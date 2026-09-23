import { WebSocket } from 'ws';
import { MonsterManager, ZONES_CONFIG, combatDistance } from './MonsterManager.js';
import { SKILL_DB, SKILL_MAX_LEVEL, canUseSkill, skillLevelBonus, computeDerived, ITEM_DB, SHOPS, makeItem, getSellPrice, getEquipBlocker, inferWeaponType, getNpcDef, SERVER_NPC_ACTIONS, NPC_INTERACT_RANGE, WARP_COSTS, fromWorld3DX, fromWorld3DZ, TOWN_RESPAWN, WORLD_MAX_X, WORLD_MAX_Z, WORLD_SCALE, QUEST_DB, getQuestState } from './GameData.js';
const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
const CHAT_MIN_INTERVAL_MS = 600;
const VALID_JOBS = ['Swordman', 'Magician', 'Archer', 'Thief', 'Acolyte', 'Merchant'];
/** 3D client walk speed (7 units/s) in server units, with slack for jitter */
const MAX_MOVE_SPEED = (7.0 / WORLD_SCALE) * 1.35;
/** Players regenerate faster when they haven't fought for this long */
const OUT_OF_COMBAT_MS = 6000;
import { AuthoritativePhysics } from './AuthoritativePhysics.js';
import { postgresTx } from './PostgresManager.js';
import { db } from './db.js';
import { AetherAiEngine } from './AetherAiEngine.js';
export class GameRoom {
    clients = new Map();
    monsterManager = new MonsterManager();
    aiEngine;
    updateInterval;
    lastAttackTimes = new Map();
    /** `${playerId}:${skillId}` -> timestamp when the skill is ready again */
    skillCooldowns = new Map();
    lastPosSyncAt = new Map();
    lastChatAt = new Map();
    tickCount = 0;
    constructor() {
        this.aiEngine = new AetherAiEngine(this);
        // 30 Hz Authoritative Tick & Snapshot Broadcast
        this.updateInterval = setInterval(() => {
            this.tick();
        }, 1000 / 30);
    }
    addClient(ws, character) {
        const account = db.getAccountById(character.accountId);
        // GM powers come from account role or authorized GM/tester characters
        const isGm = account?.role === 'admin' || account?.role === 'gm' || character.name.startsWith('Tester3D') || character.name.startsWith('Hero3D') || character.name.startsWith('GM_');
        const player = {
            id: `client_${Math.random().toString(36).substring(2, 9)}`,
            accountId: character.accountId,
            characterId: character.id,
            name: character.name,
            job: character.job,
            gender: character.gender,
            hairStyle: character.hairStyle,
            hairColor: character.hairColor,
            role: account?.role || 'user',
            isGm,
            isGodMode: false,
            speedMultiplier: 1.0,
            baseLevel: character.baseLevel,
            jobLevel: character.jobLevel,
            baseExp: character.baseExp,
            maxBaseExp: character.maxBaseExp,
            jobExp: character.jobExp,
            maxJobExp: character.maxJobExp,
            hp: character.hp,
            maxHp: character.maxHp,
            mp: character.mp,
            maxMp: character.maxMp,
            stats: { ...character.stats },
            statPoints: character.statPoints,
            skillPoints: character.skillPoints,
            zeny: character.zeny,
            x: character.x || 180,
            y: character.y || 560,
            z: character.z || 0,
            rotY: 0,
            vx: 0,
            vy: 0,
            facing: character.facing || 'right',
            anim: 'idle',
            isGrounded: true,
            lastProcessedSeq: 0,
            equipped: character.equipped || {},
            inventory: character.inventory || [],
            skillLevels: character.skillLevels || { NORMAL: 1, BASH: 1 },
            flags: { ...(character.flags || {}) },
            questProgress: { ...(character.questProgress || {}) },
            activePet: character.activePet || null,
            currentZone: character.currentZone || 'solaria_meadows',
            isDead: false,
            viewMode: '2d'
        };
        // Legacy saves: tag equipment with a weapon type so the 3D client can render it
        if (player.equipped.weapon && !player.equipped.weapon.weaponType) {
            player.equipped.weapon.weaponType = inferWeaponType(player.equipped.weapon);
        }
        this.recalculatePlayerStats(player);
        if (player.hp <= 0)
            player.hp = Math.floor(player.maxHp * 0.5);
        this.clients.set(ws, player);
        // Send initial game state to this client
        ws.send(JSON.stringify({
            type: 'INIT_STATE',
            selfId: player.id,
            player,
            players: Array.from(this.clients.values()).map(p => this.publicPlayer(p)),
            monsters: Array.from(this.monsterManager.monsters.values()),
            drops: Array.from(this.monsterManager.drops.values()),
            zones: ZONES_CONFIG
        }));
        // Send initial AI Core state
        ws.send(JSON.stringify({
            type: 'AI_UPDATE',
            state: this.aiEngine.state
        }));
        // Broadcast new player to other clients
        this.broadcast({
            type: 'PLAYER_JOINED',
            player: this.publicPlayer(player)
        }, ws);
        if (isGm) {
            this.sendSystemChat(`👑 [Game Master] ${player.name} เข้าสู่เซิร์ฟเวอร์ด้วยสิทธิ์ผู้ดูแลระบบ!`);
        }
        else {
            this.sendSystemChat(`ยินดีต้อนรับ ${player.name} [${player.job}] สู่ดินแดน Aethergard Online!`);
        }
        return player;
    }
    removeClient(ws) {
        const player = this.clients.get(ws);
        if (player) {
            this.persistPlayer(player);
            this.broadcast({
                type: 'PLAYER_LEFT',
                id: player.id
            });
            this.clients.delete(ws);
            this.lastAttackTimes.delete(player.id);
            this.lastPosSyncAt.delete(player.id);
            this.lastChatAt.delete(player.id);
            for (const key of this.skillCooldowns.keys()) {
                if (key.startsWith(`${player.id}:`))
                    this.skillCooldowns.delete(key);
            }
            // Monsters chasing this player lose interest
            this.monsterManager.monsters.forEach(m => {
                if (m.targetPlayerId === player.id)
                    m.targetPlayerId = undefined;
            });
        }
    }
    persistPlayer(player) {
        if (!player.characterId)
            return;
        const existing = db.getCharacterById(player.characterId);
        if (existing) {
            existing.baseLevel = player.baseLevel;
            existing.jobLevel = player.jobLevel;
            existing.baseExp = player.baseExp;
            existing.maxBaseExp = player.maxBaseExp;
            existing.jobExp = player.jobExp;
            existing.maxJobExp = player.maxJobExp;
            existing.hp = player.hp;
            existing.maxHp = player.maxHp;
            existing.mp = player.mp;
            existing.maxMp = player.maxMp;
            existing.stats = { ...player.stats };
            existing.statPoints = player.statPoints;
            existing.skillPoints = player.skillPoints;
            existing.zeny = player.zeny;
            existing.x = Math.round(player.x);
            existing.y = Math.round(player.y);
            existing.z = Math.round(player.z || 0);
            existing.facing = player.facing;
            existing.job = player.job;
            existing.equipped = player.equipped;
            existing.inventory = player.inventory;
            existing.skillLevels = player.skillLevels;
            existing.flags = player.flags;
            existing.questProgress = player.questProgress;
            existing.currentZone = player.currentZone;
            db.saveCharacter(existing);
        }
    }
    /** What other players are allowed to know about a character */
    publicPlayer(p) {
        return {
            id: p.id,
            name: p.name,
            job: p.job,
            baseLevel: p.baseLevel,
            gender: p.gender,
            hairColor: p.hairColor,
            isGm: Boolean(p.isGm),
            x: p.x,
            y: p.y,
            z: p.z || 0,
            facing: p.facing,
            anim: p.anim
        };
    }
    getSocket(player) {
        for (const [ws, p] of this.clients) {
            if (p === player)
                return ws;
        }
        return undefined;
    }
    /** Full character state goes only to its owner */
    sendPlayerUpdate(player, leveledUp) {
        const ws = this.getSocket(player);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player, leveledUp }));
        }
    }
    /** Close any live session already playing this character (it is saved first) */
    kickCharacter(characterId) {
        for (const [ws, p] of Array.from(this.clients.entries())) {
            if (p.characterId === characterId) {
                this.sendChat(ws, 'system', '⚠️ ตัวละครนี้ถูกเข้าสู่ระบบจากที่อื่น');
                this.removeClient(ws);
                ws.close(4001, 'logged in elsewhere');
            }
        }
    }
    handleMessage(ws, message) {
        const player = this.clients.get(ws);
        if (!player)
            return;
        switch (message.type) {
            // Authoritative Input processing with Client-side Prediction reconciliation
            case 'INPUT': {
                const packet = message.packet;
                // The 3D client is position-synced via POS_SYNC_3D; dead players can't move
                if (player.isDead || player.viewMode === '3d')
                    break;
                if (packet && packet.seq > player.lastProcessedSeq) {
                    player.lastProcessedSeq = packet.seq;
                    const boundedDt = Math.min(0.06, Math.max(0.01, packet.dt || 0.033));
                    AuthoritativePhysics.step(player, packet, boundedDt);
                }
                break;
            }
            case 'ATTACK': {
                this.handleSkill(ws, player, String(message.skill || 'NORMAL'), message.targetId ? String(message.targetId) : undefined);
                break;
            }
            // 3D Mode: the client owns its walking and the server bounds-checks it.
            // Coordinates arrive in server units (x: 0..14400, z: ±WORLD_MAX_Z).
            case 'POS_SYNC_3D': {
                if (player.isDead)
                    break;
                const sx = Number(message.x);
                const sz = Number(message.z ?? 0);
                if (!Number.isFinite(sx) || !Number.isFinite(sz))
                    break;
                const now = Date.now();
                const last = this.lastPosSyncAt.get(player.id) || 0;
                this.lastPosSyncAt.set(player.id, now);
                player.viewMode = '3d';
                let nx = Math.max(0, Math.min(WORLD_MAX_X, sx));
                let nz = Math.max(-WORLD_MAX_Z, Math.min(WORLD_MAX_Z, sz));
                // Speed validation: clamp moves faster than the walk speed allows.
                // Always checked against the server's position (the first sync after
                // login or a view switch gets a 1s budget) so nothing can teleport.
                {
                    const elapsed = last > 0 ? Math.min(1.0, (now - last) / 1000) + 0.1 : 1.0;
                    const maxDist = MAX_MOVE_SPEED * (player.speedMultiplier || 1) * (player.isGm ? 1.8 : 1) * elapsed;
                    const dx = nx - player.x;
                    const dz = nz - (player.z || 0);
                    const dist = Math.hypot(dx, dz);
                    if (dist > maxDist) {
                        nx = player.x + (dx / dist) * maxDist;
                        nz = (player.z || 0) + (dz / dist) * maxDist;
                        this.sendPosCorrection(ws, player, nx, nz);
                    }
                }
                player.x = nx;
                player.z = nz;
                player.y = 560;
                if (Number.isFinite(Number(message.rotY)))
                    player.rotY = Number(message.rotY);
                if (message.anim === 'walk' || message.anim === 'idle' || message.anim === 'jump')
                    player.anim = message.anim;
                if (message.facing === 'left' || message.facing === 'right')
                    player.facing = message.facing;
                break;
            }
            case 'VIEW_MODE': {
                player.viewMode = message.mode === '3d' ? '3d' : '2d';
                if (player.viewMode === '2d') {
                    player.z = 0;
                    player.y = 560;
                    player.vy = 0;
                }
                this.lastPosSyncAt.delete(player.id);
                break;
            }
            case 'EQUIP_ITEM': {
                this.handleEquip(ws, player, String(message.itemId || ''));
                break;
            }
            case 'UNEQUIP_ITEM': {
                this.handleUnequip(ws, player, String(message.slot || ''));
                break;
            }
            case 'NPC_ACTION': {
                this.handleNpcAction(ws, player, String(message.npcId || ''), String(message.action || ''), message.param ? String(message.param) : undefined);
                break;
            }
            case 'SHOP_BUY': {
                this.handleShopBuy(ws, player, String(message.npcId || ''), String(message.shopId || ''), String(message.itemId || ''), Number(message.qty || 1));
                break;
            }
            case 'SHOP_SELL': {
                this.handleShopSell(ws, player, String(message.npcId || ''), String(message.itemId || ''), Number(message.qty || 1));
                break;
            }
            case 'RESPAWN': {
                this.handleRespawn(ws, player);
                break;
            }
            // Refinement with PostgreSQL Row-Level Locking (SELECT FOR UPDATE)
            case 'REFINE_ITEM': {
                this.handleRefineItem(ws, player, message.itemId);
                break;
            }
            case 'USE_ITEM': {
                this.handleUseItem(player, message.itemId);
                break;
            }
            case 'ALLOCATE_STAT': {
                const stat = message.stat;
                if (STAT_KEYS.includes(stat) && player.statPoints > 0 && player.stats[stat] < 130) {
                    player.stats[stat] += 1;
                    player.statPoints -= 1;
                    this.recalculatePlayerStats(player);
                    this.persistPlayer(player);
                    ws.send(JSON.stringify({
                        type: 'PLAYER_UPDATED',
                        player
                    }));
                }
                break;
            }
            case 'JOB_CHANGE': {
                const newJob = message.job;
                if (!VALID_JOBS.includes(newJob))
                    break;
                if (!player.isGm && (player.baseLevel < 10 || player.jobLevel < 10)) {
                    this.sendChat(ws, 'system', '❌ ต้องมี Base Lv.10 และ Job Lv.10 ขึ้นไปจึงจะเปลี่ยนอาชีพได้');
                    break;
                }
                if (player.job === 'Novice' || player.isGm) {
                    player.job = newJob;
                    player.skillPoints += 5;
                    this.recalculatePlayerStats(player);
                    this.persistPlayer(player);
                    this.sendSystemChat(`🎉 ยินดีด้วย! ${player.name} ได้เลื่อนขั้นเป็นอาชีพ [${newJob}]!`);
                    this.sendPlayerUpdate(player);
                }
                else {
                    this.sendChat(ws, 'system', '❌ คุณเปลี่ยนอาชีพไปแล้ว');
                }
                break;
            }
            case 'PICK_DROP': {
                if (player.isDead)
                    break;
                // A specific drop (2D click) or everything within reach (3D [V] key)
                const candidates = message.dropId
                    ? [this.monsterManager.drops.get(String(message.dropId))].filter((d) => Boolean(d))
                    : Array.from(this.monsterManager.drops.values());
                const reach = message.dropId ? 90 : 130;
                const picked = candidates.filter(d => combatDistance(player, { x: d.x, y: d.groundY, z: d.z }) <= reach);
                if (picked.length === 0) {
                    if (!message.dropId)
                        this.sendChat(ws, 'system', '🔍 ไม่มีไอเทมอยู่ใกล้ตัว');
                    break;
                }
                picked.forEach(drop => this.collectDrop(ws, player, drop));
                this.persistPlayer(player);
                ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player }));
                break;
            }
            case 'CLAIM_QUEST': {
                this.handleClaimQuest(ws, player, String(message.questId || ''));
                break;
            }
            case 'CHAT': {
                // eslint-disable-next-line no-control-regex
                const text = String(message.text || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
                if (text.length === 0 || text.length > 150)
                    break;
                if (text.startsWith('@')) {
                    this.handleGmChatCommand(ws, player, text);
                    break;
                }
                const now = Date.now();
                if (now - (this.lastChatAt.get(player.id) || 0) < CHAT_MIN_INTERVAL_MS) {
                    this.sendChat(ws, 'system', '⏳ พิมพ์เร็วเกินไป กรุณารอสักครู่');
                    break;
                }
                this.lastChatAt.set(player.id, now);
                const chatMsg = {
                    sender: player.name,
                    text,
                    channel: 'all',
                    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                };
                this.broadcast({ type: 'CHAT', chat: chatMsg });
                break;
            }
            case 'ADMIN_ACTION': {
                if (!player.isGm && player.role !== 'admin' && player.role !== 'gm') {
                    this.sendChat(ws, 'system', '❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งผู้ดูแลระบบ');
                    break;
                }
                this.handleAdminAction(ws, player, message.action, message.data);
                break;
            }
            case 'AI_ACTION': {
                if (message.action !== 'GET_STATE' && !player.isGm)
                    break;
                if (message.action === 'RUN_DIAGNOSTICS') {
                    this.aiEngine.triggerManualDiagnostics();
                }
                else if (message.action === 'TRIGGER_EVOLUTION') {
                    this.aiEngine.triggerManualEvolution();
                }
                else if (message.action === 'GET_STATE') {
                    ws.send(JSON.stringify({ type: 'AI_UPDATE', state: this.aiEngine.state }));
                }
                break;
            }
            case 'UPGRADE_SKILL': {
                const skillId = String(message.skillId || '');
                const skill = SKILL_DB[skillId];
                if (!skill || skill.id === 'NORMAL') {
                    this.sendChat(ws, 'system', '❌ ไม่พบสกิลที่ต้องการ');
                    break;
                }
                if (!canUseSkill(skill, player.job)) {
                    this.sendChat(ws, 'system', `❌ อาชีพ ${player.job} เรียนสกิลนี้ไม่ได้`);
                    break;
                }
                if (!player.skillPoints || player.skillPoints <= 0) {
                    this.sendChat(ws, 'system', '❌ แต้มสกิลไม่พอ');
                    break;
                }
                if (!player.skillLevels)
                    player.skillLevels = {};
                const curLv = player.skillLevels[skillId] || 1;
                if (curLv >= SKILL_MAX_LEVEL) {
                    this.sendChat(ws, 'system', `✨ สกิล [${skill.name}] Lv.${SKILL_MAX_LEVEL} สูงสุดแล้ว!`);
                    break;
                }
                player.skillLevels[skillId] = curLv + 1;
                player.skillPoints -= 1;
                this.persistPlayer(player);
                ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player }));
                this.sendChat(ws, 'system', `⚡ อัปสกิล [${skill.name}] ➜ Lv.${player.skillLevels[skillId]}!`);
                break;
            }
            case 'PET_TOGGLE': {
                if (player.activePet) {
                    player.activePet = null;
                    this.sendChat(ws, 'system', '🐾 เก็บสัตว์เลี้ยงกลับแล้ว');
                }
                else {
                    player.activePet = { id: `pet_${Date.now()}`, name: 'Chibi Sunbun', type: 'sunbun', level: 1, autoLoot: true, buff: { speedBoost: 0.1, expBonus: 0.05 } };
                    this.sendChat(ws, 'system', '🐰 เรียกสัตว์เลี้ยง [Chibi Sunbun] — Auto-Loot ON (+5% EXP, +10% Speed)');
                }
                this.persistPlayer(player);
                ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player }));
                break;
            }
            case 'GET_ZONES': {
                ws.send(JSON.stringify({ type: 'ZONES_LIST', zones: ZONES_CONFIG }));
                break;
            }
        }
    }
    handleGmChatCommand(ws, player, text) {
        if (!player.isGm && player.role !== 'admin' && player.role !== 'gm') {
            this.sendChat(ws, 'system', '❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งผู้ดูแลระบบ');
            return;
        }
        const parts = text.slice(1).trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        switch (cmd) {
            case 'help': {
                this.sendChat(ws, 'system', '👑 คำสั่ง GM: @announce <ข้อความ>, @god, @speed <1-5>, @spawn <Sunbun|Leafkin|Aethercap|Gryphlet|BaphometJr|Solarion> [จำนวน], @zeny <จำนวน>, @item <excalibur|wings|ring|potion>, @heal, @killall, @ai [diag|evolve]');
                break;
            }
            case 'ai': {
                const sub = args[0]?.toLowerCase();
                if (sub === 'diag' || sub === 'diagnostics') {
                    this.aiEngine.triggerManualDiagnostics();
                }
                else if (sub === 'evolve' || sub === 'evolution') {
                    this.aiEngine.triggerManualEvolution();
                }
                else {
                    this.sendChat(ws, 'system', `🤖 AETHER-CORE AI: Status=${this.aiEngine.state.status}, Learning=${this.aiEngine.state.learningProgress}%, Event=${this.aiEngine.state.activeEvent || 'None'}, AnomalyScore=${this.aiEngine.state.anomalyScore}`);
                }
                break;
            }
            case 'announce':
            case 'broad': {
                const msg = args.join(' ');
                if (!msg) {
                    this.sendChat(ws, 'system', 'วิธีใช้: @announce <ข้อความประกาศ>');
                    return;
                }
                this.broadcastAnnouncement(msg, player.name, 'gold');
                break;
            }
            case 'god': {
                player.isGodMode = !player.isGodMode;
                if (player.isGodMode) {
                    player.hp = player.maxHp = 99999;
                    player.mp = player.maxMp = 99999;
                    this.sendChat(ws, 'system', '🛡️ God Mode [เปิดใช้งาน] - เลือดและมานา 99,999 เป็นอมตะ!');
                }
                else {
                    this.recalculatePlayerStats(player);
                    player.hp = player.maxHp;
                    player.mp = player.maxMp;
                    this.sendChat(ws, 'system', '🛡️ God Mode [ปิดใช้งาน] - กลับสู่สถานะปกติ');
                }
                this.persistPlayer(player);
                this.sendPlayerUpdate(player);
                break;
            }
            case 'speed': {
                const spd = Math.max(1, Math.min(5, parseFloat(args[0]) || 2.5));
                player.speedMultiplier = spd;
                this.sendChat(ws, 'system', `⚡ ปรับความเร็วเป็น ${spd}x เรียบร้อย!`);
                this.persistPlayer(player);
                this.sendPlayerUpdate(player);
                break;
            }
            case 'zeny': {
                const amount = parseInt(args[0], 10) || 100000;
                player.zeny = Math.max(0, player.zeny + amount);
                this.sendChat(ws, 'system', `💰 ได้รับ ${amount.toLocaleString()} Zeny (ยอดรวม: ${player.zeny.toLocaleString()} Zeny)`);
                this.persistPlayer(player);
                this.sendPlayerUpdate(player);
                break;
            }
            case 'heal': {
                player.hp = player.maxHp;
                player.mp = player.maxMp;
                this.sendChat(ws, 'system', '💖 ฟื้นฟู HP/MP เต็มเปี่ยม!');
                this.persistPlayer(player);
                this.sendPlayerUpdate(player);
                break;
            }
            case 'item': {
                const itemType = (args[0] || 'excalibur').toLowerCase();
                this.grantGmItem(ws, player, itemType);
                break;
            }
            case 'spawn': {
                const mobType = (args[0] || 'Solarion');
                const count = Math.max(1, Math.min(10, parseInt(args[1], 10) || 1));
                this.spawnMobsForGm(ws, player, mobType, count);
                break;
            }
            case 'killall': {
                this.killAllMonsters(ws, player);
                break;
            }
            case 'job': {
                const targetJob = (args[0] || 'Novice');
                const matched = VALID_JOBS.find(j => j.toLowerCase() === targetJob.toLowerCase());
                if (matched) {
                    player.job = matched;
                    this.recalculatePlayerStats(player);
                    this.persistPlayer(player);
                    this.sendChat(ws, 'system', `🔄 เปลี่ยนอาชีพเป็น [${matched}] เรียบร้อย!`);
                    this.sendPlayerUpdate(player);
                }
                else {
                    this.sendChat(ws, 'system', `❌ ไม่พบอาชีพ ${args[0]} (เลือกได้: ${VALID_JOBS.join(', ')})`);
                }
                break;
            }
            case 'lvl':
            case 'level': {
                const lvl = Math.max(1, Math.min(99, parseInt(args[0], 10) || 50));
                player.baseLevel = lvl;
                player.jobLevel = Math.min(50, lvl);
                player.statPoints += 50;
                player.skillPoints += 30;
                this.recalculatePlayerStats(player);
                this.persistPlayer(player);
                this.sendChat(ws, 'system', `⭐ ปรับระดับเลเวลเป็น Base Lv.${player.baseLevel} / Job Lv.${player.jobLevel}!`);
                this.sendPlayerUpdate(player);
                break;
            }
            default:
                this.sendChat(ws, 'system', `❓ ไม่พบคำสั่ง @${cmd} พิมพ์ @help เพื่อดูคำสั่งทั้งหมด`);
        }
    }
    handleAdminAction(ws, player, action, data = {}) {
        switch (action) {
            case 'BROADCAST': {
                const msg = String(data.message || '').trim();
                if (msg) {
                    this.broadcastAnnouncement(msg, player.name, data.style || 'gold');
                }
                break;
            }
            case 'TOGGLE_GOD': {
                player.isGodMode = !player.isGodMode;
                if (player.isGodMode) {
                    player.hp = player.maxHp = 99999;
                    player.mp = player.maxMp = 99999;
                    this.sendChat(ws, 'system', '🛡️ God Mode: เปิดใช้งาน (พลังชีวิต/มานา 99,999)');
                }
                else {
                    this.recalculatePlayerStats(player);
                    player.hp = player.maxHp;
                    player.mp = player.maxMp;
                    this.sendChat(ws, 'system', '🛡️ God Mode: ปิดใช้งาน');
                }
                this.persistPlayer(player);
                this.sendPlayerUpdate(player);
                break;
            }
            case 'SET_SPEED': {
                const spd = Math.max(1, Math.min(5, Number(data.speedMultiplier || 1.0)));
                player.speedMultiplier = spd;
                this.sendChat(ws, 'system', `⚡ ปรับความเร็วเป็น ${spd}x`);
                this.persistPlayer(player);
                this.sendPlayerUpdate(player);
                break;
            }
            case 'SPAWN_MOB': {
                const mobType = (data.mobType || 'Solarion');
                const count = Math.max(1, Math.min(10, Number(data.count || 1)));
                this.spawnMobsForGm(ws, player, mobType, count);
                break;
            }
            case 'KILL_ALL': {
                this.killAllMonsters(ws, player);
                break;
            }
            case 'HEAL_ALL': {
                this.clients.forEach((p, clientWs) => {
                    p.hp = p.maxHp;
                    p.mp = p.maxMp;
                    this.persistPlayer(p);
                    if (clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify({ type: 'PLAYER_UPDATED', player: p }));
                    }
                });
                this.sendSystemChat(`💖 GM [${player.name}] ได้ร่ายเวทฮีลฟื้นฟู HP/MP ผู้เล่นทุกคนในเซิร์ฟเวอร์เต็ม 100%!`);
                break;
            }
            case 'GIVE_ZENY': {
                const amount = Number(data.amount || 100000);
                player.zeny = Math.max(0, player.zeny + amount);
                this.sendChat(ws, 'system', `💰 ได้รับ ${amount.toLocaleString()} Zeny`);
                this.persistPlayer(player);
                this.sendPlayerUpdate(player);
                break;
            }
            case 'GIVE_ITEM': {
                const itemType = String(data.itemId || 'excalibur').toLowerCase();
                this.grantGmItem(ws, player, itemType);
                break;
            }
            case 'KICK_PLAYER': {
                const targetId = String(data.targetPlayerId || '');
                this.clients.forEach((p, clientWs) => {
                    if (p.id === targetId && clientWs !== ws) {
                        this.sendChat(clientWs, 'system', '🚫 คุณถูกตัดการเชื่อมต่อโดย GM');
                        clientWs.close();
                        this.sendChat(ws, 'system', `👢 เตะผู้เล่น [${p.name}] เรียบร้อย`);
                    }
                });
                break;
            }
        }
    }
    grantGmItem(ws, player, itemKey) {
        let newItem = null;
        const now = Date.now();
        if (itemKey.includes('excalibur') || itemKey === 'weapon') {
            newItem = {
                id: `gm_excalibur_${now}`,
                name: '⚔️ Holy Excalibur +10 [GM]',
                type: 'equip',
                icon: '🗡️',
                slot: 'weapon',
                refine: 10,
                cardSlots: 4,
                socketedCards: ['card_sunbun', 'card_sunbun', 'card_sunbun', 'card_sunbun'],
                quantity: 1,
                description: 'ดาบศักดิ์สิทธิ์ประจำกาย GM พลังทำลายล้างสูงสุดในพิภพ (ATK +500, Crit +50%)',
                effect: { atk: 500, crit: 50, str: 50, agi: 30 }
            };
        }
        else if (itemKey.includes('wing') || itemKey === 'wings' || itemKey === 'head') {
            newItem = {
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
        }
        else if (itemKey.includes('ring') || itemKey === 'accessory') {
            newItem = {
                id: `gm_ring_${now}`,
                name: '💍 Solar Eclipse Ring [Legendary]',
                type: 'equip',
                icon: '💍',
                slot: 'accessory',
                quantity: 1,
                description: 'แหวนสุริยคราสในตำนาน เพิ่ม All Stats +30',
                effect: { str: 30, agi: 30, vit: 30, int: 30, dex: 30, luk: 30 }
            };
        }
        else if (itemKey.includes('potion') || itemKey === 'elixir') {
            newItem = {
                id: `gm_elixir_${now}`,
                name: '🧪 Elixir of Immortality x99',
                type: 'usable',
                icon: '⚗️',
                quantity: 99,
                description: 'น้ำอมฤตฟื้นฟู HP/MP 99,999 ทันที',
                effect: { hp: 99999, mp: 99999 }
            };
        }
        if (newItem) {
            player.inventory.push(newItem);
            this.persistPlayer(player);
            this.sendPlayerUpdate(player);
            this.sendChat(ws, 'system', `✨ GM ได้รับไอเทมพิเศษ [${newItem.name}]!`);
        }
        else {
            this.sendChat(ws, 'system', '❌ ไม่พบประเภทไอเทมที่ระบุ (excalibur, wings, ring, elixir)');
        }
    }
    spawnMobsForGm(ws, player, mobType, count) {
        const validMobs = {
            Sunbun: 'Sunbun',
            Leafkin: 'Leafkin',
            Aethercap: 'Aethercap',
            Gryphlet: 'Gryphlet',
            BaphometJr: 'Baphomet Jr. [Mini-Boss]',
            Solarion: 'Solarion, The Eclipse Lord [MVP BOSS]'
        };
        const typeKey = Object.keys(validMobs).find(k => k.toLowerCase() === mobType.toLowerCase()) || 'Solarion';
        const chosenType = typeKey;
        const mobName = validMobs[chosenType];
        for (let i = 0; i < count; i++) {
            const offsetX = (i - Math.floor(count / 2)) * 60;
            const spawnX = Math.max(100, Math.min(14300, player.x + offsetX));
            const spawnY = player.y;
            const spawned = this.monsterManager.spawnMonster(chosenType, mobName, spawnX, spawnY, Math.max(100, spawnX - 250), Math.min(14350, spawnX + 250));
            spawned.z = spawned.homeZ = player.viewMode === '3d' ? (player.z || 0) : 0;
            this.broadcast({
                type: 'MOB_SPAWNED',
                monster: spawned
            });
        }
        this.sendSystemChat(`⚡ [GM Summon] GM [${player.name}] ได้เรียกมอนสเตอร์ [${mobName}] จำนวน ${count} ตัว!`);
    }
    killAllMonsters(ws, player) {
        let count = 0;
        this.monsterManager.monsters.forEach(mob => {
            if (!mob.isDead) {
                mob.hp = 0;
                mob.isDead = true;
                count++;
                const drops = this.monsterManager.handleMobDeath(mob);
                this.broadcast({
                    type: 'MOB_DIED',
                    mobId: mob.id,
                    mobType: mob.type,
                    mobName: mob.name,
                    killerId: player.id,
                    drops
                });
            }
        });
        this.sendSystemChat(`💥 [GM Judgment] GM [${player.name}] ร่ายทัณฑ์สวรรค์ กำจัดมอนสเตอร์ทั้งหมด ${count} ตัวในพริบตา!`);
    }
    broadcastAnnouncement(message, sender = 'Game Master', style = 'gold') {
        const announcement = {
            id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            message,
            sender,
            time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            style
        };
        this.broadcast({
            type: 'SERVER_ANNOUNCEMENT',
            announcement
        });
        this.sendSystemChat(`📢 [ประกาศจาก ${sender}]: ${message}`);
    }
    async handleRefineItem(ws, player, itemId) {
        if (!player.characterId)
            return;
        // Execute PostgreSQL Transaction with Row-Level Locking
        const result = await postgresTx.executeRefineTransaction(player.characterId, itemId);
        if (result.character) {
            player.zeny = result.character.zeny;
            player.equipped = result.character.equipped;
            player.inventory = result.character.inventory;
        }
        ws.send(JSON.stringify({
            type: 'REFINE_RESULT',
            result
        }));
        this.sendPlayerUpdate(player);
        if (result.success) {
            this.sendSystemChat(`🔥 [ช่างตีเหล็ก] ${player.name} ตีบวกสำเร็จเป็น +${result.newRefine}!`);
        }
        else if (result.broken) {
            this.sendSystemChat(`💥 [ช่างตีเหล็ก] อุปกรณ์ของ ${player.name} แตกสลายขณะตีบวกเกินขีดจำกัด!`);
        }
    }
    // ===========================================================================
    // Combat: skills & basic attacks
    // ===========================================================================
    sendSkillFailed(ws, skillId, reason) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'SKILL_FAILED', skillId, reason }));
        }
    }
    /** Lightweight HP/MP/Zeny refresh for the owning client */
    sendVitals(ws, player) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'VITALS',
                hp: player.hp, maxHp: player.maxHp,
                mp: player.mp, maxMp: player.maxMp,
                zeny: player.zeny
            }));
        }
    }
    /** Server moved the player (blink, warp, respawn, speed clamp) — tell the client */
    sendPosCorrection(ws, player, x, z) {
        player.x = x;
        player.z = z;
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'POS_CORRECTION', x, z }));
        }
    }
    isValidTarget(mob) {
        return Boolean(mob && !mob.isDead && mob.hp > 0);
    }
    /** Requested target if it's in range, otherwise the closest living monster in range */
    pickTarget(player, range, targetId) {
        const requested = targetId ? this.monsterManager.monsters.get(targetId) : undefined;
        // Small tolerance: the client sees monsters slightly behind the server
        if (this.isValidTarget(requested) && combatDistance(player, requested) <= range + 45) {
            return requested;
        }
        let best;
        let bestDist = range;
        this.monsterManager.monsters.forEach(m => {
            if (!this.isValidTarget(m))
                return;
            const d = combatDistance(player, m);
            if (d <= bestDist) {
                bestDist = d;
                best = m;
            }
        });
        return best;
    }
    rollDamage(skill, derived, levelBonus, mob) {
        const magicBasic = skill.kind === 'basic' && derived.attackKind === 'magic';
        const useMatk = Boolean(skill.useMatk) || magicBasic || (skill.element === 'holy' && derived.matk > derived.atk);
        const base = useMatk ? derived.matk : derived.atk;
        const mult = skill.kind === 'basic' ? 1 : skill.multiplier;
        const isCrit = !useMatk && (Boolean(skill.guaranteedCrit) || Math.random() * 100 < derived.crit);
        let raw;
        if (isCrit) {
            raw = base * 1.5 * mult * levelBonus; // crits pierce defense
        }
        else {
            raw = base * (0.9 + Math.random() * 0.2) * mult * levelBonus;
            raw -= useMatk ? mob.def * 0.5 : mob.def;
        }
        return { damage: Math.max(1, Math.floor(raw)), isCrit };
    }
    handleSkill(ws, player, skillId, targetId) {
        if (player.isDead)
            return;
        const skill = SKILL_DB[skillId];
        if (!skill)
            return;
        if (!canUseSkill(skill, player.job) && !player.isGm) {
            this.sendSkillFailed(ws, skillId, `อาชีพ ${player.job} ใช้สกิลนี้ไม่ได้`);
            return;
        }
        const now = Date.now();
        const derived = computeDerived(player, now);
        const cooldownMs = skill.kind === 'basic' ? derived.aspdMs : skill.cooldownMs;
        const cdKey = `${player.id}:${skillId}`;
        // 80ms grace so client-side cooldown timers don't fight network jitter
        if (now < (this.skillCooldowns.get(cdKey) || 0) - 80)
            return;
        if (player.isGodMode || player.isGm) {
            player.hp = Math.max(player.hp, player.maxHp);
            player.mp = Math.max(player.mp, player.maxMp);
        }
        if (player.mp < skill.mpCost) {
            if (player.isGm) {
                player.mp = player.maxMp;
            }
            else {
                this.sendSkillFailed(ws, skillId, 'MP ไม่พอ');
                return;
            }
        }
        if (skill.zenyCost && player.zeny < skill.zenyCost) {
            if (player.isGm) {
                player.zeny += 10000;
            }
            else {
                this.sendSkillFailed(ws, skillId, `ต้องใช้ ${skill.zenyCost} Zeny`);
                return;
            }
        }
        const level = player.skillLevels?.[skillId] || 1;
        const levelBonus = skillLevelBonus(level);
        // --- Resolve targets ---
        let primary;
        let victims = [];
        let center = { x: player.x, y: player.y, z: player.z || 0 };
        const inRadius = (c, radius) => {
            const list = [];
            this.monsterManager.monsters.forEach(m => {
                if (this.isValidTarget(m) && combatDistance({ ...c, viewMode: player.viewMode }, m) <= radius)
                    list.push(m);
            });
            return list;
        };
        switch (skill.kind) {
            case 'basic':
            case 'melee':
            case 'ranged':
            case 'blink': {
                const range = skill.kind === 'basic' ? derived.attackRange : skill.range;
                primary = this.pickTarget(player, range, targetId);
                if (!primary) {
                    // Basic swings at nothing are silently ignored to avoid chat spam
                    if (skill.kind !== 'basic')
                        this.sendSkillFailed(ws, skillId, 'ไม่มีเป้าหมายในระยะ');
                    return;
                }
                victims = [primary];
                break;
            }
            case 'ground_aoe': {
                primary = this.pickTarget(player, skill.range, targetId);
                if (primary) {
                    center = { x: primary.x, y: primary.y, z: primary.z || 0 };
                }
                else {
                    // Cast at ground in front of player along facing angle
                    const dirX = Math.sin(player.rotY || 0);
                    const dirZ = Math.cos(player.rotY || 0);
                    center = {
                        x: Math.max(0, Math.min(WORLD_MAX_X, player.x + dirX * 180)),
                        y: player.y,
                        z: player.viewMode === '3d' ? Math.max(-WORLD_MAX_Z, Math.min(WORLD_MAX_Z, (player.z || 0) + dirZ * 180)) : 0
                    };
                }
                victims = inRadius(center, skill.radius);
                break;
            }
            case 'self_aoe':
                victims = inRadius(center, skill.radius);
                break;
            case 'heal':
            case 'utility':
                break;
        }
        // --- Commit costs ---
        player.mp -= skill.mpCost;
        if (skill.zenyCost)
            player.zeny -= skill.zenyCost;
        this.skillCooldowns.set(cdKey, now + cooldownMs);
        if (victims.length > 0)
            player.lastCombatAt = now;
        // Shadow Blink: reappear just behind the target
        if (skill.kind === 'blink' && primary) {
            const dx = primary.x - player.x;
            const dz = (primary.z || 0) - (player.z || 0);
            const len = Math.hypot(dx, dz) || 1;
            const bx = Math.max(0, Math.min(WORLD_MAX_X, primary.x + (dx / len) * 45));
            const bz = player.viewMode === '3d' ? Math.max(-WORLD_MAX_Z, Math.min(WORLD_MAX_Z, (primary.z || 0) + (dz / len) * 45)) : 0;
            this.sendPosCorrection(ws, player, bx, bz);
            player.rotY = Math.atan2(-dx, -dz);
            this.lastPosSyncAt.set(player.id, now);
        }
        else if (primary) {
            player.rotY = Math.atan2(primary.x - player.x, (primary.z || 0) - (player.z || 0));
        }
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'SKILL_USED', skillId, cooldownMs, level }));
        }
        this.broadcast({
            type: 'PLAYER_ATTACKED',
            id: player.id,
            skill: skillId,
            facing: player.facing,
            targetId: primary?.id,
            tx: center.x,
            tz: center.z,
            rotY: player.rotY
        });
        // --- Healing ---
        if (skill.healPct) {
            const pct = skill.healPct * (1 + (level - 1) * 0.05);
            const healTargets = skill.id === 'SANCTUARY'
                ? Array.from(this.clients.entries()).filter(([, p]) => !p.isDead && combatDistance(player, p) <= skill.radius)
                : [[ws, player]];
            healTargets.forEach(([clientWs, p]) => {
                const amount = Math.floor(p.maxHp * pct);
                p.hp = Math.min(p.maxHp, p.hp + amount);
                this.broadcast({ type: 'PLAYER_HEALED', id: p.id, amount, hp: p.hp, maxHp: p.maxHp });
                this.sendVitals(clientWs, p);
            });
            if (skill.id === 'SOLAR_AEGIS') {
                player.blessingUntil = Math.max(player.blessingUntil || 0, now + 20000);
            }
        }
        // --- Greed Vacuum ---
        if (skill.id === 'GREED_VACUUM') {
            const drops = Array.from(this.monsterManager.drops.values())
                .filter(d => combatDistance(player, { x: d.x, y: d.groundY, z: d.z }) <= skill.radius);
            drops.forEach(d => this.collectDrop(ws, player, d));
            if (drops.length > 0) {
                this.persistPlayer(player);
                ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player }));
            }
            else {
                this.sendChat(ws, 'system', '🔍 ไม่มีไอเทมในรัศมี');
            }
        }
        // --- Damage ---
        const hits = skill.hits || 1;
        for (const mob of victims) {
            mob.targetPlayerId = player.id; // monsters fight back against whoever hits them
            for (let h = 0; h < hits && !mob.isDead; h++) {
                const { damage, isCrit } = this.rollDamage(skill, derived, levelBonus, mob);
                mob.hp = Math.max(0, mob.hp - damage);
                const dmgEvent = {
                    targetId: mob.id,
                    isPlayer: false,
                    damage,
                    isCrit,
                    isMiss: false,
                    x: mob.x,
                    y: mob.y - 30
                };
                this.broadcast({
                    type: 'DAMAGE',
                    damageEvent: dmgEvent,
                    mobHp: mob.hp,
                    mobMaxHp: mob.maxHp,
                    delayMs: h * 140,
                    element: skill.element
                });
                if (mob.hp <= 0) {
                    this.killMonster(player, mob);
                }
            }
            if (!mob.isDead) {
                if (skill.freezeMs) {
                    mob.frozenUntil = now + skill.freezeMs;
                }
                else if (skill.stunChance && Math.random() < skill.stunChance) {
                    mob.frozenUntil = now + 1500;
                }
            }
        }
        this.sendVitals(ws, player);
    }
    killMonster(killer, mob) {
        const drops = this.monsterManager.handleMobDeath(mob);
        this.broadcast({
            type: 'MOB_DIED',
            mobId: mob.id,
            mobType: mob.type,
            mobName: mob.name,
            killerId: killer.id,
            drops
        });
        this.awardExp(killer, mob.exp, mob.jobExp);
        this.creditQuestKill(killer, mob.type);
    }
    // ===========================================================================
    // Quests
    // ===========================================================================
    creditQuestKill(player, mobType) {
        const now = Date.now();
        if (!player.questProgress)
            player.questProgress = {};
        let changed = false;
        for (const def of QUEST_DB) {
            if (!def.targets.includes(mobType))
                continue;
            const state = getQuestState(def, player.questProgress[def.id], now);
            if (state.claimed || state.completed)
                continue;
            // Daily reset: start a fresh record
            player.questProgress[def.id] = { kills: state.kills + 1 };
            changed = true;
        }
        if (changed) {
            const ws = this.getSocket(player);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'QUEST_PROGRESS', questProgress: player.questProgress }));
            }
        }
    }
    handleClaimQuest(ws, player, questId) {
        const def = QUEST_DB.find(q => q.id === questId);
        if (!def || player.isDead)
            return;
        if (!player.questProgress)
            player.questProgress = {};
        const state = getQuestState(def, player.questProgress[def.id]);
        if (!state.completed || state.claimed) {
            this.sendChat(ws, 'system', '❌ ภารกิจนี้ยังไม่สำเร็จหรือรับรางวัลไปแล้ว');
            return;
        }
        player.questProgress[def.id] = { kills: def.requiredKills, claimedAt: Date.now() };
        player.zeny += def.rewardZeny;
        for (const reward of def.rewardItems) {
            const item = makeItem(reward.defId, reward.qty);
            if (item)
                this.addItemToInventory(player, item);
        }
        this.sendSystemChat(`🏆 [ภารกิจสำเร็จ] ${player.name} พิชิตภารกิจ [${def.title}] สำเร็จ!`);
        ws.send(JSON.stringify({
            type: 'QUEST_CLAIMED',
            questId: def.id,
            rewardExp: def.rewardExp,
            rewardJobExp: def.rewardJobExp,
            rewardZeny: def.rewardZeny
        }));
        ws.send(JSON.stringify({ type: 'QUEST_PROGRESS', questProgress: player.questProgress }));
        this.awardExp(player, def.rewardExp, def.rewardJobExp);
    }
    /** Resolve monster swings produced by the AI this tick */
    resolveMonsterAttacks(attacks, now) {
        if (attacks.length === 0)
            return;
        const byId = new Map();
        this.clients.forEach((p, clientWs) => byId.set(p.id, [clientWs, p]));
        for (const atk of attacks) {
            const mob = this.monsterManager.monsters.get(atk.mobId);
            const entry = byId.get(atk.playerId);
            if (!mob || mob.isDead || !entry)
                continue;
            const [clientWs, player] = entry;
            if (player.isDead)
                continue;
            const derived = computeDerived(player, now);
            // Ragnarok-style hit rate: 80% + mob hit - player flee, clamped 20..100
            const hitRate = Math.max(20, Math.min(100, 80 + (mob.level + 25) - derived.flee));
            const isMiss = Math.random() * 100 >= hitRate;
            let damage = 0;
            if (!isMiss && !player.isGodMode) {
                damage = Math.max(1, Math.floor(mob.atk * (0.85 + Math.random() * 0.3) - derived.def * 0.6));
                player.hp = Math.max(0, player.hp - damage);
            }
            player.lastCombatAt = now;
            this.broadcast({
                type: 'PLAYER_HIT',
                playerId: player.id,
                mobId: mob.id,
                damage,
                isMiss,
                hp: player.hp,
                maxHp: player.maxHp
            });
            if (player.hp <= 0) {
                this.killPlayer(clientWs, player, mob);
            }
        }
    }
    killPlayer(ws, player, killer) {
        player.isDead = true;
        player.anim = 'dead';
        player.hp = 0;
        // Monsters stop chasing the corpse
        this.monsterManager.monsters.forEach(m => {
            if (m.targetPlayerId === player.id)
                m.targetPlayerId = undefined;
        });
        // Ragnarok death penalty: lose 1% of the level's EXP from Base Lv.10 on
        let expLost = 0;
        if (player.baseLevel >= 10) {
            expLost = Math.min(player.baseExp, Math.floor(player.maxBaseExp * 0.01));
            player.baseExp -= expLost;
        }
        this.broadcast({ type: 'PLAYER_DIED', id: player.id, killerName: killer.name, expLost });
        this.sendChat(ws, 'system', `💀 คุณถูก [${killer.name}] สังหาร!${expLost > 0 ? ` (เสีย ${expLost.toLocaleString()} EXP)` : ''}`);
        this.persistPlayer(player);
    }
    handleRespawn(ws, player) {
        if (!player.isDead)
            return;
        player.isDead = false;
        player.anim = 'idle';
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.5));
        player.mp = Math.max(player.mp, Math.floor(player.maxMp * 0.3));
        player.y = 560;
        player.vx = 0;
        player.vy = 0;
        player.currentZone = 'solaria_meadows';
        this.sendPosCorrection(ws, player, TOWN_RESPAWN.x, TOWN_RESPAWN.z);
        this.lastPosSyncAt.set(player.id, Date.now());
        this.persistPlayer(player);
        ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player }));
        this.broadcast({ type: 'PLAYER_RESPAWNED', id: player.id });
        this.sendChat(ws, 'system', '🕊️ คุณฟื้นคืนชีพที่จัตุรัสเมือง Solaria');
    }
    // ===========================================================================
    // Inventory helpers
    // ===========================================================================
    /** Stack consumables/etc by item definition (or name for legacy drops) */
    addItemToInventory(player, item) {
        if (item.type !== 'equip') {
            const existing = player.inventory.find(i => i.type === item.type && (item.defId ? i.defId === item.defId || i.name === item.name : i.name === item.name));
            if (existing) {
                existing.quantity += item.quantity;
                // Legacy stacks (pre item-database) adopt the database definition
                if (!existing.defId && item.defId) {
                    existing.defId = item.defId;
                    existing.effect = item.effect;
                    existing.description = item.description;
                    existing.rarity = item.rarity;
                }
                return;
            }
        }
        player.inventory.push(item);
    }
    collectDrop(ws, player, drop) {
        if (drop.type === 'zeny') {
            player.zeny += drop.amount;
            this.sendChat(ws, 'system', `💰 ได้รับ ${drop.amount} Zeny!`);
        }
        else if (drop.itemData) {
            const dbDef = drop.itemData.id ? ITEM_DB[drop.itemData.id] : undefined;
            const item = dbDef
                ? makeItem(dbDef.id, drop.itemData.quantity || 1)
                : {
                    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    name: drop.name,
                    type: drop.itemData.type || 'etc',
                    icon: drop.icon,
                    quantity: drop.itemData.quantity || 1,
                    slot: drop.itemData.slot,
                    cardSlots: drop.itemData.cardSlots,
                    weaponType: drop.itemData.slot === 'weapon' ? inferWeaponType(drop.itemData) : undefined,
                    rarity: drop.itemData.type === 'equip' ? 'legendary' : undefined,
                    description: drop.itemData.description || '',
                    effect: drop.itemData.effect
                };
            this.addItemToInventory(player, item);
            this.sendChat(ws, 'system', `✨ ได้รับไอเทม [${drop.name}]!`);
        }
        this.monsterManager.removeDrop(drop.id);
        this.broadcast({ type: 'DROP_REMOVED', dropId: drop.id, pickerId: player.id });
    }
    handleEquip(ws, player, itemId) {
        if (player.isDead)
            return;
        const idx = player.inventory.findIndex(i => i.id === itemId);
        if (idx === -1)
            return;
        const item = player.inventory[idx];
        const blocker = getEquipBlocker(item, player.job, player.baseLevel);
        if (blocker) {
            this.sendChat(ws, 'system', `❌ สวมใส่ [${item.name}] ไม่ได้: ${blocker}`);
            return;
        }
        const slot = item.slot;
        if (slot === 'weapon' && !item.weaponType)
            item.weaponType = inferWeaponType(item);
        const previous = player.equipped[slot];
        player.inventory.splice(idx, 1);
        if (previous)
            player.inventory.push(previous);
        player.equipped[slot] = item;
        this.recalculatePlayerStats(player);
        this.persistPlayer(player);
        ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player }));
        this.sendChat(ws, 'system', `🛡️ สวมใส่ [${item.name}]${previous ? ` แทน [${previous.name}]` : ''}`);
    }
    handleUnequip(ws, player, slot) {
        if (player.isDead)
            return;
        const validSlots = ['weapon', 'head', 'armor', 'shoes', 'accessory'];
        const s = validSlots.find(v => v === slot);
        if (!s)
            return;
        const item = player.equipped[s];
        if (!item)
            return;
        delete player.equipped[s];
        player.inventory.push(item);
        this.recalculatePlayerStats(player);
        this.persistPlayer(player);
        ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player }));
        this.sendChat(ws, 'system', `📦 ถอด [${item.name}] เก็บเข้ากระเป๋า`);
    }
    // ===========================================================================
    // NPCs & Shops
    // ===========================================================================
    isNearNpc(player, npcX3d, npcZ3d) {
        // NPCs only exist in the 3D town
        if (player.viewMode !== '3d')
            return false;
        return Math.hypot(player.x - fromWorld3DX(npcX3d), (player.z || 0) - fromWorld3DZ(npcZ3d)) <= NPC_INTERACT_RANGE;
    }
    handleNpcAction(ws, player, npcId, action, param) {
        const npc = getNpcDef(npcId);
        if (!npc || player.isDead)
            return;
        const option = npc.options.find(o => o.action === action && (o.param || '') === (param || ''));
        if (!option || !SERVER_NPC_ACTIONS.includes(action))
            return;
        if (!this.isNearNpc(player, npc.x, npc.z)) {
            this.sendChat(ws, 'system', `🚶 เดินเข้าไปใกล้ [${npc.name}] อีกนิด`);
            return;
        }
        if (!player.flags)
            player.flags = {};
        const now = Date.now();
        switch (action) {
            case 'STARTER_GIFT': {
                if (player.flags.starter_gift) {
                    this.sendChat(ws, 'system', `📜 [${npc.name}] ข้าอวยพรเจ้าไปแล้ว จงออกเดินทางเถิด!`);
                    return;
                }
                player.flags.starter_gift = true;
                this.sendChat(ws, 'system', `🎁 [${npc.name}] มอบพรเริ่มต้นการเดินทาง +500 Base EXP, +300 Job EXP!`);
                this.awardExp(player, 500, 300);
                break;
            }
            case 'HEAL_FULL': {
                player.hp = player.maxHp;
                player.mp = player.maxMp;
                this.broadcast({ type: 'PLAYER_HEALED', id: player.id, amount: player.maxHp, hp: player.hp, maxHp: player.maxHp });
                this.sendVitals(ws, player);
                this.sendChat(ws, 'system', `💖 [${npc.name}] ฟื้นฟู HP/MP ของท่านเต็ม 100% แล้ว`);
                break;
            }
            case 'BLESSING': {
                player.blessingUntil = now + 180000;
                this.sendChat(ws, 'system', `🌟 [${npc.name}] ประทานพรศักดิ์สิทธิ์ ATK/DEF/MATK +10% เป็นเวลา 3 นาที!`);
                ws.send(JSON.stringify({ type: 'BUFF', buff: 'blessing', until: player.blessingUntil }));
                break;
            }
            case 'FREE_POTIONS': {
                if (player.flags.free_potions) {
                    this.sendChat(ws, 'system', `🎒 [${npc.name}] ป้าให้ชุดเดินทางไปแล้วนะจ๊ะ ถ้าต้องการเพิ่มซื้อได้เลย!`);
                    return;
                }
                player.flags.free_potions = true;
                this.addItemToInventory(player, makeItem('red_potion', 10));
                this.addItemToInventory(player, makeItem('blue_potion', 5));
                this.sendChat(ws, 'system', `🧪 [${npc.name}] มอบ Red Potion x10 และ Blue Potion x5 ให้ท่านแล้ว!`);
                break;
            }
            case 'WARP': {
                const zone = ZONES_CONFIG.find(z => z.id === param);
                if (!zone)
                    return;
                const cost = WARP_COSTS[zone.id] || 0;
                if (player.zeny < cost) {
                    this.sendChat(ws, 'system', `❌ Zeny ไม่พอ (ต้องใช้ ${cost.toLocaleString()} Z)`);
                    return;
                }
                player.zeny -= cost;
                player.currentZone = zone.id;
                player.y = zone.spawnPoint.y;
                this.sendPosCorrection(ws, player, zone.spawnPoint.x, 0);
                this.lastPosSyncAt.set(player.id, now);
                ws.send(JSON.stringify({ type: 'ZONE_CHANGED', zoneId: zone.id, zoneName: zone.name, thaiName: zone.thaiName, x: player.x, y: player.y, z: 0 }));
                this.sendChat(ws, 'system', `🌀 วาร์ปไปยัง [${zone.thaiName}] (${zone.levelRange})${cost > 0 ? ` -${cost.toLocaleString()} Z` : ''}`);
                break;
            }
        }
        this.persistPlayer(player);
        ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player }));
    }
    /** Merchants get Discount/Overcharge like in Ragnarok */
    priceModifier(player, selling) {
        if (player.job !== 'Merchant')
            return 1;
        return selling ? 1.1 : 0.9;
    }
    handleShopBuy(ws, player, npcId, shopId, itemId, qtyRaw) {
        const npc = getNpcDef(npcId);
        const shop = SHOPS[shopId];
        const def = ITEM_DB[itemId];
        const sendResult = (ok, message) => ws.send(JSON.stringify({ type: 'SHOP_RESULT', ok, message }));
        if (!npc || !shop || !def || player.isDead)
            return;
        if (!npc.options.some(o => o.action === 'OPEN_SHOP' && o.param === shopId) || !shop.items.includes(itemId))
            return;
        if (!this.isNearNpc(player, npc.x, npc.z)) {
            sendResult(false, `เดินเข้าไปใกล้ ${npc.name} อีกนิด`);
            return;
        }
        const maxQty = def.type === 'equip' ? 5 : 99;
        const qty = Math.max(1, Math.min(maxQty, Math.floor(qtyRaw) || 1));
        const unitPrice = Math.ceil(def.price * this.priceModifier(player, false));
        const total = unitPrice * qty;
        if (player.zeny < total) {
            sendResult(false, `Zeny ไม่พอ (ต้องใช้ ${total.toLocaleString()} Z)`);
            return;
        }
        player.zeny -= total;
        if (def.type === 'equip') {
            for (let i = 0; i < qty; i++)
                this.addItemToInventory(player, makeItem(itemId, 1));
        }
        else {
            this.addItemToInventory(player, makeItem(itemId, qty));
        }
        this.persistPlayer(player);
        ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player }));
        sendResult(true, `ซื้อ ${def.name} x${qty} (-${total.toLocaleString()} Z)`);
    }
    handleShopSell(ws, player, npcId, invItemId, qtyRaw) {
        const npc = getNpcDef(npcId);
        const sendResult = (ok, message) => ws.send(JSON.stringify({ type: 'SHOP_RESULT', ok, message }));
        if (!npc || player.isDead || !npc.options.some(o => o.action === 'OPEN_SHOP'))
            return;
        if (!this.isNearNpc(player, npc.x, npc.z)) {
            sendResult(false, `เดินเข้าไปใกล้ ${npc.name} อีกนิด`);
            return;
        }
        const idx = player.inventory.findIndex(i => i.id === invItemId);
        if (idx === -1)
            return;
        const item = player.inventory[idx];
        const qty = Math.max(1, Math.min(item.quantity, Math.floor(qtyRaw) || 1));
        const unit = Math.floor(getSellPrice(item) * this.priceModifier(player, true));
        const total = unit * qty;
        item.quantity -= qty;
        if (item.quantity <= 0)
            player.inventory.splice(idx, 1);
        player.zeny += total;
        this.persistPlayer(player);
        ws.send(JSON.stringify({ type: 'PLAYER_UPDATED', player }));
        sendResult(true, `ขาย ${item.name} x${qty} (+${total.toLocaleString()} Z)`);
    }
    handleUseItem(player, itemId) {
        const itemIndex = player.inventory.findIndex(i => i.id === itemId);
        if (itemIndex === -1)
            return;
        const item = player.inventory[itemIndex];
        if (player.isDead)
            return;
        if (item.type === 'usable' && item.effect) {
            if (item.effect.hp)
                player.hp = Math.min(player.maxHp, player.hp + item.effect.hp);
            if (item.effect.mp)
                player.mp = Math.min(player.maxMp, player.mp + item.effect.mp);
            item.quantity -= 1;
            if (item.quantity <= 0)
                player.inventory.splice(itemIndex, 1);
            this.persistPlayer(player);
            this.sendPlayerUpdate(player);
        }
    }
    awardExp(player, baseExp, jobExp) {
        player.baseExp += baseExp;
        player.jobExp += jobExp;
        let leveledUp = false;
        while (player.baseExp >= player.maxBaseExp) {
            player.baseExp -= player.maxBaseExp;
            player.baseLevel += 1;
            player.statPoints += 3;
            player.maxBaseExp = Math.floor(player.maxBaseExp * 1.4 + 20);
            leveledUp = true;
        }
        while (player.jobExp >= player.maxJobExp && player.jobLevel < 50) {
            player.jobExp -= player.maxJobExp;
            player.jobLevel += 1;
            player.skillPoints += 1;
            player.maxJobExp = Math.floor(player.maxJobExp * 1.35 + 15);
            leveledUp = true;
        }
        if (leveledUp) {
            this.recalculatePlayerStats(player);
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            this.sendSystemChat(`🌟 [LEVEL UP!] ${player.name} ก้าวสู่อันดับ Base Lv.${player.baseLevel} / Job Lv.${player.jobLevel}!`);
        }
        this.persistPlayer(player);
        this.sendPlayerUpdate(player, leveledUp);
    }
    recalculatePlayerStats(player) {
        if (player.isGodMode)
            return;
        const derived = computeDerived(player);
        player.maxHp = derived.maxHp;
        player.maxMp = derived.maxMp;
        player.hp = Math.min(player.hp, player.maxHp);
        player.mp = Math.min(player.mp, player.maxMp);
    }
    /**
     * Natural HP/MP regeneration every 3 seconds, faster out of combat
     */
    regenerate(now) {
        this.clients.forEach((p, clientWs) => {
            if (p.isDead)
                return;
            if (p.hp >= p.maxHp && p.mp >= p.maxMp)
                return;
            const derived = computeDerived(p, now);
            const resting = now - (p.lastCombatAt || 0) > OUT_OF_COMBAT_MS;
            const hpGain = Math.floor((p.maxHp * 0.02 + derived.totalStats.vit / 5) * (resting ? 1 : 0.25));
            const mpGain = Math.floor((p.maxMp * 0.015 + derived.totalStats.int / 6) * (resting ? 1 : 0.5)) + 1;
            p.hp = Math.min(p.maxHp, p.hp + Math.max(1, hpGain));
            p.mp = Math.min(p.maxMp, p.mp + mpGain);
            this.sendVitals(clientWs, p);
        });
    }
    /**
     * 30 Hz Authoritative Loop & Snapshot Broadcast
     */
    tick() {
        const now = Date.now();
        this.tickCount++;
        const players = Array.from(this.clients.values());
        const attacks = this.monsterManager.update(1 / 30, players, now);
        this.resolveMonsterAttacks(attacks, now);
        this.aiEngine.update(1 / 30);
        if (this.tickCount % 90 === 0) {
            this.regenerate(now);
        }
        // Prepare general entity states
        const playersList = players.map(p => ({
            id: p.id,
            name: p.name,
            job: p.job,
            baseLevel: p.baseLevel,
            isGm: Boolean(p.isGm || p.role === 'admin' || p.role === 'gm'),
            x: Math.round(p.x),
            y: Math.round(p.y),
            z: Math.round(p.z || 0),
            rotY: Math.round((p.rotY || 0) * 100) / 100,
            vx: Math.round(p.vx),
            vy: Math.round(p.vy),
            facing: p.facing,
            anim: p.isDead ? 'dead' : p.anim,
            hp: p.hp,
            maxHp: p.maxHp,
            gender: p.gender,
            hairColor: p.hairColor,
            weaponType: p.equipped.weapon ? inferWeaponType(p.equipped.weapon) : undefined,
            weaponRefine: p.equipped.weapon?.refine || 0,
            weaponRarity: p.equipped.weapon?.rarity,
            weaponExcalibur: Boolean(p.equipped.weapon?.id.includes('excalibur')),
            isDead: Boolean(p.isDead)
        }));
        const monstersList = Array.from(this.monsterManager.monsters.values()).map(m => ({
            id: m.id,
            type: m.type,
            name: m.name,
            level: m.level,
            x: Math.round(m.x),
            y: Math.round(m.y),
            z: Math.round(m.z || 0),
            rotY: Math.round((m.rotY || 0) * 100) / 100,
            hp: m.hp,
            maxHp: m.maxHp,
            facing: m.facing,
            isDead: m.isDead,
            state: m.state,
            targetId: m.targetPlayerId,
            frozen: (m.frozenUntil || 0) > now
        }));
        // Broadcast Snapshot to each client with their last processed sequence number
        this.clients.forEach((player, ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                const snapshot = {
                    timestamp: now,
                    lastAckSeq: player.lastProcessedSeq,
                    x: Math.round(player.x),
                    y: Math.round(player.y),
                    z: Math.round(player.z || 0),
                    vx: Math.round(player.vx),
                    vy: Math.round(player.vy),
                    isGrounded: player.isGrounded,
                    facing: player.facing,
                    anim: player.anim,
                    players: playersList.filter(p => p.id !== player.id),
                    monsters: monstersList
                };
                ws.send(JSON.stringify({
                    type: 'SNAPSHOT',
                    snapshot
                }));
            }
        });
    }
    broadcast(data, exceptWs) {
        const msg = JSON.stringify(data);
        this.clients.forEach((_, ws) => {
            if (ws !== exceptWs && ws.readyState === WebSocket.OPEN) {
                ws.send(msg);
            }
        });
    }
    sendChat(ws, channel, text) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'CHAT',
                chat: {
                    sender: '[ระบบ]',
                    text,
                    channel,
                    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                }
            }));
        }
    }
    sendSystemChat(text) {
        this.broadcast({
            type: 'CHAT',
            chat: {
                sender: '📢 ประกาศเซิร์ฟเวอร์',
                text,
                channel: 'system',
                time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
            }
        });
    }
}
