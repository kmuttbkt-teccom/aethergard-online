/**
 * AETHERGARD ONLINE — ModelAssetManager
 * Universal 3D Model Asset Pipeline & Online Ingestion Manager.
 * Loads, normalizes, rigs, and caches models from Tripo3D, Sketchfab, CDNs, and local GLBs.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Weapon3DBuilder, Weapon3DVisual } from './Weapon3DBuilder.js';

export interface ModelCatalogEntry {
  id: string;
  name: string;
  category: 'character' | 'npc' | 'monster' | 'prop' | 'weapon';
  source: 'tripo3d' | 'sketchfab' | 'local' | 'custom';
  url: string;
  defaultHeight: number;
  description: string;
  thumbnailIcon: string;
}

export interface Loaded3DAsset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  mixer?: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  play: (name: string, loop?: boolean) => void;
  targetHeight: number;
}

export class ModelAssetManager {
  private static _instance: ModelAssetManager | null = null;
  private _loader = new GLTFLoader();
  private _cache = new Map<string, Loaded3DAsset>();

  // Curated Library of Tripo3D, Sketchfab & High-Fidelity MMORPG Models
  public catalog: ModelCatalogEntry[] = [
    // Characters
    {
      id: 'char_xbot',
      name: 'Cyber Knight (X-Bot)',
      category: 'character',
      source: 'local',
      url: '/models/char_xbot.glb',
      defaultHeight: 1.85,
      description: 'นักรบไซเบอร์เกราะเงิน ท่วงท่าการต่อสู้แบบผสมผสาน',
      thumbnailIcon: '🤖'
    },
    {
      id: 'char_michelle',
      name: 'Sorceress Michelle',
      category: 'character',
      source: 'local',
      url: '/models/char_michelle.glb',
      defaultHeight: 1.75,
      description: 'จอมเวทสาวทรงเสน่ห์ พร้อมผ้าคลุมและอนิเมชั่นสมบูรณ์',
      thumbnailIcon: '🧙‍♀️'
    },
    {
      id: 'char_robot',
      name: 'Steam Golem Vanguard',
      category: 'character',
      source: 'local',
      url: '/models/char_robot.glb',
      defaultHeight: 1.9,
      description: 'จักรกลไอน้ำสังหาร พลังป้องกันสูง',
      thumbnailIcon: '🦾'
    },
    {
      id: 'char_cesiumman',
      name: 'Astral Void Strider',
      category: 'character',
      source: 'local',
      url: '/models/char_cesiumman.glb',
      defaultHeight: 1.8,
      description: 'ผู้ท่องมิติดวงดาว รวดเร็วและว่องไว',
      thumbnailIcon: '🌌'
    },
    // Town NPCs
    {
      id: 'npc_elder',
      name: 'ผู้เฒ่า Eldrin (Village Elder)',
      category: 'npc',
      source: 'local',
      url: '/models/char_cesiumman.glb',
      defaultHeight: 1.75,
      description: 'ผู้นำหมู่บ้าน Solaria มอบคำแนะนำและบันทึกเควส',
      thumbnailIcon: '👴'
    },
    {
      id: 'npc_blacksmith',
      name: 'ช่างตีเหล็ก Bronn (Master Blacksmith)',
      category: 'npc',
      source: 'local',
      url: '/models/char_robot.glb',
      defaultHeight: 2.0,
      description: 'ช่างตีดาบและหลอมศิลาอัปเกรดอาวุธชุดเกราะ',
      thumbnailIcon: '🔨'
    },
    {
      id: 'npc_priestess',
      name: 'นักบวชหญิง Lyanna (High Priestess)',
      category: 'npc',
      source: 'local',
      url: '/models/char_michelle.glb',
      defaultHeight: 1.75,
      description: 'ผู้ส่งมอบพรอันศักดิ์สิทธิ์และฟื้นฟู HP/MP 100%',
      thumbnailIcon: '🕊️'
    },
    {
      id: 'npc_weaponsmith',
      name: 'พ่อค้าอาวุธ Garrick (Arms Dealer)',
      category: 'npc',
      source: 'local',
      url: '/models/monster_soldier.glb',
      defaultHeight: 1.9,
      description: 'ขายอาวุธและชุดเกราะทุกสายอาชีพ',
      thumbnailIcon: '⚔️'
    },
    {
      id: 'npc_trainer',
      name: 'ครูฝึก Kaelen (Class Trainer)',
      category: 'npc',
      source: 'local',
      url: '/models/char_xbot.glb',
      defaultHeight: 1.85,
      description: 'เปลี่ยนอาชีพและอัปเกรดสกิล',
      thumbnailIcon: '🎓'
    },
    // Monsters
    {
      id: 'mob_golem',
      name: 'Titan Earth Golem',
      category: 'monster',
      source: 'local',
      url: '/models/mob_golem.glb',
      defaultHeight: 2.6,
      description: 'โกเลมหินศิลาโบราณ ทรงพลังและหนักแน่น',
      thumbnailIcon: '🗿'
    },
    {
      id: 'mob_soldier',
      name: 'Skeleton Legion Soldier',
      category: 'monster',
      source: 'local',
      url: '/models/monster_soldier.glb',
      defaultHeight: 1.9,
      description: 'นักรบโครงกระดูกแห่งสุสานใต้ดิน ถือหอกและโล่',
      thumbnailIcon: '💀'
    },
    {
      id: 'mob_fox',
      name: 'Aether Spirit Fox',
      category: 'monster',
      source: 'local',
      url: '/models/mob_fox.glb',
      defaultHeight: 1.2,
      description: 'สุนัขจิ้งจอกเวทมนตร์แห่งป่า Aetherwoods',
      thumbnailIcon: '🦊'
    },
    {
      id: 'mob_horse',
      name: 'Nightmare Stallion',
      category: 'monster',
      source: 'local',
      url: '/models/mob_horse.glb',
      defaultHeight: 2.0,
      description: 'อาชาเพลิงนิลแห่ง Magma Core',
      thumbnailIcon: '🐎'
    },
    {
      id: 'mob_duck',
      name: 'Sunny Slime Duck',
      category: 'monster',
      source: 'local',
      url: '/models/mob_duck.glb',
      defaultHeight: 1.0,
      description: 'เป็ดน้อยจอมซน มาสคอตประจำทุ่งหญ้า Solaria',
      thumbnailIcon: '🦆'
    },
    {
      id: 'mob_flamingo',
      name: 'Celestial Seraph Flamingo',
      category: 'monster',
      source: 'local',
      url: '/models/mob_flamingo.glb',
      defaultHeight: 2.2,
      description: 'วิหคเพลิงสวรรค์ ผู้พิทักษ์มิติว่างเปล่า',
      thumbnailIcon: '🦩'
    },
    // MVP Bosses & New 3D Additions
    {
      id: 'mob_dragon',
      name: 'Solarion, The Eclipse Lord [MVP Dragon]',
      category: 'monster',
      source: 'local',
      url: '/models/mob_dragon.glb',
      defaultHeight: 3.6,
      description: 'มังกรแดงคริสตัลสุริยคราส บอสสูงสุดแห่ง Aethergard กางปีกโปร่งแสงสวยงาม',
      thumbnailIcon: '🐉'
    },
    {
      id: 'mob_brainstem',
      name: 'Biomecha Colossus (BrainStem)',
      category: 'monster',
      source: 'local',
      url: '/models/mob_brainstem.glb',
      defaultHeight: 2.8,
      description: 'อสูรจักรกลชีวภาพโบราณ Lord Baphomet พลังทำลายล้างมหาศาล',
      thumbnailIcon: '👾'
    },
    {
      id: 'char_soldier',
      name: 'Armored Soldier Knight',
      category: 'character',
      source: 'local',
      url: '/models/char_soldier.glb',
      defaultHeight: 1.85,
      description: 'อัศวินเกราะเต็มยศ อนิเมชั่นการเดินและวิ่งสมบูรณ์แบบ',
      thumbnailIcon: '🛡️'
    },
    {
      id: 'char_robot_expressive',
      name: 'Proto Robot Expressive',
      category: 'character',
      source: 'local',
      url: '/models/char_robot_expressive.glb',
      defaultHeight: 1.8,
      description: 'หุ่นยนต์อัจฉริยะ แสดงอารมณ์และอนิเมชั่นรอบด้าน',
      thumbnailIcon: '🤖'
    },
    {
      id: 'item_helmet',
      name: 'Legendary Relic Helm',
      category: 'prop',
      source: 'local',
      url: '/models/item_helmet.glb',
      defaultHeight: 1.2,
      description: 'หมวกสงครามรบระดับตำนาน พื้นผิว PBR คุณภาพสูง',
      thumbnailIcon: '🪖'
    },
    // 3D Master Weapons & Relics
    {
      id: 'weapon_excalibur',
      name: 'Holy Excalibur +10 [GM]',
      category: 'weapon',
      source: 'local',
      url: 'weapon_excalibur',
      defaultHeight: 1.5,
      description: 'ดาบศักดิ์สิทธิ์เอ็กซ์คาลิเบอร์ สลักอักขระรูนสีฟ้าคราม ส่องแสงออร่าสวรรค์',
      thumbnailIcon: '🗡️'
    },
    {
      id: 'weapon_dragonslayer',
      name: 'Dragon Slayer Greatsword',
      category: 'weapon',
      source: 'local',
      url: 'weapon_dragonslayer',
      defaultHeight: 1.9,
      description: 'ดาบยักษ์ศิลาออบซิเดียน ผสานเส้นชีพจรลาวาเพลิงผลาญมังกร',
      thumbnailIcon: '⚔️'
    },
    {
      id: 'weapon_staff',
      name: 'Archangel Wing Staff',
      category: 'weapon',
      source: 'local',
      url: 'weapon_staff',
      defaultHeight: 1.8,
      description: 'คทาปีกเทวทูตทองคำ หัวคทาลอยแกนมานาเรืองแสงหมุนวน',
      thumbnailIcon: '🪄'
    },
    {
      id: 'weapon_bow',
      name: 'Astral Composite Bow',
      category: 'weapon',
      source: 'local',
      url: 'weapon_bow',
      defaultHeight: 1.6,
      description: 'ธนูคันโค้งดวงดาว สายธนูพลังงานแสงทองยิงทะลวงมิติ',
      thumbnailIcon: '🏹'
    },
    {
      id: 'weapon_dagger',
      name: 'Nightshade Shadow Daggers',
      category: 'weapon',
      source: 'local',
      url: 'weapon_dagger',
      defaultHeight: 0.9,
      description: 'มีดสั้นคู่เงาราตรี ใบมีดอเมทิสต์สีม่วงแฝงพิษคริสตัล',
      thumbnailIcon: '🗡️'
    },
    {
      id: 'weapon_shield',
      name: 'Aegis of the Sun Shield',
      category: 'weapon',
      source: 'local',
      url: 'weapon_shield',
      defaultHeight: 1.2,
      description: 'โล่ว่าวกษัตริย์ ประดับดวงสุริยะสีทองคุ้มครองผู้ถือครอง',
      thumbnailIcon: '🛡️'
    }
  ];

  public static getInstance(): ModelAssetManager {
    if (!this._instance) {
      this._instance = new ModelAssetManager();
    }
    return this._instance;
  }

  /**
   * Load any 3D model by URL or catalog ID.
   * Auto-normalizes scale, anchors feet to ground (y = 0), and tunes materials.
   */
  public async loadModel(urlOrId: string, customHeight?: number): Promise<Loaded3DAsset> {
    // Check if weapon model
    if (urlOrId.startsWith('weapon_')) {
      let visual: Weapon3DVisual;
      switch (urlOrId) {
        case 'weapon_excalibur': visual = Weapon3DBuilder.createExcalibur(); break;
        case 'weapon_dragonslayer': visual = Weapon3DBuilder.createDragonSlayer(); break;
        case 'weapon_staff': visual = Weapon3DBuilder.createArchangelStaff(); break;
        case 'weapon_bow': visual = Weapon3DBuilder.createAstralBow(); break;
        case 'weapon_dagger': visual = Weapon3DBuilder.createNightshadeDagger(); break;
        case 'weapon_shield': visual = Weapon3DBuilder.createAegisShield(); break;
        default: visual = Weapon3DBuilder.createExcalibur(); break;
      }
      return {
        scene: visual.group,
        animations: [],
        actions: new Map(),
        play: () => {},
        targetHeight: customHeight || 1.85
      };
    }

    // Resolve URL from catalog if ID passed
    const catalogItem = this.catalog.find(c => c.id === urlOrId);
    const url = catalogItem ? catalogItem.url : urlOrId;
    const targetH = customHeight || catalogItem?.defaultHeight || 1.85;

    // Check memory cache
    const cacheKey = `${url}_h${targetH}`;
    if (this._cache.has(cacheKey)) {
      return this._cloneAsset(this._cache.get(cacheKey)!);
    }

    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf: GLTF) => {
          const asset = this._normalizeGLTF(gltf, targetH);
          this._cache.set(cacheKey, asset);
          resolve(this._cloneAsset(asset));
        },
        undefined,
        (error) => {
          console.warn(`[ModelAssetManager] Failed to load model from: ${url}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Normalizes bounding box, anchors model origin to feet (min.y = 0),
   * and prepares AnimationMixer with fuzzy action detection.
   */
  private _normalizeGLTF(gltf: GLTF, targetHeight: number): Loaded3DAsset {
    const rawScene = gltf.scene;

    // 1. Calculate raw bounding box
    const bbox = new THREE.Box3().setFromObject(rawScene);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    // 2. Uniform height scale
    const scale = targetHeight / Math.max(0.001, size.y);
    rawScene.scale.set(scale, scale, scale);

    // 3. Ground Anchor: Shift so feet touch y = 0 and (x, z) are centered
    rawScene.position.x = -center.x * scale;
    rawScene.position.z = -center.z * scale;
    rawScene.position.y = -bbox.min.y * scale;

    // Wrap in a clean pivot group
    const root = new THREE.Group();
    root.add(rawScene);

    // 4. Tune materials for shadows and tone mapping
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        if (m.material) {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.roughness !== undefined) mat.roughness = Math.min(0.85, mat.roughness);
        }
      }
    });

    // 5. Setup AnimationMixer
    let mixer: THREE.AnimationMixer | undefined;
    const actions = new Map<string, THREE.AnimationAction>();

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(root);
      gltf.animations.forEach((clip) => {
        const action = mixer!.clipAction(clip);
        actions.set(clip.name.toLowerCase(), action);
      });
    }

    const play = (name: string, loop: boolean = true) => {
      if (!mixer || actions.size === 0) return;
      const lower = name.toLowerCase();

      // Find best matching action
      let targetAction: THREE.AnimationAction | undefined;
      for (const [key, act] of actions.entries()) {
        if (key.includes(lower)) {
          targetAction = act;
          break;
        }
      }

      // Default to first clip if no match
      if (!targetAction && actions.size > 0) {
        targetAction = actions.values().next().value;
      }

      if (targetAction) {
        targetAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        targetAction.clampWhenFinished = !loop;
        targetAction.play();
      }
    };

    return {
      scene: root,
      animations: gltf.animations || [],
      mixer,
      actions,
      play,
      targetHeight
    };
  }

  private _cloneAsset(asset: Loaded3DAsset): Loaded3DAsset {
    const clonedScene = asset.scene.clone(true);
    let mixer: THREE.AnimationMixer | undefined;
    const actions = new Map<string, THREE.AnimationAction>();

    if (asset.animations && asset.animations.length > 0) {
      mixer = new THREE.AnimationMixer(clonedScene);
      asset.animations.forEach((clip) => {
        const act = mixer!.clipAction(clip);
        actions.set(clip.name.toLowerCase(), act);
      });
    }

    const play = (name: string, loop: boolean = true) => {
      if (!mixer || actions.size === 0) return;
      const lower = name.toLowerCase();
      let targetAction: THREE.AnimationAction | undefined;
      for (const [key, act] of actions.entries()) {
        if (key.includes(lower)) {
          targetAction = act;
          break;
        }
      }
      if (!targetAction && actions.size > 0) {
        targetAction = actions.values().next().value;
      }
      if (targetAction) {
        targetAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        targetAction.clampWhenFinished = !loop;
        targetAction.play();
      }
    };

    return {
      scene: clonedScene,
      animations: asset.animations,
      mixer,
      actions,
      play,
      targetHeight: asset.targetHeight
    };
  }

  /**
   * Register a custom online model URL (e.g. from Tripo3D export or Sketchfab)
   */
  public registerCustomModel(
    name: string,
    url: string,
    category: 'character' | 'npc' | 'monster' | 'prop',
    height: number = 1.85
  ): ModelCatalogEntry {
    const id = `custom_${Date.now()}`;
    const entry: ModelCatalogEntry = {
      id,
      name,
      category,
      source: 'custom',
      url,
      defaultHeight: height,
      description: `โมเดลที่นำเข้าจากภายนอก: ${url}`,
      thumbnailIcon: category === 'character' ? '🦸' : (category === 'npc' ? '🧑' : '👾')
    };
    this.catalog.unshift(entry);
    return entry;
  }
}
