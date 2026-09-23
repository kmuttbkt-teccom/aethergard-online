/**
 * AETHERGARD ONLINE — SkillEffect3DManager
 * High-fidelity 3D visual spell models, projectiles and ground crater effects.
 * Includes Astral Meteor, Radiant Celestial Sword, Frost Nova ice pillars,
 * Judgment Divine Fist, and Gale Wind Arrow.
 * Automatically disposes GPU geometries and materials when effects complete.
 */

import * as THREE from 'three';

interface ManagedEffect {
  update: (dt: number) => boolean;
  dispose: () => void;
}

class DisposablesTracker {
  private items: Array<{ dispose: () => void }> = [];

  public track<T extends { dispose: () => void }>(item: T): T {
    this.items.push(item);
    return item;
  }

  public dispose() {
    for (const item of this.items) {
      try {
        item.dispose();
      } catch {
        // ignore
      }
    }
    this.items = [];
  }
}

export class SkillEffect3DManager {
  private static _instance: SkillEffect3DManager | null = null;
  private effects: ManagedEffect[] = [];

  constructor(private scene: THREE.Scene) {
    SkillEffect3DManager._instance = this;
  }

  public static getInstance(): SkillEffect3DManager | null {
    return this._instance;
  }

  public update(dt: number) {
    const current = this.effects;
    this.effects = [];
    const survivors = current.filter(e => {
      const alive = e.update(dt);
      if (!alive) {
        e.dispose();
      }
      return alive;
    });
    this.effects = survivors.concat(this.effects);
  }

  public clear() {
    for (const e of this.effects) {
      e.dispose();
    }
    this.effects = [];
  }

  // =========================================================================
  // 1. ASTRAL METEOR — Burning 3D Jagged Asteroid with Crater Shockwave
  // =========================================================================
  public spawnMeteor(target: THREE.Vector3, radius: number = 3.5, color: number = 0xff5a1f): void {
    const d = new DisposablesTracker();
    const group = new THREE.Group();

    // 1.1 Meteor Core — Faceted Jagged Obsidian & Magma Rock
    const rockGeo = d.track(new THREE.DodecahedronGeometry(0.85, 1));
    const rockMat = d.track(new THREE.MeshStandardMaterial({
      color: 0x26140e,
      emissive: color,
      emissiveIntensity: 1.4,
      roughness: 0.6,
      metalness: 0.2
    }));
    const rock = new THREE.Mesh(rockGeo, rockMat);
    group.add(rock);

    // 1.2 Satellite Rock Fragments
    const subGeo = d.track(new THREE.DodecahedronGeometry(0.25, 0));
    const subRocks: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const sub = new THREE.Mesh(subGeo, rockMat);
      const angle = (i / 4) * Math.PI * 2;
      sub.position.set(Math.cos(angle) * 0.95, (Math.random() - 0.5) * 0.6, Math.sin(angle) * 0.95);
      group.add(sub);
      subRocks.push(sub);
    }

    // 1.3 Blazing Flame Trail Cone
    const flameMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xffa200,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    const flameCone = new THREE.Mesh(d.track(new THREE.ConeGeometry(0.9, 4.2, 12, 1, true)), flameMat);
    flameCone.position.y = 2.1;
    group.add(flameCone);

