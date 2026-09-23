import Phaser from 'phaser';
import { WorldScene } from './phaser/WorldScene.js';
import { AuthUI } from './ui/AuthUI.js';
import { UIManager } from './ui/UIManager.js';
import { sound } from './engine/Sound.js';
import './ui/styles.css';
let phaserGame = null;
let currentScene = null;
let uiManager = null;
window.addEventListener('DOMContentLoaded', () => {
    // Initialize UI Manager
    uiManager = new UIManager({
        onAllocateStat: (stat) => {
            if (currentScene && currentScene.network) {
                currentScene.network.sendAllocateStat(stat);
            }
        },
        onUseItem: (itemId) => {
            if (currentScene && currentScene.network) {
                currentScene.network.sendUseItem(itemId);
            }
        },
        onRefineItem: (itemId) => {
            if (currentScene && currentScene.network) {
                currentScene.network.sendRefine(itemId);
            }
        },
        onJobChange: (job) => {
            if (currentScene && currentScene.network) {
                currentScene.network.sendJobChange(job);
            }
        },
        onSendChat: (text) => {
            if (currentScene && currentScene.network) {
                currentScene.network.sendChat(text);
            }
        },
        onToggleSound: () => {
            return sound.toggleMute();
        }
    });
    // Setup Back to Character Selection button in game
    document.getElementById('btn-back-char-select')?.addEventListener('click', () => {
        if (confirm('คุณต้องการออกจากเกมเพื่อกลับสู่หน้าเลือกตัวละครใช่หรือไม่?')) {
            if (currentScene && currentScene.threeWorld) {
                currentScene.threeWorld.destroy();
            }
            const c3d = document.getElementById('game-3d-container');
            if (c3d) {
                c3d.classList.add('hidden');
                c3d.innerHTML = '';
            }
            if (currentScene && currentScene.network) {
                currentScene.network.disconnect();
            }
            if (phaserGame) {
                phaserGame.destroy(true);
                phaserGame = null;
                currentScene = null;
            }
            authUI.showCharSelectScreen();
        }
    });
    // Initialize Auth UI
    const authUI = new AuthUI({
        onStartGame: (token, character) => {
            // If a previous game instance was running, clean it up
            if (currentScene && currentScene.threeWorld) {
                currentScene.threeWorld.destroy();
            }
            const c3d = document.getElementById('game-3d-container');
            if (c3d) {
                c3d.classList.remove('hidden');
                c3d.innerHTML = '';
            }
            const c2d = document.getElementById('game-container');
            if (c2d) {
                c2d.classList.add('hidden');
            }
            const label = document.getElementById('tb-view-mode-label');
            if (label)
                label.textContent = 'Full 3D';
            if (phaserGame) {
                phaserGame.destroy(true);
                phaserGame = null;
            }
            // Phaser 3 Game Configuration
            const config = {
                type: Phaser.AUTO,
                parent: 'game-container',
                width: window.innerWidth,
                height: window.innerHeight,
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { x: 0, y: 980 },
                        debug: false
                    }
                },
                scale: {
                    mode: Phaser.Scale.RESIZE,
                    autoCenter: Phaser.Scale.CENTER_BOTH
                },
                scene: [WorldScene]
            };
            phaserGame = new Phaser.Game(config);
            phaserGame.scene.start('WorldScene', {
                token,
                character,
                ui: uiManager
            });
            // Track active scene
            phaserGame.events.on('step', () => {
                if (!currentScene) {
                    currentScene = phaserGame?.scene.getScene('WorldScene');
                }
            });
        }
    });
});
