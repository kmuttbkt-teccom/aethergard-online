/**
 * AETHERGARD ONLINE — DungeonStageManager
 * Handles Pixel Slayer Saga Dungeon Raids: Tower of Slayers & Abyssal Dragon Lair.
 * Manages arena generation, waves, boss phases, and rewards.
 */
import * as THREE from 'three';
import { SLAYER_DUNGEON_STAGES } from '../../../server/src/GameData.js';
export class DungeonStageManager {
    scene;
    state = {
        isActive: false,
        floor: 1,
        stageName: 'Tower of Slayers Floor 1',
        recommendedLv: 15,
        bossType: 'TreasureMimic',
        bossHp: 10000,
        bossMaxHp: 10000,
        isBossEnraged: false,
        wave: 1,
        maxWaves: 3,
        monstersRemaining: 0,
        rewardGems: 100,
        rewardZeny: 10000
    };
    arenaGroup = new THREE.Group();
    brazierLights = [];
    runicCircle;
    onStateChangeCallback;
    constructor(scene) {
        this.scene = scene;
        this.arenaGroup.name = 'dungeon_arena_group';
        this.arenaGroup.visible = false;
        this.buildDungeonArena();
        this.scene.add(this.arenaGroup);
    }
    setCallback(cb) {
        this.onStateChangeCallback = cb;
    }
    notify() {
        if (this.onStateChangeCallback) {
            this.onStateChangeCallback({ ...this.state });
        }
    }
    buildDungeonArena() {
        // 1. Dark circular obsidian arena platform (at x: 500, z: 0)
        const arenaCenter = new THREE.Vector3(500, -0.05, 0);
        const platformGeo = new THREE.CylinderGeometry(28, 30, 2, 32);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.65,
            metalness: 0.3
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(arenaCenter.x, -1, arenaCenter.z);
        platform.receiveShadow = true;
        this.arenaGroup.add(platform);
        // 2. Glowing Runic Magic Circle on ground
        const circleGeo = new THREE.RingGeometry(4, 24, 32);
        circleGeo.rotateX(-Math.PI / 2);
        const circleMat = new THREE.MeshBasicMaterial({
            color: 0xff0055,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        this.runicCircle = new THREE.Mesh(circleGeo, circleMat);
        this.runicCircle.position.set(arenaCenter.x, 0.02, arenaCenter.z);
        this.arenaGroup.add(this.runicCircle);
        // 3. Perimeter Flaming Braziers (8 pillars around arena)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const bx = arenaCenter.x + Math.cos(angle) * 26;
            const bz = arenaCenter.z + Math.sin(angle) * 26;
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
            pillar.position.set(bx, 2.25, bz);
            this.arenaGroup.add(pillar);
            // Flame bowl
            const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.6, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 }));
            bowl.position.set(bx, 4.8, bz);
            this.arenaGroup.add(bowl);
            // Glowing Fire
            const fire = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6), new THREE.MeshStandardMaterial({
                color: 0xff4500,
                emissive: 0xff3300,
                emissiveIntensity: 1.5,
                roughness: 0.2
            }));
            fire.position.set(bx, 5.4, bz);
            this.arenaGroup.add(fire);
            const light = new THREE.PointLight(0xff5500, 2.5, 18);
            light.position.set(bx, 5.6, bz);
            this.arenaGroup.add(light);
            this.brazierLights.push(light);
        }
    }
    enterStage(floor = 1) {
        const stage = SLAYER_DUNGEON_STAGES.find(s => s.floor === floor) || SLAYER_DUNGEON_STAGES[0];
        this.state.isActive = true;
        this.state.floor = stage.floor;
        this.state.stageName = stage.name;
        this.state.recommendedLv = stage.recommendedLv;
        this.state.bossType = stage.bossType;
        this.state.wave = 1;
        this.state.maxWaves = stage.waves;
        this.state.rewardGems = stage.rewardGems;
        this.state.rewardZeny = stage.rewardZeny;
        if (stage.bossType === 'AncientPyroclastDragon') {
            this.state.bossMaxHp = 180000;
            this.state.bossHp = 180000;
            this.runicCircle.material.color.setHex(0xff3300);
        }
        else if (stage.bossType === 'DemonLordMalakor') {
            this.state.bossMaxHp = 250000;
            this.state.bossHp = 250000;
            this.runicCircle.material.color.setHex(0x7209b7);
        }
        else {
            this.state.bossMaxHp = 35000;
            this.state.bossHp = 35000;
            this.runicCircle.material.color.setHex(0xffd166);
        }
        this.arenaGroup.visible = true;
        this.notify();
        return {
            playerSpawn: new THREE.Vector3(500, 0, 16),
            bossType: stage.bossType,
            stageName: stage.name
        };
    }
    exitDungeon() {
        this.state.isActive = false;
        this.arenaGroup.visible = false;
        this.notify();
    }
    updateBossHp(currentHp, maxHp) {
        this.state.bossHp = currentHp;
        this.state.bossMaxHp = maxHp;
        const ratio = currentHp / maxHp;
        if (ratio < 0.5 && !this.state.isBossEnraged) {
            this.state.isBossEnraged = true;
        }
        this.notify();
    }
    update(time, dt) {
        if (!this.state.isActive)
            return;
        // Rotate runic circle
        if (this.runicCircle) {
            this.runicCircle.rotation.z += dt * 0.4;
        }
        // Flicker braziers
        this.brazierLights.forEach((light, i) => {
            light.intensity = 2.0 + Math.sin(time * 8 + i) * 0.6;
        });
    }
}