    // 1.4 Outer Flame Aura
    const auraMat = d.track(new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    const auraCone = new THREE.Mesh(d.track(new THREE.ConeGeometry(1.3, 5.0, 10, 1, true)), auraMat);
    auraCone.position.y = 2.4;
    group.add(auraCone);

    // Initial Path Calculation
    const startPos = new THREE.Vector3(target.x - 9, 24, target.z - 6);
    const endPos = new THREE.Vector3(target.x, 0.4, target.z);
    group.position.copy(startPos);
    group.lookAt(endPos);
    group.rotateX(-Math.PI / 2);
    this.scene.add(group);

    // 1.5 Ground Targeting Rune Seal
    const groundRuneGroup = new THREE.Group();
    groundRuneGroup.position.set(target.x, 0.08, target.z);

    const runeMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    const runeRing = new THREE.Mesh(d.track(new THREE.RingGeometry(radius * 0.8, radius, 36)), runeMat);
    runeRing.rotation.x = -Math.PI / 2;
    groundRuneGroup.add(runeRing);

    const innerRune = new THREE.Mesh(d.track(new THREE.RingGeometry(0.2, radius * 0.45, 6)), runeMat);
    innerRune.rotation.x = -Math.PI / 2;
    groundRuneGroup.add(innerRune);
    this.scene.add(groundRuneGroup);

    const fallDuration = 0.52;
    let t = 0;
    let exploded = false;

    this.effects.push({
      update: (dt) => {
        t += dt;
        const k = Math.min(1, t / fallDuration);
        // Ease in quad for gravity acceleration
        const progress = k * k;
        group.position.lerpVectors(startPos, endPos, progress);

        // Spin rocks
        rock.rotation.x += dt * 6;
        rock.rotation.y += dt * 8;
        subRocks.forEach((sr, idx) => {
          sr.rotation.y += dt * (5 + idx * 2);
        });

        // Spin ground seal
        runeRing.rotation.z += dt * 2.5;
        innerRune.rotation.z -= dt * 3.5;

        // Flash ground seal brighter right before impact
        runeMat.opacity = 0.7 + Math.sin(k * Math.PI * 4) * 0.3;

        if (k >= 1 && !exploded) {
          exploded = true;
          // Spawn massive ground detonation
          this.triggerMeteorExplosion(endPos, radius, color);
          return false;
        }
        return k < 1;
      },
      dispose: () => {
        this.scene.remove(group);
        this.scene.remove(groundRuneGroup);
        d.dispose();
      }
    });
  }

