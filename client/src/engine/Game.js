import { GameMap } from './Map.js';
import { Camera } from './Camera.js';
import { InputManager } from './Input.js';
import { sound } from './Sound.js';
import { ClientPlayer } from '../entities/Player.js';
import { ClientMonster } from '../entities/Monster.js';
import { ClientDropItem } from '../entities/DropItem.js';
import { DamageNumberManager } from '../entities/DamageNumber.js';
import { NetworkClient } from '../systems/Network.js';
import { UIManager } from '../ui/UIManager.js';
export class Game {
    canvas;
    ctx;
    map;
    camera;
    input;
    network;
    ui;
    damageNumbers;
    selfPlayer = null;
    remotePlayers = new Map();
    monsters = new Map();
    drops = new Map();
    lastTime = performance.now();
    networkSyncTimer = 0;
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.map = new GameMap();
        this.camera = new Camera(this.canvas.width, this.canvas.height);
        this.input = new InputManager();
        this.damageNumbers = new DamageNumberManager();
        // UI Manager
        this.ui = new UIManager({
            onAllocateStat: (stat) => {
                this.network.sendAllocateStat(stat);
            },
            onUseItem: (itemId) => {
                this.network.sendUseItem(itemId);
            },
            onRefineItem: (itemId) => {
                this.network.sendRefine(itemId);
            },
            onJobChange: (job) => {
                this.network.sendJobChange(job);
            },
            onSendChat: (text) => {
                this.network.sendChat(text);
                if (this.selfPlayer) {
                    this.selfPlayer.showChat(text);
                }
            },
            onToggleSound: () => {
                return sound.toggleMute();
            }
        });
        // Network Client
        this.network = new NetworkClient({
            onInit: (selfId, player, players, monsters, drops) => {
                this.selfPlayer = new ClientPlayer(player, true);
                this.remotePlayers.clear();
                players.forEach(p => {
                    if (p.id !== selfId) {
                        this.remotePlayers.set(p.id, new ClientPlayer(p, false));
                    }
                });
                this.monsters.clear();
                monsters.forEach(m => {
                    this.monsters.set(m.id, new ClientMonster(m));
                });
                this.drops.clear();
                drops.forEach(d => {
                    this.drops.set(d.id, new ClientDropItem(d));
                });
                this.ui.updatePlayerHUD(player);
            },
            onPlayerJoined: (player) => {
                this.remotePlayers.set(player.id, new ClientPlayer(player, false));
                this.ui.appendChat({
                    sender: '[ระบบ]',
                    text: `${player.name} ได้เข้าสู่เกม!`,
                    channel: 'system',
                    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                });
            },
            onPlayerLeft: (id) => {
                const p = this.remotePlayers.get(id);
                if (p) {
                    this.ui.appendChat({
                        sender: '[ระบบ]',
                        text: `${p.data.name} ได้ออกจากเกมแล้ว`,
                        channel: 'system',
                        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                    });
                    this.remotePlayers.delete(id);
                }
            },
            onPlayerMoved: (msg) => {
                const p = this.remotePlayers.get(msg.id);
                if (p) {
                    p.data.x = msg.x;
                    p.data.y = msg.y;
                    p.data.vx = msg.vx;
                    p.data.vy = msg.vy;
                    p.data.facing = msg.facing;
                    p.data.anim = msg.anim;
                    p.data.isGrounded = msg.isGrounded;
                }
            },
            onPlayerAttacked: (id, skill, facing) => {
                const p = this.remotePlayers.get(id);
                if (p) {
                    p.data.facing = facing;
                    p.triggerAttack(skill);
                    sound.playSlash();
                }
            },
            onPlayerUpdated: (player, leveledUp) => {
                if (this.selfPlayer && this.selfPlayer.data.id === player.id) {
                    this.selfPlayer.data = player;
                    if (leveledUp) {
                        this.selfPlayer.triggerLevelUp();
                    }
                    this.ui.updatePlayerHUD(player);
                }
                else {
                    const p = this.remotePlayers.get(player.id);
                    if (p) {
                        p.data = player;
                        if (leveledUp) {
                            p.triggerLevelUp();
                        }
                    }
                }
            },
            onDamage: (damageEvent, mobHp) => {
                this.damageNumbers.add(damageEvent.x, damageEvent.y, damageEvent.damage, damageEvent.isCrit, false, damageEvent.isMiss);
                sound.playHit(damageEvent.isCrit);
                const mob = this.monsters.get(damageEvent.targetId);
                if (mob && mobHp !== undefined) {
                    mob.data.hp = mobHp;
                }
            },
            onMobDied: (mobId, drops) => {
                const mob = this.monsters.get(mobId);
                if (mob) {
                    mob.data.isDead = true;
                }
                drops.forEach(d => {
                    this.drops.set(d.id, new ClientDropItem(d));
                });
            },
            onDropRemoved: (dropId, pickerId) => {
                const drop = this.drops.get(dropId);
                if (drop) {
                    if (this.selfPlayer && pickerId === this.selfPlayer.data.id) {
                        sound.playCoin();
                    }
                    this.drops.delete(dropId);
                }
            },
            onChat: (chat) => {
                this.ui.appendChat(chat);
                // If sender is player, show overhead bubble
                if (this.selfPlayer && chat.sender === this.selfPlayer.data.name) {
                    this.selfPlayer.showChat(chat.text);
                }
                else {
                    for (const p of this.remotePlayers.values()) {
                        if (p.data.name === chat.sender) {
                            p.showChat(chat.text);
                            break;
                        }
                    }
                }
            }
        });
        // Make globally accessible for debugging if needed
        window.game = this;
        // Start loop
        requestAnimationFrame((t) => this.loop(t));
    }
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.camera) {
            this.camera.resize(this.canvas.width, this.canvas.height);
        }
    }
    start(token = '', characterId = '') {
        this.network.connect(token, characterId);
    }
    loop(currentTime) {
        const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
        this.lastTime = currentTime;
        this.update(dt);
        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }
    update(dt) {
        if (!this.selfPlayer)
            return;
        // Handle Input & Physics
        const keys = {
            left: this.input.isLeft(),
            right: this.input.isRight(),
            up: this.input.isUp(),
            down: this.input.isDownDir(),
            jump: this.input.isJumpJustPressed(),
            dropDown: this.input.isDownDir() && this.input.isJumpJustPressed()
        };
        this.selfPlayer.updatePhysics(dt, this.map, keys);
        this.selfPlayer.updateTimers(dt);
        // Attack Action [Z]
        if (this.input.isAttackJustPressed()) {
            this.selfPlayer.triggerAttack('NORMAL');
            this.network.sendAttack('NORMAL');
            sound.playSlash();
        }
        // Skill 1: Bash [X]
        if (this.input.isSkill1JustPressed()) {
            if (this.selfPlayer.data.mp >= 15) {
                this.selfPlayer.triggerAttack('BASH');
                this.network.sendAttack('BASH');
                sound.playSlash();
            }
            else {
                this.ui.appendChat({
                    sender: '[ระบบ]',
                    text: 'มานา (MP) ไม่เพียงพอสำหรับสกิล Bash!',
                    channel: 'system',
                    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                });
            }
        }
        // Pickup Item [V]
        if (this.input.isPickupJustPressed()) {
            this.drops.forEach(d => {
                const dist = Math.hypot(this.selfPlayer.data.x - d.data.x, this.selfPlayer.data.y - d.data.groundY);
                if (dist < 85) {
                    this.network.sendPickDrop(d.data.id);
                }
            });
        }
        // Hotbar [1] Red Potion
        if (this.input.isHotbar1()) {
            const red = this.selfPlayer.data.inventory.find(i => i.id.includes('red_potion'));
            if (red) {
                this.network.sendUseItem(red.id);
                sound.playPotion();
            }
        }
        // Hotbar [2] Blue Potion
        if (this.input.isHotbar2()) {
            const blue = this.selfPlayer.data.inventory.find(i => i.id.includes('blue_potion'));
            if (blue) {
                this.network.sendUseItem(blue.id);
                sound.playPotion();
            }
        }
        // Hotbar [3] Fly Wing Teleport
        if (this.input.isHotbar3()) {
            const wing = this.selfPlayer.data.inventory.find(i => i.id.includes('fly_wing'));
            if (wing) {
                this.network.sendUseItem(wing.id);
                // Teleport to random safe platform
                this.selfPlayer.data.x = 200 + Math.random() * (this.map.width - 400);
                this.selfPlayer.data.y = 560;
                this.selfPlayer.data.vy = 0;
                sound.playDoubleJump();
            }
        }
        // UI Window Hotkeys
        if (this.input.isJustPressed('KeyS'))
            this.ui.toggleWindow('status-win');
        if (this.input.isJustPressed('KeyI'))
            this.ui.toggleWindow('inventory-win');
        if (this.input.isJustPressed('KeyK'))
            this.ui.toggleWindow('skills-win');
        if (this.input.isJustPressed('KeyJ'))
            this.ui.toggleWindow('job-win');
        if (this.input.isJustPressed('KeyH'))
            this.ui.toggleWindow('help-win');
        // Update Remote Players
        this.remotePlayers.forEach(p => {
            p.updateTimers(dt);
        });
        // Update Monsters
        this.monsters.forEach(m => {
            m.update(dt);
        });
        // Update Drops
        this.drops.forEach(d => {
            d.update(dt);
        });
        // Update Damage numbers
        this.damageNumbers.update(dt);
        // Camera follow
        this.camera.follow(this.selfPlayer.data.x, this.selfPlayer.data.y, this.map.width, this.map.height, dt);
        // Sync player position over network (25 times per second)
        this.networkSyncTimer += dt;
        if (this.networkSyncTimer >= 0.04) {
            this.networkSyncTimer = 0;
            this.network.sendMove(this.selfPlayer.data);
        }
        // Update MiniMap
        this.ui.renderMiniMap(this.selfPlayer.data, Array.from(this.remotePlayers.values()).map(p => p.data), Array.from(this.monsters.values()).map(m => m.data), this.map.width, this.map.height);
    }
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Camera transformation
        ctx.save();
        ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
        // 1. Render Map & Parallax
        this.map.render(ctx, this.camera.x, this.camera.y, this.camera.viewportW, this.camera.viewportH);
        // 2. Render Ground Drops
        if (this.selfPlayer) {
            this.drops.forEach(d => {
                d.render(ctx, this.selfPlayer.data.x, this.selfPlayer.data.y);
            });
        }
        // 3. Render Monsters
        this.monsters.forEach(m => {
            m.render(ctx);
        });
        // 4. Render Remote Players
        this.remotePlayers.forEach(p => {
            p.render(ctx);
        });
        // 5. Render Self Player
        if (this.selfPlayer) {
            this.selfPlayer.render(ctx);
        }
        // 6. Render Floating Damage Numbers
        this.damageNumbers.render(ctx);
        ctx.restore();
    }
}
