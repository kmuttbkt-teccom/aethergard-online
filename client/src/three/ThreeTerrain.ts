import * as THREE from 'three';

export interface Zone3DDef {
  name: string;
  minX: number;
  maxX: number;
  centerX: number;
  groundColor: number;
  pathColor: number;
  ambientLight: number;
}

export const ZONES_3D: Zone3DDef[] = [
  { name: 'Solaria Meadows', minX: -60, maxX: 22, centerX: -19, groundColor: 0x558b2f, pathColor: 0x90a4ae, ambientLight: 0xfff3b0 },
  { name: 'Whispering Aetherwoods', minX: 22, maxX: 94, centerX: 58, groundColor: 0x241734, pathColor: 0x4a154b, ambientLight: 0xc77dff },
  { name: 'Mirage Dunes', minX: 94, maxX: 166, centerX: 130, groundColor: 0xd4a373, pathColor: 0xc89666, ambientLight: 0xffd166 },
  { name: 'Cursed Catacombs', minX: 166, maxX: 238, centerX: 202, groundColor: 0x1c1d24, pathColor: 0x2b2d42, ambientLight: 0x8d99ae },
  { name: 'Magma Core', minX: 238, maxX: 310, centerX: 274, groundColor: 0x2b0d0d, pathColor: 0x4a1010, ambientLight: 0xff7b00 },
  { name: 'Celestial Void', minX: 310, maxX: 410, centerX: 350, groundColor: 0x0a0c1e, pathColor: 0x161b33, ambientLight: 0x4cc9f0 },
];