  private triggerMeteorExplosion(pos: THREE.Vector3, radius: number, color: number) {
    const d = new DisposablesTracker();
    const expGroup = new THREE.Group();
    expGroup.position.set(pos.x, 0.1, pos.z);
    this.scene.add(expGroup);

    // 1. Blinding Flash Sphere
    const flashMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xfff0ad,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    const flash = new THREE.Mesh(d.track(new THREE.SphereGeometry(1.2, 16, 12)), flashMat);
    flash.position.y = 0.8;
    expGroup.add(flash);

    // 2. Dual Shockwave Rings
    const ringMat1 = d.track(new THREE.MeshBasicMaterial({
      color: 0xff3700,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    const shockwave1 = new THREE.Mesh(d.track(new THREE.RingGeometry(0.3, 0.8, 36)), ringMat1);
    shockwave1.rotation.x = -Math.PI / 2;
    expGroup.add(shockwave1);

    const ringMat2 = d.track(new THREE.MeshBasicMaterial({
      color: 0xffbe0b,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    const shockwave2 = new THREE.Mesh(d.track(new THREE.RingGeometry(0.1, 0.5, 32)), ringMat2);
    shockwave2.rotation.x = -Math.PI / 2;
    expGroup.add(shockwave2);

    // 3. Ground Lava Fissure Cracks (4 branches)
    const crackMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xff5400,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    for (let i = 0; i < 4; i++) {
      const crack = new THREE.Mesh(d.track(new THREE.PlaneGeometry(0.35, radius * 1.2)), crackMat);
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = (i / 4) * Math.PI + (Math.random() - 0.5) * 0.3;
      expGroup.add(crack);
    }

    // 4. Burning Shrapnel Debris with Gravity Bouncing
    const shardGeo = d.track(new THREE.DodecahedronGeometry(0.18, 0));
    const shardMat = d.track(new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      emissive: 0xff4500,
      emissiveIntensity: 1.5,
      roughness: 0.5
    }));
    const debris: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3 }> = [];
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(shardGeo, shardMat);
      mesh.position.set(0, 0.5, 0);
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 6;
      const vel = new THREE.Vector3(Math.cos(angle) * speed, 5 + Math.random() * 6, Math.sin(angle) * speed);
      debris.push({ mesh, vel });
      expGroup.add(mesh);
    }

    let elapsed = 0;
    const duration = 0.85;

    this.effects.push({
      update: (dt) => {
        elapsed += dt;
        const k = elapsed / duration;

        // Flash expansion and fade
        flash.scale.setScalar(1 + elapsed * 6);
        flashMat.opacity = Math.max(0, 0.95 - elapsed * 3);

        // Shockwaves expanding
        const waveScale1 = (radius * 1.5) * Math.min(1, elapsed * 3.5);
        shockwave1.scale.setScalar(waveScale1);
        ringMat1.opacity = Math.max(0, 0.9 * (1 - k));

        const waveScale2 = (radius * 1.2) * Math.min(1, elapsed * 2.8);
        shockwave2.scale.setScalar(waveScale2);
        ringMat2.opacity = Math.max(0, 0.7 * (1 - k));

        // Fade fissures
        crackMat.opacity = Math.max(0, 0.85 * (1 - k * 1.2));

        // Physics for bouncing debris
        debris.forEach(dItem => {
          dItem.mesh.position.addScaledVector(dItem.vel, dt);
          dItem.vel.y -= 22 * dt; // gravity
          dItem.mesh.rotation.x += dt * 10;
          dItem.mesh.rotation.y += dt * 8;
          if (dItem.mesh.position.y < 0) {
            dItem.mesh.position.y = 0;
            dItem.vel.y = -dItem.vel.y * 0.4;
            dItem.vel.x *= 0.7;
            dItem.vel.z *= 0.7;
          }
        });

        return elapsed < duration;
      },
      dispose: () => {
        this.scene.remove(expGroup);
        d.dispose();
      }
    });
  }

  // =========================================================================
  // 2. RADIANT CELESTIAL SWORD — Giant Plunging Holy Blade & Divine Rays
  // =========================================================================
  public spawnRadiantSword(center: THREE.Vector3, radius: number = 3.0): void {
    const d = new DisposablesTracker();
    const group = new THREE.Group();
    group.position.set(center.x, 0, center.z);
    this.scene.add(group);

    // 2.1 Celestial Rune Seal in the Sky
    const skySealMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    const skySeal = new THREE.Mesh(d.track(new THREE.RingGeometry(0.8, 2.2, 32)), skySealMat);
    skySeal.rotation.x = -Math.PI / 2;
    skySeal.position.y = 7.0;
    group.add(skySeal);

    // 2.2 Giant 3D Holy Greatsword
    const swordGroup = new THREE.Group();
    swordGroup.position.y = 12.0;

    // Golden Blade
    const bladeGeo = d.track(new THREE.BoxGeometry(0.3, 4.2, 0.08));
    const bladeMat = d.track(new THREE.MeshStandardMaterial({
      color: 0xfffae0,
      emissive: 0xffd700,
      emissiveIntensity: 1.8,
      metalness: 0.9,
      roughness: 0.15
    }));
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 2.1;
    swordGroup.add(blade);

    // Blade Point Tip
    const tipGeo = d.track(new THREE.ConeGeometry(0.24, 0.7, 4));
    tipGeo.rotateY(Math.PI / 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.y = -0.35;
    tip.rotation.x = Math.PI;
    swordGroup.add(tip);

    // Winged Celestial Crossguard
    const guardMat = d.track(new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
      metalness: 0.8
    }));
    const guard = new THREE.Mesh(d.track(new THREE.BoxGeometry(1.5, 0.22, 0.2)), guardMat);
    guard.position.y = 4.25;
    swordGroup.add(guard);

    // Sword Hilt & Radiant Halo
    const hilt = new THREE.Mesh(d.track(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8)), guardMat);
    hilt.position.y = 4.75;
    swordGroup.add(hilt);

    const haloRing = new THREE.Mesh(d.track(new THREE.TorusGeometry(0.5, 0.04, 6, 24)), skySealMat);
    haloRing.position.y = 5.3;
    swordGroup.add(haloRing);

    group.add(swordGroup);

    let t = 0;
    const dropDuration = 0.26;
    let impacted = false;

    this.effects.push({
      update: (dt) => {
        t += dt;
        skySeal.rotation.z += dt * 5;

        if (t <= dropDuration) {
          const k = t / dropDuration;
          swordGroup.position.y = THREE.MathUtils.lerp(12.0, 0.4, k * k);
        } else if (!impacted) {
          impacted = true;
          swordGroup.position.y = 0.4;
          // Trigger ground explosion & holy shockwaves
          this.triggerRadiantImpact(center, radius);
        }

        // Sword vibrates in ground then dissolves in holy light
        if (impacted) {
          const stayTime = t - dropDuration;
          swordGroup.position.x = (Math.random() - 0.5) * 0.04;
          bladeMat.emissiveIntensity = 2.0 * Math.max(0, 1 - stayTime / 0.6);
          skySealMat.opacity = Math.max(0, 0.9 * (1 - stayTime / 0.4));
          if (stayTime > 0.65) return false;
        }

        return true;
      },
      dispose: () => {
        this.scene.remove(group);
        d.dispose();
      }
    });
  }

