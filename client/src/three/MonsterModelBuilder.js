import * as THREE from 'three';
import { ModelLoader } from './ModelLoader.js';
/**
 * Maps monster types to their GLTF filenames.
 * Files must exist in client/public/models/
 */
const MONSTER_GLB_MAP = {
    // Zone 1
    'Poring': 'mob_duck.glb',
    'Sunbun': 'mob_duck.glb',
    'Gryphlet': 'mob_parrot.glb',
    // Zone 2 (Forest)
    'ForestBoar': 'mob_fox.glb',
    'WildWolf': 'mob_fox.glb',
    // Zone 3 (Desert)
    'SandGolem': 'mob_golem.glb',
    'MummyPharaoh': 'char_xbot.glb',
    // Zone 4 (Catacombs)
    'SkeletonSoldier': 'monster_soldier.glb',
    'DarkGargoyle': 'mob_stork.glb',
    'WraithPhantom': 'char_cesiumman.glb',
    // Zone 5 (Magma)
    'LavaGolem': 'mob_golem.glb',
    'NightmareSteed': 'mob_horse.glb',
    // Zone 6 (Celestial)
    'Archangel': 'mob_flamingo.glb',
    'Valkyrie': 'char_soldier.glb',
    'Solarion': 'mob_dragon.glb',
    'LordBaphomet': 'mob_brainstem.glb',
};
export class MonsterModelBuilder {
    /**
     * Async version: tries to load GLTF first, falls back to procedural.
     * Use this for initial spawn when you have time to await.
     */
    static async createMonsterAsync(type, name, scene) {
        const glbFile = MONSTER_GLB_MAP[type];
        if (glbFile) {
            try {
                const loader = await ModelLoader.getInstance();
                const model = await loader.tryLoad(glbFile);
                if (model) {
                    // Auto-scale and position the GLTF model cleanly
                    const isBoss = ['LordBaphomet', 'Solarion', 'Valkyrie'].includes(type);
                    const targetH = type === 'Solarion' ? 3.6 : (type === 'LordBaphomet' ? 2.8 : (isBoss ? 2.4 : 1.5));
                    loader.normalizeModel(model.scene, targetH);
                    model.play('idle', true);
                    const group = new THREE.Group();
                    group.add(model.scene);
                    group.name = `mob_${type}_${name}_gltf`;
                    scene.add(group);
                    // Name/HP labels are drawn by ThreeWorld's OverheadLabel
                    return {
                        group,
                        type,
                        gltfModel: model,
                        updateAnimation: (_time, dt) => {
                            model.mixer?.update(dt);
                        }
                    };
                }
            }
            catch (e) {
                console.warn(`[MonsterModelBuilder] GLTF load failed for ${type}:`, e);
            }
        }
        // Fallback to procedural
        return MonsterModelBuilder.createMonster(type, name);
    }
    /** Add a floating name tag above a model */
    static _addNameTag(group, name, _type, posY = 2.8) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(name, 128, 32);
        ctx.fillText(name, 128, 32);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(2.2, 0.42, 1);
        sprite.position.y = posY;
        group.add(sprite);
    }
    static createMonster(type, name) {
        const group = new THREE.Group();
        group.name = `mob_${type}_${name}`;
        let updateAnimation = () => { };
        switch (type) {
            case 'Sunbun':
            case 'Poring': {
                // Cute Bouncy Golden Rabbit Slime
                const bodyGeo = new THREE.SphereGeometry(0.48, 16, 16);
                bodyGeo.scale(1.1, 0.95, 1.0);
                const bodyMat = new THREE.MeshStandardMaterial({
                    color: 0xffd166,
                    roughness: 0.35,
                    emissive: 0xffb703,
                    emissiveIntensity: 0.2
                });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.y = 0.42;
                body.castShadow = true;
                group.add(body);
                // Rabbit Ears
                const earGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.45, 8);
                earGeo.scale(1, 1, 0.4);
                const leftEar = new THREE.Mesh(earGeo, bodyMat);
                leftEar.position.set(-0.2, 0.52, 0);
                leftEar.rotation.z = -0.25;
                body.add(leftEar);
                const rightEar = new THREE.Mesh(earGeo, bodyMat);
                rightEar.position.set(0.2, 0.52, 0);
                rightEar.rotation.z = 0.25;
                body.add(rightEar);
                // Eyes
                const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
                const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
                leftEye.position.set(-0.16, 0.08, 0.44);
                body.add(leftEye);
                const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
                rightEye.position.set(0.16, 0.08, 0.44);
                body.add(rightEye);
                updateAnimation = (time) => {
                    const bounce = Math.abs(Math.sin(time * 6)) * 0.18;
                    body.position.y = 0.42 + bounce;
                    body.scale.set(1.0 - bounce * 0.4, 1.0 + bounce * 0.5, 1.0 - bounce * 0.4);
                    leftEar.rotation.z = -0.25 + Math.sin(time * 6) * 0.15;
                    rightEar.rotation.z = 0.25 - Math.sin(time * 6) * 0.15;
                };
                break;
            }
            case 'Leafkin':
            case 'Fabre': {
                // Emerald Leaf Fairy with flapping wings
                const bodyGeo = new THREE.SphereGeometry(0.35, 12, 12);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0x52b788, roughness: 0.4 });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.y = 0.65;
                body.castShadow = true;
                group.add(body);
                // Translucent Leaf Wings
                const wingGeo = new THREE.BoxGeometry(0.35, 0.55, 0.02);
                const wingMat = new THREE.MeshStandardMaterial({
                    color: 0x95d5b2,
                    transparent: true,
                    opacity: 0.75
                });
                const leftWing = new THREE.Mesh(wingGeo, wingMat);
                leftWing.position.set(-0.25, 0.15, -0.15);
                body.add(leftWing);
                const rightWing = new THREE.Mesh(wingGeo, wingMat);
                rightWing.position.set(0.25, 0.15, -0.15);
                body.add(rightWing);
                updateAnimation = (time) => {
                    body.position.y = 0.65 + Math.sin(time * 4) * 0.12;
                    const flap = Math.sin(time * 18) * 0.6;
                    leftWing.rotation.y = flap;
                    rightWing.rotation.y = -flap;
                };
                break;
            }
            case 'RedDemon': {
                // Horned Red Demon / Troll from user image 3 (row 3, left)
                const bodyGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.95, 12);
                const demonMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.5 });
                const body = new THREE.Mesh(bodyGeo, demonMat);
                body.position.y = 0.85;
                body.castShadow = true;
                group.add(body);
                // Muscular Head
                const headGeo = new THREE.SphereGeometry(0.42, 12, 12);
                const head = new THREE.Mesh(headGeo, demonMat);
                head.position.y = 0.75;
                body.add(head);
                // Black Horns
                const hornGeo = new THREE.ConeGeometry(0.12, 0.48, 8);
                const hornMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
                const leftHorn = new THREE.Mesh(hornGeo, hornMat);
                leftHorn.position.set(-0.28, 0.32, 0.1);
                leftHorn.rotation.z = 0.45;
                head.add(leftHorn);
                const rightHorn = new THREE.Mesh(hornGeo, hornMat);
                rightHorn.position.set(0.28, 0.32, 0.1);
                rightHorn.rotation.z = -0.45;
                head.add(rightHorn);
                // Glowing Yellow Eyes
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
                const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06), eyeMat);
                leftEye.position.set(-0.16, 0.05, 0.36);
                head.add(leftEye);
                const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.06), eyeMat);
                rightEye.position.set(0.16, 0.05, 0.36);
                head.add(rightEye);
                // Giant Spiked Club in Hand
                const clubGeo = new THREE.CylinderGeometry(0.16, 0.08, 1.2, 8);
                const clubMat = new THREE.MeshStandardMaterial({ color: 0x495057, roughness: 0.8 });
                const club = new THREE.Mesh(clubGeo, clubMat);
                club.position.set(0.65, 0.2, 0.25);
                club.rotation.x = Math.PI / 4;
                body.add(club);
                updateAnimation = (time) => {
                    body.position.y = 0.85 + Math.sin(time * 3) * 0.05;
                    club.rotation.z = Math.sin(time * 3) * 0.15;
                };
                break;
            }
            case 'BaphometJr': {
                // Mini-Boss: Purple Horned Devil with Scythe
                const bodyGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.85, 10);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3c096c, roughness: 0.5 });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.y = 0.75;
                body.castShadow = true;
                group.add(body);
                // Devil Horns
                const hornGeo = new THREE.TorusGeometry(0.24, 0.06, 8, 12, Math.PI);
                const hornMat = new THREE.MeshStandardMaterial({ color: 0x10002b });
                const horns = new THREE.Mesh(hornGeo, hornMat);
                horns.position.set(0, 0.85, 0);
                horns.rotation.x = -Math.PI / 2;
                body.add(horns);
                // Dark Wings
                const wingGeo = new THREE.BoxGeometry(0.55, 0.65, 0.02);
                const wingMat = new THREE.MeshStandardMaterial({ color: 0x240046 });
                const leftWing = new THREE.Mesh(wingGeo, wingMat);
                leftWing.position.set(-0.4, 0.3, -0.25);
                leftWing.rotation.y = 0.3;
                body.add(leftWing);
                const rightWing = new THREE.Mesh(wingGeo, wingMat);
                rightWing.position.set(0.4, 0.3, -0.25);
                rightWing.rotation.y = -0.3;
                body.add(rightWing);
                updateAnimation = (time) => {
                    body.position.y = 0.75 + Math.sin(time * 3.5) * 0.08;
                    leftWing.rotation.y = 0.3 + Math.sin(time * 5) * 0.25;
                    rightWing.rotation.y = -0.3 - Math.sin(time * 5) * 0.25;
                };
                break;
            }
            case 'Solarion': {
                // MVP BOSS: The Eclipse Lord (Giant Obsidian Lord with Flaming Wings & Scythe)
                group.scale.set(1.45, 1.45, 1.45);
                const bodyGeo = new THREE.CylinderGeometry(0.55, 0.68, 1.35, 14);
                const obsMat = new THREE.MeshStandardMaterial({
                    color: 0x1a052b,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: 0x7209b7,
                    emissiveIntensity: 0.3
                });
                const body = new THREE.Mesh(bodyGeo, obsMat);
                body.position.y = 1.15;
                body.castShadow = true;
                group.add(body);
                // Flaming Eclipse Wings (Large Red/Gold)
                const wingGroup = new THREE.Group();
                const wingMat = new THREE.MeshStandardMaterial({
                    color: 0xff0054,
                    emissive: 0xff5400,
                    emissiveIntensity: 0.7,
                    transparent: true,
                    opacity: 0.85
                });
                for (let side = -1; side <= 1; side += 2) {
                    const wing = new THREE.Group();
                    for (let f = 0; f < 5; f++) {
                        const feather = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1 - f * 0.15, 0.04), wingMat);
                        feather.position.set(side * (0.45 + f * 0.22), 0.4 - f * 0.12, -0.1);
                        feather.rotation.z = side * (0.35 + f * 0.18);
                        wing.add(feather);
                    }
                    wingGroup.add(wing);
                }
                body.add(wingGroup);
                // Giant Eclipse Scythe
                const scythe = new THREE.Group();
                const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.8 }));
                scythe.add(shaft);
                const bladeGeo = new THREE.TorusGeometry(0.65, 0.08, 8, 16, Math.PI * 0.6);
                const bladeMat = new THREE.MeshStandardMaterial({
                    color: 0xf72585,
                    emissive: 0xff0054,
                    emissiveIntensity: 0.9
                });
                const blade = new THREE.Mesh(bladeGeo, bladeMat);
                blade.position.set(0.35, 1.1, 0);
                blade.rotation.z = -Math.PI * 0.25;
                scythe.add(blade);
                scythe.position.set(0.85, 0.3, 0.2);
                body.add(scythe);
                // MVP Crimson Aura Ring on ground
                const auraGeo = new THREE.RingGeometry(0.85, 1.6, 32);
                const auraMat = new THREE.MeshBasicMaterial({
                    color: 0xff0054,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.6
                });
                const aura = new THREE.Mesh(auraGeo, auraMat);
                aura.rotation.x = -Math.PI / 2;
                aura.position.y = 0.05;
                group.add(aura);
                updateAnimation = (time) => {
                    body.position.y = 1.15 + Math.sin(time * 2.5) * 0.12;
                    aura.rotation.z += 0.02;
                    const auraScale = 1.0 + Math.sin(time * 4) * 0.15;
                    aura.scale.set(auraScale, auraScale, 1);
                    wingGroup.children[0].rotation.y = Math.sin(time * 3) * 0.25;
                    wingGroup.children[1].rotation.y = -Math.sin(time * 3) * 0.25;
                    scythe.rotation.z = Math.sin(time * 2) * 0.15;
                };
                break;
            }
            // ===== ZONE 2: Forest monsters =====
            case 'ForestBoar':
            case 'WildWolf': {
                const color = type === 'ForestBoar' ? 0x5c4033 : 0x78909c;
                const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 12), bodyMat);
                body.scale.set(1.3, 0.8, 1.0);
                body.position.y = 0.38;
                body.castShadow = true;
                group.add(body);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), bodyMat);
                head.position.set(0.42, 0.42, 0);
                group.add(head);
                const snout = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshStandardMaterial({ color: type === 'ForestBoar' ? 0xffe0b2 : 0xb0bec5 }));
                snout.position.set(0.66, 0.40, 0);
                group.add(snout);
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xcc0000 });
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
                eye.position.set(0.62, 0.50, 0.14);
                group.add(eye);
                if (type === 'ForestBoar') {
                    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }));
                    tusk.position.set(0.68, 0.32, 0.12);
                    tusk.rotation.z = Math.PI * 0.5;
                    group.add(tusk);
                }
                updateAnimation = (time) => { body.position.y = 0.38 + Math.abs(Math.sin(time * 3.5)) * 0.06; };
                break;
            }
            // ===== ZONE 3: Desert monsters =====
            case 'DesertScorpion': {
                const scorpMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.5 });
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10), scorpMat);
                body.scale.set(1.4, 0.7, 1.1);
                body.position.y = 0.3;
                body.castShadow = true;
                group.add(body);
                // Claws
                [-1, 1].forEach(side => {
                    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), scorpMat);
                    claw.position.set(side * 0.66, 0.28, 0.1);
                    group.add(claw);
                });
                // Tail
                const tail = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 10, Math.PI), new THREE.MeshStandardMaterial({ color: 0xf77f00 }));
                tail.position.set(-0.25, 0.55, 0);
                tail.rotation.x = -0.5;
                group.add(tail);
                const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 6), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
                stinger.position.set(-0.46, 0.72, 0);
                group.add(stinger);
                updateAnimation = (time) => { tail.rotation.y = Math.sin(time * 3) * 0.2; };
                break;
            }
            case 'SandGolem':
            case 'MummyPharaoh': {
                const golemColor = type === 'SandGolem' ? 0xc9a45c : 0xede0c8;
                const mat = new THREE.MeshStandardMaterial({ color: golemColor, roughness: 0.85 });
                const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.82, 0.5), mat);
                torso.position.y = 0.7;
                torso.castShadow = true;
                group.add(torso);
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.48), mat);
                head.position.y = 1.32;
                group.add(head);
                if (type === 'MummyPharaoh') {
                    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.26, 4), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 }));
                    crown.position.y = 1.64;
                    group.add(crown);
                }
                const eyeMat = new THREE.MeshBasicMaterial({ color: type === 'SandGolem' ? 0xff6d00 : 0x00e5ff });
                [-0.14, 0.14].forEach(ex => {
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
                    eye.position.set(ex, 1.36, 0.24);
                    group.add(eye);
                });
                // Arms
                [-1, 1].forEach(side => {
                    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), mat);
                    arm.position.set(side * 0.46, 0.7, 0);
                    group.add(arm);
                });
                updateAnimation = (time) => { torso.position.y = 0.7 + Math.sin(time * 1.8) * 0.05; };
                break;
            }
            // ===== ZONE 4: Undead monsters =====
            case 'SkeletonSoldier': {
                const boneMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.6 });
                const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), boneMat);
                spine.position.y = 0.72;
                group.add(spine);
                const skull = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), boneMat);
                skull.position.y = 1.22;
                group.add(skull);
                const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.18), boneMat);
                jaw.position.y = 1.05;
                group.add(jaw);
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
                [-0.1, 0.1].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04), eyeMat); e.position.set(ex, 1.25, 0.22); group.add(e); });
                // Sword
                const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.04), new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8 }));
                sword.position.set(0.42, 0.85, 0);
                group.add(sword);
                updateAnimation = (time) => { skull.rotation.y = Math.sin(time * 2.2) * 0.15; sword.rotation.z = Math.sin(time * 3) * 0.1; };
                break;
            }
            case 'WraithPhantom':
            case 'DarkGargoyle': {
                const phantomColor = type === 'WraithPhantom' ? 0x7209b7 : 0x37474f;
                const mat = new THREE.MeshStandardMaterial({ color: phantomColor, transparent: true, opacity: type === 'WraithPhantom' ? 0.75 : 0.95, emissive: phantomColor, emissiveIntensity: 0.25 });
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), mat);
                body.scale.set(0.9, 1.4, 0.9);
                body.position.y = 0.7;
                group.add(body);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), mat);
                head.position.y = 1.4;
                group.add(head);
                if (type === 'DarkGargoyle') {
                    // Wings
                    const wingMat = new THREE.MeshStandardMaterial({ color: 0x263238, side: THREE.DoubleSide });
                    [-1, 1].forEach(side => {
                        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), wingMat);
                        wing.position.set(side * 0.6, 1.1, -0.1);
                        wing.rotation.y = side * 0.4;
                        group.add(wing);
                    });
                }
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
                [-0.1, 0.1].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05), eyeMat); e.position.set(ex, 1.44, 0.24); group.add(e); });
                updateAnimation = (time) => { body.position.y = 0.7 + Math.sin(time * 2.5) * 0.14; head.position.y = 1.4 + Math.sin(time * 2.5) * 0.14; body.rotation.y += 0.012; };
                break;
            }
            // ===== ZONE 5: Fire monsters =====
            case 'FireSalamander': {
                const fireMat = new THREE.MeshStandardMaterial({ color: 0xe53935, emissive: 0xff4500, emissiveIntensity: 0.4, roughness: 0.3 });
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), fireMat);
                body.scale.set(1.4, 0.8, 1.0);
                body.position.y = 0.36;
                body.castShadow = true;
                group.add(body);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), fireMat);
                head.position.set(0.56, 0.44, 0);
                group.add(head);
                const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xff7043 }));
                tail.position.set(-0.62, 0.4, 0);
                tail.rotation.z = Math.PI * 0.5;
                group.add(tail);
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
                [-1, 1].forEach(side => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05), eyeMat); e.position.set(0.68, 0.52, side * 0.12); group.add(e); });
                updateAnimation = (time) => { body.position.y = 0.36 + Math.abs(Math.sin(time * 4)) * 0.07; };
                break;
            }
            case 'LavaGolem': {
                const stoneMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 });
                const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff6d00, emissive: 0xff4500, emissiveIntensity: 0.6 });
                const torso = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.9, 0.7), stoneMat);
                torso.position.y = 0.8;
                torso.castShadow = true;
                group.add(torso);
                // Lava cracks (glowing strips)
                const crack1 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.6), lavaMat);
                crack1.position.set(0.12, 0.8, 0.36);
                group.add(crack1);
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.6), stoneMat);
                head.position.y = 1.5;
                group.add(head);
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6d00 });
                [-0.16, 0.16].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07), eyeMat); e.position.set(ex, 1.54, 0.31); group.add(e); });
                [-1, 1].forEach(side => {
                    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), lavaMat);
                    fist.position.set(side * 0.78, 0.64, 0);
                    group.add(fist);
                });
                updateAnimation = (time) => { torso.position.y = 0.8 + Math.sin(time * 1.5) * 0.04; };
                break;
            }
            case 'NightmareSteed': {
                const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.7 });
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.6, 0.5), darkMat);
                body.position.y = 0.6;
                body.castShadow = true;
                group.add(body);
                const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.52, 8), darkMat);
                neck.position.set(0.34, 0.9, 0);
                neck.rotation.z = 0.35;
                group.add(neck);
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.28), darkMat);
                head.position.set(0.62, 1.06, 0);
                group.add(head);
                const maneMat = new THREE.MeshStandardMaterial({ color: 0x0f3460 });
                const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.06), maneMat);
                mane.position.set(0.3, 1.08, 0);
                group.add(mane);
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe040fb });
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05), eyeMat);
                eye.position.set(0.78, 1.1, 0.14);
                group.add(eye);
                // Fire hooves
                const hoofMat = new THREE.MeshStandardMaterial({ color: 0xff6d00, emissive: 0xff4500, emissiveIntensity: 0.5 });
                [-0.3, 0.3].forEach(fx => {
                    const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.09), hoofMat);
                    hoof.position.set(fx, 0.1, 0.2);
                    group.add(hoof);
                    const hoof2 = new THREE.Mesh(new THREE.SphereGeometry(0.09), hoofMat);
                    hoof2.position.set(fx, 0.1, -0.2);
                    group.add(hoof2);
                });
                updateAnimation = (time) => { body.position.y = 0.6 + Math.abs(Math.sin(time * 4)) * 0.05; };
                break;
            }
            // ===== ZONE 6: Divine monsters =====
            case 'Archangel': {
                const robeMat = new THREE.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xffd700, emissiveIntensity: 0.3 });
                const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.82, 8), robeMat);
                torso.position.y = 0.72;
                group.add(torso);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), new THREE.MeshStandardMaterial({ color: 0xffe082 }));
                head.position.y = 1.34;
                group.add(head);
                // Halo
                const haloMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.8, wireframe: true });
                const halo = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20), haloMat);
                halo.position.y = 1.68;
                group.add(halo);
                // Wings
                const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
                [-1, 1].forEach(side => {
                    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.55), wingMat);
                    wing.position.set(side * 0.56, 1.08, -0.12);
                    wing.rotation.y = side * 0.35;
                    group.add(wing);
                });
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0x64b5f6 });
                [-0.1, 0.1].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05), eyeMat); e.position.set(ex, 1.36, 0.24); group.add(e); });
                // Holy sword
                const swordMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, emissive: 0xffd700, emissiveIntensity: 0.4 });
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.04), swordMat);
                blade.position.set(0.46, 0.7, 0);
                group.add(blade);
                const guard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.04), swordMat);
                guard.position.set(0.46, 0.9, 0);
                group.add(guard);
                updateAnimation = (time) => { head.position.y = 1.34 + Math.sin(time * 2) * 0.06; halo.rotation.z += 0.015; };
                break;
            }
            case 'LordBaphomet': {
                const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a0030, emissive: 0x4a0080, emissiveIntensity: 0.3, roughness: 0.5 });
                const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.6), darkMat);
                torso.position.y = 0.9;
                torso.castShadow = true;
                group.add(torso);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), darkMat);
                head.position.y = 1.72;
                group.add(head);
                // Big curled horns
                const hornMat = new THREE.MeshStandardMaterial({ color: 0x2d0050 });
                [-1, 1].forEach(side => {
                    const horn = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 8, 14, Math.PI * 1.2), hornMat);
                    horn.position.set(side * 0.26, 1.86, 0);
                    horn.rotation.z = side * 0.6;
                    group.add(horn);
                });
                // Bat wings
                const wingMat = new THREE.MeshStandardMaterial({ color: 0x0d001f, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
                [-1, 1].forEach(side => {
                    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), wingMat);
                    wing.position.set(side * 0.88, 1.2, -0.15);
                    wing.rotation.y = side * 0.4;
                    group.add(wing);
                });
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
                [-0.14, 0.14].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07), eyeMat); e.position.set(ex, 1.76, 0.32); group.add(e); });
                // Scythe
                const scythe = new THREE.Group();
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), new THREE.MeshStandardMaterial({ color: 0x546e7a }));
                handle.position.y = 0.5;
                scythe.add(handle);
                const blade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 3), new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.8 }));
                blade.position.set(0.18, 0.98, 0);
                blade.rotation.z = -0.4;
                scythe.add(blade);
                scythe.position.set(0.72, 0.7, 0);
                group.add(scythe);
                // MVP boss scale
                group.scale.set(1.4, 1.4, 1.4);
                updateAnimation = (time) => { head.rotation.y = Math.sin(time * 1.5) * 0.12; scythe.rotation.z = Math.sin(time * 2) * 0.12; };
                break;
            }
            case 'Valkyrie': {
                const armorMat = new THREE.MeshStandardMaterial({ color: 0xe3f2fd, metalness: 0.7, roughness: 0.25 });
                const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.8, 0.52), armorMat);
                torso.position.y = 0.72;
                group.add(torso);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), new THREE.MeshStandardMaterial({ color: 0x90caf9 }));
                head.position.y = 1.36;
                group.add(head);
                // Winged helm
                const helmMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.85, roughness: 0.2 });
                const helm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), helmMat);
                helm.position.y = 1.56;
                group.add(helm);
                [-1, 1].forEach(side => {
                    const hw = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.22), helmMat);
                    hw.position.set(side * 0.28, 1.62, 0);
                    hw.rotation.y = side * 0.45;
                    group.add(hw);
                });
                // Divine wings
                const wingMat = new THREE.MeshStandardMaterial({ color: 0xfffde7, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
                [-1, 1].forEach(side => {
                    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.52), wingMat);
                    wing.position.set(side * 0.56, 1.06, -0.1);
                    wing.rotation.y = side * 0.35;
                    group.add(wing);
                });
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1565c0 });
                [-0.1, 0.1].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05), eyeMat); e.position.set(ex, 1.38, 0.24); group.add(e); });
                // Spear
                const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.8 }));
                spear.position.set(0.52, 0.84, 0);
                group.add(spear);
                const speartip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 4), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 }));
                speartip.position.set(0.52, 1.52, 0);
                group.add(speartip);
                group.scale.set(1.25, 1.25, 1.25); // MVP
                updateAnimation = (time) => { torso.position.y = 0.72 + Math.sin(time * 2) * 0.05; helm.rotation.y = Math.sin(time * 1.8) * 0.08; };
                break;
            }
            // ==================== PIXEL SLAYER SAGA BOSSES & MONSTERS ====================
            case 'AncientPyroclastDragon': {
                // Grand 3D Dragon with Wings, Spikes, Lava Belly and Flame Horns
                const scaleMat = new THREE.MeshStandardMaterial({ color: 0x9e2a2b, roughness: 0.45 });
                const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff5400, emissive: 0xff3300, emissiveIntensity: 0.6, roughness: 0.3 });
                const hornMat = new THREE.MeshStandardMaterial({ color: 0x330f0a, metalness: 0.6, roughness: 0.4 });
                // Body (Chest & Abdomen)
                const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.6, 8), scaleMat);
                torso.position.y = 1.3;
                torso.rotation.x = 0.25;
                torso.castShadow = true;
                group.add(torso);
                // Glowing Lava Underbelly
                const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 1.3, 6), lavaMat);
                belly.position.set(0, 1.25, 0.35);
                belly.rotation.x = 0.25;
                group.add(belly);
                // Long Neck & Dragon Head
                const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.1, 7), scaleMat);
                neck.position.set(0, 2.2, 0.4);
                neck.rotation.x = -0.35;
                group.add(neck);
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.9), scaleMat);
                head.position.set(0, 2.7, 0.75);
                group.add(head);
                // Horns
                [-1, 1].forEach(side => {
                    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 5), hornMat);
                    horn.position.set(side * 0.32, 3.1, 0.5);
                    horn.rotation.set(-0.4, 0, side * 0.35);
                    group.add(horn);
                });
                // Glowing Eyes
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
                [-0.26, 0.26].forEach(ex => {
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08), eyeMat);
                    eye.position.set(ex, 2.8, 1.05);
                    group.add(eye);
                });
                // Giant Flapping Wings
                const wingMat = new THREE.MeshStandardMaterial({ color: 0xd90429, side: THREE.DoubleSide, roughness: 0.5 });
                const leftWing = new THREE.Group();
                const leftWingMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), wingMat);
                leftWingMesh.position.set(-0.9, 0.4, 0);
                leftWing.add(leftWingMesh);
                leftWing.position.set(-0.7, 1.8, -0.2);
                group.add(leftWing);
                const rightWing = new THREE.Group();
                const rightWingMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), wingMat);
                rightWingMesh.position.set(0.9, 0.4, 0);
                rightWing.add(rightWingMesh);
                rightWing.position.set(0.7, 1.8, -0.2);
                group.add(rightWing);
                // Tail
                const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 6), scaleMat);
                tail.position.set(0, 0.9, -1.1);
                tail.rotation.x = -1.2;
                group.add(tail);
                group.scale.set(1.7, 1.7, 1.7);
                updateAnimation = (time) => {
                    const flap = Math.sin(time * 5) * 0.45;
                    leftWing.rotation.z = flap;
                    rightWing.rotation.z = -flap;
                    head.rotation.y = Math.sin(time * 2) * 0.15;
                    tail.rotation.y = Math.sin(time * 3) * 0.25;
                    torso.position.y = 1.3 + Math.sin(time * 4) * 0.08;
                };
                break;
            }
            case 'DemonLordMalakor': {
                // Nether Demon Lord with Obsidian Armor, Curved Horns & Abyssal Scythe
                const demonMat = new THREE.MeshStandardMaterial({ color: 0x14012b, roughness: 0.35 });
                const runeMat = new THREE.MeshStandardMaterial({ color: 0x7209b7, emissive: 0xb5179e, emissiveIntensity: 0.6 });
                const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.6), demonMat);
                torso.position.y = 1.05;
                torso.castShadow = true;
                group.add(torso);
                // Glowing Rune Sigil in chest
                const sigil = new THREE.Mesh(new THREE.CircleGeometry(0.2, 8), runeMat);
                sigil.position.set(0, 1.25, 0.32);
                group.add(sigil);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), demonMat);
                head.position.y = 1.85;
                group.add(head);
                // Curved Ram Horns
                const hornMat = new THREE.MeshStandardMaterial({ color: 0x050014, metalness: 0.8 });
                [-1, 1].forEach(side => {
                    const horn = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 6, 12, Math.PI * 1.3), hornMat);
                    horn.position.set(side * 0.3, 2.0, -0.05);
                    horn.rotation.set(0.4, side * 0.3, side * 0.8);
                    group.add(horn);
                });
                // Demonic Ethereal Wings
                const wingMat = new THREE.MeshStandardMaterial({ color: 0x3a0ca3, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
                const leftWing = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), wingMat);
                leftWing.position.set(-0.95, 1.5, -0.2);
                leftWing.rotation.y = 0.4;
                group.add(leftWing);
                const rightWing = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), wingMat);
                rightWing.position.set(0.95, 1.5, -0.2);
                rightWing.rotation.y = -0.4;
                group.add(rightWing);
                // Abyssal Scythe
                const scythe = new THREE.Group();
                const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x222 }));
                shaft.position.y = 0.9;
                scythe.add(shaft);
                const blade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 3), new THREE.MeshStandardMaterial({ color: 0xd90429, metalness: 0.9, emissive: 0x7209b7, emissiveIntensity: 0.4 }));
                blade.position.set(0.3, 1.6, 0);
                blade.rotation.z = -0.7;
                scythe.add(blade);
                scythe.position.set(0.85, 0.6, 0.2);
                group.add(scythe);
                group.scale.set(1.5, 1.5, 1.5);
                updateAnimation = (time) => {
                    head.rotation.y = Math.sin(time * 2) * 0.12;
                    leftWing.rotation.y = 0.4 + Math.sin(time * 4) * 0.25;
                    rightWing.rotation.y = -0.4 - Math.sin(time * 4) * 0.25;
                    scythe.rotation.z = Math.sin(time * 2.5) * 0.15;
                };
                break;
            }
            case 'ColossalTitan': {
                // Colossal Stone Titan with Moss & Glowing Runic Core
                const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
                const mossMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.8 });
                const coreMat = new THREE.MeshStandardMaterial({ color: 0x00f5d4, emissive: 0x00f5d4, emissiveIntensity: 0.8 });
                const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.8), stoneMat);
                torso.position.y = 1.2;
                torso.castShadow = true;
                group.add(torso);
                // Glowing Core
                const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), coreMat);
                core.position.set(0, 1.35, 0.45);
                group.add(core);
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.6), mossMat);
                head.position.y = 2.15;
                group.add(head);
                // Massive Boulder Shoulders
                [-1, 1].forEach(side => {
                    const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45), stoneMat);
                    shoulder.position.set(side * 0.9, 1.7, 0);
                    group.add(shoulder);
                    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35), stoneMat);
                    arm.position.set(side * 0.9, 1.0, 0);
                    group.add(arm);
                });
                group.scale.set(1.6, 1.6, 1.6);
                updateAnimation = (time) => {
                    core.rotation.y += 0.03;
                    torso.position.y = 1.2 + Math.sin(time * 2) * 0.05;
                };
                break;
            }
            case 'TreasureMimic': {
                // Gilded Wooden Treasure Chest that Chomps with Fangs
                const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });
                const goldTrim = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.3 });
                // Base Chest
                const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.6), woodMat);
                base.position.y = 0.25;
                group.add(base);
                const trim = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.1, 0.62), goldTrim);
                trim.position.y = 0.42;
                group.add(trim);
                // Hinged Lid that Chomps
                const lidGroup = new THREE.Group();
                lidGroup.position.set(0, 0.48, -0.3);
                const lid = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.3, 0.6), woodMat);
                lid.position.set(0, 0.15, 0.3);
                lidGroup.add(lid);
                // Jagged Teeth
                const toothMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
                [-0.3, -0.1, 0.1, 0.3].forEach(tx => {
                    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 3), toothMat);
                    tooth.position.set(tx, -0.05, 0.58);
                    tooth.rotation.x = Math.PI;
                    lid.add(tooth);
                });
                // Glowing Purple Eyes inside
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0x9d4edd });
                [-0.15, 0.15].forEach(ex => {
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06), eyeMat);
                    eye.position.set(ex, 0.05, 0.45);
                    lid.add(eye);
                });
                group.add(lidGroup);
                updateAnimation = (time) => {
                    const chomp = Math.abs(Math.sin(time * 5)) * 0.45;
                    lidGroup.rotation.x = -chomp;
                    base.position.y = 0.25 + Math.sin(time * 4) * 0.04;
                };
                break;
            }
            case 'BoneKnight': {
                // Cursed Bone Knight with Jagged Sword & Shield
                const boneMat = new THREE.MeshStandardMaterial({ color: 0xd6ccc2, roughness: 0.6 });
                const armorMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, metalness: 0.7, roughness: 0.4 });
                const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.4), armorMat);
                torso.position.y = 0.8;
                group.add(torso);
                const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), boneMat);
                skull.position.y = 1.35;
                group.add(skull);
                // Glowing Red Eye Sockets
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef233c });
                [-0.08, 0.08].forEach(ex => {
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035), eyeMat);
                    eye.position.set(ex, 1.37, 0.2);
                    group.add(eye);
                });
                // Bone Sword
                const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.03), armorMat);
                sword.position.set(0.48, 0.7, 0.1);
                group.add(sword);
                updateAnimation = (time) => {
                    torso.position.y = 0.8 + Math.sin(time * 3) * 0.04;
                    sword.rotation.x = Math.sin(time * 4) * 0.2;
                };
                break;
            }
            case 'ShadowWyrmling': {
                // Miniature Flying Shadow Dragon
                const wyrmMat = new THREE.MeshStandardMaterial({ color: 0x3c096c, roughness: 0.4 });
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), wyrmMat);
                body.position.y = 0.9;
                body.scale.set(1.0, 0.8, 1.4);
                group.add(body);
                const wingMat = new THREE.MeshStandardMaterial({ color: 0x7b2cbf, side: THREE.DoubleSide });
                const leftWing = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), wingMat);
                leftWing.position.set(-0.5, 1.0, 0);
                group.add(leftWing);
                const rightWing = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), wingMat);
                rightWing.position.set(0.5, 1.0, 0);
                group.add(rightWing);
                updateAnimation = (time) => {
                    body.position.y = 0.9 + Math.sin(time * 4) * 0.15;
                    const flap = Math.sin(time * 12) * 0.5;
                    leftWing.rotation.z = flap;
                    rightWing.rotation.z = -flap;
                };
                break;
            }
            default: {
                // Standard Monster Blob
                const geo = new THREE.SphereGeometry(0.42, 12, 12);
                const mat = new THREE.MeshStandardMaterial({ color: 0x9b5de5 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.y = 0.42;
                group.add(mesh);
                updateAnimation = (time) => {
                    mesh.position.y = 0.42 + Math.abs(Math.sin(time * 4)) * 0.15;
                };
            }
        }
        return {
            group,
            type,
            updateAnimation
        };
    }
}
