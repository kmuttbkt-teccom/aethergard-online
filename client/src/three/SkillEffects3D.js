/**
 * AETHERGARD ONLINE — SkillEffects3D
 * Time-based visual effects for skills, projectiles, hits and floating text.
 * Every effect is ticked from ThreeWorld's render loop and disposes its own
 * GPU resources when it finishes.
 */
import * as THREE from 'three';
import { SKILL_DB, WEAPON_PROFILES } from '../../../server/src/GameData.js';
import { SkillEffect3DManager } from './SkillEffect3DManager.js';
export const ELEMENT_COLORS = {
    neutral: 0xffffff,
    fire: 0xff5a1f,
    ice: 0x7dd3fc,
    wind: 0x6ee7b7,
    holy: 0xffd166,
    shadow: 0xa855f7,
    earth: 0xd4a373
};
/** Collects every geometry/material/texture created for an effect so it can be freed */
class Disposables {
    items = [];
    track(item) {
        this.items.push(item);
        return item;
    }
    dispose() {
        this.items.forEach(i => i.dispose());
        this.items = [];
    }
}
export class SkillEffects3D {
    scene;
    effects = [];
    advancedEffects;
    constructor(scene) {
        this.scene = scene;
        this.advancedEffects = new SkillEffect3DManager(scene);
    }
    update(dt) {
        this.advancedEffects.update(dt);
        // Effects may spawn follow-up effects (impacts, explosions) while updating,
        // so collect those in a fresh array instead of mutating the one we iterate.
        const current = this.effects;
        this.effects = [];
        const survivors = current.filter(e => {
            const alive = e.update(dt);
            if (!alive)
                e.dispose();
            return alive;
        });
        this.effects = survivors.concat(this.effects);
    }
    clear() {
        this.advancedEffects.clear();
        this.effects.forEach(e => e.dispose());
        this.effects = [];
    }
    // ---------------------------------------------------------------------------
    // High level: play the right visuals for a skill cast
    // ---------------------------------------------------------------------------
    /**
     * @param caster  caster position (feet)
     * @param rotY    caster facing
     * @param target  primary target position (feet) if any
     * @param center  AOE centre (feet)
     * @param onImpact called when the projectile/meteor lands (for hit sparks)
     */
    playSkill(skillId, caster, rotY, target, center, weaponType = 'fist') {
        // Intercept with high-fidelity 3D spell effects
        if (this.advancedEffects.playSkill(skillId, caster, rotY, target, center)) {
            return;
        }
        const skill = SKILL_DB[skillId];
        const color = skill ? ELEMENT_COLORS[skill.element] : 0xffffff;
        const radius = skill ? skill.radius * 0.03 : 2;
        switch (skillId) {
            case 'NORMAL': {
                const kind = WEAPON_PROFILES[weaponType].kind;
                if (kind === 'ranged' && target)
                    this.projectile(caster, target, 'arrow', 0xf8f9fa);
                else if (kind === 'magic' && target)
                    this.projectile(caster, target, 'orb', weaponType === 'rod' ? 0xffd166 : 0x7dd3fc);
                else
                    this.slashArc(caster, rotY, 0xffffff, 1.0);
                break;
            }
            case 'BASH':
                this.slashArc(caster, rotY, 0xff7b00, 1.35);
                if (target)
                    this.impact(target, 0xff7b00, 1.2);
                break;
            case 'RADIANT_SLASH':
                this.spinSlash(caster, color, radius);
                this.groundRing(caster, radius, color, 0.5);
                break;
            case 'FIRST_AID':
                this.healPillar(caster, 0x86efac, 0.7);
                break;
            case 'SOLAR_AEGIS':
                this.healPillar(caster, 0xffd166);
                this.dome(caster, 0xffd166);
                break;
            case 'ASTRAL_METEOR':
                this.meteor(center, radius, color);
                break;
            case 'FROST_NOVA':
                this.nova(caster, radius, color);
                break;
            case 'GALE_ARROW':
                if (target)
                    this.projectile(caster, target, 'arrow', color, 1.6);
                break;
            case 'RAIN_OF_LIGHT':
                this.lightRain(center, radius, color);
                break;
            case 'SHADOW_BLINK':
                this.smoke(caster, color);
                if (target) {
                    this.smoke(target, color);
                    this.impact(target, color, 1.4);
                }
                break;
            case 'BLADE_DANCE':
                this.bladeDance(caster, radius, color);
                break;
            case 'SANCTUARY':
                this.groundRing(caster, radius, color, 1.2, true);
                this.healPillar(caster, 0x86efac);
                break;
            case 'JUDGMENT_FIST':
                if (target) {
                    this.impact(target, color, 1.5);
                    this.healPillar(target, color, 0.6);
                }
                break;
            case 'COIN_BURST':
                this.coinBurst(caster, radius);
                break;
            case 'GREED_VACUUM':
                this.vortex(caster, radius, 0xffd166);
                break;
            case 'DRAGON_BREATH':
                if (target) {
                    this.dragonFlameJet(caster, target);
                }
                else {
                    this.meteor(center, radius, 0xff4500);
                }
                break;
            case 'METEOR_STORM':
                for (let i = 0; i < 4; i++) {
                    const offset = new THREE.Vector3(center.x + (Math.random() - 0.5) * radius * 1.5, center.y, center.z + (Math.random() - 0.5) * radius * 1.5);
                    setTimeout(() => this.meteor(offset, radius * 0.6, 0xff3300), i * 180);
                }
                break;
            case 'ABYSSAL_VORTEX':
                this.vortex(center, radius, 0x7209b7);
                this.smoke(center, 0x3a0ca3);
                break;
            case 'SHADOW_CLEAVE':
                this.slashArc(caster, rotY, 0xb5179e, 1.8);
                if (target)
                    this.impact(target, 0xd90429, 1.6);
                break;
            case 'TITAN_SMASH':
                this.groundRing(caster, radius * 1.3, 0x588157, 0.8);
                this.impact(caster, 0xd4a373, 2.0);
                break;
            default:
                this.slashArc(caster, rotY, color, 1.0);
        }
    }
    // ---------------------------------------------------------------------------
    // Primitive effects
    // ---------------------------------------------------------------------------
    slashArc(pos, rotY, color, scale = 1) {
        const d = new Disposables();
        const geo = d.track(new THREE.TorusGeometry(1.1 * scale, 0.07 * scale, 6, 20, Math.PI * 0.9));
        const mat = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x + Math.sin(rotY) * 0.9, 1.0, pos.z + Math.cos(rotY) * 0.9);
        mesh.rotation.set(Math.PI / 2.4, rotY + Math.PI / 2, 0);
        this.scene.add(mesh);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                mesh.rotation.z -= dt * 14;
                mesh.scale.setScalar(1 + t * 2.5);
                mat.opacity = Math.max(0, 0.95 - t * 4);
                return t < 0.25;
            },
            dispose: () => { this.scene.remove(mesh); d.dispose(); }
        });
    }
    impact(pos, color, scale = 1) {
        const d = new Disposables();
        const group = new THREE.Group();
        group.position.set(pos.x, 1.0, pos.z);
        const mat = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
        const geo = d.track(new THREE.OctahedronGeometry(0.12 * scale));
        const shards = [];
        for (let i = 0; i < 10; i++) {
            const m = new THREE.Mesh(geo, mat);
            const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 3);
            group.add(m);
            shards.push({ mesh: m, vel });
        }
        const flashGeo = d.track(new THREE.SphereGeometry(0.4 * scale, 12, 8));
        const flash = new THREE.Mesh(flashGeo, mat);
        group.add(flash);
        this.scene.add(group);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                shards.forEach(s => {
                    s.mesh.position.addScaledVector(s.vel, dt);
                    s.vel.y -= 9 * dt;
                });
                flash.scale.setScalar(1 + t * 5);
                mat.opacity = Math.max(0, 1 - t * 3);
                return t < 0.35;
            },
            dispose: () => { this.scene.remove(group); d.dispose(); }
        });
    }
    dragonFlameJet(from, to) {
        const d = new Disposables();
        const group = new THREE.Group();
        const dir = new THREE.Vector3().subVectors(to, from);
        const dist = Math.max(1, dir.length());
        const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
        mid.y = 1.3;
        const beamGeo = d.track(new THREE.CylinderGeometry(0.35, 1.4, dist, 8));
        beamGeo.rotateX(Math.PI / 2);
        const beamMat = d.track(new THREE.MeshStandardMaterial({
            color: 0xff4500,
            emissive: 0xff3300,
            emissiveIntensity: 2.5,
            transparent: true,
            opacity: 0.88,
            blending: THREE.AdditiveBlending
        }));
        const mesh = new THREE.Mesh(beamGeo, beamMat);
        mesh.position.copy(mid);
        mesh.lookAt(to);
        group.add(mesh);
        this.scene.add(group);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                mesh.scale.set(1 + Math.sin(t * 24) * 0.25, 1 + Math.sin(t * 24) * 0.25, 1);
                beamMat.opacity = Math.max(0, 0.88 - t * 1.6);
                return t < 0.55;
            },
            dispose: () => {
                this.scene.remove(group);
                d.dispose();
            }
        });
        this.impact(to, 0xff4500, 1.8);
    }
    projectile(from, to, kind, color, scale = 1, onArrive) {
        const d = new Disposables();
        const group = new THREE.Group();
        const start = new THREE.Vector3(from.x, 1.1, from.z);
        const end = new THREE.Vector3(to.x, 0.9, to.z);
        group.position.copy(start);
        if (kind === 'arrow') {
            const shaftMat = d.track(new THREE.MeshBasicMaterial({ color: 0xd6ccc2 }));
            const shaft = new THREE.Mesh(d.track(new THREE.CylinderGeometry(0.02, 0.02, 0.8 * scale, 5)), shaftMat);
            shaft.rotation.x = Math.PI / 2;
            const headMat = d.track(new THREE.MeshBasicMaterial({ color }));
            const head = new THREE.Mesh(d.track(new THREE.ConeGeometry(0.06 * scale, 0.18 * scale, 5)), headMat);
            head.rotation.x = Math.PI / 2;
            head.position.z = 0.45 * scale;
            group.add(shaft, head);
        }
        else {
            const orbMat = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
            group.add(new THREE.Mesh(d.track(new THREE.SphereGeometry(0.2 * scale, 12, 10)), orbMat));
            const haloMat = d.track(new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
            const halo = new THREE.Sprite(haloMat);
            halo.scale.setScalar(0.9 * scale);
            group.add(halo);
        }
        group.lookAt(end);
        this.scene.add(group);
        const dist = start.distanceTo(end);
        const duration = Math.max(0.08, dist / 28);
        let t = 0;
        let landed = false;
        this.effects.push({
            update: (dt) => {
                t += dt;
                const k = Math.min(1, t / duration);
                group.position.lerpVectors(start, end, k);
                group.position.y += Math.sin(k * Math.PI) * (kind === 'arrow' ? 0.35 : 0.1);
                if (k >= 1 && !landed) {
                    landed = true;
                    this.impact(end, color, kind === 'arrow' ? 0.6 : 0.9);
                    onArrive?.();
                }
                return k < 1;
            },
            dispose: () => { this.scene.remove(group); d.dispose(); }
        });
    }
    groundRing(pos, radius, color, duration = 0.5, filled = false) {
        const d = new Disposables();
        const geo = d.track(filled ? new THREE.CircleGeometry(radius, 40) : new THREE.RingGeometry(radius * 0.85, radius, 48));
        geo.rotateX(-Math.PI / 2);
        const mat = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: filled ? 0.35 : 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, 0.06, pos.z);
        this.scene.add(mesh);
        const startOpacity = mat.opacity;
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                const k = t / duration;
                if (!filled)
                    mesh.scale.setScalar(0.3 + Math.min(1, k * 2) * 0.7);
                mesh.rotation.y += dt;
                mat.opacity = startOpacity * (1 - k);
                return t < duration;
            },
            dispose: () => { this.scene.remove(mesh); d.dispose(); }
        });
    }
    spinSlash(pos, color, radius) {
        for (let i = 0; i < 3; i++) {
            this.slashArc(pos, (i / 3) * Math.PI * 2, color, Math.max(1, radius / 2.2));
        }
    }
    dome(pos, color) {
        const d = new Disposables();
        const geo = d.track(new THREE.SphereGeometry(1.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2));
        const mat = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, 0, pos.z);
        this.scene.add(mesh);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                mesh.rotation.y += dt * 1.5;
                mesh.scale.setScalar(Math.min(1, t * 5));
                mat.opacity = 0.35 * (1 - Math.max(0, t - 0.6) / 0.6);
                return t < 1.2;
            },
            dispose: () => { this.scene.remove(mesh); d.dispose(); }
        });
    }
    healPillar(pos, color, scale = 1) {
        const d = new Disposables();
        const group = new THREE.Group();
        group.position.set(pos.x, 0, pos.z);
        const beamMat = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        const beam = new THREE.Mesh(d.track(new THREE.CylinderGeometry(0.7 * scale, 0.9 * scale, 4, 20, 1, true)), beamMat);
        beam.position.y = 2;
        group.add(beam);
        const sparkGeo = d.track(new THREE.OctahedronGeometry(0.07));
        const sparks = [];
        for (let i = 0; i < 14; i++) {
            const s = new THREE.Mesh(sparkGeo, beamMat);
            const a = Math.random() * Math.PI * 2;
            s.position.set(Math.cos(a) * 0.7 * scale, Math.random() * 1.5, Math.sin(a) * 0.7 * scale);
            sparks.push(s);
            group.add(s);
        }
        this.scene.add(group);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                sparks.forEach(s => { s.position.y += dt * 3; });
                beam.scale.set(1, Math.min(1, t * 4), 1);
                beamMat.opacity = 0.45 * (1 - t / 0.9);
                return t < 0.9;
            },
            dispose: () => { this.scene.remove(group); d.dispose(); }
        });
    }
    meteor(center, radius, color) {
        const d = new Disposables();
        const rockMat = d.track(new THREE.MeshBasicMaterial({ color: 0xff9e00 }));
        const rock = new THREE.Mesh(d.track(new THREE.DodecahedronGeometry(0.6, 0)), rockMat);
        const trailMat = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
        const trail = new THREE.Mesh(d.track(new THREE.ConeGeometry(0.55, 3, 10, 1, true)), trailMat);
        trail.position.y = 1.6;
        const group = new THREE.Group();
        group.add(rock, trail);
        const start = new THREE.Vector3(center.x - 6, 14, center.z - 3);
        const end = new THREE.Vector3(center.x, 0.4, center.z);
        group.position.copy(start);
        group.lookAt(end);
        group.rotateX(-Math.PI / 2);
        this.scene.add(group);
        this.groundRing(center, radius, color, 0.55, true);
        let t = 0;
        let exploded = false;
        this.effects.push({
            update: (dt) => {
                t += dt;
                const k = Math.min(1, t / 0.45);
                group.position.lerpVectors(start, end, k * k);
                rock.rotation.x += dt * 8;
                if (k >= 1 && !exploded) {
                    exploded = true;
                    this.impact(end, color, 2.2);
                    this.groundRing(end, radius, color, 0.6);
                    this.groundRing(end, radius * 0.6, 0xffe066, 0.45);
                }
                return k < 1;
            },
            dispose: () => { this.scene.remove(group); d.dispose(); }
        });
    }
    nova(center, radius, color) {
        const d = new Disposables();
        const group = new THREE.Group();
        group.position.set(center.x, 0, center.z);
        const mat = d.track(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, transparent: true, opacity: 0.9, roughness: 0.1 }));
        const geo = d.track(new THREE.ConeGeometry(0.18, 1.1, 5));
        const spikes = [];
        const count = 18;
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const s = new THREE.Mesh(geo, mat);
            s.position.set(Math.cos(a), 0, Math.sin(a));
            s.userData.angle = a;
            s.rotation.z = -Math.cos(a) * 0.4;
            s.rotation.x = Math.sin(a) * 0.4;
            spikes.push(s);
            group.add(s);
        }
        this.scene.add(group);
        this.groundRing(center, radius, color, 0.6);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                const r = Math.min(radius, radius * t * 4);
                spikes.forEach(s => {
                    s.position.set(Math.cos(s.userData.angle) * r, 0.4 * Math.min(1, t * 6), Math.sin(s.userData.angle) * r);
                });
                mat.opacity = 0.9 * (1 - Math.max(0, t - 0.4) / 0.4);
                return t < 0.8;
            },
            dispose: () => { this.scene.remove(group); d.dispose(); }
        });
    }
    lightRain(center, radius, color) {
        this.groundRing(center, radius, color, 0.9, true);
        for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * radius;
            const target = new THREE.Vector3(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r);
            const from = new THREE.Vector3(target.x - 1.5, 0, target.z);
            const delay = i * 0.05;
            let waited = 0;
            // Stagger the bolts so they rain down one after another
            this.effects.push({
                update: (dt) => {
                    waited += dt;
                    if (waited >= delay) {
                        this.fallingBolt(from, target, color);
                        return false;
                    }
                    return true;
                },
                dispose: () => { }
            });
        }
    }
    fallingBolt(from, to, color) {
        const d = new Disposables();
        const mat = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
        const bolt = new THREE.Mesh(d.track(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5)), mat);
        const start = new THREE.Vector3(from.x, 9, from.z);
        const end = new THREE.Vector3(to.x, 0.8, to.z);
        bolt.position.copy(start);
        bolt.lookAt(end);
        bolt.rotateX(Math.PI / 2);
        this.scene.add(bolt);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                const k = Math.min(1, t / 0.22);
                bolt.position.lerpVectors(start, end, k);
                if (k >= 1)
                    this.impact(end, color, 0.5);
                return k < 1;
            },
            dispose: () => { this.scene.remove(bolt); d.dispose(); }
        });
    }
    smoke(pos, color) {
        const d = new Disposables();
        const mat = d.track(new THREE.MeshBasicMaterial({ color: 0x1e1b2e, transparent: true, opacity: 0.7, depthWrite: false }));
        const tint = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
        const geo = d.track(new THREE.SphereGeometry(0.35, 8, 6));
        const puffs = [];
        const group = new THREE.Group();
        group.position.set(pos.x, 0.6, pos.z);
        for (let i = 0; i < 9; i++) {
            const m = new THREE.Mesh(geo, i % 3 === 0 ? tint : mat);
            const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).multiplyScalar(2.5);
            puffs.push({ m, v });
            group.add(m);
        }
        this.scene.add(group);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                puffs.forEach(p => {
                    p.m.position.addScaledVector(p.v, dt);
                    p.m.scale.setScalar(1 + t * 2);
                });
                mat.opacity = 0.7 * (1 - t / 0.6);
                tint.opacity = 0.5 * (1 - t / 0.6);
                return t < 0.6;
            },
            dispose: () => { this.scene.remove(group); d.dispose(); }
        });
    }
    bladeDance(center, radius, color) {
        const d = new Disposables();
        const group = new THREE.Group();
        group.position.set(center.x, 1.0, center.z);
        const mat = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
        const geo = d.track(new THREE.BoxGeometry(0.08, 0.02, 0.7));
        for (let i = 0; i < 6; i++) {
            const blade = new THREE.Mesh(geo, mat);
            const a = (i / 6) * Math.PI * 2;
            blade.position.set(Math.cos(a) * radius * 0.7, 0, Math.sin(a) * radius * 0.7);
            blade.rotation.y = -a;
            group.add(blade);
        }
        this.scene.add(group);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                group.rotation.y += dt * 18;
                group.position.y = 0.8 + Math.sin(t * 20) * 0.15;
                mat.opacity = 0.95 * (1 - Math.max(0, t - 0.35) / 0.2);
                return t < 0.55;
            },
            dispose: () => { this.scene.remove(group); d.dispose(); }
        });
    }
    coinBurst(center, radius) {
        const d = new Disposables();
        const group = new THREE.Group();
        group.position.set(center.x, 0.8, center.z);
        const mat = d.track(new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.9, roughness: 0.2, emissive: 0x8a6d00, emissiveIntensity: 0.4 }));
        const geo = d.track(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12));
        const coins = [];
        for (let i = 0; i < 16; i++) {
            const m = new THREE.Mesh(geo, mat);
            const a = (i / 16) * Math.PI * 2;
            const v = new THREE.Vector3(Math.cos(a), 0.9 + Math.random() * 0.5, Math.sin(a)).multiplyScalar(radius * 2.2);
            coins.push({ m, v });
            group.add(m);
        }
        this.scene.add(group);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                coins.forEach(c => {
                    c.m.position.addScaledVector(c.v, dt);
                    c.v.y -= 20 * dt;
                    c.m.rotation.x += dt * 15;
                    if (c.m.position.y < -0.7)
                        c.m.position.y = -0.7;
                });
                return t < 0.6;
            },
            dispose: () => {
                this.scene.remove(group);
                d.dispose();
            }
        });
        this.groundRing(center, radius, 0xffd166, 0.4);
    }
    vortex(center, radius, color) {
        const d = new Disposables();
        const geo = d.track(new THREE.RingGeometry(0.2, radius, 48, 1, 0, Math.PI * 1.6));
        geo.rotateX(-Math.PI / 2);
        const mat = d.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(center.x, 0.08, center.z);
        this.scene.add(mesh);
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                mesh.rotation.y += dt * 10;
                mesh.scale.setScalar(Math.max(0.05, 1 - t / 0.8));
                return t < 0.8;
            },
            dispose: () => { this.scene.remove(mesh); d.dispose(); }
        });
    }
    /** Billboard text (damage numbers, MISS, heals) floating upward */
    floatingText(pos, text, fill, stroke, big = false) {
        const d = new Disposables();
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        ctx.font = `bold ${big ? 58 : 44}px Impact, "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 8;
        ctx.strokeStyle = stroke;
        ctx.strokeText(text, 128, 48);
        ctx.fillStyle = fill;
        ctx.fillText(text, 128, 48);
        const tex = d.track(new THREE.CanvasTexture(canvas));
        const mat = d.track(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
        const sprite = new THREE.Sprite(mat);
        sprite.renderOrder = 999;
        const baseScale = big ? 2.4 : 1.8;
        sprite.scale.set(baseScale, baseScale * 0.375, 1);
        const drift = (Math.random() - 0.5) * 0.8;
        sprite.position.set(pos.x + drift * 0.5, pos.y, pos.z);
        this.scene.add(sprite);
        const startY = pos.y;
        let t = 0;
        this.effects.push({
            update: (dt) => {
                t += dt;
                sprite.position.y = startY + t * 2.2;
                sprite.position.x += drift * dt;
                // Pop in, then fade
                const pop = t < 0.1 ? 0.6 + t * 4 : 1;
                sprite.scale.set(baseScale * pop, baseScale * 0.375 * pop, 1);
                mat.opacity = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.35);
                return t < 0.9;
            },
            dispose: () => { this.scene.remove(sprite); d.dispose(); }
        });
    }
    floatingDamage(pos, amount, isCrit = false) {
        const text = amount.toString();
        const fill = isCrit ? '#fef08a' : '#ffffff';
        const stroke = isCrit ? '#854d0e' : '#991b1b';
        this.floatingText(pos, text, fill, stroke, isCrit);
    }
}