  private triggerRadiantImpact(center: THREE.Vector3, radius: number) {
    const d = new DisposablesTracker();
    const group = new THREE.Group();
    group.position.set(center.x, 0.06, center.z);
    this.scene.add(group);

    // 1. Golden Holy Shockwave
    const ringMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    const ring = new THREE.Mesh(d.track(new THREE.RingGeometry(0.3, 1.0, 36)), ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    // 2. Four Holy Light Slashes in X Pattern
    const slashMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xfffae0,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    for (let i = 0; i < 4; i++) {
      const slash = new THREE.Mesh(d.track(new THREE.PlaneGeometry(0.2, radius * 1.5)), slashMat);
      slash.rotation.x = -Math.PI / 2;
      slash.rotation.z = (i / 4) * Math.PI;
      group.add(slash);
    }

    // 3. Upward Divine Light Pillars
    const pillarMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    const pillars: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = radius * 0.65;
      const pil = new THREE.Mesh(d.track(new THREE.CylinderGeometry(0.08, 0.16, 5, 8, 1, true)), pillarMat);
      pil.position.set(Math.cos(angle) * dist, 2.5, Math.sin(angle) * dist);
      group.add(pil);
      pillars.push(pil);
    }

    let elapsed = 0;
    const dur = 0.65;

    this.effects.push({
      update: (dt) => {
        elapsed += dt;
        const k = elapsed / dur;
        ring.scale.setScalar(radius * 1.3 * Math.min(1, elapsed * 3.5));
        ringMat.opacity = Math.max(0, 0.9 * (1 - k));
        slashMat.opacity = Math.max(0, 0.85 * (1 - k * 1.3));
        pillars.forEach(p => {
          p.position.y += dt * 3.5;
        });
        pillarMat.opacity = Math.max(0, 0.5 * (1 - k));
        return elapsed < dur;
      },
      dispose: () => {
        this.scene.remove(group);
        d.dispose();
      }
    });
  }

