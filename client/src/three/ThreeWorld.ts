import * as THREE from 'three';
import { CharacterModel, PlayerData, MonsterData, DropItemData, ServerSnapshot, DamageEvent, WeaponType } from '../../../server/src/types.js';
import {
  SKILL_DB, SkillDef, JOB_SKILL_BAR, SERVER_NPC_ACTIONS, NpcOption, canUseSkill, computeDerived, inferWeaponType,
  isBossMonster, toWorld3DX, toWorld3DZ, fromWorld3DX, fromWorld3DZ, WORLD_MAX_X, WORLD_MAX_Z, WORLD_SCALE, RARITY_COLORS
} from '../../../server/src/GameData.js';
import { NetworkClient } from '../systems/Network.js';
import { UIManager } from '../ui/UIManager.js';
import { CharacterModelBuilder, Character3DVisuals, CharacterAnim } from './CharacterModelBuilder.js';
import { MonsterModelBuilder, Monster3DVisuals } from './MonsterModelBuilder.js';
import { ThreeTerrain } from './ThreeTerrain.js';
import { sound } from '../engine/Sound.js';
import { MobileControls } from '../systems/MobileControls.js';
import { NPC3DManager, NPCDef } from './NPC3DManager.js';
import { ModelAssetManager } from './ModelAssetManager.js';
import { SkillEffects3D, ELEMENT_COLORS } from './SkillEffects3D.js';
import { BotEngine } from '../systems/BotEngine.js';
import { Weapon3DBuilder, Weapon3DVisual } from './Weapon3DBuilder.js';
import { HeroCompanion3D } from './HeroCompanion3D.js';
import { HeroRosterManager, HERO_ROSTER_DB, HeroDef } from '../systems/HeroRoster.js';

type SnapshotPlayer = ServerSnapshot['players'][number];
type SnapshotMonster = ServerSnapshot['monsters'][number];

const MIN_X3D = toWorld3DX(0);
const MAX_X3D = toWorld3DX(WORLD_MAX_X);
const MAX_Z3D = toWorld3DZ(WORLD_MAX_Z);
/** How far a queued skill/attack will walk to reach its target (3D units) */
const MAX_CHASE_DISTANCE = 18;

export interface LegendaryWeaponStyle {
  id: 'flame_greatsword' | 'cursed_bow' | 'celestial_staff' | 'shadow_daggers';
  name: string;
  thaiName: string;
  weaponType: WeaponType;
  dripColor: string;
  skills: [string, string, string, string]; // [Z, X, 4, 5]
  range: number;
}

export const LEGENDARY_WEAPONS: LegendaryWeaponStyle[] = [
  {
    id: 'flame_greatsword',
    name: 'Dragon Slayer (ดาบเพลิง)',
    thaiName: 'ดาบเพลิงมังกรผลาญพิภพ',
    weaponType: 'greatsword',
    dripColor: '#ff4500',
    skills: ['NORMAL', 'BASH', 'RADIANT_SLASH', 'SOLAR_AEGIS'],
    range: 3.2
  },
  {
    id: 'cursed_bow',
    name: 'Astral Shadow Bow (ธนูต้องสาป)',
    thaiName: 'ธนูต้องสาปกลืนวิญญาณ',
    weaponType: 'bow',
    dripColor: '#a855f7',
    skills: ['NORMAL', 'GALE_ARROW', 'RAIN_OF_LIGHT', 'SHADOW_BLINK'],
    range: 9.0
  },
  {
    id: 'celestial_staff',
    name: 'Archangel Scepter (ไม้เท้าเวทย์)',
    thaiName: 'ไม้เท้ามนตราปีกเทวทูต',
    weaponType: 'staff',
    dripColor: '#38bdf8',
    skills: ['NORMAL', 'ASTRAL_METEOR', 'FROST_NOVA', 'SANCTUARY'],
    range: 8.0
  },
  {
    id: 'shadow_daggers',
    name: 'Nightshade Claws (กริชเงาราตรี)',
    thaiName: 'กริชเงาราตรีคู่ปลิดชีพ',
    weaponType: 'dagger',
    dripColor: '#e11d48',
    skills: ['NORMAL', 'SHADOW_BLINK', 'BLADE_DANCE', 'COIN_BURST'],
    range: 2.6
  }
];

/**
 * Floating billboard with a name, level and optional HP bar.
 * The canvas is only redrawn when a value actually changes.
 */
class OverheadLabel {
  public sprite: THREE.Sprite;
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private key = '';

  constructor(private nameColor: string, private showHp: boolean) {
    this.canvas.width = 256;
    this.canvas.height = 64;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthTest: false });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.renderOrder = 900;
    this.sprite.scale.set(2.6, 0.65, 1);
  }

  update(name: string, level: number, hp: number, maxHp: number, highlight = false) {
    const key = `${name}|${level}|${hp}|${maxHp}|${highlight}`;
    if (key === this.key) return;
    this.key = key;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 21px "Noto Sans Thai", Kanit, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    const label = level > 0 ? `${name}  Lv.${level}` : name;
    ctx.strokeText(label, 128, 24);
    ctx.fillStyle = highlight ? '#fde047' : this.nameColor;
    ctx.fillText(label, 128, 24);

    if (this.showHp && maxHp > 0) {
      const pct = Math.max(0, Math.min(1, hp / maxHp));
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(48, 36, 160, 12);
      ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(50, 38, 156 * pct, 8);
    }
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
    (this.sprite.material as THREE.SpriteMaterial).dispose();
  }
}

interface RemotePlayerEntry {
  visuals: Character3DVisuals;
  targetPos: THREE.Vector3;
  targetRot: number;
  data: SnapshotPlayer;
  label: OverheadLabel;
}

interface MonsterEntry {
  visuals: Monster3DVisuals;
  pos: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetRot: number;
  data: SnapshotMonster;
  label: OverheadLabel;
  height: number;
  lungeT: number;
  hitT: number;
  frozenRing?: THREE.Mesh;
}

interface DropEntry {
  group: THREE.Group;
  data: DropItemData;
  baseY: number;
}

export class ThreeWorld {
  public container: HTMLElement;
  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public terrain!: ThreeTerrain;
  public npcManager!: NPC3DManager;
  public effects!: SkillEffects3D;

  public network: NetworkClient;
  public ui: UIManager;
  public character: CharacterModel;
  public mobileControls?: MobileControls;
  /** Shared with the 2D scene: same on/off state and settings window */
  public botEngine?: BotEngine;

  // Local Player
  public playerVisuals!: Character3DVisuals;
  private selfLabel!: OverheadLabel;
  public playerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public playerTarget: THREE.Vector3 | null = null;
  public playerFacing: number = 0; // Y angle in radians
  public isMoving: boolean = false;
  public isJumping: boolean = false;
  public jumpVy: number = 0;
  /** Shared with WorldScene — the server's latest view of this character */
  public selfData: PlayerData | null = null;
  public selfId: string | null = null;
  public isDead = false;
  private _pendingNpcInteract: NPCDef | null = null;
  private shopNpc: NPCDef | null = null;

  // Remote entities
  public remotePlayers: Map<string, RemotePlayerEntry> = new Map();
  public monsters: Map<string, MonsterEntry> = new Map();
  private drops: Map<string, DropEntry> = new Map();

  // Camera Orbit & Zoom (Ragnarok Online style)
  public cameraDistance: number = 14;
  public cameraPitch: number = Math.PI * 0.28; // ~50 degrees elevation
  public cameraYaw: number = 0; // 360 degree rotation
  public isRightMouseDown: boolean = false;
  public lastMouseX: number = 0;
  public lastMouseY: number = 0;
  private shakeT = 0;

  // Raycasting & Click Marker
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private clickMarker!: THREE.Mesh;
  private targetReticle!: THREE.Group;
  private footstepTimer: number = 0;
  private footstepDustGroup: THREE.Group = new THREE.Group();

  // Animation Loop
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private keys: { [key: string]: boolean } = {};
  public isRunning: boolean = false;
  private elapsed = 0;

  // Combat state
  /** Currently selected monster (reticle + target frame) */
  private selectedTargetId: string | null = null;
  /** RO-style auto attack: keep swinging at the selected target */
  private autoAttack = false;
  /** A skill waiting until we've walked into range of its target */
  private queuedSkill: string | null = null;
  private lastBasicAt = 0;
  private lastPosSyncAt = 0;
  private wasMoving = false;
  private pendingPickupId: string | null = null;

  // Auto-play bot (3D)
  private botNextThinkAt = 0;
  private botLastPotionAt = 0;
  private botDeadSince = 0;

  private unsubscribers: Array<() => void> = [];
  private hitVignette: HTMLElement | null = null;

  // Party & Companions (Pixel-Art 3D Billboard party members)
  public companions: HeroCompanion3D[] = [];

  // Real-time Weapon Switching (Drip & Skills)
  public currentWeaponIndex: number = 0;
  public activeWeaponStyle: LegendaryWeaponStyle = LEGENDARY_WEAPONS[0];

  constructor(
    container: HTMLElement,
    network: NetworkClient,
    ui: UIManager,
    character: CharacterModel
  ) {
    this.container = container;
    this.network = network;
    this.ui = ui;
    this.character = character;

    this.initThree();
    this.setupControls();
    this.subscribeNetwork();
  }

