import * as THREE from 'three';
import { ModelLoader } from './ModelLoader.js';
import { WeaponModelBuilder } from './WeaponModelBuilder.js';
import { Weapon3DBuilder } from './Weapon3DBuilder.js';
import { inferWeaponType } from '../../../server/src/GameData.js';
export class CharacterModelBuilder {
    /**
     * Build an Isometric 3D Chibi Character (Ragnarok Online x MapleStory 2 Style)
     * Based on user reference image: Chibi head ratio, cute limbs, class-themed armor & weapons
     */
    static createCharacter(name, job, gender = 'male', hairColor = '#ffd700', isGm = false) {
        const group = new THREE.Group();
        group.name = `char_${name}`;
        // 1. Chibi Torso / Body (Rounded Cylinder)
        let bodyColor = 0x4361ee; // Default Novice Blue
        if (isGm)
            bodyColor = 0xffd700; // Gold for GM
        else if (job === 'Swordman')
            bodyColor = 0xd90429;
        else if (job === 'Magician')
            bodyColor = 0x7209b7;
        else if (job === 'Archer')
            bodyColor = 0x2b9348;
        else if (job === 'Thief')
            bodyColor = 0x212529;
        else if (job === 'Acolyte')
            bodyColor = 0xf5f3f4;
        else if (job === 'Merchant')
            bodyColor = 0xf77f00;
        const bodyGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.72, 12);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.45,
            metalness: job === 'Swordman' || isGm ? 0.35 : 0.1
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.82;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);
        // Belt / Tunic Accent
        const beltGeo = new THREE.CylinderGeometry(0.42, 0.43, 0.14, 12);
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x3d2614, roughness: 0.6 });
        const beltMesh = new THREE.Mesh(beltGeo, beltMat);
        beltMesh.position.y = -0.15;
        bodyMesh.add(beltMesh);
        // Belt Buckle (Gold)
        const buckleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.08);
        const buckleMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.7, roughness: 0.2 });
        const buckleMesh = new THREE.Mesh(buckleGeo, buckleMat);
        buckleMesh.position.set(0, 0, 0.42);
        beltMesh.add(buckleMesh);
        // 2. Chibi Head (Cute Big Head Ratio 1:2)
        const headGeo = new THREE.SphereGeometry(0.55, 16, 16);
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0xffdfc4, // Warm Peach Skin
            roughness: 0.65
        });
        const headMesh = new THREE.Mesh(headGeo, skinMat);
        headMesh.position.y = 0.65;
        headMesh.castShadow = true;
        bodyMesh.add(headMesh);
        // Cute Anime Eyes (Big Expressive Oval Eyes)
        const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
        eyeGeo.scale(1, 1.3, 0.5);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1d3557 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2, 0.05, 0.48);
        headMesh.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2, 0.05, 0.48);
        headMesh.add(rightEye);
        // Eye Highlights (Anime sparkles)
        const glintGeo = new THREE.SphereGeometry(0.03, 6, 6);
        const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const leftGlint = new THREE.Mesh(glintGeo, glintMat);
        leftGlint.position.set(-0.18, 0.09, 0.52);
        headMesh.add(leftGlint);
        const rightGlint = new THREE.Mesh(glintGeo, glintMat);
        rightGlint.position.set(0.22, 0.09, 0.52);
        headMesh.add(rightGlint);
        // Cute Blush Cheeks
        const blushGeo = new THREE.SphereGeometry(0.07, 8, 8);
        blushGeo.scale(1.2, 0.6, 0.2);
        const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.65 });
        const leftBlush = new THREE.Mesh(blushGeo, blushMat);
        leftBlush.position.set(-0.32, -0.06, 0.44);
        headMesh.add(leftBlush);
        const rightBlush = new THREE.Mesh(blushGeo, blushMat);
        rightBlush.position.set(0.32, -0.06, 0.44);
        headMesh.add(rightBlush);
        // 3. 3D Hair (Stylized Anime Spiky / Flowing Hair)
        const hairGroup = new THREE.Group();
        const hairMat = new THREE.MeshStandardMaterial({
            color: hairColor,
            roughness: 0.5
        });
        // Hair base dome
        const hairBaseGeo = new THREE.SphereGeometry(0.58, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const hairBase = new THREE.Mesh(hairBaseGeo, hairMat);
        hairBase.position.y = 0.08;
        hairGroup.add(hairBase);
        // Front Anime Bangs (Cones / Tufts)
        for (let i = -3; i <= 3; i++) {
            const bangGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
            bangGeo.rotateX(Math.PI * 0.85);
            const bang = new THREE.Mesh(bangGeo, hairMat);
            bang.position.set(i * 0.12, 0.22, 0.48 - Math.abs(i) * 0.04);
            bang.rotation.z = -i * 0.15;
            hairGroup.add(bang);
        }
        // Glossy Hair Shine Band (Iconic Anime Specular Highlight)
        const shineGeo = new THREE.TorusGeometry(0.57, 0.022, 8, 24);
        shineGeo.rotateX(Math.PI * 0.45);
        const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
        const shine = new THREE.Mesh(shineGeo, shineMat);
        shine.position.y = 0.26;
        hairGroup.add(shine);
        // Sculpted Side Locks framing face
        const sideBangGeo = new THREE.ConeGeometry(0.09, 0.46, 6);
        sideBangGeo.rotateZ(0.2);
        const leftSideBang = new THREE.Mesh(sideBangGeo, hairMat);
        leftSideBang.position.set(-0.44, 0.08, 0.35);
        hairGroup.add(leftSideBang);
        const rightSideBang = new THREE.Mesh(sideBangGeo, hairMat);
        rightSideBang.rotation.z = -0.2;
        rightSideBang.position.set(0.44, 0.08, 0.35);
        hairGroup.add(rightSideBang);
        headMesh.add(hairGroup);
        // 4. Limbs: Arms with Weapon / Shield Sockets & Modern Armor Pauldrons
        const armGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.45, 8);
        const armMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });
        // Shoulder Pauldrons (Modern Stylized Armor Plates)
        const pauldronMat = new THREE.MeshStandardMaterial({
            color: isGm ? 0xffd700 : (job === 'Swordman' ? 0xd90429 : 0x334155),
            metalness: 0.65,
            roughness: 0.25
        });
        const pauldronGeo = new THREE.DodecahedronGeometry(0.18, 1);
        pauldronGeo.scale(1.1, 0.7, 1.2);
        // Left Arm (Shield hand)
        const leftArm = new THREE.Group();
        leftArm.position.set(-0.48, 0.2, 0);
        const leftArmMesh = new THREE.Mesh(armGeo, armMat);
        leftArmMesh.position.y = -0.2;
        leftArmMesh.castShadow = true;
        leftArm.add(leftArmMesh);
        const leftPauldron = new THREE.Mesh(pauldronGeo, pauldronMat);
        leftPauldron.position.set(-0.06, 0.04, 0);
        leftPauldron.castShadow = true;
        leftArm.add(leftPauldron);
        bodyMesh.add(leftArm);
        const shieldSlot = new THREE.Group();
        shieldSlot.position.set(0, -0.38, 0.12);
        leftArm.add(shieldSlot);
        // Right Arm (Weapon hand)
        const rightArm = new THREE.Group();
        rightArm.position.set(0.48, 0.2, 0);
        const rightArmMesh = new THREE.Mesh(armGeo, armMat);
        rightArmMesh.position.y = -0.2;
        rightArmMesh.castShadow = true;
        rightArm.add(rightArmMesh);
        const rightPauldron = new THREE.Mesh(pauldronGeo, pauldronMat);
        rightPauldron.position.set(0.06, 0.04, 0);
        rightPauldron.castShadow = true;
        rightArm.add(rightPauldron);
        bodyMesh.add(rightArm);
        const weaponSlot = new THREE.Group();
        weaponSlot.position.set(0, -0.38, 0.12);
        rightArm.add(weaponSlot);
        // 5. Legs & Boots
        const legGeo = new THREE.CylinderGeometry(0.13, 0.14, 0.42, 8);
        const bootMat = new THREE.MeshStandardMaterial({ color: 0x241711, roughness: 0.6 });
        const leftLeg = new THREE.Mesh(legGeo, bootMat);
        leftLeg.position.set(-0.2, -0.48, 0);
        leftLeg.castShadow = true;
        bodyMesh.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, bootMat);
        rightLeg.position.set(0.2, -0.48, 0);
        rightLeg.castShadow = true;
        bodyMesh.add(rightLeg);
        // Head Slot (Hats, Helmets, Crowns)
        const headSlot = new THREE.Group();
        headSlot.position.set(0, 0.55, 0);
        headMesh.add(headSlot);
        // Back Slot (Wings, Backpacks, Capes)
        const backSlot = new THREE.Group();
        backSlot.position.set(0, 0.05, -0.42);
        bodyMesh.add(backSlot);
        // Dynamic Flowing Cape / Scarf
        const capeGroup = new THREE.Group();
        capeGroup.position.set(0, 0.22, -0.22);
        const capeGeo = new THREE.PlaneGeometry(0.52, 0.82, 3, 5);
        const capeColors = {
            Swordman: 0x9d0208,
            Magician: 0x5a189a,
            Archer: 0x1b4332,
            Thief: 0x1a1a24,
            Acolyte: 0xd4af37,
            Merchant: 0xb05b22,
            Novice: 0x1d3557
        };
        const capeMat = new THREE.MeshStandardMaterial({
            color: isGm ? 0xffd700 : (capeColors[job] || 0x1d3557),
            roughness: 0.6,
            side: THREE.DoubleSide
        });
        const capeMesh = new THREE.Mesh(capeGeo, capeMat);
        capeMesh.position.set(0, -0.38, 0);
        capeMesh.castShadow = true;
        capeGroup.add(capeMesh);
        bodyMesh.add(capeGroup);
        // Class Specific Gear (From user image 3)
        this.applyClassAppearance(job, headSlot, weaponSlot, shieldSlot, backSlot);
        // 6. GM Crown & Wings & Starlight Aura if GM
        let crownMesh;
        let wingsMesh;
        let auraMesh;
        if (isGm) {
            // 3D Ornate Golden Crown
            crownMesh = this.createGmCrown();
            crownMesh.position.set(0, 0.68, 0);
            headSlot.add(crownMesh);
            // 3D Seraph Wings
            wingsMesh = this.createSeraphWings();
            backSlot.add(wingsMesh);
            // Radiant Aura on ground
            const auraGeo = new THREE.RingGeometry(0.4, 0.95, 32);
            const auraMat = new THREE.MeshBasicMaterial({
                color: 0xffd700,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.45
            });
            auraMesh = new THREE.Mesh(auraGeo, auraMat);
            auraMesh.rotation.x = -Math.PI / 2;
            auraMesh.position.y = 0.04;
            group.add(auraMesh);
            // Equip Holy Excalibur +10 in weapon slot
            weaponSlot.clear();
            weaponSlot.add(Weapon3DBuilder.createExcalibur().group);
        }
        // Shadow blob beneath character
        const shadowGeo = new THREE.CircleGeometry(0.6, 16);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.35
        });
        const shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
        shadowBlob.rotation.x = -Math.PI / 2;
        shadowBlob.position.y = 0.02;
        group.add(shadowBlob);
        // Procedural Animation Handler
        let attackStartedAt = -10;
        const ATTACK_DURATION = 0.35;
        const playAttack = (time) => {
            attackStartedAt = time;
        };
        const updateAnimation = (animIn, time, dt) => {
            // A queued swing overrides idle/walk until it finishes
            let anim = animIn;
            const swingT = (time - attackStartedAt) / ATTACK_DURATION;
            if (anim !== 'dead' && swingT >= 0 && swingT < 1)
                anim = 'attack';
            WeaponModelBuilder.animateGlow(weaponSlot, time);
            if (anim === 'dead') {
                bodyMesh.rotation.x = -1.35;
                bodyMesh.position.y = 0.42;
                leftArm.rotation.x = -0.4;
                rightArm.rotation.x = -0.4;
                leftLeg.rotation.x = 0;
                rightLeg.rotation.x = 0;
                return;
            }
            // Aura Pulse & Rotation
            if (auraMesh) {
                auraMesh.rotation.z += dt * 1.5;
                const s = 1.0 + Math.sin(time * 3) * 0.12;
                auraMesh.scale.set(s, s, 1);
            }
            // Crown Gentle Float
            if (crownMesh) {
                crownMesh.position.y = 0.68 + Math.sin(time * 3.5) * 0.06;
            }
            // Wing Flutter
            if (wingsMesh) {
                const wingFlap = Math.sin(time * 4) * 0.2;
                wingsMesh.children[0]?.rotation.set(0, wingFlap, 0);
                wingsMesh.children[1]?.rotation.set(0, -wingFlap, 0);
            }
            // Cape Wind Flutter
            if (capeGroup) {
                const isRun = anim === 'walk';
                const windCycle = isRun ? time * 11 : time * 3;
                const baseAngle = isRun ? 0.65 : 0.15;
                capeGroup.rotation.x = baseAngle + Math.sin(windCycle) * (isRun ? 0.18 : 0.05);
                capeGroup.rotation.y = Math.cos(windCycle * 0.7) * 0.04;
            }
            if (anim === 'walk') {
                const cycle = time * 9;
                leftLeg.rotation.x = Math.sin(cycle) * 0.55;
                rightLeg.rotation.x = -Math.sin(cycle) * 0.55;
                leftArm.rotation.x = -Math.sin(cycle) * 0.45;
                rightArm.rotation.x = Math.sin(cycle) * 0.45;
                bodyMesh.position.y = 0.82 + Math.abs(Math.sin(cycle * 2)) * 0.08;
                bodyMesh.rotation.x = 0.12; // Forward lean sprint
                headMesh.position.y = 0.65 + Math.abs(Math.sin(cycle * 2)) * 0.03;
            }
            else if (anim === 'jump') {
                leftLeg.rotation.x = -0.4;
                rightLeg.rotation.x = -0.3;
                leftArm.rotation.x = 0.6;
                rightArm.rotation.x = 0.6;
                bodyMesh.position.y = 0.95;
                bodyMesh.rotation.x = 0;
            }
            else if (anim === 'attack') {
                // Wind up over the shoulder, then slash down and across
                const t = Math.max(0, Math.min(1, swingT));
                const ease = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
                const strike = t < 0.3 ? 0 : Math.sin(((t - 0.3) / 0.7) * Math.PI);
                rightArm.rotation.x = -2.3 * ease + 0.9 * strike;
                rightArm.rotation.z = 0.35 * strike;
                leftArm.rotation.x = -0.5 * ease;
                bodyMesh.rotation.y = -0.35 * ease + 0.45 * strike;
                bodyMesh.rotation.x = 0.08;
                bodyMesh.position.y = 0.82;
            }
            else {
                // Idle breathing
                const breath = Math.sin(time * 2.2) * 0.02;
                bodyMesh.position.y = 0.82 + breath;
                bodyMesh.rotation.x = 0;
                headMesh.position.y = 0.65 + breath * 0.5;
                leftArm.rotation.x = Math.sin(time * 1.8) * 0.08;
                rightArm.rotation.x = -Math.sin(time * 1.8) * 0.08;
                leftLeg.rotation.x = 0;
                rightLeg.rotation.x = 0;
                rightArm.rotation.z = 0;
                bodyMesh.rotation.y = 0;
            }
        };
        let currentWeaponKey = '__class_default__';
        const setWeapon = (weaponType, refine = 0, rarity = 'common', isExcalibur = false) => {
            const key = `${weaponType || 'none'}:${refine}:${rarity}:${isExcalibur}`;
            if (key === currentWeaponKey)
                return;
            currentWeaponKey = key;
            weaponSlot.clear();
            shieldSlot.clear();
            if (!weaponType || weaponType === 'fist')
                return;
            if (isExcalibur) {
                weaponSlot.add(Weapon3DBuilder.createExcalibur().group);
            }
            else if (refine >= 7 || rarity === 'legendary' || rarity === 'epic') {
                if (weaponType === 'sword') {
                    weaponSlot.add(Weapon3DBuilder.createExcalibur().group);
                }
                else if (weaponType === 'greatsword') {
                    weaponSlot.add(Weapon3DBuilder.createDragonSlayer().group);
                }
                else if (weaponType === 'staff' || weaponType === 'rod') {
                    weaponSlot.add(Weapon3DBuilder.createArchangelStaff().group);
                }
                else if (weaponType === 'bow') {
                    weaponSlot.add(Weapon3DBuilder.createAstralBow().group);
                }
                else if (weaponType === 'dagger') {
                    weaponSlot.add(Weapon3DBuilder.createNightshadeDagger().group);
                }
                else {
                    weaponSlot.add(WeaponModelBuilder.create(weaponType, refine, rarity));
                }
            }
            else {
                weaponSlot.add(WeaponModelBuilder.create(weaponType, refine, rarity));
            }
            // Off-hand gear that suits the class and weapon
            if (job === 'Swordman' && (weaponType === 'sword' || weaponType === 'greatsword')) {
                shieldSlot.add(Weapon3DBuilder.createAegisShield().group);
            }
            else if (job === 'Thief' && weaponType === 'dagger') {
                shieldSlot.add(Weapon3DBuilder.createNightshadeDagger().group);
            }
        };
        const setEquipment = (equipped) => {
            const w = equipped.weapon;
            if (!w) {
                setWeapon(undefined);
                return;
            }
            setWeapon(inferWeaponType(w), w.refine || 0, w.rarity || (w.id.startsWith('gm_') ? 'legendary' : 'common'), w.id.includes('excalibur'));
        };
        return {
            group,
            bodyMesh,
            headMesh,
            hairMesh: hairGroup,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            weaponSlot,
            shieldSlot,
            headSlot,
            backSlot,
            crownMesh,
            wingsMesh,
            auraMesh,
            capeMesh: capeGroup,
            updateAnimation,
            setEquipment,
            setWeapon,
            playAttack
        };
    }
    /**
     * Apply Class Hats, Robes, and Starter Gear matching User's Image 3
     */
    static applyClassAppearance(job, headSlot, weaponSlot, shieldSlot, backSlot) {
        if (job === 'Magician') {
            // Wizard Hat (Pointy Cone with wide brim)
            const brimGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.05, 16);
            const hatMat = new THREE.MeshStandardMaterial({ color: 0x3a0ca3, roughness: 0.6 });
            const brim = new THREE.Mesh(brimGeo, hatMat);
            const coneGeo = new THREE.ConeGeometry(0.42, 0.85, 12);
            coneGeo.rotateZ(0.12);
            const cone = new THREE.Mesh(coneGeo, hatMat);
            cone.position.set(-0.06, 0.42, 0);
            const wizardHat = new THREE.Group();
            wizardHat.add(brim);
            wizardHat.add(cone);
            wizardHat.position.y = 0.02;
            headSlot.add(wizardHat);
            // Magic Archangel Staff
            weaponSlot.add(Weapon3DBuilder.createArchangelStaff().group);
        }
        else if (job === 'Archer') {
            // Hunter Hood
            const hoodGeo = new THREE.SphereGeometry(0.62, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.7);
            const hoodMat = new THREE.MeshStandardMaterial({ color: 0x2b9348, roughness: 0.7 });
            const hood = new THREE.Mesh(hoodGeo, hoodMat);
            hood.position.y = -0.05;
            headSlot.add(hood);
            // Astral Composite Bow
            weaponSlot.add(Weapon3DBuilder.createAstralBow().group);
        }
        else if (job === 'Swordman') {
            // Knight Visor Helmet
            const helmGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.65, 14);
            const helmMat = new THREE.MeshStandardMaterial({ color: 0xadb5bd, metalness: 0.65, roughness: 0.35 });
            const helm = new THREE.Mesh(helmGeo, helmMat);
            helm.position.y = -0.08;
            // Visor slit
            const slitGeo = new THREE.BoxGeometry(0.42, 0.08, 0.1);
            const slitMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
            const slit = new THREE.Mesh(slitGeo, slitMat);
            slit.position.set(0, 0, 0.3);
            helm.add(slit);
            headSlot.add(helm);
            // Holy Excalibur & Aegis Shield
            weaponSlot.add(Weapon3DBuilder.createExcalibur().group);
            shieldSlot.add(Weapon3DBuilder.createAegisShield().group);
        }
        else if (job === 'Acolyte') {
            // Holy Cleric Archangel Staff & Aegis Shield
            weaponSlot.add(Weapon3DBuilder.createArchangelStaff().group);
            shieldSlot.add(Weapon3DBuilder.createAegisShield().group);
        }
        else if (job === 'Thief') {
            // Assassin Cowl / Mask
            const maskGeo = new THREE.BoxGeometry(0.48, 0.22, 0.12);
            const maskMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24 });
            const mask = new THREE.Mesh(maskGeo, maskMat);
            mask.position.set(0, -0.12, 0.48);
            headSlot.add(mask);
            // Dual Nightshade Daggers
            weaponSlot.add(Weapon3DBuilder.createNightshadeDagger().group);
            shieldSlot.add(Weapon3DBuilder.createNightshadeDagger().group);
        }
        else if (job === 'Merchant') {
            // Giant Coin Sack on Back
            const sackGeo = new THREE.SphereGeometry(0.45, 12, 12);
            sackGeo.scale(1.0, 1.3, 0.85);
            const sackMat = new THREE.MeshStandardMaterial({ color: 0xa06034, roughness: 0.8 });
            const sack = new THREE.Mesh(sackGeo, sackMat);
            sack.position.set(0, 0.1, -0.25);
            backSlot.add(sack);
            // Dragon Slayer Heavy Greatsword
            weaponSlot.add(Weapon3DBuilder.createDragonSlayer().group);
        }
        else {
            // Novice Starter Knife
            weaponSlot.add(this.createDagger());
        }
    }
    /**
     * 3D Holy Excalibur +10 [GM] Model
     */
    static createExcaliburSword() {
        const sword = new THREE.Group();
        // Golden Blade
        const bladeGeo = new THREE.BoxGeometry(0.12, 1.25, 0.04);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffea00,
            emissiveIntensity: 0.3,
            metalness: 0.9,
            roughness: 0.15
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.65;
        sword.add(blade);
        // Tip (Pointy Triangle)
        const tipGeo = new THREE.ConeGeometry(0.08, 0.25, 4);
        tipGeo.rotateY(Math.PI / 4);
        const tip = new THREE.Mesh(tipGeo, bladeMat);
        tip.position.y = 1.38;
        sword.add(tip);
        // Crossguard (Ornate Gold Wings)
        const guardGeo = new THREE.BoxGeometry(0.44, 0.08, 0.1);
        const guardMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.8, roughness: 0.2 });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.y = 0.05;
        sword.add(guard);
        // Ruby Center Gem
        const gemGeo = new THREE.OctahedronGeometry(0.06);
        const gemMat = new THREE.MeshBasicMaterial({ color: 0xe63946 });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        gem.position.set(0, 0.05, 0.06);
        sword.add(gem);
        // Hilt / Grip
        const hiltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8);
        const hiltMat = new THREE.MeshStandardMaterial({ color: 0x3d2614, roughness: 0.6 });
        const hilt = new THREE.Mesh(hiltGeo, hiltMat);
        hilt.position.y = -0.15;
        sword.add(hilt);
        sword.rotation.x = Math.PI / 2;
        return sword;
    }
    static createSteelSword() {
        const sword = new THREE.Group();
        const bladeGeo = new THREE.BoxGeometry(0.1, 0.95, 0.03);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xced4da, metalness: 0.85, roughness: 0.2 });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.5;
        sword.add(blade);
        // Glowing Azure Rune Fuller down blade
        const runeGeo = new THREE.BoxGeometry(0.02, 0.75, 0.035);
        const runeMat = new THREE.MeshStandardMaterial({
            color: 0x4cc9f0,
            emissive: 0x00b4d8,
            emissiveIntensity: 0.75,
            roughness: 0.1
        });
        const rune = new THREE.Mesh(runeGeo, runeMat);
        rune.position.y = 0.5;
        sword.add(rune);
        const guardGeo = new THREE.BoxGeometry(0.34, 0.06, 0.08);
        const guardMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.8, roughness: 0.3 });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        sword.add(guard);
        sword.rotation.x = Math.PI / 2;
        return sword;
    }
    static createKiteShield() {
        const shield = new THREE.Group();
        const plateGeo = new THREE.BoxGeometry(0.48, 0.65, 0.08);
        const plateMat = new THREE.MeshStandardMaterial({ color: 0x415a77, metalness: 0.6, roughness: 0.3 });
        const plate = new THREE.Mesh(plateGeo, plateMat);
        // Gold Cross & Border on Shield
        const crossVGeo = new THREE.BoxGeometry(0.1, 0.55, 0.09);
        const crossHGeo = new THREE.BoxGeometry(0.38, 0.1, 0.09);
        const crossMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.8, roughness: 0.25 });
        const crossV = new THREE.Mesh(crossVGeo, crossMat);
        const crossH = new THREE.Mesh(crossHGeo, crossMat);
        plate.add(crossV);
        plate.add(crossH);
        shield.add(plate);
        shield.position.set(0, 0, 0.15);
        return shield;
    }
    static createMagicStaff() {
        const staff = new THREE.Group();
        const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.25, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.6 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 0.6;
        staff.add(pole);
        // Golden Astral Wing Socket
        const wingGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 16, Math.PI);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.8 });
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.y = 1.2;
        staff.add(wing);
        // Glowing Magic Orb on Top with Pulses
        const orbGeo = new THREE.SphereGeometry(0.16, 16, 16);
        const orbMat = new THREE.MeshStandardMaterial({
            color: 0x4cc9f0,
            emissive: 0x00b4d8,
            emissiveIntensity: 0.85,
            roughness: 0.1
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.y = 1.32;
        staff.add(orb);
        staff.rotation.x = Math.PI / 2;
        return staff;
    }
    static createHolyStaff() {
        const staff = new THREE.Group();
        const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xfff3b0, metalness: 0.6, roughness: 0.25 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 0.6;
        staff.add(pole);
        // Radiant Golden Cross Top with Amber Core
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.06), poleMat);
        crossV.position.y = 1.35;
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.06), poleMat);
        crossH.position.y = 1.4;
        staff.add(crossV);
        staff.add(crossH);
        const amberGeo = new THREE.OctahedronGeometry(0.07);
        const amberMat = new THREE.MeshBasicMaterial({ color: 0xff9e00 });
        const amber = new THREE.Mesh(amberGeo, amberMat);
        amber.position.set(0, 1.4, 0.04);
        staff.add(amber);
        staff.rotation.x = Math.PI / 2;
        return staff;
    }
    static createWoodenBow() {
        const bow = new THREE.Group();
        const curve = new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8);
        curve.scale(1, 1, 0.35);
        const bowMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.6 });
        const bowMesh = new THREE.Mesh(curve, bowMat);
        bow.add(bowMesh);
        // Luminous Golden String
        const stringGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.1, 4);
        const stringMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
        const bowString = new THREE.Mesh(stringGeo, stringMat);
        bowString.position.z = -0.16;
        bow.add(bowString);
        return bow;
    }
    static createDagger() {
        const dagger = new THREE.Group();
        const bladeGeo = new THREE.BoxGeometry(0.08, 0.55, 0.02);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xadb5bd,
            metalness: 0.85,
            roughness: 0.2,
            emissive: 0x7209b7,
            emissiveIntensity: 0.35
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.28;
        dagger.add(blade);
        dagger.rotation.x = Math.PI / 2;
        return dagger;
    }
    static createClub() {
        const club = new THREE.Group();
        const geo = new THREE.CylinderGeometry(0.12, 0.05, 0.8, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x5a3e2b, roughness: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.4;
        club.add(mesh);
        club.rotation.x = Math.PI / 2;
        return club;
    }
    /**
     * 3D GM Royal Golden Crown with Rubies
     */
    static createGmCrown() {
        const crown = new THREE.Group();
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.85,
            roughness: 0.2,
            emissive: 0xffd700,
            emissiveIntensity: 0.25
        });
        // Crown Base Ring
        const baseGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.12, 16);
        const baseRing = new THREE.Mesh(baseGeo, goldMat);
        crown.add(baseRing);
        // 5 Ornate Peaks
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const height = i === 0 ? 0.32 : (i % 2 === 1 ? 0.24 : 0.18);
            const peakGeo = new THREE.ConeGeometry(0.08, height, 6);
            const peak = new THREE.Mesh(peakGeo, goldMat);
            peak.position.set(Math.cos(angle) * 0.34, 0.06 + height / 2, Math.sin(angle) * 0.34);
            crown.add(peak);
        }
        // Center Big Ruby Gem
        const rubyGeo = new THREE.OctahedronGeometry(0.08);
        const rubyMat = new THREE.MeshBasicMaterial({ color: 0xe63946 });
        const ruby = new THREE.Mesh(rubyGeo, rubyMat);
        ruby.position.set(0, 0.26, 0.36);
        crown.add(ruby);
        return crown;
    }
    /**
     * 3D Seraph Wings [GM]
     */
    static createSeraphWings() {
        const wings = new THREE.Group();
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xfff3b0,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.9,
            roughness: 0.2
        });
        // Left Wing
        const leftWing = new THREE.Group();
        for (let i = 0; i < 4; i++) {
            const featherGeo = new THREE.BoxGeometry(0.12, 0.55 - i * 0.08, 0.02);
            const feather = new THREE.Mesh(featherGeo, wingMat);
            feather.position.set(-0.25 - i * 0.12, 0.15 - i * 0.08, 0);
            feather.rotation.z = -0.35 - i * 0.15;
            leftWing.add(feather);
        }
        wings.add(leftWing);
        // Right Wing
        const rightWing = new THREE.Group();
        for (let i = 0; i < 4; i++) {
            const featherGeo = new THREE.BoxGeometry(0.12, 0.55 - i * 0.08, 0.02);
            const feather = new THREE.Mesh(featherGeo, wingMat);
            feather.position.set(0.25 + i * 0.12, 0.15 - i * 0.08, 0);
            feather.rotation.z = 0.35 + i * 0.15;
            rightWing.add(feather);
        }
        wings.add(rightWing);
        return wings;
    }
    /**
     * Try to load a GLTF character model (Michelle or Robot).
     * Falls back silently — caller should use createCharacter() as fallback.
     */
    static async tryLoadGLTFPlayer(job) {
        // Map jobs to character models
        const glbMap = {
            'Swordman': 'monster_soldier.glb',
            'Magician': 'char_michelle.glb',
            'Archer': 'char_cesiumman.glb',
            'Thief': 'char_robot.glb',
            'Acolyte': 'char_xbot.glb',
            'Merchant': 'char_robot.glb',
        };
        const file = glbMap[job];
        if (!file)
            return null;
        try {
            const loader = await ModelLoader.getInstance();
            const model = await loader.tryLoad(file);
            if (!model)
                return null;
            const group = new THREE.Group();
            loader.normalizeModel(model.scene, 1.6);
            group.add(model.scene);
            // Start idle animation
            model.play('idle', true);
            // Store mixer update on group userData
            group.__gltfModel = model;
            return group;
        }
        catch {
            return null;
        }
    }
}