  // =========================================================================
  // 3. FROST NOVA — 3D Translucent Crystalline Ice Spikes & Glacial Mist
  // =========================================================================
  public spawnFrostNova(center: THREE.Vector3, radius: number = 3.5): void {
    const d = new DisposablesTracker();
    const group = new THREE.Group();
    group.position.set(center.x, 0, center.z);
    this.scene.add(group);

    // 3.1 12 Crystalline Ice Pillars
    const spikeGeo = d.track(new THREE.CylinderGeometry(0.02, 0.28, 2.2, 5));
    const iceMat = d.track(new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88
    }));

    interface IcePillar {
      mesh: THREE.Mesh;
      baseAngle: number;
      targetDist: number;
      maxHeight: number;
    }

    const pillars: IcePillar[] = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const dist = (0.5 + (i % 2) * 0.45) * radius;
      const mesh = new THREE.Mesh(spikeGeo, iceMat);

      // Start subterranean
      mesh.position.set(Math.cos(angle) * dist, -1.2, Math.sin(angle) * dist);
      // Tilt naturally outwards
      mesh.rotation.z = -Math.cos(angle) * 0.3;
      mesh.rotation.x = Math.sin(angle) * 0.3;
      mesh.rotation.y = Math.random() * Math.PI;

      group.add(mesh);
      pillars.push({
        mesh,
        baseAngle: angle,
        targetDist: dist,
        maxHeight: 0.8 + Math.random() * 0.5
      });
    }

    // 3.2 Ground Frost Wave Ring
    const frostRingMat = d.track(new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    const frostRing = new THREE.Mesh(d.track(new THREE.RingGeometry(0.3, radius, 36)), frostRingMat);
    frostRing.rotation.x = -Math.PI / 2;
    frostRing.position.y = 0.05;
    group.add(frostRing);

    // 3.3 Glacial Diamond Sparkles
    const diamondGeo = d.track(new THREE.OctahedronGeometry(0.1));
    const sparkles: Array<{ m: THREE.Mesh; vel: THREE.Vector3 }> = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(diamondGeo, iceMat);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      m.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 1.5);
      sparkles.push({ m, vel });
      group.add(m);
    }

    let t = 0;
    const dur = 0.85;

    this.effects.push({
      update: (dt) => {
        t += dt;
        const k = t / dur;

        // Pillars thrust up violent fast (0.15s) then hold and slowly dissolve
        pillars.forEach(p => {
          if (t < 0.16) {
            const riseK = t / 0.16;
            p.mesh.position.y = THREE.MathUtils.lerp(-1.2, p.maxHeight, riseK * riseK);
          } else {
            p.mesh.position.y = p.maxHeight + Math.sin(t * 12) * 0.02;
          }
        });

        // Frost ring expansion
        frostRing.scale.setScalar(Math.min(1, t * 4.5));
        frostRingMat.opacity = Math.max(0, 0.85 * (1 - k));

        // Sparkles rise
        sparkles.forEach(s => {
          s.m.position.addScaledVector(s.vel, dt);
          s.m.rotation.x += dt * 4;
          s.m.rotation.y += dt * 6;
        });

        // Fade ice opacity at end
        if (t > 0.45) {
          const fadeK = (t - 0.45) / 0.4;
          iceMat.opacity = Math.max(0, 0.88 * (1 - fadeK));
          iceMat.emissiveIntensity = 0.9 * (1 - fadeK);
        }

        return t < dur;
      },
      dispose: () => {
        this.scene.remove(group);
        d.dispose();
      }
    });
  }

  // =========================================================================
  // 4. JUDGMENT DIVINE FIST — Giant Golden Fist Plunging from Heavens
  // =========================================================================
  public spawnJudgmentFist(target: THREE.Vector3): void {
    const d = new DisposablesTracker();
    const group = new THREE.Group();
    group.position.set(target.x, 16.0, target.z);
    this.scene.add(group);

    const goldMat = d.track(new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      metalness: 0.85,
      roughness: 0.2
    }));

    // 4.1 Arm Forearm / Bracer
    const forearm = new THREE.Mesh(d.track(new THREE.CylinderGeometry(0.5, 0.65, 1.8, 8)), goldMat);
    forearm.position.y = 1.4;
    group.add(forearm);

    // 4.2 Hand Body
    const palm = new THREE.Mesh(d.track(new THREE.BoxGeometry(1.0, 0.7, 0.7)), goldMat);
    palm.position.y = 0.35;
    group.add(palm);

    // 4.3 Clenched Knuckles (4 fingers)
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(d.track(new THREE.BoxGeometry(0.2, 0.45, 0.4)), goldMat);
      finger.position.set(-0.35 + i * 0.24, -0.15, 0.2);
      group.add(finger);
    }

    // 4.4 Thumb Folded Across
    const thumb = new THREE.Mesh(d.track(new THREE.BoxGeometry(0.22, 0.35, 0.7)), goldMat);
    thumb.position.set(-0.45, 0.05, 0.1);
    group.add(thumb);

    // 4.5 Glowing Runic Seal on Back of Fist
    const sealMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xfffae0,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    }));
    const seal = new THREE.Mesh(d.track(new THREE.CircleGeometry(0.35, 16)), sealMat);
    seal.position.set(0, 0.35, -0.36);
    group.add(seal);

    // Downward Slam Animation
    let t = 0;
    const slamDuration = 0.22;
    let smashed = false;

    this.effects.push({
      update: (dt) => {
        t += dt;
        if (t < slamDuration) {
          const k = t / slamDuration;
          group.position.y = THREE.MathUtils.lerp(16.0, 0.3, k * k * k);
        } else if (!smashed) {
          smashed = true;
          group.position.y = 0.3;
          // Trigger divine crater and shockwave
          this.triggerFistImpact(target);
        }

        if (smashed) {
          const stayTime = t - slamDuration;
          goldMat.emissiveIntensity = 1.5 * Math.max(0, 1 - stayTime / 0.4);
          sealMat.opacity = Math.max(0, 0.9 * (1 - stayTime / 0.3));
          if (stayTime > 0.45) return false;
        }

        return true;
      },
      dispose: () => {
        this.scene.remove(group);
        d.dispose();
      }
    });
  }

  private triggerFistImpact(target: THREE.Vector3) {
    const d = new DisposablesTracker();
    const group = new THREE.Group();
    group.position.set(target.x, 0.08, target.z);
    this.scene.add(group);

    // Golden Ground Shockwave Ring
    const waveMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    const wave = new THREE.Mesh(d.track(new THREE.RingGeometry(0.3, 1.2, 32)), waveMat);
    wave.rotation.x = -Math.PI / 2;
    group.add(wave);

    // Divine Skyward Light Pillar
    const pilMat = d.track(new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    const pillar = new THREE.Mesh(d.track(new THREE.CylinderGeometry(1.0, 1.2, 8, 16, 1, true)), pilMat);
    pillar.position.y = 4.0;
    group.add(pillar);

    // Holy Sparks
    const sparkGeo = d.track(new THREE.OctahedronGeometry(0.12));
    const sparks: Array<{ m: THREE.Mesh; v: THREE.Vector3 }> = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(sparkGeo, waveMat);
      const angle = (i / 14) * Math.PI * 2;
      const speed = 4 + Math.random() * 4;
      const v = new THREE.Vector3(Math.cos(angle) * speed, 3 + Math.random() * 4, Math.sin(angle) * speed);
      sparks.push({ m, v });
      group.add(m);
    }

    let elapsed = 0;
    const dur = 0.55;

    this.effects.push({
      update: (dt) => {
        elapsed += dt;
        const k = elapsed / dur;
        wave.scale.setScalar(3.2 * Math.min(1, elapsed * 4));
        waveMat.opacity = Math.max(0, 0.9 * (1 - k));
        pillar.scale.set(1 + elapsed * 1.5, 1, 1 + elapsed * 1.5);
        pilMat.opacity = Math.max(0, 0.65 * (1 - k * 1.4));
        sparks.forEach(s => {
          s.m.position.addScaledVector(s.v, dt);
          s.v.y -= 14 * dt;
        });
        return elapsed < dur;
      },
      dispose: () => {
        this.scene.remove(group);
        d.dispose();
      }
    });
  }

  // =========================================================================
  // 5. GALE ARROW — Aerodynamic Wind Piercer with Spinning Vortex Helix
  // =========================================================================
  public spawnGaleArrow(origin: THREE.Vector3, target: THREE.Vector3, onHit?: () => void): void {
    const d = new DisposablesTracker();
    const group = new THREE.Group();
    const start = new THREE.Vector3(origin.x, 1.2, origin.z);
    const end = new THREE.Vector3(target.x, 1.0, target.z);
    group.position.copy(start);
    group.lookAt(end);
    this.scene.add(group);

    // 5.1 Emerald Arrowhead
    const arrowMat = d.track(new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x34d399,
      emissiveIntensity: 1.4,
      metalness: 0.7,
      roughness: 0.2
    }));
    const head = new THREE.Mesh(d.track(new THREE.ConeGeometry(0.12, 0.45, 5)), arrowMat);
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.6;
    group.add(head);

    // 5.2 Arrow Shaft
    const shaft = new THREE.Mesh(d.track(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6)), arrowMat);
    shaft.rotation.x = Math.PI / 2;
    group.add(shaft);

    // 5.3 Double-Helix Wind Vortex Ribbons
    const windMat = d.track(new THREE.MeshBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    const helix1 = new THREE.Mesh(d.track(new THREE.TorusGeometry(0.18, 0.02, 6, 20, Math.PI * 1.6)), windMat);
    helix1.position.z = 0.2;
    group.add(helix1);

    const helix2 = new THREE.Mesh(d.track(new THREE.TorusGeometry(0.18, 0.02, 6, 20, Math.PI * 1.6)), windMat);
    helix2.position.z = -0.2;
    helix2.rotation.z = Math.PI;
    group.add(helix2);

    const dist = start.distanceTo(end);
    const speed = 30; // 30 m/s
    const dur = Math.max(0.08, dist / speed);
    let t = 0;
    let hit = false;

    this.effects.push({
      update: (dt) => {
        t += dt;
        const k = Math.min(1, t / dur);
        group.position.lerpVectors(start, end, k);

        // Spin wind ribbons rapidly around flight vector
        helix1.rotation.z += dt * 25;
        helix2.rotation.z -= dt * 25;

        if (k >= 1 && !hit) {
          hit = true;
          this.triggerGaleImpact(end);
          onHit?.();
          return false;
        }
        return k < 1;
      },
      dispose: () => {
        this.scene.remove(group);
        d.dispose();
      }
    });
  }

  private triggerGaleImpact(pos: THREE.Vector3) {
    const d = new DisposablesTracker();
    const group = new THREE.Group();
    group.position.set(pos.x, 0.1, pos.z);
    this.scene.add(group);

    // Swirling Emerald Cyclone Ring
    const mistMat = d.track(new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    const cyclone = new THREE.Mesh(d.track(new THREE.RingGeometry(0.3, 1.8, 24)), mistMat);
    cyclone.rotation.x = -Math.PI / 2;
    group.add(cyclone);

    // 4 Slicing Wind Blades
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(d.track(new THREE.BoxGeometry(0.06, 0.02, 1.2)), mistMat);
      blade.position.y = 0.5 + i * 0.2;
      blade.rotation.y = (i / 4) * Math.PI * 2;
      group.add(blade);
    }

    let elapsed = 0;
    const dur = 0.45;

    this.effects.push({
      update: (dt) => {
        elapsed += dt;
        const k = elapsed / dur;
        cyclone.rotation.z += dt * 14;
        cyclone.scale.setScalar(1 + elapsed * 2.5);
        mistMat.opacity = Math.max(0, 0.8 * (1 - k));
        group.position.y = 0.1 + elapsed * 1.5;
        return elapsed < dur;
      },
      dispose: () => {
        this.scene.remove(group);
        d.dispose();
      }
    });
  }

  // =========================================================================
  // Master Router: Play Advanced 3D Effects for Skills
  // =========================================================================
  public playSkill(
    skillId: string,
    casterPos: THREE.Vector3,
    rotY: number,
    targetPos: THREE.Vector3 | null,
    centerPos: THREE.Vector3
  ): boolean {
    switch (skillId) {
      case 'ASTRAL_METEOR':
        this.spawnMeteor(centerPos, 3.8);
        return true;
      case 'RADIANT_SLASH':
        this.spawnRadiantSword(casterPos, 3.2);
        return true;
      case 'FROST_NOVA':
        this.spawnFrostNova(casterPos, 3.6);
        return true;
      case 'JUDGMENT_FIST':
        this.spawnJudgmentFist(targetPos || casterPos);
        return true;
      case 'GALE_ARROW':
        if (targetPos) {
          this.spawnGaleArrow(casterPos, targetPos);
          return true;
        }
        return false;
      default:
        return false;
    }
  }
}