  private initThree() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene & Atmosphere (Lush Forest Sky & Fog)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa3cef1); // Daylight Azure Sky
    this.scene.fog = new THREE.FogExp2(0xa3cef1, 0.015);

    // 2. Camera (Isometric Perspective)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
    this.updateCameraPosition();

    // 3. Modern Stylized MMORPG Renderer with Tone Mapping & Soft Shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. Vibrant Lighting: Sky Ambient, Ground Bounce Hemisphere, Sunlight & Anime Rim Light
    const ambientLight = new THREE.AmbientLight(0xfff3b0, 0.45);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f6212, 0.7);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffae0, 1.3);
    sunLight.position.set(30, 45, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 120;
    const shadowD = 35;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    this.scene.add(sunLight);

    // Anime Character Rim Light (silhouetted edge highlights)
    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.85);
    rimLight.position.set(-25, 30, -30);
    this.scene.add(rimLight);

    // 5. Build 3D Terrain & Multi-Zone Environment
    this.terrain = new ThreeTerrain(this.scene);
    this.effects = new SkillEffects3D(this.scene);

    // 6. Click Ripple Ground Marker
    const markerGeo = new THREE.RingGeometry(0.3, 0.5, 24);
    markerGeo.rotateX(-Math.PI / 2);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    this.clickMarker = new THREE.Mesh(markerGeo, markerMat);
    this.clickMarker.position.y = 0.05;
    this.scene.add(this.clickMarker);

    // 7. Holographic Combat Target Reticle
    this.targetReticle = new THREE.Group();
    const reticleRingGeo = new THREE.RingGeometry(1.1, 1.3, 32);
    reticleRingGeo.rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xff2a55,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const reticleRing = new THREE.Mesh(reticleRingGeo, reticleMat);
    this.targetReticle.add(reticleRing);

    for (let i = 0; i < 4; i++) {
      const notchGeo = new THREE.BoxGeometry(0.12, 0.02, 0.35);
      const notchMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
      const notch = new THREE.Mesh(notchGeo, notchMat);
      const angle = (i * Math.PI) / 2;
      notch.position.set(Math.cos(angle) * 1.25, 0.01, Math.sin(angle) * 1.25);
      notch.rotation.y = -angle;
      this.targetReticle.add(notch);
    }
    this.targetReticle.position.y = 0.04;
    this.targetReticle.visible = false;
    this.scene.add(this.targetReticle);

    // 8. Footstep Dust System
    this.scene.add(this.footstepDustGroup);

    // 9. Create Self 3D Player Character
    this.playerVisuals = CharacterModelBuilder.createCharacter(
      this.character.name,
      this.character.job,
      this.character.gender,
      this.character.hairColor || '#ffd700',
      Boolean(this.character.isGm)
    );
    this.playerVisuals.setEquipment(this.character.equipped || {});
    this.scene.add(this.playerVisuals.group);
    this.selfLabel = new OverheadLabel('#bae6fd', true);
    this.scene.add(this.selfLabel.sprite);

    // 10. Interactive 3D Town NPCs (Solaria Town)
    this.npcManager = NPC3DManager.getInstance();
    this.npcManager.initNpcs(this.scene);
    this.npcManager.onNpcInteractCallback = (npc, option) => this.handleNpcAction(npc, option);

    // 11. Red screen-edge flash when we get hit
    this.hitVignette = document.createElement('div');
    this.hitVignette.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s;box-shadow:inset 0 0 120px 30px rgba(220,38,38,.75);z-index:5;';
    this.container.appendChild(this.hitVignette);

    window.addEventListener('resize', this.onResize);
    window.visualViewport?.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onOrientationChange);

    // 12. 3D Companions & Legendary Weapon Initialization
    this.initCompanions();
    setTimeout(() => this.applyWeaponStyle(0, false), 400);
  }

  public start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.renderLoop);
    // Announce our 3D position right away so the server switches to x/z combat
    this.syncPosition(true);
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
  }

  /** Full teardown when leaving the game (listeners, subscriptions, GPU) */
  public destroy() {
    this.stop();
    this.unsubscribers.forEach(u => u());
    this.unsubscribers = [];
    this.companions.forEach(c => c.destroy(this.scene));
    this.companions = [];
    window.removeEventListener('resize', this.onResize);
    window.visualViewport?.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onOrientationChange);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.effects.clear();
    this.renderer.dispose();
  }

  /** Place the local player at a server position (entering 3D, warps, respawn) */
  public placeAt(serverX: number, serverZ: number) {
    this.playerPos.set(
      Math.max(MIN_X3D, Math.min(MAX_X3D, toWorld3DX(serverX))),
      0,
      Math.max(-MAX_Z3D, Math.min(MAX_Z3D, toWorld3DZ(serverZ)))
    );
    this.playerTarget = null;
    this.playerVisuals.group.position.copy(this.playerPos);
    this.updateCameraPosition();
  }

  /** WorldScene calls this whenever the server sends a fresh PlayerData for us */
  public onSelfUpdated(player: PlayerData) {
    this.selfData = player;
    this.playerVisuals.setEquipment(player.equipped || {});
    this.ui.gameplay.updatePlayer(player);
  }

  private onOrientationChange = () => {
    setTimeout(this.onResize, 100);
    setTimeout(this.onResize, 350);
  };

  private onResize = () => {
    if (!this.container) return;
    const vv = window.visualViewport;
    const width = (vv ? vv.width : this.container.clientWidth) || window.innerWidth;
    const height = (vv ? vv.height : this.container.clientHeight) || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * 360-degree Orbit Camera around Player (Clamped above ground)
   */
  public updateCameraPosition() {
    const targetY = Math.max(0, this.playerPos.y);
    const cx = this.playerPos.x + this.cameraDistance * Math.sin(this.cameraPitch) * Math.sin(this.cameraYaw);
    const cy = Math.max(1.5, targetY + this.cameraDistance * Math.cos(this.cameraPitch) + 1.2);
    const cz = this.playerPos.z + this.cameraDistance * Math.sin(this.cameraPitch) * Math.cos(this.cameraYaw);

    this.camera.position.set(cx, cy, cz);
    if (this.shakeT > 0) {
      const s = this.shakeT * 0.6;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.playerPos.x, targetY + 1.2, this.playerPos.z);
  }

  // ===========================================================================
  // Input
  // ===========================================================================

  private isTyping(): boolean {
    const el = document.activeElement as HTMLElement | null;
    return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable));
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.isRunning || this.isTyping()) return;
    const key = e.key.toLowerCase();
    this.keys[key] = true;

    if (key === ' ' || key === 'c') this.jump();
    else if (key === 'z') {
      const skill = this.activeWeaponStyle ? this.activeWeaponStyle.skills[0] : 'NORMAL';
      this.performSkill(skill);
    }
    else if (key === 'x') {
      const skill = this.activeWeaponStyle ? this.activeWeaponStyle.skills[1] : 'BASH';
      this.performSkill(skill);
    }
    else if (key === '4' || key === '5') {
      const bar = JOB_SKILL_BAR[this.selfData?.job || this.character.job];
      const skill = key === '4'
        ? (this.activeWeaponStyle ? this.activeWeaponStyle.skills[2] : bar[0])
        : (this.activeWeaponStyle ? this.activeWeaponStyle.skills[3] : bar[1]);
      if (skill) this.performSkill(skill);
    }
    else if (key === 'q') this.switchWeapon();
    else if (key === 'l') this.ui.toggleWindow('quest-win');
    else if (key === '1') this.usePotion('hp');
    else if (key === '2') this.usePotion('mp');
    else if (key === 'v') this.pickupLoot();
    else if (key === 'i') this.ui.toggleWindow('inventory-win');
    else if (key === 'k') this.ui.toggleWindow('skills-win');
    else if (key === 'j') this.ui.toggleWindow('job-win');
    else if (key === 'p') this.ui.toggleWindow('status-win');
    else if (key === 'f') this.toggleBot();
    else if (key === 'tab') {
      e.preventDefault();
      this.cycleTarget();
    } else if (key === 'escape') {
      this.clearTarget();
      this.ui.gameplay.closeShop();
      const dlg = document.getElementById('npc-dialogue-win');
      if (dlg) dlg.style.display = 'none';
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isRightMouseDown) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.cameraYaw -= dx * 0.008; // 360 degree horizontal rotate
      this.cameraPitch = Math.max(0.15, Math.min(Math.PI * 0.44, this.cameraPitch + dy * 0.006)); // Elevation tilt
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) this.isRightMouseDown = false;
  };

  public resetCamera() {
    this.cameraYaw = 0;
    this.cameraPitch = 0.52;
    this.cameraDistance = 14;
  }

  private setupControls() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);

    // Mouse: right-drag orbits 360°, left-click moves / targets.
    // Touch: one-finger drag orbits, a short tap moves / targets, pinch zooms.
    // (The joystick and action buttons sit above the canvas, so they never land here.)
    const touches = new Map<number, { x: number; y: number; startX: number; startY: number; startAt: number }>();
    let pinchDist = 0;
    const pinchDistance = () => {
      const [a, b] = Array.from(touches.values());
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    this.container.style.touchAction = 'none';

    this.container.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        if (e.button === 2) {
          this.isRightMouseDown = true;
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
        } else if (e.button === 0) {
          this.handleGroundClick(e);
        }
        return;
      }
      this.container.setPointerCapture?.(e.pointerId);
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, startAt: performance.now() });
      if (touches.size === 2) pinchDist = pinchDistance();
    });

    this.container.addEventListener('pointermove', (e) => {
      const t = touches.get(e.pointerId);
      if (!t) return;
      const dx = e.clientX - t.x;
      const dy = e.clientY - t.y;
      t.x = e.clientX;
      t.y = e.clientY;
      if (touches.size >= 2) {
        const d = pinchDistance();
        this.cameraDistance = Math.max(6, Math.min(32, this.cameraDistance - (d - pinchDist) * 0.05));
        pinchDist = d;
      } else {
        this.cameraYaw -= dx * 0.01;
        this.cameraPitch = Math.max(0.15, Math.min(Math.PI * 0.44, this.cameraPitch + dy * 0.008));
      }
    });

    const endTouch = (e: PointerEvent) => {
      const t = touches.get(e.pointerId);
      if (!t) return;
      const wasSingle = touches.size === 1;
      touches.delete(e.pointerId);
      const moved = Math.hypot(e.clientX - t.startX, e.clientY - t.startY);
      if (e.type === 'pointerup' && wasSingle && moved < 12 && performance.now() - t.startAt < 400) {
        this.handleGroundClick(e);
      }
    };
    this.container.addEventListener('pointerup', endTouch);
    this.container.addEventListener('pointercancel', endTouch);

    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse Wheel: Zoom
    this.container.addEventListener('wheel', (e) => {
      this.cameraDistance = Math.max(6, Math.min(32, this.cameraDistance + e.deltaY * 0.015));
    }, { passive: true });
  }

  public jump() {
    if (!this.isJumping && !this.isDead) {
      this.isJumping = true;
      this.jumpVy = 0.28;
      sound.playJump();
    }
  }

  private handleGroundClick(e: MouseEvent) {
    if (this.isDead) return;
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 0. Check if clicked on an NPC
    const clickedNpc = this.npcManager.checkRaycast(this.raycaster);
    if (clickedNpc) {
      this.clearTarget();
      const dist = this.playerPos.distanceTo(new THREE.Vector3(clickedNpc.x, 0, clickedNpc.z));
      if (dist <= 5.5) {
        this.openNpc(clickedNpc);
      } else {
        this.playerTarget = new THREE.Vector3(clickedNpc.x, 0, clickedNpc.z);
        this._pendingNpcInteract = clickedNpc;
      }
      return;
    }

    // 1. Check if clicked on a monster (select target + auto attack)
    const monsterMeshes: THREE.Object3D[] = [];
    const mobIdMap = new Map<THREE.Object3D, string>();
    this.monsters.forEach(({ visuals }, id) => {
      if (visuals.group.visible) {
        visuals.group.traverse(child => {
          monsterMeshes.push(child);
          mobIdMap.set(child, id);
        });
      }
    });

    const mobHits = this.raycaster.intersectObjects(monsterMeshes, false);
    if (mobHits.length > 0) {
      const mobId = mobIdMap.get(mobHits[0].object);
      if (mobId) {
        this.selectTarget(mobId);
        this.autoAttack = true;
        this._pendingNpcInteract = null;
        this.pendingPickupId = null;
      }
      return;
    }

    // 2. Check drops (walk over and pick up)
    const dropMeshes: THREE.Object3D[] = [];
    const dropIdMap = new Map<THREE.Object3D, string>();
    this.drops.forEach(({ group }, id) => {
      group.traverse(child => {
        dropMeshes.push(child);
        dropIdMap.set(child, id);
      });
    });
    const dropHits = this.raycaster.intersectObjects(dropMeshes, false);
    if (dropHits.length > 0) {
      const dropId = dropIdMap.get(dropHits[0].object);
      const drop = dropId ? this.drops.get(dropId) : undefined;
      if (drop) {
        this.pendingPickupId = dropId!;
        this.autoAttack = false;
        this.playerTarget = new THREE.Vector3(drop.group.position.x, 0, drop.group.position.z);
        return;
      }
    }

    // 3. Ground click → move
    const intersects = this.raycaster.intersectObject(this.terrain.groundMesh);
    if (intersects.length > 0) {
      const hit = intersects[0].point;
      this.playerTarget = new THREE.Vector3(hit.x, 0, hit.z);
      this.autoAttack = false;
      this.queuedSkill = null;
      this._pendingNpcInteract = null;
      this.pendingPickupId = null;

      // Trigger Golden Click Ripple
      this.clickMarker.position.set(hit.x, 0.05, hit.z);
      this.clickMarker.scale.set(0.2, 0.2, 0.2);
      (this.clickMarker.material as THREE.MeshBasicMaterial).opacity = 0.9;
    }
  }

  // ===========================================================================
  // Targeting
  // ===========================================================================

  private selectTarget(mobId: string | null) {
    this.selectedTargetId = mobId;
    if (!mobId) {
      this.ui.gameplay.setTarget(null);
      return;
    }
    const mob = this.monsters.get(mobId);
    if (mob) this.refreshTargetFrame(mob);
  }

  private clearTarget() {
    this.selectTarget(null);
    this.autoAttack = false;
    this.queuedSkill = null;
  }

  private refreshTargetFrame(mob: MonsterEntry) {
    this.ui.gameplay.setTarget({
      name: mob.data.name,
      level: mob.data.level,
      hp: mob.data.hp,
      maxHp: mob.data.maxHp,
      boss: isBossMonster(mob.data.type)
    });
  }

  private isAlive(mob: MonsterEntry | undefined): mob is MonsterEntry {
    return Boolean(mob && !mob.data.isDead && mob.data.hp > 0);
  }

  private distanceTo(mob: MonsterEntry): number {
    return Math.hypot(mob.pos.x - this.playerPos.x, mob.pos.z - this.playerPos.z);
  }

  private nearestMonster(maxDist: number): MonsterEntry | undefined {
    let best: MonsterEntry | undefined;
    let bestDist = maxDist;
    this.monsters.forEach(m => {
      if (!this.isAlive(m)) return;
      const d = this.distanceTo(m);
      if (d < bestDist) {
        bestDist = d;
        best = m;
      }
    });
    return best;
  }

  /** Tab: step through living monsters from nearest to farthest */
  private cycleTarget() {
    const candidates = Array.from(this.monsters.values())
      .filter(m => this.isAlive(m) && this.distanceTo(m) < 20)
      .sort((a, b) => this.distanceTo(a) - this.distanceTo(b));
    if (candidates.length === 0) return;
    const idx = candidates.findIndex(m => m.data.id === this.selectedTargetId);
    this.selectTarget(candidates[(idx + 1) % candidates.length].data.id);
  }

  private faceTowards(pos: THREE.Vector3) {
    const dx = pos.x - this.playerPos.x;
    const dz = pos.z - this.playerPos.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.01) this.playerFacing = Math.atan2(dx, dz);
  }

  // ===========================================================================
  // Skills & attacks
  // ===========================================================================

  /** Kept for WorldScene/MobileControls, which call skills by id */
  public performAttack(skillName: string = 'NORMAL') {
    this.performSkill(skillName);
  }

  private skillRange3D(skill: SkillDef): number {
    if (skill.kind === 'basic') {
      if (this.activeWeaponStyle) return this.activeWeaponStyle.range;
      return this.selfData ? computeDerived(this.selfData).attackRange * WORLD_SCALE : 3;
    }
    return skill.range * WORLD_SCALE;
  }

  public performSkill(skillId: string) {
    if (this.isDead || !this.selfData) return;
    const skill = SKILL_DB[skillId];
    if (!skill) return;
    const self = this.selfData;

    const isWeaponSkill = this.activeWeaponStyle?.skills.includes(skillId);
    if (!isWeaponSkill && !canUseSkill(skill, self.job, this.activeWeaponStyle?.weaponType)) {
      this.ui.gameplay.toast(`อาชีพ ${self.job} ใช้ ${skill.name} ไม่ได้`, 'error');
      return;
    }
    const now = performance.now();
    if (skill.kind === 'basic') {
      if (now - this.lastBasicAt < computeDerived(self).aspdMs) return;
    } else if (this.ui.gameplay.getCooldownRemaining(skillId) > 0) {
      return;
    }
    if (self.mp < skill.mpCost) {
      this.ui.gameplay.toast(`💧 MP ไม่พอสำหรับ ${skill.name} (${skill.mpCost} MP)`, 'error');
      return;
    }
    if (skill.zenyCost && self.zeny < skill.zenyCost) {
      this.ui.gameplay.toast(`💰 ต้องใช้ ${skill.zenyCost} Zeny`, 'error');
      return;
    }

    const needsTarget = ['basic', 'melee', 'ranged', 'blink'].includes(skill.kind);
    let target: MonsterEntry | undefined;
    if (needsTarget) {
      const range = this.skillRange3D(skill);
      const selected = this.selectedTargetId ? this.monsters.get(this.selectedTargetId) : undefined;
      target = this.isAlive(selected) && this.distanceTo(selected) < MAX_CHASE_DISTANCE
        ? selected
        : this.nearestMonster(MAX_CHASE_DISTANCE);
      if (!target) {
        // Auto-attack re-checks every frame; only explicit presses get feedback
        if (!this.autoAttack) this.ui.gameplay.toast('ไม่มีมอนสเตอร์อยู่ใกล้ ๆ', 'error');
        return;
      }
      if (target.data.id !== this.selectedTargetId) this.selectTarget(target.data.id);

      // Out of range: walk over and cast on arrival (like Ragnarok)
      if (this.distanceTo(target) > range + 0.3) {
        this.queuedSkill = skill.kind === 'basic' ? null : skillId;
        if (skill.kind === 'basic') this.autoAttack = true;
        this.playerTarget = target.pos.clone();
        return;
      }
      this.faceTowards(target.pos);
      this.playerTarget = null;
    } else if (skill.kind === 'ground_aoe') {
      const range = this.skillRange3D(skill);
      const selected = this.selectedTargetId ? this.monsters.get(this.selectedTargetId) : undefined;
      target = this.isAlive(selected) && this.distanceTo(selected) < MAX_CHASE_DISTANCE
        ? selected
        : this.nearestMonster(range + 2);
      if (target && this.distanceTo(target) > range + 0.3) {
        this.queuedSkill = skillId;
        this.playerTarget = target.pos.clone();
        return;
      }
      if (target) {
        this.faceTowards(target.pos);
      }
      this.playerTarget = null;
    }

    if (skill.kind === 'basic') {
      this.lastBasicAt = now;
      // One press keeps swinging until the target dies or the player moves (RO-style)
      this.autoAttack = true;
    }
    this.queuedSkill = null;
    this.playerVisuals.playAttack(this.elapsed);
    this.network.sendAttack(skillId, target?.data.id);
    this.syncPosition(true);
  }

  public usePotion(kind: 'hp' | 'mp', silent = false) {
    if (!this.selfData || this.isDead) return false;
    const preferred = kind === 'hp' ? ['red_potion', 'orange_potion', 'white_potion'] : ['blue_potion', 'mana_elixir'];
    const inv = this.selfData.inventory;
    const potion = preferred.map(id => inv.find(i => i.defId === id || i.name.toLowerCase().replace(/ /g, '_') === id)).find(Boolean)
      || inv.find(i => i.type === 'usable' && (kind === 'hp' ? i.effect?.hp : i.effect?.mp));
    if (!potion) {
      if (!silent) this.ui.gameplay.toast(kind === 'hp' ? '🧪 ไม่มียาฟื้นฟู HP' : '💙 ไม่มียาฟื้นฟู MP', 'error');
      return false;
    }
    sound.playPotion();
    this.network.sendUseItem(potion.id);
    return true;
  }

  // ===========================================================================
  // Auto-play bot
  // ===========================================================================

  public toggleBot() {
    if (!this.botEngine) return;
    const on = this.botEngine.toggle();
    this.ui.gameplay.toast(on ? '🤖 เปิดบอทล่ามอนอัตโนมัติ (กด F เพื่อปิด)' : '🤖 ปิดบอทแล้ว', on ? 'success' : 'info');
    if (!on) {
      this.autoAttack = false;
      this.queuedSkill = null;
      this.playerTarget = null;
    }
  }

  /**
   * Auto hunt: drink potions, fight the nearest monster with job skills,
   * pick up loot between fights and respawn after death. Runs 4x a second
   * and drives the same targeting/skill code as the player's own inputs.
   */
  private updateBot() {
    const bot = this.botEngine;
    if (!bot?.enabled || !this.selfData) return;
    const now = performance.now();
    if (now < this.botNextThinkAt) return;
    this.botNextThinkAt = now + 250;
    const self = this.selfData;
    const s = bot.settings;

    // Dead: wait out the death screen, then respawn in town
    if (this.isDead) {
      if (!this.botDeadSince) this.botDeadSince = now;
      if (now - this.botDeadSince > 4000) {
        this.botDeadSince = 0;
        this.network.sendRespawn();
      }
      return;
    }
    this.botDeadSince = 0;

    // 1. Potions
    if (s.autoPotion && now - this.botLastPotionAt > 1100) {
      if ((self.hp / self.maxHp) * 100 <= s.hpThreshold && this.usePotion('hp', true)) this.botLastPotionAt = now;
      else if ((self.mp / self.maxMp) * 100 <= s.mpThreshold && this.usePotion('mp', true)) this.botLastPotionAt = now;
    }

    // 2. Self-heal skills when hurt
    const bar = JOB_SKILL_BAR[self.job];
    const jobSkills = [bar[0], bar[1]].filter((id): id is string => Boolean(id)).map(id => SKILL_DB[id]);
    const healSkill = jobSkills.find(sk => sk.kind === 'heal');
    if (s.autoSkill && healSkill && self.hp / self.maxHp < 0.6 && self.mp >= healSkill.mpCost
        && this.ui.gameplay.getCooldownRemaining(healSkill.id) <= 0) {
      this.performSkill(healSkill.id);
      return;
    }

    // 3. Fight: keep the current target, else pick the nearest monster
    const current = this.selectedTargetId ? this.monsters.get(this.selectedTargetId) : undefined;
    let target = this.isAlive(current) && this.distanceTo(current) < 25 ? current : undefined;
    if (!target) {
      // Loot first when nothing is attacking us
      if (s.autoLoot && this.botLoot()) return;
      target = this.nearestMonster(25);
      if (target) this.selectTarget(target.data.id);
    }

    if (target) {
      // Offensive job skills when ready and MP allows (keep a small reserve)
      if (s.autoSkill && !this.queuedSkill) {
        const offensive = [...jobSkills, SKILL_DB.BASH].filter(sk =>
          sk && sk.kind !== 'heal' && sk.kind !== 'utility' && canUseSkill(sk, self.job)
          && self.mp >= sk.mpCost + 5 && (!sk.zenyCost || self.zeny >= sk.zenyCost * 4)
          && this.ui.gameplay.getCooldownRemaining(sk.id) <= 0);
        const inRange = offensive.filter(sk => sk.kind === 'self_aoe'
          ? this.distanceTo(target!) <= sk.radius * WORLD_SCALE
          : this.distanceTo(target!) <= this.skillRange3D(sk) + 0.3);
        if (inRange.length > 0) {
          this.performSkill(inRange[0].id);
          return;
        }
      }
      if (!this.autoAttack) this.performSkill('NORMAL');
      this.autoAttack = true;
      return;
    }

    // 4. Nothing nearby: walk toward the nearest monster anywhere in view
    const far = this.nearestMonster(80);
    if (far && !this.playerTarget) this.playerTarget = far.pos.clone();
  }

  /** Walk to the nearest drop within reach; returns true while looting */
  private botLoot(): boolean {
    if (this.pendingPickupId && this.drops.has(this.pendingPickupId)) return true;
    let best: DropEntry | undefined;
    let bestDist = 12;
    this.drops.forEach(d => {
      const dist = this.playerPos.distanceTo(d.group.position);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    });
    if (!best) return false;
    this.pendingPickupId = best.data.id;
    this.autoAttack = false;
    this.playerTarget = new THREE.Vector3(best.group.position.x, 0, best.group.position.z);
    return true;
  }

  public pickupLoot() {
    if (this.isDead) return;
    this.network.sendPickupNearby();
  }

  // ===========================================================================
  // Network events
  // ===========================================================================

  private subscribeNetwork() {
    const on = (type: string, fn: (msg: any) => void) => this.unsubscribers.push(this.network.on(type, fn));

    on('INIT_STATE', (msg) => {
      this.selfId = msg.selfId;
      this.selfData = msg.player;
      this.isDead = Boolean(msg.player?.isDead);
      (msg.drops as DropItemData[] || []).forEach(d => this.addDrop(d));
    });

    on('PLAYER_ATTACKED', (msg) => this.onPlayerAttacked(msg));
    on('DAMAGE', (msg) => this.onDamage(msg.damageEvent as DamageEvent, msg.mobHp, msg.delayMs || 0));

    on('MOB_DIED', (msg) => {
      this.showMobDeathBurst3D(msg.mobId);
      const mob = this.monsters.get(msg.mobId);
      if (mob) {
        mob.data.isDead = true;
        mob.visuals.group.visible = false;
        mob.label.sprite.visible = false;
      }
      if (msg.mobId === this.selectedTargetId) this.clearTarget();
      (msg.drops as DropItemData[] || []).forEach(d => this.addDrop(d));
      if (msg.killerId === this.selfId) sound.playCoin();
    });

    on('DROP_REMOVED', (msg) => this.removeDrop(msg.dropId));

    on('PLAYER_LEFT', (msg) => this.removeRemotePlayer(msg.id));

    on('SKILL_USED', (msg) => {
      const skill = SKILL_DB[msg.skillId];
      if (skill && skill.kind !== 'basic') this.ui.gameplay.startCooldown(msg.skillId, msg.cooldownMs);
    });

    on('SKILL_FAILED', (msg) => this.ui.gameplay.toast(`⚠️ ${msg.reason}`, 'error'));

    on('VITALS', (msg) => {
      if (!this.selfData) return;
      Object.assign(this.selfData, { hp: msg.hp, maxHp: msg.maxHp, mp: msg.mp, maxMp: msg.maxMp, zeny: msg.zeny });
      this.ui.updatePlayerHUD(this.selfData);
    });

    on('PLAYER_HIT', (msg) => this.onPlayerHit(msg));

    on('PLAYER_HEALED', (msg) => {
      const pos = this.getPlayerPosition(msg.id);
      if (pos) this.effects.floatingText(new THREE.Vector3(pos.x, 2.6, pos.z), `+${msg.amount}`, '#86efac', '#14532d');
      if (msg.id === this.selfId && this.selfData) {
        this.selfData.hp = msg.hp;
        this.ui.updatePlayerHUD(this.selfData);
        sound.playBlessing();
      }
    });

    on('PLAYER_DIED', (msg) => {
      if (msg.id !== this.selfId) return;
      this.isDead = true;
      this.clearTarget();
      this.playerTarget = null;
      if (this.selfData) {
        this.selfData.hp = 0;
        this.ui.updatePlayerHUD(this.selfData);
      }
      this.ui.gameplay.showDeath(msg.killerName, msg.expLost || 0);
    });

    on('PLAYER_RESPAWNED', (msg) => {
      if (msg.id !== this.selfId) return;
      this.isDead = false;
      this.ui.gameplay.hideDeath();
      this.effects.healPillar(this.playerPos, 0xffd166);
      sound.playLevelUp();
    });

    on('POS_CORRECTION', (msg) => {
      const nx = toWorld3DX(msg.x);
      const nz = toWorld3DZ(msg.z || 0);
      const jump = Math.hypot(nx - this.playerPos.x, nz - this.playerPos.z);
      this.playerPos.x = nx;
      this.playerPos.z = nz;
      if (jump > 3) {
        // Teleport (blink / warp / respawn): drop any walk orders
        this.playerTarget = null;
        this._pendingNpcInteract = null;
      }
      this.playerVisuals.group.position.copy(this.playerPos);
    });

    on('ZONE_CHANGED', (msg) => {
      this.ui.gameplay.toast(`🌀 ${msg.thaiName}`, 'success');
      this.effects.healPillar(this.playerPos, 0x00b4d8);
      this.ui.gameplay.closeShop();
    });

    on('SHOP_RESULT', (msg) => {
      this.ui.gameplay.toast(msg.ok ? `✅ ${msg.message}` : `❌ ${msg.message}`, msg.ok ? 'success' : 'error');
      if (msg.ok) sound.playCoin();
    });

    on('BUFF', () => {
      this.effects.healPillar(this.playerPos, 0xffd166);
      this.effects.dome(this.playerPos, 0xffd166);
    });
  }

  private getPlayerPosition(id: string): THREE.Vector3 | null {
    if (id === this.selfId) return this.playerPos;
    return this.remotePlayers.get(id)?.visuals.group.position || null;
  }

  private onPlayerAttacked(msg: { id: string; skill: string; targetId?: string; tx?: number; tz?: number; rotY?: number }) {
    const isSelf = msg.id === this.selfId;
    const remote = isSelf ? undefined : this.remotePlayers.get(msg.id);
    if (!isSelf && !remote) return;

    const casterPos = isSelf ? this.playerPos.clone() : remote!.visuals.group.position.clone();
    const rotY = isSelf ? this.playerFacing : (msg.rotY ?? remote!.targetRot);
    const target = msg.targetId ? this.monsters.get(msg.targetId) : undefined;
    const targetPos = target ? target.pos.clone() : null;
    const center = msg.tx !== undefined ? new THREE.Vector3(toWorld3DX(msg.tx), 0, toWorld3DZ(msg.tz || 0)) : casterPos.clone();

    let weaponType: WeaponType = 'fist';
    if (isSelf) weaponType = inferWeaponType(this.selfData?.equipped.weapon);
    else weaponType = remote!.data.weaponType || 'fist';

    if (!isSelf) {
      remote!.visuals.playAttack(this.elapsed);
      if (msg.rotY !== undefined) remote!.targetRot = msg.rotY;
    }
    // Skip effects far off-screen
    if (casterPos.distanceTo(this.playerPos) > 60) return;
    this.effects.playSkill(msg.skill, casterPos, rotY, targetPos, center, weaponType);
    if (isSelf || casterPos.distanceTo(this.playerPos) < 25) sound.playSlash();
  }

  private onDamage(event: DamageEvent, mobHp: number | undefined, delayMs: number) {
    const mob = this.monsters.get(event.targetId);
    if (!mob) return;
    if (mobHp !== undefined) {
      mob.data.hp = mobHp;
      mob.label.update(mob.data.name, mob.data.level, mob.data.hp, mob.data.maxHp, mob.data.id === this.selectedTargetId);
      if (mob.data.id === this.selectedTargetId) this.refreshTargetFrame(mob);
    }
    const show = () => {
      if (mob.pos.distanceTo(this.playerPos) > 60) return;
      mob.hitT = 1;
      const pos = new THREE.Vector3(mob.pos.x, mob.height + 0.4, mob.pos.z);
      if (event.isCrit) {
        this.effects.floatingText(pos, `${event.damage}!`, '#fde047', '#b91c1c', true);
        this.shakeT = Math.max(this.shakeT, 0.18);
      } else {
        this.effects.floatingText(pos, `${event.damage}`, '#ffffff', '#c2410c');
      }
      sound.playHit(event.isCrit);
    };
    if (delayMs > 0) setTimeout(show, delayMs);
    else show();
  }

  private onPlayerHit(msg: { playerId: string; mobId: string; damage: number; isMiss: boolean; hp: number; maxHp: number }) {
    const mob = this.monsters.get(msg.mobId);
    if (mob) mob.lungeT = 1;

    const isSelf = msg.playerId === this.selfId;
    if (isSelf && this.selfData) {
      this.selfData.hp = msg.hp;
      this.selfData.maxHp = msg.maxHp;
      this.ui.updatePlayerHUD(this.selfData);
      // Getting hit by something we haven't targeted: fight back target
      if (!this.selectedTargetId && mob) this.selectTarget(mob.data.id);
    }
    if (!this.isRunning) return;

    const pos = isSelf ? this.playerPos : this.remotePlayers.get(msg.playerId)?.visuals.group.position;
    if (!pos) return;
    const textPos = new THREE.Vector3(pos.x, 2.5, pos.z);
    if (msg.isMiss) {
      this.effects.floatingText(textPos, 'MISS', '#e2e8f0', '#334155');
    } else {
      this.effects.floatingText(textPos, `${msg.damage}`, isSelf ? '#fca5a5' : '#fecaca', '#7f1d1d');
      if (isSelf) {
        this.shakeT = Math.max(this.shakeT, 0.12);
        if (this.hitVignette) {
          this.hitVignette.style.opacity = '1';
          setTimeout(() => { if (this.hitVignette) this.hitVignette.style.opacity = '0'; }, 160);
        }
        sound.playHit(false);
      }
    }
  }

  // ===========================================================================
  // Snapshot sync
  // ===========================================================================

  public syncSnapshot(snapshot: ServerSnapshot) {
    // --- Remote players ---
    const seenPlayers = new Set<string>();
    snapshot.players.forEach(p => {
      seenPlayers.add(p.id);
      let r = this.remotePlayers.get(p.id);
      if (!r) {
        const visuals = CharacterModelBuilder.createCharacter(p.name, p.job, p.gender || 'male', p.hairColor || '#ffd700', Boolean(p.isGm));
        this.scene.add(visuals.group);
        const label = new OverheadLabel(p.isGm ? '#fde047' : '#ffffff', true);
        this.scene.add(label.sprite);
        const startPos = new THREE.Vector3(toWorld3DX(p.x), 0, toWorld3DZ(p.z || 0));
        visuals.group.position.copy(startPos);
        r = { visuals, targetPos: startPos.clone(), targetRot: p.rotY || 0, data: p, label };
        this.remotePlayers.set(p.id, r);
      }
      r.data = p;
      r.targetPos.set(toWorld3DX(p.x), 0, toWorld3DZ(p.z || 0));
      if (p.rotY !== undefined) r.targetRot = p.rotY;
      r.visuals.setWeapon(p.weaponType, p.weaponRefine || 0, p.weaponRarity || 'common', Boolean(p.weaponExcalibur));
      r.label.update(p.name, p.baseLevel, p.hp ?? 1, p.maxHp ?? 1);
    });
    this.remotePlayers.forEach((_, id) => {
      if (!seenPlayers.has(id)) this.removeRemotePlayer(id);
    });

    // --- Monsters ---
    snapshot.monsters.forEach(m => {
      let mob = this.monsters.get(m.id);
      const targetPos = new THREE.Vector3(toWorld3DX(m.x), 0, toWorld3DZ(m.z || 0));
      if (!mob) {
        mob = this.createMonsterEntry(m, targetPos);
      }
      const wasDead = mob.data.isDead;
      mob.data = m;
      mob.targetPos.copy(targetPos);
      if (m.rotY !== undefined) mob.targetRot = m.rotY;
      if (wasDead && !m.isDead) {
        mob.pos.copy(targetPos); // respawn: snap instead of sliding across the map
      }
      mob.visuals.group.visible = !m.isDead;
      mob.label.sprite.visible = !m.isDead;
      mob.label.update(m.name, m.level, m.hp, m.maxHp, m.id === this.selectedTargetId);
      if (m.id === this.selectedTargetId) this.refreshTargetFrame(mob);
    });
  }

  private createMonsterEntry(m: SnapshotMonster, targetPos: THREE.Vector3): MonsterEntry {
    const placeholder = MonsterModelBuilder.createMonster(m.type, m.name);
    placeholder.group.position.copy(targetPos);
    this.scene.add(placeholder.group);
    const label = new OverheadLabel(isBossMonster(m.type) ? '#fbbf24' : '#fecaca', true);
    this.scene.add(label.sprite);

    const entry: MonsterEntry = {
      visuals: placeholder,
      pos: targetPos.clone(),
      targetPos: targetPos.clone(),
      targetRot: m.rotY || 0,
      data: m,
      label,
      height: this.measureHeight(placeholder.group),
      lungeT: 0,
      hitT: 0
    };
    this.monsters.set(m.id, entry);

    // Async GLTF upgrade — swap out placeholder when loaded
    MonsterModelBuilder.createMonsterAsync(m.type, m.name, this.scene).then(gltfVisuals => {
      const current = this.monsters.get(m.id);
      if (gltfVisuals.gltfModel && current) {
        this.scene.remove(current.visuals.group);
        gltfVisuals.group.position.copy(current.pos);
        gltfVisuals.group.visible = !current.data.isDead;
        current.visuals = gltfVisuals;
        current.height = this.measureHeight(gltfVisuals.group);
        if (current.frozenRing) {
          gltfVisuals.group.add(current.frozenRing);
        }
      } else if (gltfVisuals !== placeholder) {
        this.scene.remove(gltfVisuals.group);
      }
    }).catch(() => { /* keep placeholder */ });

    return entry;
  }

  private measureHeight(obj: THREE.Object3D): number {
    const prev = obj.position.clone();
    obj.position.set(0, 0, 0);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    obj.position.copy(prev);
    const h = box.isEmpty() ? 1.5 : box.max.y;
    return Math.max(1.0, Math.min(5, h));
  }

  private removeRemotePlayer(id: string) {
    const r = this.remotePlayers.get(id);
    if (!r) return;
    this.scene.remove(r.visuals.group);
    this.scene.remove(r.label.sprite);
    r.label.dispose();
    this.remotePlayers.delete(id);
  }

  // ===========================================================================
  // Drops
  // ===========================================================================

  private addDrop(d: DropItemData) {
    if (this.drops.has(d.id)) return;
    const group = new THREE.Group();
    group.position.set(toWorld3DX(d.x), 0, toWorld3DZ(d.z || 0));

    if (d.type === 'zeny') {
      const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.9, roughness: 0.2, emissive: 0x7a5c00, emissiveIntensity: 0.5 });
      for (let i = 0; i < 3; i++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 14), coinMat);
        coin.rotation.x = Math.PI / 2;
        coin.position.set((i - 1) * 0.12, 0.35 + i * 0.05, 0);
        group.add(coin);
      }
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.font = '46px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.icon, 32, 36);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
      sprite.scale.set(0.7, 0.7, 1);
      sprite.position.y = 0.45;
      group.add(sprite);
    }

    // Loot beam: colour hints at value
    const beamColor = d.type === 'card' ? 0xc084fc : d.type === 'equip' ? parseInt(RARITY_COLORS.legendary.slice(1), 16) : d.type === 'zeny' ? 0xffd166 : 0x93c5fd;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.4, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.position.y = 0.04;
    group.add(ring);
    if (d.type === 'equip' || d.type === 'card') {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.2, 3, 8, 1, true),
        new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      beam.position.y = 1.5;
      group.add(beam);
    }

    this.scene.add(group);
    this.drops.set(d.id, { group, data: d, baseY: 0 });
  }

  private removeDrop(id: string) {
    const drop = this.drops.get(id);
    if (!drop) return;
    this.scene.remove(drop.group);
    drop.group.traverse(o => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | undefined;
      if (mat) {
        const map = (mat as THREE.SpriteMaterial).map;
        map?.dispose();
        mat.dispose();
      }
    });
    this.drops.delete(id);
    if (this.pendingPickupId === id) this.pendingPickupId = null;
  }

  // ===========================================================================
  // Render loop
  // ===========================================================================

  private renderLoop = (timestamp: number) => {
    if (!this.isRunning) return;

    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    this.elapsed = timestamp / 1000;
    const time = this.elapsed;

    this.updateBot();
    this.updateCombatIntent();
    this.updatePlayerMovement(dt, time);
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.updateCameraPosition();
    this.terrain.updateEnvironment(time, dt);
    this.effects.update(dt);

    // Auto-dialogue: when close enough to pending NPC
    if (this._pendingNpcInteract) {
      const dist = this.playerPos.distanceTo(new THREE.Vector3(this._pendingNpcInteract.x, 0, this._pendingNpcInteract.z));
      if (dist <= 3.8) {
        const npc = this._pendingNpcInteract;
        this._pendingNpcInteract = null;
        this.playerTarget = null;
        this.openNpc(npc);
      }
    }
    // Walking away from a merchant closes their shop
    if (this.shopNpc && this.ui.gameplay.isShopOpen) {
      if (this.playerPos.distanceTo(new THREE.Vector3(this.shopNpc.x, 0, this.shopNpc.z)) > 8) {
        this.ui.gameplay.closeShop();
        this.shopNpc = null;
      }
    }
    this.npcManager.update(time, dt);

    // Walk-to-pickup
    if (this.pendingPickupId) {
      const drop = this.drops.get(this.pendingPickupId);
      if (drop && this.playerPos.distanceTo(drop.group.position) < 1.6) {
        this.pendingPickupId = null;
        this.playerTarget = null;
        this.pickupLoot();
      }
    }

    // Target reticle
    const target = this.selectedTargetId ? this.monsters.get(this.selectedTargetId) : undefined;
    if (this.isAlive(target)) {
      this.targetReticle.position.set(target.pos.x, 0.05, target.pos.z);
      this.targetReticle.rotation.y += dt * 2.5;
      this.targetReticle.visible = true;
    } else {
      this.targetReticle.visible = false;
      if (this.selectedTargetId) this.clearTarget();
    }

    // Footstep dust puffs when running
    if (this.isMoving && !this.isJumping) {
      this.footstepTimer += dt;
      if (this.footstepTimer > 0.16) {
        this.footstepTimer = 0;
        this.spawnFootstepDust(this.playerPos);
      }
    }

    // Self animation & label
    const animState: CharacterAnim = this.isDead ? 'dead' : this.isJumping ? 'jump' : (this.isMoving ? 'walk' : 'idle');
    this.playerVisuals.updateAnimation(animState, time, dt);
    if (this.selfData) {
      this.selfLabel.update(this.selfData.name, this.selfData.baseLevel, this.selfData.hp, this.selfData.maxHp);
    }
    this.selfLabel.sprite.position.set(this.playerPos.x, this.playerPos.y + 2.55, this.playerPos.z);

    // Remote players
    this.remotePlayers.forEach(r => {
      r.visuals.group.position.lerp(r.targetPos, Math.min(1, dt * 8));
      r.visuals.group.rotation.y = this.lerpAngle(r.visuals.group.rotation.y, r.targetRot, dt * 10);
      const moving = r.visuals.group.position.distanceTo(r.targetPos) > 0.08;
      const anim: CharacterAnim = r.data.isDead ? 'dead' : r.data.anim === 'jump' ? 'jump' : moving || r.data.anim === 'walk' ? 'walk' : 'idle';
      r.visuals.updateAnimation(anim, time, dt);
      const p = r.visuals.group.position;
      r.label.sprite.position.set(p.x, p.y + 2.55, p.z);
    });

    // Monsters
    this.monsters.forEach(mob => this.updateMonster(mob, time, dt));

    // Drops bob & spin
    this.drops.forEach(d => {
      d.group.rotation.y += dt * 1.8;
      d.group.position.y = Math.sin(time * 3 + d.group.position.x) * 0.08;
    });

    // 3D Pixel-Art Hero Companions (Party System)
    this.updateCompanions(time, dt);

    // Fade click ripple marker
    const markerMat = this.clickMarker.material as THREE.MeshBasicMaterial;
    if (markerMat.opacity > 0) {
      markerMat.opacity = Math.max(0, markerMat.opacity - dt * 2.5);
      const s = this.clickMarker.scale.x + dt * 2.5;
      this.clickMarker.scale.set(s, s, s);
    }

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.renderLoop);
  };

  // ===========================================================================
  // Real-Time Weapon Switching & Companion System
  // ===========================================================================

  public switchWeapon(index?: number) {
    if (index !== undefined) {
      this.currentWeaponIndex = index % LEGENDARY_WEAPONS.length;
    } else {
      this.currentWeaponIndex = (this.currentWeaponIndex + 1) % LEGENDARY_WEAPONS.length;
    }
    this.applyWeaponStyle(this.currentWeaponIndex, true);
  }

  public applyWeaponStyle(index: number, showToast = true) {
    const style = LEGENDARY_WEAPONS[index];
    this.activeWeaponStyle = style;

    // 1. Update 3D Character hand weapon (drip)
    this.playerVisuals.setWeapon(style.weaponType, 10, 'legendary', false);

    // 2. Play switch flash FX
    this.effects.playSkill('SOLAR_AEGIS', this.playerPos, 0, null, this.playerPos);

    // 3. Update HUD skill hotbars
    this.ui.gameplay.updateWeaponSkillBar(style.skills, style.name, style.dripColor);

    if (showToast) {
      this.ui.gameplay.toast(`⚔️ สลับอาวุธ: ${style.name}`, 'success');
      sound.playEquip();
    }
  }

  public initCompanions() {
    this.refreshCompanions();
  }

  public refreshCompanions() {
    // 1. Destroy existing companions
    this.companions.forEach(c => c.destroy(this.scene));
    this.companions = [];

    // 2. Read party from HeroRosterManager
    const roster = HeroRosterManager.getInstance();
    const party = roster.getParty(); // ['player', slot1, slot2, slot3]

    for (let slot = 1; slot <= 3; slot++) {
      const heroId = party[slot];
      if (heroId && HERO_ROSTER_DB[heroId]) {
        const hero = HERO_ROSTER_DB[heroId];
        const offset = slot === 1 ? -2 : slot === 2 ? 2 : 0;
        const companion = new HeroCompanion3D(
          hero,
          slot,
          this.playerPos.clone().add(new THREE.Vector3(offset, 0, -2)),
          this.scene
        );
        this.companions.push(companion);
      }
    }
  }

  private updateCompanions(time: number, dt: number) {
    if (this.companions.length === 0) return;
    const targetMob = this.selectedTargetId ? this.monsters.get(this.selectedTargetId) : undefined;
    const liveTarget = this.isAlive(targetMob) ? { id: targetMob.data.id, pos: targetMob.pos, hp: targetMob.data.hp } : null;

    for (let i = 0; i < this.companions.length; i++) {
      const comp = this.companions[i];
      comp.update(
        time,
        dt,
        this.playerPos,
        this.playerFacing,
        liveTarget,
        this.effects,
        (mobId, dmg, skillName) => {
          const mob = this.monsters.get(mobId);
          if (mob && mob.data.hp > 0) {
            mob.data.hp = Math.max(0, mob.data.hp - dmg);
            this.effects.floatingDamage(mob.pos, dmg, false);
            mob.hitT = 0.25;
            this.network.sendAttack(skillName || 'NORMAL', mobId);
            if (this.selectedTargetId === mobId) {
              this.refreshTargetFrame(mob);
            }
          }
        }
      );
    }
  }

  private updateMonster(mob: MonsterEntry, time: number, dt: number) {
    const group = mob.visuals.group;
    if (mob.data.isDead) return;

    mob.pos.lerp(mob.targetPos, Math.min(1, dt * 6));
    group.position.copy(mob.pos);
    group.rotation.y = this.lerpAngle(group.rotation.y, mob.targetRot, dt * 8);

    // Attack lunge: hop forward toward the victim and back
    if (mob.lungeT > 0) {
      mob.lungeT = Math.max(0, mob.lungeT - dt * 4);
      const k = Math.sin(mob.lungeT * Math.PI) * 0.6;
      group.position.x += Math.sin(group.rotation.y) * k;
      group.position.z += Math.cos(group.rotation.y) * k;
      group.position.y += k * 0.4;
    }
    // Hit reaction: quick squash
    if (mob.hitT > 0) {
      mob.hitT = Math.max(0, mob.hitT - dt * 6);
      const s = 1 + Math.sin(mob.hitT * Math.PI) * 0.18;
      group.scale.set(s, 2 - s, s);
    } else if (group.scale.x !== 1) {
      group.scale.set(1, 1, 1);
    }

    // Frozen / stunned: ice ring and no idle animation
    if (mob.data.frozen) {
      if (!mob.frozenRing) {
        const geo = new THREE.TorusGeometry(0.9, 0.12, 6, 18);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color: ELEMENT_COLORS.ice, emissive: ELEMENT_COLORS.ice, emissiveIntensity: 0.7, transparent: true, opacity: 0.75 });
        mob.frozenRing = new THREE.Mesh(geo, mat);
        mob.frozenRing.position.y = 0.3;
        group.add(mob.frozenRing);
      }
      mob.frozenRing.visible = true;
      mob.frozenRing.rotation.y += dt * 2;
    } else {
      if (mob.frozenRing) mob.frozenRing.visible = false;
      mob.visuals.updateAnimation(time, dt);
    }

    mob.label.sprite.position.set(mob.pos.x, mob.height + 0.55, mob.pos.z);
  }

  private lerpAngle(from: number, to: number, t: number): number {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return from + diff * Math.min(1, t);
  }

  /** Chase the target for auto-attack or a queued skill, and fire when in range */
  private updateCombatIntent() {
    if (this.isDead || (!this.autoAttack && !this.queuedSkill)) return;
    const target = this.selectedTargetId ? this.monsters.get(this.selectedTargetId) : undefined;
    if (!this.isAlive(target) || this.distanceTo(target) > MAX_CHASE_DISTANCE * 1.5) {
      this.autoAttack = false;
      this.queuedSkill = null;
      return;
    }

    const skillId = this.queuedSkill || 'NORMAL';
    const skill = SKILL_DB[skillId];
    const range = this.skillRange3D(skill);
    if (this.distanceTo(target) > range + 0.2) {
      this.playerTarget = target.pos.clone();
      return;
    }
    this.playerTarget = null;
    if (this.queuedSkill) {
      const queued = this.queuedSkill;
      this.queuedSkill = null;
      this.performSkill(queued);
    } else if (this.selfData && performance.now() - this.lastBasicAt >= computeDerived(this.selfData).aspdMs) {
      this.performSkill('NORMAL');
    }
  }

  private updatePlayerMovement(dt: number, time: number) {
    const speedMult = (this.character.isGm ? 1.8 : 1.0) * (this.selfData?.speedMultiplier || 1);
    const baseSpeed = 7.0 * speedMult;
    let moveX = 0;
    let moveZ = 0;

    if (!this.isDead) {
      // Keyboard WASD Movement relative to camera angle
      const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
      const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));

      if (this.keys['w'] || this.keys['arrowup']) { moveX += forward.x; moveZ += forward.z; }
      if (this.keys['s'] || this.keys['arrowdown']) { moveX -= forward.x; moveZ -= forward.z; }
      if (this.keys['a'] || this.keys['arrowleft']) { moveX -= right.x; moveZ -= right.z; }
      if (this.keys['d'] || this.keys['arrowright']) { moveX += right.x; moveZ += right.z; }

      // Mobile Virtual Analog Joystick & D-pad input
      const mInput = this.mobileControls?.inputState;
      if (mInput && (mInput.analogX !== 0 || mInput.analogY !== 0 || mInput.left || mInput.right || mInput.up || mInput.down)) {
        const ax = mInput.analogX || (mInput.right ? 1 : (mInput.left ? -1 : 0));
        const az = mInput.analogY || (mInput.down ? 1 : (mInput.up ? -1 : 0));
        moveX += right.x * ax + forward.x * (-az);
        moveZ += right.z * ax + forward.z * (-az);
      }
      if (mInput?.jump) this.jump();

      // Manual movement cancels click-to-move, auto attack and queued skills
      if (moveX !== 0 || moveZ !== 0) {
        this.playerTarget = null;
        this.autoAttack = false;
        this.queuedSkill = null;
        this._pendingNpcInteract = null;
        this.pendingPickupId = null;
      }
    }

    if (moveX !== 0 || moveZ !== 0) {
      const dir = new THREE.Vector3(moveX, 0, moveZ).normalize();
      this.playerPos.x += dir.x * baseSpeed * dt;
      this.playerPos.z += dir.z * baseSpeed * dt;
      this.playerFacing = Math.atan2(dir.x, dir.z);
      this.isMoving = true;
    } else if (this.playerTarget && !this.isDead) {
      // Point and Click Navigation
      const toTarget = new THREE.Vector3().subVectors(this.playerTarget, this.playerPos);
      toTarget.y = 0;
      const dist = toTarget.length();

      if (dist > 0.25) {
        toTarget.normalize();
        const step = Math.min(dist, baseSpeed * dt);
        this.playerPos.x += toTarget.x * step;
        this.playerPos.z += toTarget.z * step;
        this.playerFacing = Math.atan2(toTarget.x, toTarget.z);
        this.isMoving = true;
      } else {
        this.playerTarget = null;
        this.isMoving = false;
      }
    } else {
      this.isMoving = false;
    }

    // Keep player inside the 6-zone world and the walkable corridor
    this.playerPos.x = Math.max(MIN_X3D, Math.min(MAX_X3D, this.playerPos.x));
    this.playerPos.z = Math.max(-MAX_Z3D, Math.min(MAX_Z3D, this.playerPos.z));

    // Jump Physics
    if (this.isJumping) {
      this.playerPos.y += this.jumpVy * dt * 60;
      this.jumpVy -= 0.015 * dt * 60; // Gravity
      if (this.playerPos.y <= 0) {
        this.playerPos.y = 0;
        this.isJumping = false;
        this.jumpVy = 0;
      }
    }

    // Position sync: 10 Hz while moving, plus one final update when we stop
    const now = performance.now();
    if ((this.isMoving && now - this.lastPosSyncAt > 100) || (this.wasMoving && !this.isMoving)) {
      this.syncPosition(true);
    }
    this.wasMoving = this.isMoving;

    // Apply to visual group
    this.playerVisuals.group.position.copy(this.playerPos);
    this.playerVisuals.group.rotation.y = this.lerpAngle(this.playerVisuals.group.rotation.y, this.playerFacing, dt * 14);
  }

  private syncPosition(force = false) {
    const now = performance.now();
    if (!force && now - this.lastPosSyncAt < 100) return;
    this.lastPosSyncAt = now;
    const facing = Math.sin(this.playerFacing) < 0 ? 'left' : 'right';
    const anim = this.isJumping ? 'jump' : this.isMoving ? 'walk' : 'idle';
    this.network.sendPosSync3D(fromWorld3DX(this.playerPos.x), fromWorld3DZ(this.playerPos.z), this.playerFacing, anim, facing);
  }

  private spawnFootstepDust(pos: THREE.Vector3) {
    const dustGeo = new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 5, 5);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xd4a373,
      transparent: true,
      opacity: 0.55
    });
    const dust = new THREE.Mesh(dustGeo, dustMat);
    dust.position.set(
      pos.x + (Math.random() - 0.5) * 0.3,
      0.08,
      pos.z + (Math.random() - 0.5) * 0.3
    );
    this.footstepDustGroup.add(dust);

    let life = 0;
    const maxLife = 0.35;
    const animDust = () => {
      life += 0.016;
      dust.position.y += 0.018;
      const s = 1 + life * 2.5;
      dust.scale.set(s, s, s);
      dustMat.opacity = Math.max(0, 0.55 * (1 - life / maxLife));
      if (life < maxLife) {
        requestAnimationFrame(animDust);
      } else {
        this.footstepDustGroup.remove(dust);
        dustGeo.dispose();
        dustMat.dispose();
      }
    };
    requestAnimationFrame(animDust);
  }

  public showMobDeathBurst3D(mobId: string) {
    const mob = this.monsters.get(mobId);
    if (!mob) return;
    const pos = mob.pos.clone();
    this.effects.impact(pos, 0xffd166, 1.4);
    this.effects.smoke(pos, 0xffffff);
  }

  // ===========================================================================
  // NPCs
  // ===========================================================================

  private openNpc(npc: NPCDef) {
    this.syncPosition(true);
    this.npcManager.openDialogue(npc, (option) => this.handleNpcAction(npc, option));
  }

  public handleNpcAction(npc: NPCDef, option: NpcOption) {
    // Rewards, heals and warps are resolved by the server
    if (SERVER_NPC_ACTIONS.includes(option.action)) {
      this.syncPosition(true);
      this.network.sendNpcAction(npc.id, option.action, option.param);
      if (option.action === 'HEAL_FULL' || option.action === 'BLESSING') sound.playBlessing();
      return;
    }

    switch (option.action) {
      case 'OPEN_SHOP':
        if (option.param) {
          this.shopNpc = npc;
          this.ui.gameplay.openShop(npc.id, option.param);
          sound.playCoin();
        }
        break;
      case 'OPEN_REFINE':
        this.ui.toggleWindow('refine-win', true);
        break;
      case 'QUEST':
        this.ui.toggleWindow('quest-win', true);
        break;
      case 'OPEN_JOB':
        this.ui.toggleWindow('job-win', true);
        break;
      case 'OPEN_SKILLS':
        this.ui.toggleWindow('skills-win', true);
        break;
      case 'LORE':
        this.ui.addChatMessage(npc.name, 'ดินแดนแห่งนี้แบ่งออกเป็น 6 มิติ เริ่มจากทุ่งหญ้า Solaria สู่ป่าเวทมนตร์ ทะเลทราย สุสานใต้ดิน แกนลาวา จนถึงมิติดวงดาว... มอนสเตอร์ในทุ่งหญ้าจะไม่ทำร้ายเจ้าก่อน แต่ตั้งแต่ป่า Aetherwoods เป็นต้นไปมันจะไล่ล่าเจ้าทันทีที่เห็น!', 'system');
        break;
      case 'REFINE_INFO':
        this.ui.addChatMessage(npc.name, 'การตีบวก +1 ถึง +4 ปลอดภัย 100% ตั้งแต่ +5 ขึ้นไปมีโอกาสล้มเหลว อาวุธ +7 ขึ้นไปจะเปล่งแสงให้ทุกคนเห็น!', 'system');
        break;
      case 'SANCTUARY_LORE':
        this.ui.addChatMessage(npc.name, 'วิหารแห่งแสงปกป้องเมือง Solaria มาหลายร้อยปี หากเจ้าล้มลงในการต่อสู้ แสงจะนำเจ้ากลับมาที่จัตุรัสเมืองเสมอ', 'system');
        break;
      case 'MARKET_NEWS':
        this.ui.addChatMessage(npc.name, '📈 การ์ดมอนสเตอร์ขายได้ 400 Z! ส่วนอาชีพ Merchant ซื้อของถูกลง 10% และขายได้แพงขึ้น 10% นะจ๊ะ', 'system');
        break;
      case 'WEAPON_TIPS':
        this.ui.addChatMessage(npc.name, '🗡️ มีด: ตีเร็ว | ⚔️ ดาบ: สมดุล | 🗡️ ดาบสองมือ: แรงแต่ช้า | 🔱 หอก: ระยะไกลกว่า | 🏹 ธนู: ยิงไกลใช้ DEX | 🪄 คทา: ยิงเวทใช้ INT (MATK)', 'system');
        break;
      default:
        this.ui.addChatMessage(npc.name, `ท่านได้เลือกคำสั่ง: ${option.label}`, 'system');
    }
  }

  public async setPlayerCustomModel(urlOrId: string) {
    try {
      const asset = await ModelAssetManager.getInstance().loadModel(urlOrId, 1.85);
      while (this.playerVisuals.group.children.length > 0) {
        this.playerVisuals.group.remove(this.playerVisuals.group.children[0]);
      }
      this.playerVisuals.group.add(asset.scene);
      asset.play('idle', true);
      this.playerVisuals.updateAnimation = (state, _time, dt) => {
        if (asset.mixer) {
          asset.play(state === 'walk' ? 'run' : (state === 'attack' ? 'attack' : 'idle'), true);
          asset.mixer.update(dt);
        }
      };
      sound.playLevelUp();
      this.ui.addChatMessage('ระบบ', `✨ สกินตัวละคร 3D ถูกเปลี่ยนเป็น [${urlOrId}] สำเร็จ!`, 'system');
    } catch (e) {
      console.error('Failed to change player model:', e);
      this.ui.addChatMessage('ระบบ', `❌ โหลดโมเดล 3D ไม่สำเร็จ กรุณาตรวจสอบ URL หรือรูปแบบไฟล์ .glb`, 'system');
    }
  }

  public setPlayerWeaponSkin(weaponId: string) {
    if (!this.playerVisuals || !this.playerVisuals.weaponSlot) {
      this.ui.addChatMessage('ระบบ', `⚠️ กรุณาใช้โมเดลตัวละครมาตรฐานเพื่อสวมใส่อาวุธ 3D`, 'system');
      return;
    }
    this.playerVisuals.weaponSlot.clear();
    let visual: Weapon3DVisual;
    switch (weaponId) {
      case 'weapon_excalibur': visual = Weapon3DBuilder.createExcalibur(); break;
      case 'weapon_dragonslayer': visual = Weapon3DBuilder.createDragonSlayer(); break;
      case 'weapon_staff': visual = Weapon3DBuilder.createArchangelStaff(); break;
      case 'weapon_bow': visual = Weapon3DBuilder.createAstralBow(); break;
      case 'weapon_dagger': visual = Weapon3DBuilder.createNightshadeDagger(); break;
      case 'weapon_shield':
        this.playerVisuals.shieldSlot.clear();
        this.playerVisuals.shieldSlot.add(Weapon3DBuilder.createAegisShield().group);
        sound.playLevelUp();
        this.ui.addChatMessage('ระบบ', `🛡️ สวมใส่โล่ 3D [Aegis of the Sun Shield] สำเร็จ!`, 'system');
        return;
      default: visual = Weapon3DBuilder.createExcalibur(); break;
    }
    this.playerVisuals.weaponSlot.add(visual.group);
    sound.playLevelUp();
    this.ui.addChatMessage('ระบบ', `⚔️ สวมใส่อาวุธ 3D [${visual.name}] สำเร็จ!`, 'system');
  }
}
