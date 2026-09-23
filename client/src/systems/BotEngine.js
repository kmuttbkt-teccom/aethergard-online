import { sound } from '../engine/Sound.js';
export class BotEngine {
    enabled = false;
    settings = {
        autoAttack: true,
        autoSkill: true,
        autoPotion: true,
        autoLoot: true,
        hpThreshold: 45,
        mpThreshold: 30
    };
    lastPotionTime = 0;
    lastLootTime = 0;
    lastAttackTime = 0;
    onStateChange;
    constructor(onChange) {
        this.onStateChange = onChange;
    }
    setOnChange(cb) {
        this.onStateChange = cb;
    }
    toggle() {
        this.enabled = !this.enabled;
        if (this.onStateChange)
            this.onStateChange(this.enabled);
        return this.enabled;
    }
    setEnabled(val) {
        this.enabled = val;
        if (this.onStateChange)
            this.onStateChange(this.enabled);
    }
    update(scene, dt) {
        const inputOverride = { moveLeft: false, moveRight: false, jump: false };
        if (!this.enabled || !scene.selfData)
            return inputOverride;
        const now = Date.now();
        const player = scene.selfData;
        // 1. Auto Potion (Red & Blue Potion)
        if (this.settings.autoPotion && now - this.lastPotionTime > 1100) {
            const hpPercent = (player.hp / player.maxHp) * 100;
            if (hpPercent <= this.settings.hpThreshold) {
                const red = player.inventory.find(i => i.id.includes('red_potion') || i.name.includes('Red Potion'));
                if (red) {
                    scene.network.sendUseItem(red.id);
                    sound.playPotion();
                    this.lastPotionTime = now;
                }
            }
            const mpPercent = (player.mp / player.maxMp) * 100;
            if (mpPercent <= this.settings.mpThreshold) {
                const blue = player.inventory.find(i => i.id.includes('blue_potion') || i.name.includes('Blue Potion'));
                if (blue) {
                    scene.network.sendUseItem(blue.id);
                    sound.playPotion();
                    this.lastPotionTime = now;
                }
            }
        }
        // 2. Auto Loot (Pick up drops in range)
        if (this.settings.autoLoot && now - this.lastLootTime > 600) {
            // If player is Merchant and has Greed Vacuum, trigger it occasionally!
            if (player.job === 'Merchant' && player.mp >= 10 && scene.getDropCount() >= 2) {
                scene.performBotSkill('GREED_VACUUM');
                this.lastLootTime = now;
            }
            else {
                scene.pickupNearbyDrops();
                this.lastLootTime = now;
            }
        }
        // 3. Auto Hunt (Acquire target mob and navigate / attack)
        if (this.settings.autoAttack) {
            const nearestMob = scene.findClosestAliveMonster();
            if (nearestMob) {
                const dx = nearestMob.x - player.x;
                const dy = nearestMob.y - player.y;
                const dist = Math.hypot(dx, dy);
                // Face monster
                if (dx < -15) {
                    inputOverride.moveLeft = true;
                }
                else if (dx > 15) {
                    inputOverride.moveRight = true;
                }
                // Jump if target is on an upper platform
                if (dy < -35 && Math.abs(dx) < 180) {
                    inputOverride.jump = true;
                }
                // In attack range
                if (dist <= 85) {
                    if (now - this.lastAttackTime > 450) {
                        this.lastAttackTime = now;
                        // Decide skill vs normal attack
                        let skillToUse = 'NORMAL';
                        if (this.settings.autoSkill && player.mp >= 20) {
                            if (player.job === 'Swordman')
                                skillToUse = Math.random() > 0.4 ? 'RADIANT_SLASH' : 'BASH';
                            else if (player.job === 'Magician')
                                skillToUse = Math.random() > 0.4 ? 'ASTRAL_METEOR' : 'FROST_NOVA';
                            else if (player.job === 'Archer')
                                skillToUse = 'GALE_ARROW';
                            else if (player.job === 'Thief')
                                skillToUse = Math.random() > 0.5 ? 'SHADOW_BLINK' : 'BLADE_DANCE';
                            else if (player.job === 'Acolyte')
                                skillToUse = 'SANCTUARY';
                            else if (player.job === 'Merchant')
                                skillToUse = player.zeny > 100 ? 'COIN_BURST' : 'NORMAL';
                        }
                        scene.performBotSkill(skillToUse);
                    }
                }
            }
        }
        return inputOverride;
    }
}
