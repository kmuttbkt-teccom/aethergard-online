/**
 * AETHERGARD ONLINE — Weapon3DBuilder
 * High-fidelity 3D weapon meshes with PBR materials, glowing runic energy accents,
 * and animated particle auras for characters and weapon studio inspector.
 */

import * as THREE from 'three';

export interface Weapon3DVisual {
  group: THREE.Group;
  name: string;
  type: 'sword' | 'greatsword' | 'staff' | 'bow' | 'dagger' | 'shield' | 'hammer';
  update?: (time: number, dt: number) => void;
}

export class Weapon3DBuilder {
  /**
   * 1. Holy Excalibur — Legendary One-Handed Runic Blade
   */
  public static createExcalibur(): Weapon3DVisual {
    const group = new THREE.Group();
    group.name = 'weapon_excalibur';

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.08, 1.4, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      metalness: 0.9,
      roughness: 0.15
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.8;
    blade.castShadow = true;
    group.add(blade);

    // Blade Tip
    const tipGeo = new THREE.ConeGeometry(0.06, 0.25, 4);
    tipGeo.rotateY(Math.PI / 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.y = 1.55;
    group.add(tip);

    // Glowing Azure Rune Fuller Line
    const runeGeo = new THREE.BoxGeometry(0.025, 1.1, 0.025);
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.2
    });
    const rune = new THREE.Mesh(runeGeo, runeMat);
    rune.position.y = 0.75;
    group.add(rune);

