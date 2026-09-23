/**
 * AETHERGARD ONLINE — WeaponModelBuilder
 * Procedural low-poly weapons for every WeaponType. Each weapon is modelled
 * along +Y with the grip at the origin, then tilted forward to sit in the
 * character's right-hand weaponSlot. Rarity changes the metal/rune palette
 * and refine +7 and above adds a pulsing glow.
 */
import * as THREE from 'three';
import { inferWeaponType } from '../../../server/src/GameData.js';
const PALETTES = {
    common: { metal: 0xced4da, rune: 0x94a3b8, accent: 0x8d6e63, runeIntensity: 0.0 },
    uncommon: { metal: 0xd8e2dc, rune: 0x4ade80, accent: 0xa3a380, runeIntensity: 0.55 },
    rare: { metal: 0xcfe8ff, rune: 0x4cc9f0, accent: 0xffd166, runeIntensity: 0.8 },
    epic: { metal: 0xe0c3fc, rune: 0xa855f7, accent: 0xffd166, runeIntensity: 0.95 },
    legendary: { metal: 0xffe8a3, rune: 0xffb703, accent: 0xe63946, runeIntensity: 1.1 }
};
const WOOD = 0x6f4e37;
const LEATHER = 0x3d2614;
export class WeaponModelBuilder {
    /** Build the weapon mesh for an equipped item (or bare type + refine) */
    static create(weaponType, refine = 0, rarity = 'common') {
        const pal = PALETTES[rarity] || PALETTES.common;
        const metal = new THREE.MeshStandardMaterial({ color: pal.metal, metalness: 0.85, roughness: 0.22 });
        const rune = new THREE.MeshStandardMaterial({
            color: pal.rune, emissive: pal.rune, emissiveIntensity: pal.runeIntensity, roughness: 0.15
        });
        const accent = new THREE.MeshStandardMaterial({ color: pal.accent, metalness: 0.7, roughness: 0.3 });
        const wood = new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.7 });
        const leather = new THREE.MeshStandardMaterial({ color: LEATHER, roughness: 0.8 });
        let weapon;
        switch (weaponType) {
            case 'dagger':
                weapon = this.dagger(metal, rune, accent, leather);
                break;
            case 'sword':
                weapon = this.sword(metal, rune, accent, leather, 1.0);
                break;
            case 'greatsword':
                weapon = this.sword(metal, rune, accent, leather, 1.45);
                break;
            case 'spear':
                weapon = this.spear(metal, rune, wood);
                break;
            case 'axe':
                weapon = this.axe(metal, rune, wood);
                break;
            case 'mace':
                weapon = this.mace(metal, rune, wood);
                break;
            case 'scythe':
                weapon = this.scythe(metal, rune, accent);
                break;
            case 'staff':
                weapon = this.staff(rune, accent, wood);
                break;
            case 'rod':
                weapon = this.rod(rune, accent);
                break;
            case 'bow':
                weapon = this.bow(wood, rune, accent);
                break;
            default:
                weapon = new THREE.Group();
                break;
        }
        weapon.traverse(o => {
            if (o.isMesh)
                o.castShadow = true;
        });
        // Refine +7 and up: weapon glows brighter with every level
        if (refine >= 7) {
            const glowMat = new THREE.SpriteMaterial({
                color: refine >= 10 ? 0xffd166 : 0x4cc9f0,
                transparent: true,
                opacity: 0.35 + (refine - 7) * 0.08,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const glow = new THREE.Sprite(glowMat);
            glow.scale.set(0.9, 1.6, 1);
            glow.position.y = 0.6;
            glow.name = 'refine_glow';
            weapon.add(glow);
            rune.emissiveIntensity = Math.max(rune.emissiveIntensity, 0.9) + (refine - 7) * 0.2;
        }
        weapon.userData.weaponType = weaponType;
        // Bows are held upright; everything else points forward from the fist
        if (weaponType !== 'bow')
            weapon.rotation.x = Math.PI / 2;
        return weapon;
    }
    static createForItem(item) {
        if (!item)
            return null;
        return this.create(inferWeaponType(item), item.refine || 0, item.rarity || (item.id.startsWith('gm_') ? 'legendary' : 'common'));
    }
    /** Pulse the refine glow — call from the render loop */
    static animateGlow(weaponRoot, time) {
        const glow = weaponRoot.getObjectByName('refine_glow');
        if (glow) {
            const s = 1 + Math.sin(time * 4) * 0.12;
            glow.scale.set(0.9 * s, 1.6 * s, 1);
        }
    }
    // ---------------------------------------------------------------------------
    static dagger(metal, rune, accent, grip) {
        const g = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.02), metal);
        blade.position.y = 0.3;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.057, 0.14, 4), metal);
        tip.rotation.y = Math.PI / 4;
        tip.position.y = 0.62;
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.42, 0.025), rune);
        edge.position.y = 0.3;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.06), accent);
        guard.position.y = 0.04;
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 6), grip);
        hilt.position.y = -0.06;
        g.add(blade, tip, edge, guard, hilt);
        return g;
    }
    static sword(metal, rune, accent, grip, scale) {
        const g = new THREE.Group();
        const len = 0.95 * scale;
        const width = 0.1 * (scale > 1 ? 1.5 : 1);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(width, len, 0.035), metal);
        blade.position.y = 0.08 + len / 2;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(width * 0.72, 0.2, 4), metal);
        tip.rotation.y = Math.PI / 4;
        tip.position.y = 0.08 + len + 0.1;
        const fuller = new THREE.Mesh(new THREE.BoxGeometry(width * 0.22, len * 0.8, 0.04), rune);
        fuller.position.y = 0.08 + len / 2;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34 * (scale > 1 ? 1.35 : 1), 0.07, 0.09), accent);
        guard.position.y = 0.04;
        const hiltLen = scale > 1 ? 0.36 : 0.22;
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, hiltLen, 8), grip);
        hilt.position.y = -hiltLen / 2;
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), accent);
        pommel.position.y = -hiltLen;
        g.add(blade, tip, fuller, guard, hilt, pommel);
        return g;
    }
    static spear(metal, rune, wood) {
        const g = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.9, 8), wood);
        shaft.position.y = 0.55;
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.36, 4), metal);
        head.position.y = 1.68;
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 6, 12), rune);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 1.5;
        const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), rune);
        tassel.rotation.x = Math.PI;
        tassel.position.y = 1.4;
        g.add(shaft, head, collar, tassel);
        g.position.y = -0.3;
        return g;
    }
    static axe(metal, rune, wood) {
        const g = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.05, 8), wood);
        handle.position.y = 0.4;
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, -0.14);
        bladeShape.quadraticCurveTo(0.42, -0.34, 0.4, 0);
        bladeShape.quadraticCurveTo(0.42, 0.34, 0, 0.14);
        bladeShape.lineTo(0, -0.14);
        const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.04, bevelEnabled: false });
        bladeGeo.translate(0.02, 0, -0.02);
        const blade = new THREE.Mesh(bladeGeo, metal);
        blade.position.y = 0.8;
        const back = blade.clone();
        back.scale.set(-0.55, 0.7, 1);
        const rim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.05), rune);
        rim.position.set(0.41, 0.8, 0);
        g.add(handle, blade, back, rim);
        return g;
    }
    static mace(metal, rune, wood) {
        const g = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.7, 8), wood);
        handle.position.y = 0.25;
        const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), metal);
        head.position.y = 0.7;
        g.add(handle, head);
        for (let i = 0; i < 6; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), rune);
            const a = (i / 6) * Math.PI * 2;
            spike.position.set(Math.cos(a) * 0.16, 0.7, Math.sin(a) * 0.16);
            spike.lookAt(Math.cos(a) * 2, 0.7, Math.sin(a) * 2);
            spike.rotateX(Math.PI / 2);
            g.add(spike);
        }
        return g;
    }
    static scythe(metal, rune, accent) {
        const g = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8), new THREE.MeshStandardMaterial({ color: 0x1f1f2e, roughness: 0.5 }));
        shaft.position.y = 0.5;
        const blade = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 4, 20, Math.PI * 0.7), metal);
        blade.scale.set(1, 1, 0.3);
        blade.position.set(-0.42, 1.3, 0);
        const edge = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.012, 4, 20, Math.PI * 0.7), rune);
        edge.position.copy(blade.position);
        const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), accent);
        cap.position.y = 1.37;
        g.add(shaft, blade, edge, cap);
        g.position.y = -0.3;
        return g;
    }
    static staff(rune, accent, wood) {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.35, 8), wood);
        pole.position.y = 0.55;
        const claw = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 6, 14, Math.PI * 1.4), accent);
        claw.rotation.z = -Math.PI * 0.2;
        claw.position.y = 1.3;
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), rune);
        orb.position.y = 1.3;
        orb.name = 'staff_orb';
        g.add(pole, claw, orb);
        g.position.y = -0.25;
        return g;
    }
    static rod(rune, accent) {
        const g = new THREE.Group();
        const ivory = new THREE.MeshStandardMaterial({ color: 0xfff3b0, metalness: 0.5, roughness: 0.3 });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8), ivory);
        pole.position.y = 0.5;
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.05), accent);
        crossV.position.y = 1.2;
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.05), accent);
        crossH.position.y = 1.25;
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), rune);
        gem.position.set(0, 1.25, 0.04);
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 20), rune);
        halo.position.y = 1.25;
        g.add(pole, crossV, crossH, gem, halo);
        g.position.y = -0.2;
        return g;
    }
    static bow(wood, rune, accent) {
        const g = new THREE.Group();
        const limb = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.032, 6, 24, Math.PI * 0.85), wood);
        limb.rotation.z = Math.PI / 2 + Math.PI * 0.075;
        limb.position.z = 0.02;
        limb.rotation.y = Math.PI / 2;
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 8), accent);
        const tipTop = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), rune);
        tipTop.position.set(0, 0.57, -0.24);
        const tipBottom = tipTop.clone();
        tipBottom.position.y = -0.57;
        const string = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.14, 4), new THREE.MeshBasicMaterial({ color: 0xf8f9fa }));
        string.position.z = -0.24;
        g.add(limb, grip, tipTop, tipBottom, string);
        g.position.set(0, 0.1, 0.1);
        return g;
    }
}