export class ThreeTerrain {
  public scene: THREE.Scene;
  public groundMesh!: THREE.Mesh;
  public treesGroup: THREE.Group = new THREE.Group();
  public rocksGroup: THREE.Group = new THREE.Group();
  public environmentGroup: THREE.Group = new THREE.Group();
  public windFoliage: Array<{ object: THREE.Object3D; baseRotZ: number; speed: number; phase: number }> = [];
  public waterMeshes: THREE.Mesh[] = [];
  public particlesGroup: THREE.Points | null = null;
  public cloudsGroup: THREE.Group = new THREE.Group();
  public cloudEntries: Array<{ group: THREE.Group; speed: number; minX: number; maxX: number }> = [];
  public sunCoronaRing: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildEnvironment();
  }

  public getGroundHeight(x: number, z: number): number {
    // Walkable corridor (|z| <= 12) is completely flat at y = 0
    if (Math.abs(z) <= 12) return 0;
    // Outer gentle boundary hills
    const dist = Math.abs(z) - 12;
    return Math.min(6, dist * 0.25);
  }

  private buildEnvironment() {
    this.scene.add(this.environmentGroup);
    this.scene.add(this.treesGroup);
    this.scene.add(this.rocksGroup);
    this.scene.add(this.cloudsGroup);

    // 1. Build Multi-Zone 3D Ground (covers x: -60 to +410, z: -30 to +30)
    this.buildMultiZoneGround();

    // 2. Build Zone 1 Props (Solaria Meadows)
    this.buildSolariaProps();

    // 3. Build Zone 2 Props (Aetherwoods - Glowing mushrooms & ancient violet trees)
    this.buildAetherwoodsProps();

    // 4. Build Zone 3 Props (Mirage Dunes - Pyramids & desert rocks)
    this.buildMirageProps();

    // 5. Build Zone 4 Props (Catacombs - Stone arches & ruin pillars)
    this.buildCatacombsProps();

    // 6. Build Zone 5 Props (Magma Core - Volcanic obsidian & lava glows)
    this.buildMagmaProps();

    // 7. Build Zone 6 Props (Celestial Void - Crystal spires & starlight shrines)
    this.buildCelestialProps();

    // 8. Zone Transition Portals
    this.buildZonePortals();

    // 9. Modern Water Stream between Zone 1 & Zone 2
    this.buildWaterStreams();

    // 10. Stylized 3D Grass Tufts & Wildflowers
    this.buildGrassTufts();

    // 11. Stone Lantern Posts & Shrines
    this.buildLanterns();

    // 12. Atmospheric Floating Stardust Particles
    this.createAtmosphericParticles();

    // 13. Dynamic Stylized Puffy Clouds in Sky
    this.buildSkyClouds();

    // 14. Radiant Anime Sun with Golden Corona
    this.buildSunCorona();

    // 15. Village Fences, Benches & Floral Decorations
    this.buildVillageFencesAndBenches();

    // 16. Mystic Monoliths & Rune Stones
    this.buildMysticRuneStones();
  }

  private buildMultiZoneGround() {
    ZONES_3D.forEach(zone => {
      const w = zone.maxX - zone.minX;
      const d = 60; // z from -30 to +30

      // Main ground section
      const groundGeo = new THREE.PlaneGeometry(w, d, Math.max(8, Math.round(w / 4)), 16);
      groundGeo.rotateX(-Math.PI / 2);

      // Keep walkable strip (z between -12 and +12) flat at y = 0; gentle hills on edges
      const pos = groundGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const localZ = pos.getZ(i);
        if (Math.abs(localZ) > 12) {
          const edgeDist = Math.abs(localZ) - 12;
          pos.setY(i, edgeDist * 0.2);
        } else {
          pos.setY(i, 0);
        }
      }
      groundGeo.computeVertexNormals();

      const groundMat = new THREE.MeshStandardMaterial({
        color: zone.groundColor,
        roughness: 0.88,
        metalness: 0.05
      });

      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.position.set(zone.minX + w / 2, 0, 0);
      ground.receiveShadow = true;
      ground.name = `ground_${zone.name}`;
      this.environmentGroup.add(ground);

      if (!this.groundMesh) {
        this.groundMesh = ground;
      }

      // Central Walkway Path (Cobblestone / road strip through each zone)
      const pathGeo = new THREE.PlaneGeometry(w, 5, Math.round(w / 8), 2);
      pathGeo.rotateX(-Math.PI / 2);
      const pathMat = new THREE.MeshStandardMaterial({
        color: zone.pathColor,
        roughness: 0.92
      });
      const path = new THREE.Mesh(pathGeo, pathMat);
      path.position.set(zone.minX + w / 2, 0.02, 0);
      path.receiveShadow = true;
      this.environmentGroup.add(path);
    });
  }

  private buildSolariaProps() {
    const treeXs = [-42, -34, -26, -18, -10, -2, 6, 14];
    treeXs.forEach(x => {
      this.treesGroup.add(this.createAncientTree(x + (Math.random() * 4 - 2), -(14 + Math.random() * 4), 1.1 + Math.random() * 0.4, 0x40916c));
      this.treesGroup.add(this.createAncientTree(x + (Math.random() * 4 - 2), 14 + Math.random() * 4, 1.1 + Math.random() * 0.4, 0x52b788));
    });

    for (let x = -45; x < 15; x += 16) {
      this.environmentGroup.add(this.createPillar(x, -5, 0xffffff));
      this.environmentGroup.add(this.createPillar(x, 5, 0xffffff));
    }
  }

  private buildAetherwoodsProps() {
    for (let x = 26; x < 90; x += 10) {
      this.treesGroup.add(this.createAncientTree(x, -(15 + Math.random() * 4), 1.3, 0x5a189a));
      this.treesGroup.add(this.createAncientTree(x + 5, 15 + Math.random() * 4, 1.2, 0x7209b7));

      this.environmentGroup.add(this.createGlowingMushroom(x + 2, -6, 0x00b4d8));
      this.environmentGroup.add(this.createGlowingMushroom(x + 6, 6, 0xff007f));
    }
  }

  private buildMirageProps() {
    for (let x = 100; x < 160; x += 18) {
      this.environmentGroup.add(this.createPyramid(x, -18, 5));
      this.environmentGroup.add(this.createPyramid(x + 8, 18, 4));
      this.rocksGroup.add(this.createRock(x + 4, -7, 1.4, 0xd4a373));
      this.rocksGroup.add(this.createRock(x + 12, 7, 1.2, 0xc9a45c));
    }
  }

  private buildCatacombsProps() {
    for (let x = 172; x < 232; x += 16) {
      this.environmentGroup.add(this.createRuinArch(x, 0));
      this.environmentGroup.add(this.createTombstone(x + 4, -6));
      this.environmentGroup.add(this.createTombstone(x + 8, 6));
      this.rocksGroup.add(this.createRock(x + 10, -16, 2.5, 0x1f2421));
      this.rocksGroup.add(this.createRock(x + 10, 16, 2.5, 0x1f2421));
    }
  }

  private buildMagmaProps() {
    for (let x = 244; x < 304; x += 14) {
      this.rocksGroup.add(this.createRock(x, -16, 3.0, 0x370617));
      this.rocksGroup.add(this.createRock(x + 6, 16, 3.2, 0x370617));

      const lavaGeo = new THREE.PlaneGeometry(4, 1.2);
      lavaGeo.rotateX(-Math.PI / 2);
      const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff3c00 });
      const lava = new THREE.Mesh(lavaGeo, lavaMat);
      lava.position.set(x + 3, 0.03, (Math.random() > 0.5 ? -4 : 4));
      this.environmentGroup.add(lava);
    }
  }

  private buildCelestialProps() {
    for (let x = 316; x < 378; x += 14) {
      this.environmentGroup.add(this.createCrystalSpire(x, -14, 0x4cc9f0));
      this.environmentGroup.add(this.createCrystalSpire(x + 7, 14, 0xffd166));
      this.environmentGroup.add(this.createCrystalSpire(x + 12, -7, 0x9d4edd));
    }

    const throneGeo = new THREE.CylinderGeometry(4, 5, 0.8, 16);
    const throneMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
    const throne = new THREE.Mesh(throneGeo, throneMat);
    throne.position.set(360, 0.4, 0);
    this.environmentGroup.add(throne);
  }

  private buildZonePortals() {
    const portalXs = [22, 94, 166, 238, 310];
    const portalColors = [0x7209b7, 0xf77f00, 0x9d0208, 0xd62828, 0x4cc9f0];

    portalXs.forEach((px, i) => {
      const ringGeo = new THREE.TorusGeometry(3.2, 0.25, 12, 24);
      ringGeo.rotateY(Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({
        color: portalColors[i],
        emissive: portalColors[i],
        emissiveIntensity: 0.4,
        roughness: 0.3
      });
      const portal = new THREE.Mesh(ringGeo, ringMat);
      portal.position.set(px, 3.2, 0);
      this.environmentGroup.add(portal);
    });
  }

  private createAncientTree(x: number, z: number, scale: number, leafColor: number): THREE.Group {
    const tree = new THREE.Group();
    tree.scale.set(scale, scale, scale);
    tree.position.set(x, 0, z);

    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.65, 3.2, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    tree.add(trunk);

    const foliage = new THREE.Group();
    foliage.position.y = 2.4;
    for (let i = 0; i < 3; i++) {
      const leafGeo = new THREE.DodecahedronGeometry(1.4 - i * 0.2);
      const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.8, flatShading: true });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = i * 0.8;
      leaf.castShadow = true;
      foliage.add(leaf);
    }
    tree.add(foliage);

    this.windFoliage.push({
      object: foliage,
      baseRotZ: 0,
      speed: 1.2 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2
    });

    return tree;
  }

  private createGlowingMushroom(x: number, z: number, color: number): THREE.Group {
    const shroom = new THREE.Group();
    shroom.position.set(x, 0, z);

    const stemGeo = new THREE.CylinderGeometry(0.12, 0.2, 0.8, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xf1faee });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.4;
    shroom.add(stem);

    const capGeo = new THREE.SphereGeometry(0.5, 12, 8);
    capGeo.scale(1, 0.5, 1);
    const capMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.4 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.85;
    shroom.add(cap);
    return shroom;
  }

  private createPillar(x: number, z: number, color: number): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(0.4, 0.45, 3.2, 10);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const pillar = new THREE.Mesh(geo, mat);
    pillar.position.set(x, 1.6, z);
    pillar.castShadow = true;
    return pillar;
  }

  private createPyramid(x: number, z: number, size: number): THREE.Mesh {
    const geo = new THREE.ConeGeometry(size * 0.7, size, 4);
    geo.rotateY(Math.PI / 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xdda15e, roughness: 0.95, flatShading: true });
    const pyr = new THREE.Mesh(geo, mat);
    pyr.position.set(x, size / 2, z);
    pyr.castShadow = true;
    return pyr;
  }

  private createRock(x: number, z: number, size: number, color: number): THREE.Mesh {
    const geo = new THREE.DodecahedronGeometry(size, 1);
    geo.scale(1.2, 0.8, 1);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, size * 0.4, z);
    rock.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    rock.castShadow = true;
    return rock;
  }

  private createRuinArch(x: number, z: number): THREE.Group {
    const arch = new THREE.Group();
    arch.position.set(x, 0, z);

    const pillar1 = this.createPillar(0, -4, 0x4a4e69);
    const pillar2 = this.createPillar(0, 4, 0x4a4e69);
    arch.add(pillar1);
    arch.add(pillar2);

    const beamGeo = new THREE.BoxGeometry(1.2, 0.6, 9);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x3d3f50, roughness: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 3.3, 0);
    arch.add(beam);
    return arch;
  }

  private createTombstone(x: number, z: number): THREE.Mesh {
    const geo = new THREE.BoxGeometry(0.5, 1.2, 0.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x22222e, roughness: 0.9 });
    const tomb = new THREE.Mesh(geo, mat);
    tomb.position.set(x, 0.6, z);
    return tomb;
  }

  private createCrystalSpire(x: number, z: number, color: number): THREE.Mesh {
    const geo = new THREE.OctahedronGeometry(1.2, 0);
    geo.scale(0.6, 2.8, 0.6);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85
    });
    const spire = new THREE.Mesh(geo, mat);
    spire.position.set(x, 2.8, z);
    spire.castShadow = true;
    return spire;
  }

  private createAtmosphericParticles() {
    const count = 350;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = -50 + Math.random() * 430;
      positions[i * 3 + 1] = 0.5 + Math.random() * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffd166,
      size: 0.22,
      transparent: true,
      opacity: 0.7
    });

    this.particlesGroup = new THREE.Points(geo, mat);
    this.scene.add(this.particlesGroup);
  }

  private buildWaterStreams() {
    // Translucent river between Solaria Meadows and Whispering Aetherwoods at x = 22
    const riverWidth = 9;
    const riverLength = 62;
    const riverGeo = new THREE.PlaneGeometry(riverWidth, riverLength, 8, 16);
    riverGeo.rotateX(-Math.PI / 2);

    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x0077b6,
      emissive: 0x023e8a,
      emissiveIntensity: 0.25,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.82
    });

    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.position.set(22, 0.03, 0);
    riverMesh.receiveShadow = true;
    this.environmentGroup.add(riverMesh);
    this.waterMeshes.push(riverMesh);

    // River stone riverbanks (pebbles and boulders along both sides)
    for (let z = -28; z <= 28; z += 4) {
      if (Math.abs(z) > 4) { // Don't block bridge walkway
        const rockL = this.createRock(22 - 4.5, z + (Math.random() - 0.5), 0.5 + Math.random() * 0.4, 0x6c757d);
        const rockR = this.createRock(22 + 4.5, z + (Math.random() - 0.5), 0.5 + Math.random() * 0.4, 0x6c757d);
        this.environmentGroup.add(rockL);
        this.environmentGroup.add(rockR);
      }
    }

    // Wooden Arch Bridge over the river along the central path (|z| <= 3.5)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(22, 0.08, 0);

    const plankMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 });
    const railingMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });

    const bridgeLen = 11;
    const plankCount = 14;
    for (let i = 0; i < plankCount; i++) {
      const px = -bridgeLen / 2 + (i / (plankCount - 1)) * bridgeLen;
      const py = Math.sin((i / (plankCount - 1)) * Math.PI) * 0.35;
      const plankGeo = new THREE.BoxGeometry(bridgeLen / plankCount * 0.9, 0.12, 6.2);
      const plank = new THREE.Mesh(plankGeo, plankMat);
      plank.position.set(px, py, 0);
      plank.receiveShadow = true;
      bridgeGroup.add(plank);
    }

    // Bridge Side Railings
    for (const side of [-3.1, 3.1]) {
      const railGeo = new THREE.BoxGeometry(bridgeLen, 0.1, 0.15);
      const rail = new THREE.Mesh(railGeo, railingMat);
      rail.position.set(0, 0.9, side);
      bridgeGroup.add(rail);

      for (let px = -5; px <= 5; px += 2.5) {
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6);
        const post = new THREE.Mesh(postGeo, railingMat);
        post.position.set(px, 0.45, side);
        bridgeGroup.add(post);
      }
    }

    this.environmentGroup.add(bridgeGroup);
  }

  private buildGrassTufts() {
    const grassGroup = new THREE.Group();
    const grassColors = [0x558b2f, 0x7cb342, 0x8bc34a, 0x2e7d32];
    const flowerColors = [0xff6b6b, 0x4cc9f0, 0xffd166, 0xff9ff3, 0xffffff];

    const bladeGeo = new THREE.ConeGeometry(0.08, 0.7, 4);
    bladeGeo.translate(0, 0.35, 0);

    const createTuft = (gx: number, gz: number, hasFlower: boolean) => {
      const tuft = new THREE.Group();
      tuft.position.set(gx, 0, gz);
      const col = grassColors[Math.floor(Math.random() * grassColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, flatShading: true });

      const blades = 3 + Math.floor(Math.random() * 3);
      for (let b = 0; b < blades; b++) {
        const blade = new THREE.Mesh(bladeGeo, mat);
        const angle = (b / blades) * Math.PI * 2 + Math.random() * 0.5;
        blade.rotation.y = angle;
        blade.rotation.z = 0.15 + Math.random() * 0.2;
        const s = 0.7 + Math.random() * 0.5;
        blade.scale.set(s, s, s);
        tuft.add(blade);
      }

      if (hasFlower) {
        const fCol = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        const fMat = new THREE.MeshStandardMaterial({ color: fCol, roughness: 0.5, emissive: fCol, emissiveIntensity: 0.3 });
        const flowerGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const flower = new THREE.Mesh(flowerGeo, fMat);
        flower.position.set(0, 0.65, 0);
        tuft.add(flower);
      }

      this.windFoliage.push({
        object: tuft,
        baseRotZ: 0,
        speed: 2.0 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
      return tuft;
    };

    for (let x = -56; x < 90; x += 3.5) {
      const gzNorth = -3.8 - Math.random() * 2.0;
      grassGroup.add(createTuft(x + Math.random() * 2, gzNorth, Math.random() > 0.6));

      const gzSouth = 3.8 + Math.random() * 2.0;
      grassGroup.add(createTuft(x + Math.random() * 2, gzSouth, Math.random() > 0.6));

      if (Math.random() > 0.5) {
        const zFar = (Math.random() > 0.5 ? 1 : -1) * (7 + Math.random() * 6);
        grassGroup.add(createTuft(x + Math.random() * 3, zFar, true));
      }
    }

    this.environmentGroup.add(grassGroup);
  }

  private buildLanterns() {
    const lanternXs = [-48, -28, -8, 12, 38, 58, 78, 110, 140, 180, 220, 256, 290, 330, 370];
    lanternXs.forEach((x, i) => {
      const zSide = (i % 2 === 0) ? -4.2 : 4.2;
      this.environmentGroup.add(this.createStoneLantern(x, zSide));
    });
  }

  private createStoneLantern(x: number, z: number): THREE.Group {
    const lantern = new THREE.Group();
    lantern.position.set(x, 0, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4e69, roughness: 0.85 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xffb703,
      emissiveIntensity: 0.9,
      roughness: 0.3
    });

    const baseGeo = new THREE.BoxGeometry(0.7, 0.3, 0.7);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 0.15;
    lantern.add(base);

    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.8, 8);
    const pillar = new THREE.Mesh(pillarGeo, stoneMat);
    pillar.position.y = 1.2;
    pillar.castShadow = true;
    lantern.add(pillar);

    const chamberGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const chamber = new THREE.Mesh(chamberGeo, glowMat);
    chamber.position.y = 2.25;
    lantern.add(chamber);

    const roofGeo = new THREE.ConeGeometry(0.55, 0.35, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, stoneMat);
    roof.position.y = 2.65;
    roof.castShadow = true;
    lantern.add(roof);

    return lantern;
  }

  // 13. Dynamic Stylized Puffy Clouds in Sky
  private buildSkyClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      flatShading: true
    });

    const createPuffyCloud = (scale: number): THREE.Group => {
      const g = new THREE.Group();
      const numPuffs = 4 + Math.floor(Math.random() * 3);
      for (let p = 0; p < numPuffs; p++) {
        const rad = (1.4 + Math.random() * 1.2) * scale;
        const puffGeo = new THREE.DodecahedronGeometry(rad, 1);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (p - numPuffs / 2) * (1.6 * scale),
          (Math.random() - 0.5) * 0.8 * scale,
          (Math.random() - 0.5) * 1.2 * scale
        );
        g.add(puff);
      }
      return g;
    };

    const cloudConfigs = [
      { x: -40, y: 32, z: -18, scale: 1.4, speed: 0.45 },
      { x: -10, y: 36, z: 16, scale: 1.6, speed: 0.35 },
      { x: 25, y: 34, z: -12, scale: 1.3, speed: 0.5 },
      { x: 60, y: 38, z: 14, scale: 1.8, speed: 0.3 },
      { x: 105, y: 33, z: -16, scale: 1.5, speed: 0.4 },
      { x: 145, y: 37, z: 12, scale: 1.7, speed: 0.38 },
      { x: 190, y: 35, z: -14, scale: 1.4, speed: 0.42 },
      { x: 240, y: 39, z: 15, scale: 1.9, speed: 0.32 },
      { x: 290, y: 34, z: -15, scale: 1.6, speed: 0.44 },
      { x: 340, y: 36, z: 10, scale: 2.0, speed: 0.36 }
    ];

    cloudConfigs.forEach(cfg => {
      const cloud = createPuffyCloud(cfg.scale);
      cloud.position.set(cfg.x, cfg.y, cfg.z);
      this.cloudsGroup.add(cloud);
      this.cloudEntries.push({
        group: cloud,
        speed: cfg.speed,
        minX: -60,
        maxX: 410
      });
    });
  }

  // 14. Radiant Anime Sun with Golden Corona
  private buildSunCorona() {
    const sunGroup = new THREE.Group();
    sunGroup.position.set(35, 52, -28);

    // Sun Core Sphere
    const sunGeo = new THREE.SphereGeometry(4.2, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    const sunCore = new THREE.Mesh(sunGeo, sunMat);
    sunGroup.add(sunCore);

    // Golden Radiant Halo Ring
    const ringGeo = new THREE.RingGeometry(4.8, 8.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
    });
    this.sunCoronaRing = new THREE.Mesh(ringGeo, ringMat);
    this.sunCoronaRing.lookAt(0, -1, 0.6);
    sunGroup.add(this.sunCoronaRing);

    this.environmentGroup.add(sunGroup);
  }

  // 15. Village Fences, Benches & Floral Decorations
  private buildVillageFencesAndBenches() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.85 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });

    // Wooden fences bordering Solaria Meadows plaza
    const createFenceSection = (x: number, z: number, rotY: number = 0): THREE.Group => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rotY;

      // 2 Posts
      for (const px of [-1.2, 1.2]) {
        const postGeo = new THREE.BoxGeometry(0.18, 1.1, 0.18);
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(px, 0.55, 0);
        post.castShadow = true;
        g.add(post);
      }
      // 2 Crossbars
      for (const py of [0.4, 0.85]) {
        const barGeo = new THREE.BoxGeometry(2.5, 0.12, 0.1);
        const bar = new THREE.Mesh(barGeo, woodMat);
        bar.position.set(0, py, 0);
        g.add(bar);
      }
      return g;
    };

    // Solaria Fences along walkway edges
    for (let x = -48; x < 12; x += 6) {
      if (Math.abs(x) > 3) {
        this.environmentGroup.add(createFenceSection(x, -6.8));
        this.environmentGroup.add(createFenceSection(x, 6.8));
      }
    }

    // Village Stone Resting Benches
    const benchPositions = [
      { x: -32, z: -5.2, rot: 0.1 },
      { x: -18, z: 5.2, rot: -0.1 },
      { x: -4, z: -5.2, rot: 0.05 }
    ];

    benchPositions.forEach(b => {
      const bench = new THREE.Group();
      bench.position.set(b.x, 0, b.z);
      bench.rotation.y = b.rot;

      // Seat slab
      const slabGeo = new THREE.BoxGeometry(2.2, 0.18, 0.8);
      const slab = new THREE.Mesh(slabGeo, stoneMat);
      slab.position.y = 0.6;
      slab.castShadow = true;
      bench.add(slab);

      // 2 Legs
      for (const lx of [-0.85, 0.85]) {
        const legGeo = new THREE.BoxGeometry(0.3, 0.6, 0.65);
        const leg = new THREE.Mesh(legGeo, stoneMat);
        leg.position.set(lx, 0.3, 0);
        leg.castShadow = true;
        bench.add(leg);
      }
      this.environmentGroup.add(bench);
    });
  }

  // 16. Mystic Monoliths & Rune Stones
  private buildMysticRuneStones() {
    const runeStoneMat = new THREE.MeshStandardMaterial({
      color: 0x1f192b,
      roughness: 0.7,
      metalness: 0.15
    });

    const runePositions = [
      { x: 38, z: -7, color: 0x00b4d8 },
      { x: 55, z: 7, color: 0xc77dff },
      { x: 75, z: -7.5, color: 0xff007f }
    ];

    runePositions.forEach(r => {
      const monolith = new THREE.Group();
      monolith.position.set(r.x, 0, r.z);

      // Angled stone obelisk
      const stoneGeo = new THREE.ConeGeometry(0.85, 3.4, 5);
      const stone = new THREE.Mesh(stoneGeo, runeStoneMat);
      stone.position.y = 1.7;
      stone.castShadow = true;
      monolith.add(stone);

      // Glowing rune ring floating at midpoint
      const runeRingGeo = new THREE.TorusGeometry(1.05, 0.07, 8, 24);
      const runeRingMat = new THREE.MeshBasicMaterial({
        color: r.color,
        transparent: true,
        opacity: 0.85
      });
      const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
      runeRing.rotation.x = Math.PI / 2;
      runeRing.position.y = 1.8;
      monolith.add(runeRing);

      this.windFoliage.push({
        object: runeRing,
        baseRotZ: 0,
        speed: 1.5,
        phase: Math.random() * Math.PI
      });

      this.environmentGroup.add(monolith);
    });
  }

  public updateParticles(time: number) {
    if (!this.particlesGroup) return;
    const positions = this.particlesGroup.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3 + 1] += Math.sin(time + i) * 0.006;
      if (positions[i * 3 + 1] < 0.2) positions[i * 3 + 1] = 7;
      if (positions[i * 3 + 1] > 7.5) positions[i * 3 + 1] = 0.5;
    }
    this.particlesGroup.geometry.attributes.position.needsUpdate = true;
  }

  public updateEnvironment(time: number, dt: number) {
    this.updateParticles(time);

    // Dynamic drifting clouds across sky
    for (let i = 0; i < this.cloudEntries.length; i++) {
      const c = this.cloudEntries[i];
      c.group.position.x += c.speed * dt * 2.5;
      if (c.group.position.x > c.maxX) {
        c.group.position.x = c.minX;
      }
    }

    // Radiant sun corona slow breathing
    if (this.sunCoronaRing) {
      const s = 1.0 + Math.sin(time * 1.8) * 0.06;
      this.sunCoronaRing.scale.set(s, s, 1);
      this.sunCoronaRing.rotation.z += dt * 0.08;
    }

    // Water surface wave shimmer
    for (let i = 0; i < this.waterMeshes.length; i++) {
      const mesh = this.waterMeshes[i];
      mesh.position.y = 0.03 + Math.sin(time * 2.2 + i) * 0.015;
    }

    // Wind foliage sway
    for (let i = 0; i < this.windFoliage.length; i++) {
      const item = this.windFoliage[i];
      item.object.rotation.z = item.baseRotZ + Math.sin(time * item.speed + item.phase) * 0.038;
      item.object.rotation.x = Math.cos(time * item.speed * 0.75 + item.phase) * 0.02;
    }
  }
}