    // Golden Crossguard
    const guardGeo = new THREE.BoxGeometry(0.42, 0.06, 0.08);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.25
    });
    const guard = new THREE.Mesh(guardGeo, goldMat);
    guard.position.y = 0.12;
    guard.castShadow = true;
    group.add(guard);

    // Guard Gemstones
    const gemGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });
    const leftGem = new THREE.Mesh(gemGeo, gemMat);
    leftGem.position.set(-0.18, 0.12, 0);
    const rightGem = new THREE.Mesh(gemGeo, gemMat);
    rightGem.position.set(0.18, 0.12, 0);
    group.add(leftGem);
    group.add(rightGem);

    // Hilt Grip
    const gripGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.25, 8);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.y = -0.02;
    group.add(grip);

    // Golden Pommel with Sapphire Core
    const pommelGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const pommel = new THREE.Mesh(pommelGeo, goldMat);
    pommel.position.y = -0.16;
    group.add(pommel);

    return {
      group,
      name: 'Holy Excalibur +10',
      type: 'sword',
      update: (time) => {
        runeMat.emissiveIntensity = 0.7 + Math.sin(time * 4) * 0.25;
      }
    };
  }

  /**
   * 2. Dragon Slayer Greatsword — Massive Heavy Magma Blade
   */
  public static createDragonSlayer(): Weapon3DVisual {
    const group = new THREE.Group();
    group.name = 'weapon_dragonslayer';

    // Massive Obsidian Blade
    const bladeGeo = new THREE.BoxGeometry(0.22, 1.8, 0.035);
    const obsMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      metalness: 0.7,
      roughness: 0.4
    });
    const blade = new THREE.Mesh(bladeGeo, obsMat);
    blade.position.y = 1.05;
    blade.castShadow = true;
    group.add(blade);

    // Jagged Tip
    const tipGeo = new THREE.ConeGeometry(0.15, 0.35, 4);
    tipGeo.rotateY(Math.PI / 4);
    const tip = new THREE.Mesh(tipGeo, obsMat);
    tip.position.y = 2.05;
    group.add(tip);

    // Glowing Lava Veins
    const lavaGeo = new THREE.BoxGeometry(0.06, 1.5, 0.04);
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xff4500,
      emissive: 0xff4500,
      emissiveIntensity: 0.9,
      roughness: 0.3
    });
    const lava = new THREE.Mesh(lavaGeo, lavaMat);
    lava.position.y = 1.0;
    group.add(lava);

    // Spiked Dragon Horn Crossguard
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x44403c, metalness: 0.8, roughness: 0.3 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.09), guardMat);
    guard.position.y = 0.16;
    group.add(guard);

    // Extended Two-Handed Hilt
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), new THREE.MeshStandardMaterial({ color: 0x292524 }));
    grip.position.y = -0.06;
    group.add(grip);

    return {
      group,
      name: 'Dragon Slayer Greatsword',
      type: 'greatsword',
      update: (time) => {
        lavaMat.emissiveIntensity = 0.75 + Math.sin(time * 3.5) * 0.25;
      }
    };
  }

  /**
   * 3. Archangel Wing Staff — Golden Celestial Scepter
   */
  public static createArchangelStaff(): Weapon3DVisual {
    const group = new THREE.Group();
    group.name = 'weapon_staff';

    // Golden Staff Shaft
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 1.8, 10), goldMat);
    shaft.position.y = 0.75;
    shaft.castShadow = true;
    group.add(shaft);

    // Winged Crest at Top
    const wingGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 16, Math.PI);
    const wingL = new THREE.Mesh(wingGeo, goldMat);
    wingL.position.set(-0.08, 1.65, 0);
    wingL.rotation.z = Math.PI * 0.75;
    const wingR = new THREE.Mesh(wingGeo, goldMat);
    wingR.position.set(0.08, 1.65, 0);
    wingR.rotation.z = -Math.PI * 0.75;
    group.add(wingL);
    group.add(wingR);

    // Levitating Floating Mana Core
    const orbGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.95,
      roughness: 0.1,
      transparent: true,
      opacity: 0.88
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 1.72;
    group.add(orb);

    // Orbiting Magic Ring
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 6, 24), goldMat);
    orbitRing.position.y = 1.72;
    group.add(orbitRing);

    return {
      group,
      name: 'Archangel Wing Staff',
      type: 'staff',
      update: (time) => {
        orb.position.y = 1.72 + Math.sin(time * 3) * 0.03;
        orbitRing.rotation.x = time * 2;
        orbitRing.rotation.y = time * 1.5;
        orbMat.emissiveIntensity = 0.8 + Math.sin(time * 5) * 0.25;
      }
    };
  }

  /**
   * 4. Astral Composite Bow — Starlight Recurve Bow
   */
  public static createAstralBow(): Weapon3DVisual {
    const group = new THREE.Group();
    group.name = 'weapon_bow';

    // Curved Bow Limbs
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });

    const limbGeo = new THREE.TorusGeometry(0.7, 0.035, 8, 24, Math.PI * 0.85);
    const bowMesh = new THREE.Mesh(limbGeo, limbMat);
    bowMesh.rotation.z = -Math.PI * 0.42;
    bowMesh.position.set(0.1, 0.5, 0);
    group.add(bowMesh);

    // Bow Tips
    const tipTop = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), goldMat);
    tipTop.position.set(0.35, 1.15, 0);
    const tipBtm = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), goldMat);
    tipBtm.position.set(0.35, -0.15, 0);
    tipBtm.rotation.z = Math.PI;
    group.add(tipTop);
    group.add(tipBtm);

    // Glowing Golden Energy Bowstring
    const stringMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffd166,
      emissiveIntensity: 0.95
    });
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.3, 6), stringMat);
    string.position.set(0.32, 0.5, 0);
    group.add(string);

    return {
      group,
      name: 'Astral Composite Bow',
      type: 'bow',
      update: (time) => {
        stringMat.emissiveIntensity = 0.75 + Math.sin(time * 4) * 0.25;
      }
    };
  }

  /**
   * 5. Nightshade Twin Daggers — Amethyst Shadow Blade
   */
  public static createNightshadeDagger(): Weapon3DVisual {
    const group = new THREE.Group();
    group.name = 'weapon_dagger';

    // Curved Blade
    const bladeGeo = new THREE.BoxGeometry(0.06, 0.75, 0.015);
    const purpleMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      emissive: 0xa855f7,
      emissiveIntensity: 0.75,
      metalness: 0.8,
      roughness: 0.2
    });
    const blade = new THREE.Mesh(bladeGeo, purpleMat);
    blade.position.y = 0.45;
    blade.rotation.z = -0.08;
    group.add(blade);

    // Hilt & Ring Pommel
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0x18181b }));
    hilt.position.y = 0.02;
    group.add(hilt);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), purpleMat);
    ring.position.y = -0.09;
    group.add(ring);

    return {
      group,
      name: 'Nightshade Shadow Dagger',
      type: 'dagger'
    };
  }

  /**
   * 6. Aegis of the Sun Shield — Ornate Kite Shield
   */
  public static createAegisShield(): Weapon3DVisual {
    const group = new THREE.Group();
    group.name = 'weapon_shield';

    // Triangular Beveled Shield Body
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(-0.35, 0.45);
    shieldShape.lineTo(0.35, 0.45);
    shieldShape.lineTo(0.3, -0.1);
    shieldShape.lineTo(0, -0.5);
    shieldShape.lineTo(-0.3, -0.1);
    shieldShape.closePath();

    const extrudeSettings = { depth: 0.04, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
    shieldGeo.center();

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.25
    });
    const shield = new THREE.Mesh(shieldGeo, metalMat);
    shield.castShadow = true;
    group.add(shield);

    // Golden Sun Boss Core
    const sunGeo = new THREE.SphereGeometry(0.12, 10, 10);
    const sunMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.2
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.z = 0.04;
    group.add(sun);

    // Gold Trim Cross
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.02), sunMat);
    crossH.position.z = 0.03;
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.02), sunMat);
    crossV.position.z = 0.03;
    group.add(crossH);
    group.add(crossV);

    return {
      group,
      name: 'Aegis Sun Shield',
      type: 'shield'
    };
  }

  /**
   * Helper to create the default weapon loadout for any job class
   */
  public static createWeaponForJob(job: string): { mainHand: Weapon3DVisual; offHand?: Weapon3DVisual } {
    switch (job) {
      case 'Swordman':
      case 'Knight':
        return {
          mainHand: this.createExcalibur(),
          offHand: this.createAegisShield()
        };
      case 'Magician':
      case 'Wizard':
        return {
          mainHand: this.createArchangelStaff()
        };
      case 'Archer':
      case 'Hunter':
        return {
          mainHand: this.createAstralBow()
        };
      case 'Thief':
      case 'Assassin':
        return {
          mainHand: this.createNightshadeDagger(),
          offHand: this.createNightshadeDagger()
        };
      case 'Acolyte':
      case 'Priest':
        return {
          mainHand: this.createArchangelStaff(),
          offHand: this.createAegisShield()
        };
      case 'Merchant':
      case 'Blacksmith':
      default:
        return {
          mainHand: this.createDragonSlayer()
        };
    }
  }
}
