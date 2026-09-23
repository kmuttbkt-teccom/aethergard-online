import * as fs from 'fs';
import { makeItem } from './GameData.js';
import * as path from 'path';
import * as crypto from 'crypto';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LEGACY_ADMIN_HASH = crypto.createHash('sha256').update('admin1234' + 'midgard_salt_ro_maple').digest('hex');
/** Letters (incl. Thai vowels/tone marks), digits, underscore and single spaces — no markup */
const NAME_PATTERN = /^[\p{L}\p{M}\p{N}_]+(?: [\p{L}\p{M}\p{N}_]+)*$/u;
const RESERVED_PREFIXES = ['gm_', 'admin_', 'gm ', 'admin '];
export function isValidName(name) {
    return NAME_PATTERN.test(name);
}
/** Account fields that are safe to send to the browser */
export function publicAccount(account) {
    const { passwordHash, guestSecretHash, ...safe } = account;
    return safe;
}
function safeEqual(a, b) {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
export class Database {
    dbPath;
    tokenSecret;
    data = {
        accounts: [],
        characters: []
    };
    constructor() {
        const dataDir = path.resolve(process.cwd(), 'server', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.dbPath = path.join(dataDir, 'database.json');
        this.tokenSecret = this.loadTokenSecret(dataDir);
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const raw = fs.readFileSync(this.dbPath, 'utf-8');
                this.data = JSON.parse(raw);
            }
            else {
                this.save();
            }
            // Seed default admin account if not present
            let adminAcc = this.data.accounts.find(a => a.username === 'admin');
            if (!adminAcc) {
                adminAcc = {
                    id: 'acc_admin_001',
                    username: 'admin',
                    displayName: '👑 Server Administrator',
                    provider: 'local',
                    role: 'admin',
                    createdAt: new Date().toISOString()
                };
                this.data.accounts.push(adminAcc);
            }
            else if (adminAcc.role !== 'admin') {
                adminAcc.role = 'admin';
            }
            // Never run with the publicly known default password
            if (!adminAcc.passwordHash || adminAcc.passwordHash === LEGACY_ADMIN_HASH || process.env.ADMIN_PASSWORD) {
                const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
                adminAcc.passwordHash = this.hashPassword(password);
                if (!process.env.ADMIN_PASSWORD) {
                    console.log('=================================================');
                    console.log(`🔐 Admin password was reset. Login: admin / ${password}`);
                    console.log('   (set the ADMIN_PASSWORD env var to choose your own)');
                    console.log('=================================================');
                }
            }
            this.save();
            // Seed GM character for admin account if none exists
            const adminChar = this.data.characters.find(c => c.accountId === adminAcc.id);
            if (!adminChar) {
                this.createCharacter(adminAcc.id, 0, 'GM_Solaris', 'male', 0, '#ffd700');
            }
        }
        catch (err) {
            console.error('Failed to load database, initializing empty:', err);
            this.save();
        }
    }
    save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('Failed to save database:', err);
        }
    }
    /** HMAC key: TOKEN_SECRET env var, else a random key persisted next to the database */
    loadTokenSecret(dataDir) {
        if (process.env.TOKEN_SECRET)
            return process.env.TOKEN_SECRET;
        const keyPath = path.join(dataDir, 'token-secret.key');
        try {
            if (fs.existsSync(keyPath))
                return fs.readFileSync(keyPath, 'utf-8').trim();
            const secret = crypto.randomBytes(32).toString('hex');
            fs.writeFileSync(keyPath, secret, { encoding: 'utf-8', mode: 0o600 });
            return secret;
        }
        catch {
            return crypto.randomBytes(32).toString('hex'); // tokens won't survive a restart
        }
    }
    /** scrypt with a per-password salt: "scrypt$<salt>$<hash>" */
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 32).toString('hex');
        return `scrypt$${salt}$${hash}`;
    }
    verifyPassword(account, password) {
        const stored = account.passwordHash;
        if (!stored)
            return false;
        if (stored.startsWith('scrypt$')) {
            const [, salt, hash] = stored.split('$');
            return safeEqual(crypto.scryptSync(password, salt, 32).toString('hex'), hash);
        }
        // Legacy unsalted SHA-256: accept once, then upgrade to scrypt
        const legacy = crypto.createHash('sha256').update(password + 'midgard_salt_ro_maple').digest('hex');
        if (!safeEqual(legacy, stored))
            return false;
        account.passwordHash = this.hashPassword(password);
        this.save();
        return true;
    }
    sign(payload) {
        return crypto.createHmac('sha256', this.tokenSecret).update(payload).digest('hex');
    }
    createToken(account) {
        // Signed token: base64(accountId:issuedAt:hmac), valid for TOKEN_TTL_MS
        const payload = `${account.id}:${Date.now()}`;
        return Buffer.from(`${payload}:${this.sign(payload)}`).toString('base64');
    }
    verifyToken(token) {
        try {
            const decoded = Buffer.from(String(token), 'base64').toString('utf-8');
            const parts = decoded.split(':');
            if (parts.length !== 3)
                return null;
            const [accountId, timestamp, sign] = parts;
            if (!safeEqual(sign, this.sign(`${accountId}:${timestamp}`)))
                return null;
            const issuedAt = Number(timestamp);
            if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > TOKEN_TTL_MS)
                return null;
            return this.data.accounts.find(a => a.id === accountId) || null;
        }
        catch {
            return null;
        }
    }
    // --- Auth Methods ---
    /**
     * Guests resume with id + secret (the id alone may be seen by others).
     * Legacy guests created before secrets existed get one on their next login.
     */
    loginGuest(existingGuestId, guestSecret) {
        let account;
        if (existingGuestId) {
            const found = this.data.accounts.find(a => a.id === existingGuestId && a.provider === 'guest');
            if (found && (!found.guestSecretHash || (guestSecret && safeEqual(this.sign(`guest:${guestSecret}`), found.guestSecretHash)))) {
                account = found;
            }
        }
        if (!account) {
            const id = `guest_${crypto.randomUUID()}`;
            account = {
                id,
                username: id,
                displayName: `Guest_${Math.floor(Math.random() * 9000 + 1000)}`,
                provider: 'guest',
                createdAt: new Date().toISOString()
            };
            this.data.accounts.push(account);
        }
        let newSecret;
        if (!account.guestSecretHash) {
            newSecret = crypto.randomBytes(24).toString('base64url');
            account.guestSecretHash = this.sign(`guest:${newSecret}`);
        }
        this.save();
        const token = this.createToken(account);
        return { account, token, guestSecret: newSecret };
    }
    registerLocal(username, password, displayName) {
        const cleanUser = String(username).trim().toLowerCase();
        if (!/^[a-z0-9_]{3,24}$/.test(cleanUser)) {
            return { error: 'ชื่อผู้ใช้ต้องเป็น a-z, 0-9 หรือ _ ความยาว 3-24 ตัวอักษร' };
        }
        if (String(password).length < 8 || String(password).length > 128) {
            return { error: 'รหัสผ่านต้องมีความยาว 8-128 ตัวอักษร' };
        }
        const cleanDisplay = String(displayName || '').trim();
        if (cleanDisplay && (cleanDisplay.length > 20 || !isValidName(cleanDisplay))) {
            return { error: 'ชื่อที่แสดงใช้ได้เฉพาะตัวอักษร ตัวเลข และ _ (ไม่เกิน 20 ตัว)' };
        }
        const exists = this.data.accounts.find(a => a.username === cleanUser);
        if (exists) {
            return { error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' };
        }
        const account = {
            id: `acc_${crypto.randomUUID()}`,
            username: cleanUser,
            displayName: cleanDisplay || cleanUser,
            provider: 'local',
            passwordHash: this.hashPassword(password),
            createdAt: new Date().toISOString()
        };
        this.data.accounts.push(account);
        this.save();
        const token = this.createToken(account);
        return { account, token };
    }
    loginLocal(username, password) {
        const cleanUser = String(username).trim().toLowerCase();
        const account = this.data.accounts.find(a => a.username === cleanUser && a.provider === 'local');
        if (!account || !this.verifyPassword(account, String(password))) {
            return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
        }
        const token = this.createToken(account);
        return { account, token };
    }
    loginOAuth(provider, profile) {
        const username = `${provider}_${profile.id}`;
        let account = this.data.accounts.find(a => a.username === username || (a.provider === provider && a.username === profile.email));
        if (!account) {
            account = {
                id: `acc_${crypto.randomUUID()}`,
                username,
                displayName: profile.name || `${provider}_User`,
                provider,
                createdAt: new Date().toISOString()
            };
            this.data.accounts.push(account);
            this.save();
        }
        const token = this.createToken(account);
        return { account, token };
    }
    // --- Character Methods ---
    getCharactersByAccount(accountId) {
        return this.data.characters
            .filter(c => c.accountId === accountId)
            .sort((a, b) => a.slot - b.slot);
    }
    createCharacter(accountId, slot, name, gender, hairStyle, hairColor) {
        const cleanName = String(name).trim();
        if (cleanName.length < 2 || cleanName.length > 16) {
            return { error: 'ชื่อตัวละครต้องมีความยาว 2 - 16 ตัวอักษร' };
        }
        if (!isValidName(cleanName)) {
            return { error: 'ชื่อตัวละครใช้ได้เฉพาะตัวอักษร ตัวเลข และ _' };
        }
        const nameOwner = this.data.accounts.find(a => a.id === accountId);
        const isStaff = nameOwner?.role === 'admin' || nameOwner?.role === 'gm';
        if (!isStaff && RESERVED_PREFIXES.some(prefix => cleanName.toLowerCase().startsWith(prefix))) {
            return { error: 'ชื่อที่ขึ้นต้นด้วย GM_ หรือ Admin_ สงวนไว้สำหรับผู้ดูแลระบบ' };
        }
        if (!Number.isInteger(slot) || slot < 0 || slot > 3) {
            return { error: 'ช่องตัวละครไม่ถูกต้อง' };
        }
        // Check name uniqueness globally
        const nameExists = this.data.characters.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
        if (nameExists) {
            return { error: 'ชื่อตัวละครนี้มีผู้อื่นใช้งานแล้ว' };
        }
        // Check slot
        const userChars = this.getCharactersByAccount(accountId);
        if (userChars.length >= 4) {
            return { error: 'สร้างตัวละครได้สูงสุด 4 ตัวเท่านั้น' };
        }
        const slotTaken = userChars.find(c => c.slot === slot);
        if (slotTaken) {
            return { error: 'ช่องตัวละครนี้มีตัวละครอยู่แล้ว' };
        }
        const now = Date.now();
        const initialWeapon = makeItem('novice_knife');
        const gmWeapon = {
            id: `gm_excalibur_${now}`,
            name: '⚔️ Holy Excalibur +10 [GM]',
            type: 'equip',
            icon: '🗡️',
            slot: 'weapon',
            refine: 10,
            cardSlots: 4,
            socketedCards: ['card_sunbun', 'card_sunbun', 'card_sunbun', 'card_sunbun'],
            weaponType: 'sword',
            rarity: 'legendary',
            quantity: 1,
            description: 'ดาบศักดิ์สิทธิ์ประจำกาย GM พลังทำลายล้างสูงสุดในพิภพ (ATK +500, Crit +50%)',
            effect: { atk: 500, crit: 50, str: 50, agi: 30 }
        };
        const gmWings = {
            id: `gm_wings_${now}`,
            name: '🪽 Seraph Wings [GM]',
            type: 'equip',
            icon: '🪽',
            slot: 'head',
            refine: 10,
            cardSlots: 2,
            quantity: 1,
            description: 'ปีกแห่งแสงทูตสวรรค์ เพิ่มความเร็วและการป้องกันสูงสุด (DEF +120)',
            effect: { def: 120, vit: 40, agi: 40 }
        };
        const gmRing = {
            id: `gm_ring_${now}`,
            name: '💍 Solar Eclipse Ring [Legendary]',
            type: 'equip',
            icon: '💍',
            slot: 'accessory',
            quantity: 1,
            description: 'แหวนสุริยคราสในตำนาน เพิ่ม All Stats +30',
            effect: { str: 30, agi: 30, vit: 30, int: 30, dex: 30, luk: 30 }
        };
        const account = this.data.accounts.find(a => a.id === accountId);
        // GM powers come only from the account role, never from the character name
        const isGm = account?.role === 'admin' || account?.role === 'gm';
        const character = {
            id: `char_${crypto.randomUUID()}`,
            accountId,
            slot,
            name: cleanName,
            job: 'Novice',
            gender,
            hairStyle,
            hairColor,
            baseLevel: isGm ? 99 : 1,
            jobLevel: isGm ? 50 : 1,
            baseExp: 0,
            maxBaseExp: 50,
            jobExp: 0,
            maxJobExp: 35,
            hp: isGm ? 99999 : 120,
            maxHp: isGm ? 99999 : 120,
            mp: isGm ? 99999 : 50,
            maxMp: isGm ? 99999 : 50,
            stats: isGm ? { str: 99, agi: 99, vit: 99, int: 99, dex: 99, luk: 99 } : { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 },
            statPoints: isGm ? 99 : 10,
            skillPoints: isGm ? 99 : 3,
            zeny: isGm ? 1000000 : 500,
            isGm,
            isGodMode: false,
            speedMultiplier: 1.0,
            x: 180 + Math.random() * 60,
            y: 560,
            facing: 'right',
            equipped: isGm ? { weapon: gmWeapon, head: gmWings, accessory: gmRing } : { weapon: initialWeapon },
            inventory: [
                makeItem('red_potion', 15),
                makeItem('blue_potion', 5),
                {
                    id: 'novice_fly_wing',
                    name: 'Fly Wing',
                    type: 'usable',
                    icon: '🪶',
                    quantity: 5,
                    description: 'เทเลพอร์ตสุ่มตำแหน่งในแผนที่'
                }
            ],
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
        };
        this.data.characters.push(character);
        this.save();
        return { character };
    }
    deleteCharacter(accountId, characterId) {
        const idx = this.data.characters.findIndex(c => c.id === characterId && c.accountId === accountId);
        if (idx !== -1) {
            this.data.characters.splice(idx, 1);
            this.save();
            return true;
        }
        return false;
    }
    getCharacterById(characterId) {
        return this.data.characters.find(c => c.id === characterId) || null;
    }
    saveCharacter(char) {
        const idx = this.data.characters.findIndex(c => c.id === char.id);
        if (idx !== -1) {
            this.data.characters[idx] = { ...char, lastLoginAt: new Date().toISOString() };
            this.save();
        }
    }
    getAccountById(id) {
        return this.data.accounts.find(a => a.id === id);
    }
    setAccountRole(accountId, role) {
        const acc = this.data.accounts.find(a => a.id === accountId);
        if (acc) {
            acc.role = role;
            this.save();
            return true;
        }
        return false;
    }
    getAllCharacters() {
        return this.data.characters;
    }
}
export const db = new Database();
