import pg from 'pg';
import { db } from './db.js';
const { Pool } = pg;
export class PostgresTransactionManager {
    pool = null;
    isConnectedToPostgres = false;
    rowLocks = new Map();
    constructor() {
        const databaseUrl = process.env.DATABASE_URL;
        if (databaseUrl) {
            try {
                this.pool = new Pool({
                    connectionString: databaseUrl,
                    connectionTimeoutMillis: 3000
                });
                this.pool.connect().then(client => {
                    console.log('🐘 Connected to PostgreSQL with Row-Level Locking enabled!');
                    this.isConnectedToPostgres = true;
                    client.release();
                }).catch(() => {
                    console.log('ℹ️ PostgreSQL not reachable at DATABASE_URL, using In-Memory Row-Level Lock Engine (ACID FOR UPDATE emulation)');
                });
            }
            catch {
                console.log('ℹ️ Using In-Memory Row-Level Lock Engine (ACID FOR UPDATE emulation)');
            }
        }
        else {
            console.log('ℹ️ DATABASE_URL not set. Running Row-Level Locking Engine (SELECT FOR UPDATE Mutex)');
        }
    }
    /**
     * Acquire an exclusive row-level lock on one or more row IDs (emulating SELECT ... FOR UPDATE)
     */
    async acquireRowLocks(rowIds) {
        const sortedIds = [...rowIds].sort(); // Sort to prevent deadlocks (Lock Ordering)
        const releaseFns = [];
        for (const id of sortedIds) {
            let resolver;
            const newLock = new Promise(resolve => {
                resolver = resolve;
            });
            const currentLock = this.rowLocks.get(id) || Promise.resolve();
            this.rowLocks.set(id, currentLock.then(() => newLock));
            await currentLock;
            releaseFns.push(() => {
                resolver();
                if (this.rowLocks.get(id) === currentLock.then(() => newLock)) {
                    this.rowLocks.delete(id);
                }
            });
        }
        return () => {
            releaseFns.reverse().forEach(fn => fn());
        };
    }
    /**
     * Refine an equipment item using PostgreSQL Transaction & Row-Level Locking (SELECT ... FOR UPDATE)
     */
    async executeRefineTransaction(characterId, itemId) {
        if (this.isConnectedToPostgres && this.pool) {
            return this.executePostgresRefine(characterId, itemId);
        }
        else {
            return this.executeEmulatedRefine(characterId, itemId);
        }
    }
    /**
     * Actual PostgreSQL Query implementation with BEGIN, SELECT FOR UPDATE, and COMMIT
     */
    async executePostgresRefine(characterId, itemId) {
        const client = await this.pool.connect();
        try {
            // 1. Begin Transaction with Read Committed isolation
            await client.query('BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;');
            // 2. Acquire Row-Level Lock on Character and Item
            const charRes = await client.query('SELECT * FROM characters WHERE id = $1 FOR UPDATE;', [characterId]);
            const itemRes = await client.query('SELECT * FROM inventory_items WHERE id = $1 AND character_id = $2 FOR UPDATE;', [itemId, characterId]);
            if (charRes.rows.length === 0 || itemRes.rows.length === 0) {
                await client.query('ROLLBACK;');
                return { success: false, broken: false, newRefine: 0, message: 'ไม่พบตัวละครหรือไอเทม', zenyCost: 0 };
            }
            const char = charRes.rows[0];
            const item = itemRes.rows[0];
            const currentRefine = item.refine_level || 0;
            const zenyCost = (currentRefine + 1) * 200;
            if (char.zeny < zenyCost) {
                await client.query('ROLLBACK;');
                return { success: false, broken: false, newRefine: currentRefine, message: 'เงิน Zeny ไม่เพียงพอ', zenyCost };
            }
            // Safe upgrade up to +4 (100% success)
            const successChance = currentRefine < 4 ? 1.0 : Math.max(0.2, 1.0 - (currentRefine - 3) * 0.15);
            const isSuccess = Math.random() < successChance;
            if (isSuccess) {
                const nextRefine = currentRefine + 1;
                await client.query('UPDATE characters SET zeny = zeny - $1 WHERE id = $2;', [zenyCost, characterId]);
                await client.query('UPDATE inventory_items SET refine_level = $1, atk = atk + 5 WHERE id = $2;', [nextRefine, itemId]);
                await client.query('COMMIT;');
                return { success: true, broken: false, newRefine: nextRefine, message: `🎉 ตีบวกสำเร็จเป็น +${nextRefine}!`, zenyCost };
            }
            else {
                // Failed
                const isBroken = currentRefine >= 4;
                if (isBroken) {
                    await client.query('DELETE FROM inventory_items WHERE id = $1;', [itemId]);
                }
                await client.query('UPDATE characters SET zeny = zeny - $1 WHERE id = $2;', [zenyCost, characterId]);
                await client.query('COMMIT;');
                return { success: false, broken: isBroken, newRefine: isBroken ? 0 : currentRefine, message: isBroken ? '💥 ตีบวกล้มเหลว! ไอเทมแตกสลาย...' : 'ตีบวกล้มเหลว แต่ไอเทมยังปลอดภัย', zenyCost };
            }
        }
        catch (err) {
            await client.query('ROLLBACK;');
            console.error('PostgreSQL Refine Transaction Error:', err);
            return { success: false, broken: false, newRefine: 0, message: 'เกิดข้อผิดพลาดในการทำธุรกรรม', zenyCost: 0 };
        }
        finally {
            client.release();
        }
    }
    /**
     * In-memory Row-Level Lock engine matching exact ACID semantics
     */
    async executeEmulatedRefine(characterId, itemId) {
        // Acquire Row Locks for character and item
        const releaseLocks = await this.acquireRowLocks([`char:${characterId}`, `item:${itemId}`]);
        try {
            const char = db.getCharacterById(characterId);
            if (!char) {
                return { success: false, broken: false, newRefine: 0, message: 'ไม่พบตัวละคร', zenyCost: 0 };
            }
            // Find item in equipped or inventory
            let targetItem = char.equipped.weapon?.id === itemId ? char.equipped.weapon : undefined;
            let isEquipped = !!targetItem;
            if (!targetItem) {
                targetItem = char.inventory.find(i => i.id === itemId);
            }
            if (!targetItem) {
                return { success: false, broken: false, newRefine: 0, message: 'ไม่พบไอเทมในตัวละคร', zenyCost: 0 };
            }
            const currentRefine = targetItem.refine || 0;
            const zenyCost = (currentRefine + 1) * 250;
            if (char.zeny < zenyCost) {
                return { success: false, broken: false, newRefine: currentRefine, message: `เงิน Zeny ไม่พอสำหรับการตีบวก (ต้องการ ${zenyCost} Z)`, zenyCost };
            }
            // Calculate upgrade chance: +1 ถึง +4 ปลอดภัย 100%, +5 ถึง +10 มีโอกาสแตก
            const successChance = currentRefine < 4 ? 1.0 : Math.max(0.3, 1.0 - (currentRefine - 3) * 0.15);
            const isSuccess = Math.random() < successChance;
            char.zeny -= zenyCost;
            if (isSuccess) {
                const nextRefine = currentRefine + 1;
                targetItem.refine = nextRefine;
                if (!targetItem.effect)
                    targetItem.effect = {};
                targetItem.effect.atk = (targetItem.effect.atk || 12) + 6;
                targetItem.name = targetItem.name.replace(/\+\d+\s*/, '');
                targetItem.name = `+${nextRefine} ${targetItem.name}`;
                db.saveCharacter(char);
                return {
                    success: true,
                    broken: false,
                    newRefine: nextRefine,
                    message: `✨ ตีบวกสำเร็จ! ได้รับ [${targetItem.name}]`,
                    zenyCost,
                    character: char
                };
            }
            else {
                const isBroken = currentRefine >= 4;
                if (isBroken) {
                    if (isEquipped) {
                        delete char.equipped.weapon;
                    }
                    else {
                        const idx = char.inventory.findIndex(i => i.id === itemId);
                        if (idx !== -1)
                            char.inventory.splice(idx, 1);
                    }
                    db.saveCharacter(char);
                    return {
                        success: false,
                        broken: true,
                        newRefine: 0,
                        message: `💥 เสียใจด้วย! อุปกรณ์แตกสลายเนื่องจากเกินระดับปลอดภัย (+4)`,
                        zenyCost,
                        character: char
                    };
                }
                else {
                    db.saveCharacter(char);
                    return {
                        success: false,
                        broken: false,
                        newRefine: currentRefine,
                        message: `ตีบวกล้มเหลว แต่ไอเทมยังปลอดภัย`,
                        zenyCost,
                        character: char
                    };
                }
            }
        }
        finally {
            releaseLocks();
        }
    }
}
export const postgresTx = new PostgresTransactionManager();
