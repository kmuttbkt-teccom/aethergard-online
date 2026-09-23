import { getMonsterAiProfile, isBossMonster, WORLD_MAX_Z } from './GameData.js';
/**
 * Distance used for all combat checks. Players in the 3D view move on the x/z
 * plane; players still in the 2D side-scroller only have x/y.
 */
export function combatDistance(player, target) {
    if (player.viewMode === '3d') {
        return Math.hypot(player.x - target.x, (player.z || 0) - (target.z || 0));
    }
    return Math.abs(player.x - target.x) + Math.max(0, Math.abs(player.y - target.y) - 130) * 2;
}
/** Monsters give up the chase beyond this distance from their patrol area */
const LEASH_DISTANCE = 700;
export const ZONES_CONFIG = [
    {
        id: 'solaria_meadows',
        name: 'Solaria Meadows',
        thaiName: 'ทุ่งหญ้าสุริยะหน้าเมือง',
        levelRange: 'Lv. 1 - 15',
        description: 'ทุ่งหญ้าเขียวขจี อุดมสมบูรณ์ เหมาะสำหรับนักผจญภัยเริ่มต้นฝึกฝนและเก็บเลเวล',
        startX: 0,
        endX: 2400,
        spawnPoint: { x: 250, y: 560 },
        monsters: ['Sunbun', 'Poring', 'Leafkin', 'Fabre', 'Spore'],
        themeColor: '#ffd166'
    },
    {
        id: 'aetherwoods',
        name: 'Whispering Aetherwoods',
        thaiName: 'ป่าดึกดำบรรพ์มนตรา',
        levelRange: 'Lv. 15 - 35',
        description: 'ป่าโบราณที่ปกคลุมด้วยไอเวทมนตร์สีม่วงคราม มีสัตว์ป่าและเห็ดมนตราดุร้าย',
        startX: 2400,
        endX: 4800,
        spawnPoint: { x: 2600, y: 560 },
        monsters: ['Aethercap', 'Gryphlet', 'PecoPeco', 'ForestBoar', 'WildWolf'],
        themeColor: '#7209b7'
    },
    {
        id: 'mirage_dunes',
        name: 'Mirage Dunes & Ant Hell',
        thaiName: 'ทะเลทรายมรณะและถ้ำมด',
        levelRange: 'Lv. 35 - 55',
        description: 'ผืนทรายร้อนระอุและถ้ำโบราณใต้ดิน ถิ่นอาศัยของแมงป่องพิษและโกเลมหินทราย',
        startX: 4800,
        endX: 7200,
        spawnPoint: { x: 5000, y: 560 },
        monsters: ['DesertScorpion', 'SandGolem', 'MummyPharaoh', 'RedDemon'],
        themeColor: '#f77f00'
    },
    {
        id: 'catacombs',
        name: 'Cursed Catacombs',
        thaiName: 'สุสานใต้ดินและปราสาทร้าง',
        levelRange: 'Lv. 55 - 75',
        description: 'ซากปราสาทมืดและสุสานโบราณ เต็มไปด้วยโครงกระดูกและวิญญาณแค้น',
        startX: 7200,
        endX: 9600,
        spawnPoint: { x: 7400, y: 560 },
        monsters: ['SkeletonSoldier', 'WraithPhantom', 'DarkGargoyle'],
        themeColor: '#4a4e69'
    },
    {
        id: 'magma_core',
        name: 'Magma Core & Volcano',
        thaiName: 'ภูเขาไฟลาวาใต้พิภพ',
        levelRange: 'Lv. 75 - 90',
        description: 'ธารลาวาเดือดและหินหลอมเหลว ดินแดนร้อนระอุของซาลาแมนเดอร์เพลิงและโกเลมลาวา',
        startX: 9600,
        endX: 12000,
        spawnPoint: { x: 9800, y: 560 },
        monsters: ['FireSalamander', 'LavaGolem', 'NightmareSteed'],
        themeColor: '#d62828'
    },
    {
        id: 'celestial_void',
        name: 'Celestial Void & Eclipse Sanctuary',
        thaiName: 'แดนสุริยคราสและนภากาศักดิ์สิทธิ์',
        levelRange: 'Lv. 90 - 99+ [MVP]',
        description: 'เขตแดนรอยต่อมิติแห่งดวงดาว ถิ่นพำนักของเทวทูต และบอสระดับมหากาพย์ MVP',
        startX: 12000,
        endX: 14400,
        spawnPoint: { x: 12200, y: 560 },
        monsters: ['Archangel', 'BaphometJr', 'Solarion', 'LordBaphomet', 'Valkyrie'],
        themeColor: '#00b4d8'
    }
];
export class MonsterManager {
    monsters = new Map();
    drops = new Map();
    nextMobId = 1;
    nextDropId = 1;
    constructor() {
        this.initMonsters();
    }
    initMonsters() {
        const spawns = [
            // ===== ZONE 1: SOLARIA MEADOWS (0 - 2400) Lv 1 - 15 =====
            { type: 'Sunbun', name: 'Sunbun', x: 280, y: 560, minX: 100, maxX: 600 },
            { type: 'Poring', name: 'Poring', x: 520, y: 560, minX: 300, maxX: 800 },
            { type: 'Leafkin', name: 'Leafkin', x: 780, y: 440, minX: 550, maxX: 1100 },
            { type: 'Fabre', name: 'Fabre', x: 1100, y: 560, minX: 850, maxX: 1400 },
            { type: 'Sunbun', name: 'Sunbun', x: 1350, y: 560, minX: 1100, maxX: 1650 },
            { type: 'Spore', name: 'Spore Mushroom', x: 1700, y: 560, minX: 1450, maxX: 2000 },
            { type: 'Leafkin', name: 'Leafkin', x: 2050, y: 440, minX: 1800, maxX: 2350 },
            // ===== ZONE 2: WHISPERING AETHERWOODS (2400 - 4800) Lv 15 - 35 =====
            { type: 'Aethercap', name: 'Aethercap', x: 2650, y: 560, minX: 2450, maxX: 2950 },
            { type: 'Gryphlet', name: 'Gryphlet', x: 3000, y: 560, minX: 2800, maxX: 3300 },
            { type: 'PecoPeco', name: 'Peco Peco', x: 3350, y: 560, minX: 3100, maxX: 3650 },
            { type: 'ForestBoar', name: 'Forest Boar', x: 3750, y: 560, minX: 3500, maxX: 4100 },
            { type: 'WildWolf', name: 'Wild Wolf', x: 4200, y: 560, minX: 3950, maxX: 4500 },
            { type: 'Aethercap', name: 'Aethercap', x: 4550, y: 560, minX: 4300, maxX: 4750 },
            // ===== ZONE 3: MIRAGE DUNES & ANT HELL (4800 - 7200) Lv 35 - 55 =====
            { type: 'DesertScorpion', name: 'Desert Scorpion', x: 5050, y: 560, minX: 4850, maxX: 5400 },
            { type: 'SandGolem', name: 'Sand Golem', x: 5500, y: 560, minX: 5250, maxX: 5850 },
            { type: 'MummyPharaoh', name: 'Mummy Pharaoh', x: 6050, y: 560, minX: 5750, maxX: 6400 },
            { type: 'RedDemon', name: 'Red Horned Demon', x: 6550, y: 560, minX: 6250, maxX: 6900 },
            { type: 'DesertScorpion', name: 'Desert Scorpion', x: 6950, y: 560, minX: 6650, maxX: 7150 },
            // ===== ZONE 4: CURSED CATACOMBS (7200 - 9600) Lv 55 - 75 =====
            { type: 'SkeletonSoldier', name: 'Skeleton Soldier', x: 7450, y: 560, minX: 7250, maxX: 7800 },
            { type: 'WraithPhantom', name: 'Wraith Phantom', x: 7950, y: 440, minX: 7700, maxX: 8350 },
            { type: 'DarkGargoyle', name: 'Dark Gargoyle', x: 8450, y: 440, minX: 8200, maxX: 8850 },
            { type: 'SkeletonSoldier', name: 'Skeleton Soldier', x: 8950, y: 560, minX: 8700, maxX: 9350 },
            { type: 'WraithPhantom', name: 'Wraith Phantom', x: 9350, y: 440, minX: 9100, maxX: 9550 },
            // ===== ZONE 5: MAGMA CORE & VOLCANO (9600 - 12000) Lv 75 - 90 =====
            { type: 'FireSalamander', name: 'Fire Salamander', x: 9850, y: 560, minX: 9650, maxX: 10250 },
            { type: 'LavaGolem', name: 'Lava Golem', x: 10400, y: 560, minX: 10150, maxX: 10750 },
            { type: 'NightmareSteed', name: 'Nightmare Steed', x: 11000, y: 560, minX: 10750, maxX: 11350 },
            { type: 'FireSalamander', name: 'Fire Salamander', x: 11500, y: 560, minX: 11250, maxX: 11850 },
            { type: 'LavaGolem', name: 'Lava Golem', x: 11800, y: 560, minX: 11550, maxX: 11950 },
            // ===== ZONE 6: CELESTIAL VOID & MVPs (12000 - 14400) Lv 90 - 99+ =====
            { type: 'Archangel', name: 'Celestial Archangel', x: 12250, y: 440, minX: 12050, maxX: 12650 },
            { type: 'BaphometJr', name: 'Baphomet Jr. [Mini-Boss]', x: 12750, y: 560, minX: 12500, maxX: 13150 },
            { type: 'Solarion', name: 'Solarion, The Eclipse Lord [MVP BOSS]', x: 13350, y: 560, minX: 13050, maxX: 13650 },
            { type: 'LordBaphomet', name: 'Lord Baphomet [MVP WORLD BOSS]', x: 13800, y: 560, minX: 13550, maxX: 14100 },
            { type: 'Valkyrie', name: 'Valkyrie Randgris [GODDESS MVP]', x: 14200, y: 440, minX: 13950, maxX: 14350 }
        ];
        for (const spawn of spawns) {
            this.spawnMonster(spawn.type, spawn.name, spawn.x, spawn.y, spawn.minX, spawn.maxX);
        }
    }
    spawnMonster(type, name, x, y, minX, maxX) {
        const id = `mob_${this.nextMobId++}`;
        let hp = 70;
        let level = 1;
        let exp = 18;
        let jobExp = 14;
        let atk = 10;
        let def = 2;
        switch (type) {
            // Zone 1
            case 'Sunbun':
                hp = 70;
                level = 2;
                exp = 22;
                jobExp = 18;
                atk = 9;
                def = 1;
                break;
            case 'Poring':
                hp = 85;
                level = 3;
                exp = 28;
                jobExp = 22;
                atk = 11;
                def = 2;
                break;
            case 'Leafkin':
                hp = 130;
                level = 6;
                exp = 55;
                jobExp = 45;
                atk = 16;
                def = 4;
                break;
            case 'Fabre':
                hp = 160;
                level = 8;
                exp = 75;
                jobExp = 60;
                atk = 22;
                def = 5;
                break;
            case 'Spore':
                hp = 240;
                level = 12;
                exp = 125;
                jobExp = 100;
                atk = 32;
                def = 8;
                break;
            // Zone 2
            case 'Aethercap':
                hp = 420;
                level = 18;
                exp = 220;
                jobExp = 180;
                atk = 48;
                def = 12;
                break;
            case 'Gryphlet':
                hp = 650;
                level = 24;
                exp = 380;
                jobExp = 310;
                atk = 68;
                def = 18;
                break;
            case 'PecoPeco':
                hp = 820;
                level = 27;
                exp = 490;
                jobExp = 400;
                atk = 80;
                def = 22;
                break;
            case 'ForestBoar':
                hp = 1050;
                level = 30;
                exp = 680;
                jobExp = 550;
                atk = 96;
                def = 28;
                break;
            case 'WildWolf':
                hp = 1300;
                level = 34;
                exp = 890;
                jobExp = 720;
                atk = 118;
                def = 32;
                break;
            // Zone 3
            case 'DesertScorpion':
                hp = 1750;
                level = 38;
                exp = 1250;
                jobExp = 1000;
                atk = 142;
                def = 40;
                break;
            case 'SandGolem':
                hp = 2600;
                level = 45;
                exp = 1950;
                jobExp = 1600;
                atk = 175;
                def = 68;
                break;
            case 'MummyPharaoh':
                hp = 3400;
                level = 52;
                exp = 2800;
                jobExp = 2300;
                atk = 210;
                def = 52;
                break;
            case 'RedDemon':
                hp = 4200;
                level = 55;
                exp = 3600;
                jobExp = 3000;
                atk = 245;
                def = 60;
                break;
            // Zone 4
            case 'SkeletonSoldier':
                hp = 5200;
                level = 60;
                exp = 4600;
                jobExp = 3900;
                atk = 290;
                def = 75;
                break;
            case 'WraithPhantom':
                hp = 6400;
                level = 66;
                exp = 5800;
                jobExp = 4900;
                atk = 340;
                def = 85;
                break;
            case 'DarkGargoyle':
                hp = 7800;
                level = 72;
                exp = 7200;
                jobExp = 6100;
                atk = 395;
                def = 95;
                break;
            // Zone 5
            case 'FireSalamander':
                hp = 9500;
                level = 78;
                exp = 9200;
                jobExp = 7800;
                atk = 460;
                def = 110;
                break;
            case 'LavaGolem':
                hp = 12500;
                level = 84;
                exp = 12500;
                jobExp = 10500;
                atk = 540;
                def = 145;
                break;
            case 'NightmareSteed':
                hp = 15500;
                level = 88;
                exp = 16000;
                jobExp = 13500;
                atk = 620;
                def = 130;
                break;
            // Zone 6 & MVPs
            case 'Archangel':
                hp = 21000;
                level = 92;
                exp = 24000;
                jobExp = 20000;
                atk = 750;
                def = 160;
                break;
            case 'BaphometJr':
                hp = 32000;
                level = 95;
                exp = 38000;
                jobExp = 32000;
                atk = 920;
                def = 190;
                break;
            case 'Solarion':
                hp = 85000;
                level = 99;
                exp = 120000;
                jobExp = 100000;
                atk = 1450;
                def = 260;
                break;
            case 'LordBaphomet':
                hp = 120000;
                level = 99;
                exp = 180000;
                jobExp = 150000;
                atk = 1800;
                def = 300;
                break;
            case 'Valkyrie':
                hp = 160000;
                level = 99;
                exp = 250000;
                jobExp = 210000;
                atk = 2200;
                def = 340;
                break;
            // Pixel Slayer Saga Bosses & Dungeons
            case 'AncientPyroclastDragon':
                hp = 180000;
                level = 99;
                exp = 260000;
                jobExp = 220000;
                atk = 2100;
                def = 290;
                break;
            case 'DemonLordMalakor':
                hp = 250000;
                level = 99;
                exp = 350000;
                jobExp = 300000;
                atk = 2600;
                def = 360;
                break;
            case 'ColossalTitan':
                hp = 200000;
                level = 99;
                exp = 280000;
                jobExp = 240000;
                atk = 2300;
                def = 420;
                break;
            case 'TreasureMimic':
                hp = 9500;
                level = 30;
                exp = 20000;
                jobExp = 20000;
                atk = 240;
                def = 60;
                break;
            case 'BoneKnight':
                hp = 22000;
                level = 55;
                exp = 22000;
                jobExp = 18000;
                atk = 580;
                def = 160;
                break;
            case 'ShadowWyrmling':
                hp = 15000;
                level = 45;
                exp = 15000;
                jobExp = 12000;
                atk = 480;
                def = 110;
                break;
        }
        const profile = getMonsterAiProfile(type);
        const homeZ = isBossMonster(type) ? 0 : Math.round((Math.random() * 2 - 1) * WORLD_MAX_Z * 0.6);
        const mob = {
            id,
            type,
            name,
            x,
            y,
            z: homeZ,
            homeZ,
            rotY: 0,
            state: 'patrol',
            aggressive: profile.aggressive,
            moveSpeed: profile.moveSpeed,
            aggroRange: profile.aggroRange,
            attackRange: profile.attackRange,
            attackCooldownMs: profile.attackCooldownMs,
            lastAttackAt: 0,
            vx: (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.4),
            vy: 0,
            facing: 'left',
            hp,
            maxHp: hp,
            level,
            exp,
            jobExp,
            atk,
            def,
            isDead: false,
            patrolMinX: minX,
            patrolMaxX: maxX
        };
        this.monsters.set(id, mob);
        return mob;
    }
    /**
     * Advance monster AI: patrol, notice players, chase, and attack.
     * Returns the swings that connected this tick so Room can apply damage.
     */
    update(dt, players, now = Date.now()) {
        const attacks = [];
        const alivePlayers = players.filter(p => !p.isDead && p.hp > 0);
        this.monsters.forEach((mob) => {
            if (mob.isDead)
                return;
            if ((mob.frozenUntil || 0) > now)
                return;
            const speed = (mob.moveSpeed || 120) * dt;
            const patrolCenter = (mob.patrolMinX + mob.patrolMaxX) / 2;
            // Validate the current target: alive, online, and not dragged too far from home
            let target = mob.targetPlayerId ? alivePlayers.find(p => p.id === mob.targetPlayerId) : undefined;
            if (target) {
                const tooFarFromHome = Math.abs(mob.x - patrolCenter) > (mob.patrolMaxX - mob.patrolMinX) / 2 + LEASH_DISTANCE;
                if (tooFarFromHome || combatDistance(target, mob) > LEASH_DISTANCE) {
                    target = undefined;
                }
            }
            // Aggressive monsters notice the closest player in range
            if (!target && mob.aggressive && (mob.aggroRange || 0) > 0) {
                let best = mob.aggroRange || 0;
                for (const p of alivePlayers) {
                    const d = combatDistance(p, mob);
                    if (d < best) {
                        best = d;
                        target = p;
                    }
                }
            }
            mob.targetPlayerId = target?.id;
            if (target) {
                const dist = combatDistance(target, mob);
                const range = mob.attackRange || 100;
                if (dist > range * 0.9) {
                    mob.state = 'chase';
                    const use3D = target.viewMode === '3d';
                    const dx = target.x - mob.x;
                    const dz = use3D ? (target.z || 0) - (mob.z || 0) : 0;
                    const len = Math.hypot(dx, dz) || 1;
                    const step = Math.min(speed, Math.max(0, len - range * 0.7));
                    mob.x += (dx / len) * step;
                    if (use3D)
                        mob.z = (mob.z || 0) + (dz / len) * step;
                    mob.facing = dx >= 0 ? 'right' : 'left';
                    mob.rotY = Math.atan2(dx, dz);
                }
                else {
                    mob.state = 'attack';
                    const dx = target.x - mob.x;
                    const dz = (target.z || 0) - (mob.z || 0);
                    mob.facing = dx >= 0 ? 'right' : 'left';
                    mob.rotY = Math.atan2(dx, dz);
                    if (now - (mob.lastAttackAt || 0) >= (mob.attackCooldownMs || 1600)) {
                        mob.lastAttackAt = now;
                        attacks.push({ mobId: mob.id, playerId: target.id });
                    }
                }
                mob.z = Math.max(-WORLD_MAX_Z, Math.min(WORLD_MAX_Z, mob.z || 0));
                return;
            }
            // No target: walk back home if displaced, otherwise patrol
            const homeZ = mob.homeZ || 0;
            if (mob.x < mob.patrolMinX - 5 || mob.x > mob.patrolMaxX + 5 || Math.abs((mob.z || 0) - homeZ) > 10) {
                mob.state = 'return';
                const dx = Math.max(mob.patrolMinX, Math.min(mob.patrolMaxX, mob.x)) - mob.x;
                const dz = homeZ - (mob.z || 0);
                const len = Math.hypot(dx, dz) || 1;
                const step = Math.min(speed * 1.4, len);
                mob.x += (dx / len) * step;
                mob.z = (mob.z || 0) + (dz / len) * step;
                mob.facing = dx >= 0 ? 'right' : 'left';
                mob.rotY = Math.atan2(dx, dz);
                return;
            }
            mob.state = 'patrol';
            mob.x += mob.vx * dt * 30;
            if (mob.x <= mob.patrolMinX) {
                mob.x = mob.patrolMinX;
                mob.vx = Math.abs(mob.vx);
            }
            else if (mob.x >= mob.patrolMaxX) {
                mob.x = mob.patrolMaxX;
                mob.vx = -Math.abs(mob.vx);
            }
            if (Math.random() < 0.005) {
                mob.vx = -mob.vx;
            }
            mob.facing = mob.vx > 0 ? 'right' : 'left';
            mob.rotY = mob.vx > 0 ? Math.PI / 2 : -Math.PI / 2;
        });
        return attacks;
    }
    /** z of the monster whose loot is being created (drops scatter around it) */
    dropZ = 0;
    handleMobDeath(mob) {
        mob.isDead = true;
        this.dropZ = mob.z || 0;
        const drops = [];
        // Drop Zeny scaling with mob level
        const zenyAmount = Math.floor(mob.level * (10 + Math.random() * 20));
        drops.push(this.createDrop(mob.x + (Math.random() * 20 - 10), mob.y, 'zeny', `${zenyAmount} Zeny`, '💰', zenyAmount));
        // Universal Refining Mineral Drops (Oridecon / Elunium)
        if (mob.level >= 15 && Math.random() < 0.28) {
            const isElunium = Math.random() < 0.5;
            drops.push(this.createDrop(mob.x + (Math.random() * 20 - 10), mob.y, 'etc', isElunium ? 'Elunium' : 'Oridecon', '💎', 1, {
                id: isElunium ? 'elunium' : 'oridecon',
                name: isElunium ? 'Elunium (แร่ตีบวกเกราะ)' : 'Oridecon (แร่ตีบวกอาวุธ)',
                type: 'etc',
                icon: '💎',
                quantity: 1,
                description: 'แร่ศักดิ์สิทธิ์สำหรับตีบวกอุปกรณ์ที่โรงตีเหล็ก'
            }));
        }
        // Potion Drops
        if (Math.random() < 0.55) {
            const isRed = Math.random() < 0.65;
            drops.push(this.createDrop(mob.x, mob.y, 'usable', isRed ? 'Red Potion' : 'Blue Potion', isRed ? '🧪' : '💙', 1, {
                id: isRed ? 'red_potion' : 'blue_potion',
                name: isRed ? 'Red Potion' : 'Blue Potion',
                type: 'usable',
                icon: isRed ? '🧪' : '💙',
                quantity: 1,
                description: isRed ? 'ฟื้นฟู 150 HP ทันที' : 'ฟื้นฟู 80 MP ทันที',
                effect: isRed ? { hp: 150 } : { mp: 80 }
            }));
        }
        // Specific Monster Loot & Card
        switch (mob.type) {
            case 'Sunbun':
                drops.push(this.createDrop(mob.x, mob.y, 'etc', 'Sun Pearl', '☀️', 1, {
                    id: 'sun_pearl', name: 'Sun Pearl (ไข่มุกสุริยะ)', type: 'etc', icon: '☀️', quantity: 1,
                    description: 'ไข่มุกสะท้อนแสงอาทิตย์จาก Sunbun'
                }));
                if (Math.random() < 0.2) {
                    drops.push(this.createDrop(mob.x, mob.y, 'card', 'Sunbun Card', '🃏', 1, {
                        id: 'card_sunbun', name: 'Sunbun Card', type: 'card', icon: '🃏', quantity: 1,
                        description: 'LUK +3, AGI +2, Critical +2% [ใส่ลงในช่องอุปกรณ์]',
                        effect: { luk: 3, agi: 2, crit: 2 }
                    }));
                }
                break;
            case 'Poring':
                drops.push(this.createDrop(mob.x, mob.y, 'etc', 'Jellopy', '💧', 1, {
                    id: 'jellopy', name: 'Jellopy (เยลโลปี้)', type: 'etc', icon: '💧', quantity: 1,
                    description: 'ผลึกเยลลี่หวานหยดจาก Poring'
                }));
                if (Math.random() < 0.2) {
                    drops.push(this.createDrop(mob.x, mob.y, 'card', 'Poring Card', '🃏', 1, {
                        id: 'card_poring', name: 'Poring Card', type: 'card', icon: '🃏', quantity: 1,
                        description: 'LUK +2, Max HP +50 [ใส่ลงในช่องอุปกรณ์]',
                        effect: { luk: 2, hp: 50 }
                    }));
                }
                break;
            case 'Leafkin':
            case 'Fabre':
                drops.push(this.createDrop(mob.x, mob.y, 'etc', 'Verdant Leaf', '🍃', 1, {
                    id: 'verdant_leaf', name: 'Verdant Leaf (ใบไม้เอลฟ์)', type: 'etc', icon: '🍃', quantity: 1,
                    description: 'ใบไม้เรืองแสงสีมรกต'
                }));
                if (Math.random() < 0.2) {
                    drops.push(this.createDrop(mob.x, mob.y, 'card', 'Fabre Card', '🃏', 1, {
                        id: 'card_fabre', name: 'Fabre Card', type: 'card', icon: '🃏', quantity: 1,
                        description: 'VIT +2, Max HP +80 [ใส่ลงในช่องอุปกรณ์]',
                        effect: { vit: 2, hp: 80 }
                    }));
                }
                break;
            case 'ForestBoar':
                drops.push(this.createDrop(mob.x, mob.y, 'etc', 'Boar Tusk', '🐗', 1, {
                    id: 'boar_tusk', name: 'Boar Tusk (เขี้ยวหมูป่า)', type: 'etc', icon: '🐗', quantity: 1,
                    description: 'เขี้ยวแหลมคมของหมูป่ายักษ์'
                }));
                break;
            case 'WildWolf':
                drops.push(this.createDrop(mob.x, mob.y, 'card', 'Wolf Card', '🃏', 1, {
                    id: 'card_wolf', name: 'Wolf Card', type: 'card', icon: '🃏', quantity: 1,
                    description: 'ATK +15, Critical +1% [ใส่ลงในช่องอุปกรณ์]',
                    effect: { atk: 15, crit: 1 }
                }));
                break;
            case 'DesertScorpion':
                drops.push(this.createDrop(mob.x, mob.y, 'etc', 'Scorpion Pincer', '🦂', 1, {
                    id: 'scorp_pincer', name: 'Scorpion Pincer (ก้ามแมงป่อง)', type: 'etc', icon: '🦂', quantity: 1,
                    description: 'ก้ามพิษทะเลทรายที่แข็งแกร่ง'
                }));
                break;
            case 'SandGolem':
                drops.push(this.createDrop(mob.x, mob.y, 'card', 'Golem Card', '🃏', 1, {
                    id: 'card_golem', name: 'Golem Card', type: 'card', icon: '🃏', quantity: 1,
                    description: 'DEF +20, Max HP +250 [ใส่ลงในช่องอุปกรณ์]',
                    effect: { def: 20, hp: 250 }
                }));
                break;
            case 'MummyPharaoh':
                drops.push(this.createDrop(mob.x, mob.y, 'card', 'Mummy Card', '🃏', 1, {
                    id: 'card_mummy', name: 'Mummy Card', type: 'card', icon: '🃏', quantity: 1,
                    description: 'Hit Rate +20, ATK +10 [ใส่ลงในช่องอุปกรณ์]',
                    effect: { atk: 10, dex: 10 }
                }));
                break;
            case 'SkeletonSoldier':
                drops.push(this.createDrop(mob.x, mob.y, 'card', 'Skeleton Card', '🃏', 1, {
                    id: 'card_skel_soldier', name: 'Skeleton Soldier Card', type: 'card', icon: '🃏', quantity: 1,
                    description: 'Critical Rate +9% เมื่อโจมตีระยะประชิด [ใส่ลงในอาวุธ]',
                    effect: { crit: 9 }
                }));
                break;
            case 'WraithPhantom':
                drops.push(this.createDrop(mob.x, mob.y, 'etc', 'Spectral Essence', '👻', 1, {
                    id: 'spectral_essence', name: 'Spectral Essence (ผงวิญญาณ)', type: 'etc', icon: '👻', quantity: 1,
                    description: 'ไอวิญญาณเรืองแสงสีครามบริสุทธิ์'
                }));
                break;
            case 'FireSalamander':
            case 'LavaGolem':
                drops.push(this.createDrop(mob.x, mob.y, 'etc', 'Flame Heart', '🔥', 1, {
                    id: 'flame_heart', name: 'Flame Heart (หัวใจเพลิง)', type: 'etc', icon: '🔥', quantity: 1,
                    description: 'แกนความร้อนจากภูเขาไฟลาวา ใช้เสริมพลังไฟ'
                }));
                break;
            case 'NightmareSteed':
                drops.push(this.createDrop(mob.x, mob.y, 'card', 'Nightmare Card', '🃏', 1, {
                    id: 'card_nightmare', name: 'Nightmare Card', type: 'card', icon: '🃏', quantity: 1,
                    description: 'AGI +5, ป้องกันสถานะหลับ 100% [ใส่ในหมวก/เกราะ]',
                    effect: { agi: 5 }
                }));
                break;
            // ===== WORLD BOSS MVPs =====
            case 'Solarion':
                drops.push(this.createDrop(mob.x - 20, mob.y, 'equip', 'Solar Scythe [MVP]', '⚡', 1, {
                    id: 'solar_scythe', name: 'Solar Scythe [MVP] (+75 ATK, +12% Crit, +10 STR)',
                    type: 'equip', icon: '⚡', slot: 'weapon', cardSlots: 3, quantity: 1,
                    description: 'เคียวแห่งสุริยคราสอาบเพลิงสุริยะ อาวุธระดับตำนาน',
                    effect: { atk: 75, crit: 12, str: 10 }
                }));
                drops.push(this.createDrop(mob.x + 20, mob.y, 'card', 'Solarion Card [MVP]', '👑', 1, {
                    id: 'card_solarion', name: 'Solarion Card [MVP]', type: 'card', icon: '👑', quantity: 1,
                    description: 'STR +15, AGI +10, Max HP +500, All Attack +20%',
                    effect: { str: 15, agi: 10, hp: 500, atk: 25 }
                }));
                break;
            case 'LordBaphomet':
                drops.push(this.createDrop(mob.x - 25, mob.y, 'equip', 'Crescent Scythe [4]', '🌙', 1, {
                    id: 'crescent_scythe', name: 'Crescent Scythe [4] (+110 ATK, 4 Slots)',
                    type: 'equip', icon: '🌙', slot: 'weapon', cardSlots: 4, quantity: 1,
                    description: 'เคียวบาโฟเมตในตำนาน มีช่องใส่การ์ดถึง 4 ช่อง',
                    effect: { atk: 110, str: 15, crit: 15 }
                }));
                drops.push(this.createDrop(mob.x + 25, mob.y, 'card', 'Baphomet Card [MVP]', '👑', 1, {
                    id: 'card_baphomet', name: 'Baphomet Card [MVP]', type: 'card', icon: '👑', quantity: 1,
                    description: 'การโจมตีกายภาพทั้งหมดกลายเป็นกระจายรอบตัว (Splash Damage 9x9), Hit +15',
                    effect: { atk: 35, dex: 15 }
                }));
                break;
            case 'Valkyrie':
                drops.push(this.createDrop(mob.x, mob.y, 'equip', 'Valkyrian Armor [1]', '🛡️', 1, {
                    id: 'valkyrian_armor', name: 'Valkyrian Armor [1] (+140 DEF, All Stats +5)',
                    type: 'equip', icon: '🛡️', slot: 'armor', cardSlots: 1, quantity: 1,
                    description: 'ชุดเกราะแห่งเทพธิดาวาลคิรี แข็งแกร่งทนทานไร้รอยขีดข่วน',
                    effect: { def: 140, str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 }
                }));
                drops.push(this.createDrop(mob.x + 20, mob.y, 'card', 'Valkyrie Card [MVP]', '👑', 1, {
                    id: 'card_valkyrie', name: 'Valkyrie Randgris Card [MVP]', type: 'card', icon: '👑', quantity: 1,
                    description: 'สะท้อนการโจมตีเวทมนตร์ 20%, เพิ่มพลังโจมตีศักดิ์สิทธิ์ +30%',
                    effect: { def: 50, matk: 40 }
                }));
                break;
            case 'AncientPyroclastDragon':
                drops.push(this.createDrop(mob.x - 30, mob.y, 'equip', 'Dragon Slayer Core [MVP]', '🔥', 1, {
                    id: 'dragon_core_blade', name: 'Dragon Slayer Flame Blade [MVP] (+160 ATK, Fire +35%)',
                    type: 'equip', icon: '🔥', slot: 'weapon', cardSlots: 4, quantity: 1,
                    description: 'ดาบเพลิงสถิตหัวใจมังกรบรรพกาล พลังเผาผลาญสูงสุดในแดนสเลเยอร์',
                    effect: { atk: 160, str: 20, crit: 20 }
                }));
                drops.push(this.createDrop(mob.x + 30, mob.y, 'card', 'Pyroclast Dragon Card [MVP]', '👑', 1, {
                    id: 'card_pyroclast_dragon', name: 'Ancient Pyroclast Dragon Card [MVP]', type: 'card', icon: '👑', quantity: 1,
                    description: 'การโจมตีทั้งหมดแปรเปลี่ยนเป็นธาตุเพลิง ATK +30%, ฟื้นฟูเลือดเมื่อกำจัดศัตรู',
                    effect: { atk: 60, str: 15, hp: 1200 }
                }));
                break;
            case 'DemonLordMalakor':
                drops.push(this.createDrop(mob.x - 30, mob.y, 'equip', 'Abyssal Scythe of Malakor [MVP]', '🌑', 1, {
                    id: 'scythe_malakor', name: 'Abyssal Scythe of Malakor [MVP] (+180 ATK, Shadow +40%)',
                    type: 'equip', icon: '🌑', slot: 'weapon', cardSlots: 4, quantity: 1,
                    description: 'เคียวทมิฬของจอมมารมาลาคอร์ ฉีกกระชากวิญญาณศัตรู',
                    effect: { atk: 180, str: 25, agi: 20, crit: 25 }
                }));
                drops.push(this.createDrop(mob.x + 30, mob.y, 'card', 'Demon Lord Malakor Card [MVP]', '👑', 1, {
                    id: 'card_malakor', name: 'Demon Lord Malakor Card [MVP]', type: 'card', icon: '👑', quantity: 1,
                    description: 'ดูดพลังชีวิต 15% จากดาเมจที่ทำได้, เพิ่มคริติคอลดาเมจ +50%',
                    effect: { atk: 75, crit: 30 }
                }));
                break;
            case 'ColossalTitan':
                drops.push(this.createDrop(mob.x - 20, mob.y, 'equip', 'Titan Earth Plate [MVP]', '🛡️', 1, {
                    id: 'titan_earth_plate', name: 'Titan Colossus Plate [MVP] (+200 DEF, Max HP +2500)',
                    type: 'equip', icon: '🛡️', slot: 'armor', cardSlots: 2, quantity: 1,
                    description: 'เกราะศิลาไททันโบราณ แข็งแกร่งดั่งขุนเขา',
                    effect: { def: 200, vit: 30, hp: 2500 }
                }));
                break;
            case 'TreasureMimic':
                drops.push(this.createDrop(mob.x, mob.y, 'zeny', 'Golden Zeny Stash', '💰', 50000));
                drops.push(this.createDrop(mob.x + 15, mob.y, 'usable', 'Mana Elixir', '🔮', 5));
                drops.push(this.createDrop(mob.x - 15, mob.y, 'usable', 'White Potion', '🥛', 10));
                break;
        }
        // Respawn time based on boss vs normal mob
        const respawnTime = (mob.type === 'Solarion' || mob.type === 'LordBaphomet' || mob.type === 'Valkyrie' || mob.type === 'AncientPyroclastDragon' || mob.type === 'DemonLordMalakor' || mob.type === 'ColossalTitan') ? 30000 : 7000;
        mob.targetPlayerId = undefined;
        mob.frozenUntil = 0;
        setTimeout(() => {
            mob.hp = mob.maxHp;
            mob.isDead = false;
            mob.state = 'patrol';
            mob.targetPlayerId = undefined;
            mob.x = (mob.patrolMinX + mob.patrolMaxX) / 2;
            mob.z = mob.homeZ || 0;
        }, respawnTime);
        return drops;
    }
    createDrop(x, y, type, name, icon, amount, itemData) {
        const id = `drop_${this.nextDropId++}`;
        const drop = {
            id,
            name,
            type,
            icon,
            amount,
            x,
            y: y - 10,
            z: this.dropZ + (Math.random() * 40 - 20),
            vy: -4,
            groundY: y,
            itemData
        };
        this.drops.set(id, drop);
        return drop;
    }
    removeDrop(id) {
        this.drops.delete(id);
    }
}
