import Phaser from 'phaser';
import { TextureGenerator } from './TextureGenerator.js';
import { NetworkClient } from '../systems/Network.js';
import { PredictionEngine } from '../systems/PredictionEngine.js';
import { InterpolationBuffer } from '../systems/InterpolationBuffer.js';
import { AssetStreamer } from '../systems/AssetStreamer.js';
import { QuestManager } from '../systems/QuestManager.js';
import { BotEngine } from '../systems/BotEngine.js';
import { UIManager } from '../ui/UIManager.js';
import { sound } from '../engine/Sound.js';
import { PlayerData, MonsterData, DropItemData, Stats, JobClass, CharacterModel, ServerSnapshot } from '../../../server/src/types.js';
import { ThreeWorld } from '../three/ThreeWorld.js';
import { JOB_SKILL_BAR } from '../../../server/src/GameData.js';
import { MobileControls } from '../systems/MobileControls.js';

export class WorldScene extends Phaser.Scene {
  public network!: NetworkClient;
  public ui!: UIManager;
  public token!: string;
  public character!: CharacterModel;
  public threeWorld: ThreeWorld | null = null;
  public is3DMode: boolean = true;
  public mobileControls!: MobileControls;

  // Real-time Prediction & Interpolation Engines
  public prediction = new PredictionEngine();
  public interpBuffer = new InterpolationBuffer();
  public assetStreamer!: AssetStreamer;
  public questManager!: QuestManager;
  public botEngine!: BotEngine;

  // Phaser Game Objects
  private playerSprite!: Phaser.GameObjects.Container;
  private platforms: Array<{ x: number; y: number; w: number; h: number; isOneWay: boolean }> = [];

  // Entities
  public selfData: PlayerData | null = null;
  private remotePlayerContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private monsterContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private dropContainers: Map<string, { container: Phaser.GameObjects.Container; data: DropItemData }> = new Map();

  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyZ!: Phaser.Input.Keyboard.Key;
  private keyX!: Phaser.Input.Keyboard.Key;
  private keyC!: Phaser.Input.Keyboard.Key;
  private keyV!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keyF!: Phaser.Input.Keyboard.Key;
  private keyQ!: Phaser.Input.Keyboard.Key;
  private key1!: Phaser.Input.Keyboard.Key;
  private key2!: Phaser.Input.Keyboard.Key;
  private key3!: Phaser.Input.Keyboard.Key;
  private key4!: Phaser.Input.Keyboard.Key;
  private key5!: Phaser.Input.Keyboard.Key;
  private keyG!: Phaser.Input.Keyboard.Key;
  private keyT!: Phaser.Input.Keyboard.Key;
  private keyY!: Phaser.Input.Keyboard.Key;

  private currentZoneName: string = '';
  private botBadgeText?: Phaser.GameObjects.Text;

  constructor() {
    super('WorldScene');
  }

  public init(data: { token: string; character: CharacterModel; ui: UIManager }) {
    this.token = data.token;
    this.character = data.character;
    this.ui = data.ui;
  }

  public preload() {
    TextureGenerator.generateAll(this);
  }

  public create() {
    // 6-Zone Open World: 14400px wide (2400px per zone), 720px tall
    const worldW = 14400;
    const worldH = 720;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    this.assetStreamer = new AssetStreamer(this);

    // Initialize Quest and Bot Engines
    this.questManager = new QuestManager(() => {
      this.ui.renderQuestJournal(this.questManager);
    });

    this.botEngine = new BotEngine((running) => {
      this.updateBotIndicator(running);
      this.ui.updateBotStatus(running);
    });

    // 1. Create Parallax Multi-Biome Backgrounds
    this.createBackgrounds(worldW, worldH);

    // 2. Create Platform Definitions
    this.createPlatforms(worldW);

    // 3. Create Player Container
    this.createPlayer();

    // 4. Setup Controls
    this.setupControls();

    // 5. Setup Camera
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);

    // 6. Setup Network with Prediction & Snapshot Handling
    this.setupNetwork();

    // 7. Setup 3D Three.js World (Full 3D Mode Active)
    const container3D = document.getElementById('game-3d-container');
    const game2D = document.getElementById('game-container');
    if (game2D) game2D.classList.add('hidden');
    if (container3D) {
      container3D.classList.remove('hidden');
      this.threeWorld = new ThreeWorld(container3D, this.network, this.ui, this.character);
      this.threeWorld.start();
    }
    const label = document.getElementById('tb-view-mode-label');
    if (label) label.textContent = 'Full 3D';
    const btn3D = document.getElementById('tb-btn-view-mode');
    if (btn3D) {
      btn3D.onclick = () => this.toggle3DMode();
    }

    // Bind Quickslot Hotbar click events for mouse/touch
    this.setupQuickslotClicks();

    // Hook quest manager to UI
    this.ui.setSystems(this.questManager, this.botEngine, this.network, this);

    // 8. Setup Mobile Touch Controls
    this.mobileControls = new MobileControls((action) => this.handleMobileAction(action));
    if (this.threeWorld) {
      this.threeWorld.mobileControls = this.mobileControls;
      this.threeWorld.botEngine = this.botEngine;
    }
    const btnMobileToggle = document.getElementById('tb-btn-mobile-toggle');
    if (btnMobileToggle) {
      btnMobileToggle.onclick = () => {
        const overlay = document.getElementById('mobile-controls-overlay');
        overlay?.classList.toggle('minimized');
      };
    }
  }

  private createBackgrounds(w: number, h: number) {
    const ZONE_W = 2400;
    const zones = [
      { x: 0,          color1: 0xffe3a8, color2: 0x68b8f8, label: '🌿 SOLARIA MEADOWS (Lv. 1-15)', labelColor: '#ffd166' },
      { x: ZONE_W,     color1: 0x3a0ca3, color2: 0x10002b, label: '🌲 WHISPERING AETHERWOODS (Lv. 15-35)', labelColor: '#9d4edd' },
      { x: ZONE_W * 2, color1: 0xd4a017, color2: 0x7c3200, label: '🏜️ MIRAGE DUNES & ANT HELL (Lv. 35-55)', labelColor: '#f77f00' },
      { x: ZONE_W * 3, color1: 0x1a1a2e, color2: 0x000000, label: '🏰 CURSED CATACOMBS (Lv. 55-75)', labelColor: '#9d0208' },
      { x: ZONE_W * 4, color1: 0x7c1515, color2: 0x1a0000, label: '🌋 MAGMA CORE (Lv. 75-90)', labelColor: '#f48c06' },
      { x: ZONE_W * 5, color1: 0x050014, color2: 0x14003a, label: '🌌 CELESTIAL ECLIPSE [MVP] (Lv. 90-99+)', labelColor: '#4cc9f0' },
    ];

    zones.forEach(z => {
      const bg = this.add.graphics();
      bg.fillGradientStyle(z.color1, z.color1, z.color2, z.color2, 1);
      bg.fillRect(z.x, 0, ZONE_W, h);
      bg.setDepth(-10);

      this.add.text(z.x + ZONE_W / 2, 100, z.label, {
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: '26px',
        color: z.labelColor,
        stroke: '#000000',
        strokeThickness: 5
      }).setOrigin(0.5).setAlpha(0.75).setDepth(0);
    });

    // Zone 1: Marble Pillars
    const pillars = this.add.graphics();
    pillars.fillStyle(0xffffff, 0.38);
    for (let x = 80; x < 2300; x += 200) {
      pillars.fillRect(x, 240, 22, 320);
      pillars.fillRect(x - 6, 230, 34, 12);
      pillars.fillRect(x - 4, 548, 30, 10);
    }
    pillars.setDepth(-5);

    // Zone 2: Ancient Trees
    const trees = this.add.graphics();
    trees.fillStyle(0x7209b7, 0.48);
    for (let x = 2500; x < 4780; x += 200) {
      trees.beginPath(); trees.arc(x, 310, 65, Math.PI, 0); trees.fill();
      trees.fillRect(x - 15, 310, 30, 250);
    }
    // Glowing mushrooms in zone 2
    trees.fillStyle(0x00b4d8, 0.5);
    for (let x = 2600; x < 4700; x += 350) {
      trees.fillEllipse(x, 545, 80, 30);
      trees.fillRect(x - 8, 445, 16, 100);
    }
    trees.setDepth(-5);

    // Zone 3: Desert pyramids & dunes
    const dunes = this.add.graphics();
    dunes.fillStyle(0xe9c46a, 0.3);
    for (let x = 4900; x < 7100; x += 280) {
      dunes.fillTriangle(x, 560, x - 110, 560, x - 55, 340);
    }
    dunes.fillStyle(0xc9a45c, 0.15);
    for (let x = 5000; x < 7200; x += 180) {
      dunes.fillEllipse(x, 565, 220, 50);
    }
    dunes.setDepth(-5);

    // Zone 4: Catacombs arches & pillars
    const catacomb = this.add.graphics();
    catacomb.fillStyle(0x2d2d44, 0.6);
    for (let x = 7300; x < 9500; x += 200) {
      catacomb.fillRect(x, 220, 26, 340);
      catacomb.fillRect(x - 8, 210, 42, 16);
    }
    catacomb.fillStyle(0x9d0208, 0.25);
    for (let x = 7400; x < 9400; x += 300) {
      catacomb.fillRect(x - 50, 560, 100, 8);
    }
    catacomb.setDepth(-5);

    // Zone 5: Volcano & lava rivers
    const volcano = this.add.graphics();
    volcano.fillStyle(0xd62828, 0.45);
    volcano.fillTriangle(10500, 560, 10350, 560, 10425, 180);
    volcano.fillTriangle(11100, 560, 10900, 560, 11000, 220);
    volcano.fillStyle(0xff7c00, 0.55);
    for (let x = 9700; x < 11900; x += 260) {
      volcano.fillRect(x, 555, 140, 12);
    }
    volcano.setDepth(-5);

    // Zone 6: Celestial crystal spires & stars
    const celestial = this.add.graphics();
    celestial.fillStyle(0x4cc9f0, 0.25);
    for (let x = 12100; x < 14300; x += 230) {
      celestial.fillTriangle(x, 560, x - 22, 560, x - 11, 160 + Math.random() * 160);
    }
    celestial.fillStyle(0xffd166, 0.55);
    for (let i = 0; i < 180; i++) {
      const sx = 12050 + Math.random() * 2320;
      const sy = 30 + Math.random() * 400;
      celestial.fillCircle(sx, sy, 1.5 + Math.random() * 2);
    }
    // Eclipse sun
    const eclX = 13200, eclY = 140;
    celestial.fillStyle(0xff0054, 0.45);
    celestial.fillCircle(eclX, eclY, 80);
    celestial.fillStyle(0xffd166, 0.9);
    celestial.fillCircle(eclX, eclY, 56);
    celestial.fillStyle(0x14003a, 1);
    celestial.fillCircle(eclX, eclY, 50);
    celestial.setDepth(-5);

    // Warp Portals between zones (glowing rings)
    const warpPositions = [2380, 4780, 7180, 9580, 11980];
    const warpColors = [0x7209b7, 0xf77f00, 0x9d0208, 0xd62828, 0x4cc9f0];
    warpPositions.forEach((wx, i) => {
      const warp = this.add.graphics();
      warp.lineStyle(8, warpColors[i], 0.9);
      warp.strokeCircle(wx, 490, 42);
      warp.lineStyle(4, 0xffffff, 0.5);
      warp.strokeCircle(wx, 490, 52);
      warp.fillStyle(warpColors[i], 0.18);
      warp.fillCircle(wx, 490, 42);
      warp.setDepth(2);

      this.add.text(wx, 434, '🌀 WARP', {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(3);
    });
  }

  private createPlatforms(w: number) {
    // Solid ground across full world
    this.platforms.push({ x: 0, y: 560, w, h: 160, isOneWay: false });

    // Ground visuals per zone (2400px each)
    const grounds = [
      { cx: 1200,  color: 0xedf2f4, trim: 0xffd166 },   // Z1: Marble
      { cx: 3600,  color: 0x1f1135, trim: 0x4cc9f0 },   // Z2: Violet roots
      { cx: 6000,  color: 0xc9a45c, trim: 0xf77f00 },   // Z3: Desert sand
      { cx: 8400,  color: 0x0d0d18, trim: 0x9d0208 },   // Z4: Obsidian tombs
      { cx: 10800, color: 0x1a0000, trim: 0xf48c06 },   // Z5: Lava rock
      { cx: 13200, color: 0x050014, trim: 0x4cc9f0 },   // Z6: Celestial void
    ];
    grounds.forEach(g => {
      this.add.rectangle(g.cx, 640, 2400, 160, g.color).setDepth(1);
      this.add.rectangle(g.cx, 560, 2400, 10, g.trim).setDepth(1);
    });

    // Floating platforms — 8 per zone
    const floatingPlatforms: { x: number; y: number; w: number; h: number; color: number; trim: number }[] = [
      // Zone 1: Marble ledges
      { x: 180,  y: 460, w: 220, h: 16, color: 0xffffff, trim: 0xffd166 },
      { x: 450,  y: 370, w: 240, h: 16, color: 0xffffff, trim: 0xffd166 },
      { x: 740,  y: 450, w: 200, h: 16, color: 0xffffff, trim: 0xffd166 },
      { x: 980,  y: 320, w: 220, h: 16, color: 0xffffff, trim: 0xffd166 },
      { x: 1280, y: 440, w: 200, h: 16, color: 0xffffff, trim: 0xffd166 },
      { x: 1560, y: 360, w: 220, h: 16, color: 0xffffff, trim: 0xffd166 },
      { x: 1820, y: 470, w: 180, h: 16, color: 0xffffff, trim: 0xffd166 },
      { x: 2100, y: 400, w: 200, h: 16, color: 0xffffff, trim: 0xffd166 },
      // Zone 2: Aether root slabs
      { x: 2600, y: 460, w: 240, h: 16, color: 0x3a0ca3, trim: 0x9d4edd },
      { x: 2860, y: 350, w: 220, h: 16, color: 0x3a0ca3, trim: 0x9d4edd },
      { x: 3100, y: 270, w: 200, h: 16, color: 0x3a0ca3, trim: 0x9d4edd },
      { x: 3380, y: 390, w: 240, h: 16, color: 0x3a0ca3, trim: 0x9d4edd },
      { x: 3680, y: 460, w: 200, h: 16, color: 0x3a0ca3, trim: 0x4cc9f0 },
      { x: 3950, y: 350, w: 240, h: 16, color: 0x3a0ca3, trim: 0x4cc9f0 },
      { x: 4230, y: 460, w: 220, h: 16, color: 0x3a0ca3, trim: 0x4cc9f0 },
      { x: 4600, y: 380, w: 200, h: 16, color: 0x3a0ca3, trim: 0x4cc9f0 },
      // Zone 3: Desert sandstone
      { x: 5000, y: 460, w: 240, h: 16, color: 0xd4a017, trim: 0xf77f00 },
      { x: 5280, y: 370, w: 220, h: 16, color: 0xd4a017, trim: 0xf77f00 },
      { x: 5560, y: 450, w: 200, h: 16, color: 0xd4a017, trim: 0xf77f00 },
      { x: 5840, y: 320, w: 260, h: 16, color: 0xd4a017, trim: 0xf77f00 },
      { x: 6120, y: 460, w: 220, h: 16, color: 0xd4a017, trim: 0xf77f00 },
      { x: 6420, y: 370, w: 240, h: 16, color: 0xd4a017, trim: 0xf77f00 },
      { x: 6700, y: 450, w: 200, h: 16, color: 0xd4a017, trim: 0xf77f00 },
      { x: 6960, y: 380, w: 220, h: 16, color: 0xd4a017, trim: 0xf77f00 },
      // Zone 4: Catacombs stone slabs
      { x: 7400, y: 460, w: 240, h: 18, color: 0x2d2d44, trim: 0x9d0208 },
      { x: 7700, y: 360, w: 220, h: 18, color: 0x2d2d44, trim: 0x9d0208 },
      { x: 7990, y: 270, w: 200, h: 18, color: 0x2d2d44, trim: 0x9d0208 },
      { x: 8270, y: 390, w: 240, h: 18, color: 0x2d2d44, trim: 0x9d0208 },
      { x: 8560, y: 460, w: 220, h: 18, color: 0x2d2d44, trim: 0x9d0208 },
      { x: 8860, y: 360, w: 240, h: 18, color: 0x2d2d44, trim: 0x9d0208 },
      { x: 9130, y: 460, w: 200, h: 18, color: 0x2d2d44, trim: 0x9d0208 },
      { x: 9410, y: 380, w: 220, h: 18, color: 0x2d2d44, trim: 0x9d0208 },
      // Zone 5: Magma platforms
      { x: 9800,  y: 460, w: 240, h: 18, color: 0x5a0002, trim: 0xff7c00 },
      { x: 10080, y: 360, w: 220, h: 18, color: 0x5a0002, trim: 0xff7c00 },
      { x: 10360, y: 450, w: 200, h: 18, color: 0x5a0002, trim: 0xff7c00 },
      { x: 10640, y: 310, w: 260, h: 18, color: 0x5a0002, trim: 0xff7c00 },
      { x: 10940, y: 460, w: 220, h: 18, color: 0x5a0002, trim: 0xff7c00 },
      { x: 11240, y: 360, w: 240, h: 18, color: 0x5a0002, trim: 0xff7c00 },
      { x: 11520, y: 460, w: 200, h: 18, color: 0x5a0002, trim: 0xff7c00 },
      { x: 11800, y: 380, w: 220, h: 18, color: 0x5a0002, trim: 0xff7c00 },
      // Zone 6: Celestial crystal platforms
      { x: 12200, y: 460, w: 260, h: 18, color: 0x050014, trim: 0x4cc9f0 },
      { x: 12520, y: 350, w: 240, h: 18, color: 0x050014, trim: 0x4cc9f0 },
      { x: 12820, y: 260, w: 220, h: 18, color: 0x050014, trim: 0xffd166 },
      { x: 13100, y: 380, w: 300, h: 20, color: 0x050014, trim: 0xffd166 }, // Throne base
      { x: 13100, y: 280, w: 180, h: 18, color: 0x050014, trim: 0xffd166 }, // High throne
      { x: 13500, y: 440, w: 240, h: 18, color: 0x050014, trim: 0x4cc9f0 },
      { x: 13820, y: 350, w: 220, h: 18, color: 0x050014, trim: 0x4cc9f0 },
      { x: 14100, y: 460, w: 200, h: 18, color: 0x050014, trim: 0x4cc9f0 },
    ];

    floatingPlatforms.forEach(p => {
      this.platforms.push({ x: p.x, y: p.y, w: p.w, h: p.h, isOneWay: true });
      this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, p.color).setDepth(1);
      this.add.rectangle(p.x + p.w / 2, p.y + 2, p.w, 4, p.trim).setDepth(2);
    });
  }

  private createPlayer() {
    this.playerSprite = this.add.container(this.character.x || 220, this.character.y || 560);
    this.drawPlayerVisuals(this.playerSprite, this.character.name, this.character.job, this.character.baseLevel, true, Boolean(this.character.isGm));
  }

  private drawPlayerVisuals(
    container: Phaser.GameObjects.Container,
    name: string,
    job: JobClass,
    baseLevel: number,
    isSelf: boolean,
    isGm?: boolean
  ) {
    container.removeAll(true);

    // GM Radiant Starlight Aura
    if (isGm) {
      const aura = this.add.ellipse(0, -20, 38, 46, 0xffd700, 0.25);
      this.tweens.add({
        targets: aura,
        alpha: { from: 0.15, to: 0.4 },
        scaleX: { from: 0.9, to: 1.15 },
        scaleY: { from: 0.9, to: 1.15 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      container.add(aura);
    }

    const shadow = this.add.ellipse(0, -2, 26, 8, 0x000000, 0.3);
    container.add(shadow);

    const legs = this.add.rectangle(0, -8, 16, 12, 0x4a4e69);
    container.add(legs);

    let bodyColor = 0x4361ee;
    if (isGm) bodyColor = 0xffd700;
    else if (job === 'Swordman') bodyColor = 0xd90429;
    else if (job === 'Magician') bodyColor = 0x7209b7;
    else if (job === 'Archer') bodyColor = 0x2b9348;
    else if (job === 'Thief') bodyColor = 0x212529;
    else if (job === 'Acolyte') bodyColor = 0xffd166;
    else if (job === 'Merchant') bodyColor = 0xf77f00;

    const body = this.add.rectangle(0, -20, 18, 16, bodyColor);
    container.add(body);

    const head = this.add.circle(0, -34, 12, 0xffe0bd);
    container.add(head);

    const hair = this.add.ellipse(0, -40, 18, 12, isGm ? 0xffea00 : 0x9a031e);
    container.add(hair);

    const eye = this.add.ellipse(4, -34, 3, 4, 0x1d3557);
    container.add(eye);

    // Floating Golden Crown for GM
    if (isGm) {
      const crown = this.add.image(0, -56, 'gm_crown').setOrigin(0.5);
      this.tweens.add({
        targets: crown,
        y: -62,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      container.add(crown);
    }

    const labelY = isGm ? -76 : -56;
    const tagColor = isGm ? '#ffd700' : (isSelf ? '#ffe600' : '#80ed99');
    const prefix = isGm ? '👑 [GM] ' : `[${job}] `;
    const label = this.add.text(0, labelY, `${prefix}${name} (Lv.${baseLevel})`, {
      fontFamily: 'Kanit, sans-serif',
      fontSize: isGm ? '12px' : '11px',
      fontStyle: 'bold',
      color: tagColor,
      stroke: isGm ? '#7c5800' : '#000000',
      strokeThickness: isGm ? 4 : 3
    }).setOrigin(0.5);
    container.add(label);

    if (isSelf) {
      const botY = isGm ? -94 : -74;
      this.botBadgeText = this.add.text(0, botY, '🤖 AUTO HUNTING', {
        fontFamily: 'Kanit, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#4cc9f0',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);
      this.botBadgeText.setVisible(false);
      container.add(this.botBadgeText);
    }
  }

  private updateBotIndicator(active: boolean) {
    if (this.botBadgeText) {
      this.botBadgeText.setVisible(active);
    }
  }

  private setupControls() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyZ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyC = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.keyV = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    this.keyR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyF = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.keyQ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.key1 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.key3 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.key4 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
    this.key5 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);
    this.keyG = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    this.keyT = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.keyY = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
  }

  public toggle3DMode() {
    this.is3DMode = true;
    const game2D = document.getElementById('game-container');
    const game3D = document.getElementById('game-3d-container');
    const label = document.getElementById('tb-view-mode-label');

    if (game2D) game2D.classList.add('hidden');
    if (game3D) game3D.classList.remove('hidden');
    if (label) label.textContent = 'Full 3D';

    if (this.threeWorld) {
      if (this.selfData) {
        this.threeWorld.placeAt(this.selfData.x, this.selfData.z || 0);
      }
      this.network.sendViewMode('3d');
      this.threeWorld.resetCamera();
      this.threeWorld.start();
    }
    this.ui.gameplay.toast('🌐 รีเซ็ตมุมมองกล้อง 3D (Full 3D Mode)', 'success');
  }

  private setupQuickslotClicks() {
    document.getElementById('slot-z')?.addEventListener('click', () => {
      if (this.threeWorld) this.threeWorld.performAttack('NORMAL');
    });
    document.getElementById('slot-x')?.addEventListener('click', () => {
      if (this.threeWorld) this.threeWorld.performAttack('BASH');
    });
    document.getElementById('slot-4')?.addEventListener('click', () => {
      if (this.threeWorld && this.selfData) {
        const skill = this.getJobPrimarySkill(this.selfData.job);
        this.threeWorld.performAttack(skill);
      }
    });
    document.getElementById('slot-5')?.addEventListener('click', () => {
      if (this.threeWorld && this.selfData) {
        const skill = this.getJobSecondarySkill(this.selfData.job);
        this.threeWorld.performAttack(skill);
      }
    });
    document.getElementById('slot-c')?.addEventListener('click', () => {
      if (this.threeWorld) this.threeWorld.jump();
    });
    document.getElementById('slot-v')?.addEventListener('click', () => {
      if (this.threeWorld) this.threeWorld.pickupLoot();
    });
    document.getElementById('slot-1')?.addEventListener('click', () => {
      if (this.threeWorld) this.threeWorld.usePotion('hp');
    });
    document.getElementById('slot-2')?.addEventListener('click', () => {
      if (this.threeWorld) this.threeWorld.usePotion('mp');
    });
    document.getElementById('slot-3')?.addEventListener('click', () => {
      if (this.selfData) {
        const wing = this.selfData.inventory.find(i => i.id.includes('fly_wing') || i.defId === 'fly_wing');
        if (wing) {
          this.network.sendUseItem(wing.id);
          sound.playBlessing();
        }
      }
    });
  }

  private setupNetwork() {
    this.network = new NetworkClient({
      onInit: (selfId, player, players, monsters, drops) => {
        this.selfData = player;
        this.network.sendViewMode('3d');
        if (this.threeWorld) {
          this.threeWorld.placeAt(player.x, player.z || 0);
          this.threeWorld.onSelfUpdated(player);
          this.threeWorld.start();
        }
        this.questManager.setProgress(player.questProgress || {});
        this.playerSprite.setPosition(player.x, player.y);
        if (player.isGm) {
          this.ui.enableGm(true);
          this.drawPlayerVisuals(this.playerSprite, player.name, player.job, player.baseLevel, true, true);
        }
        this.ui.updatePlayerHUD(player);

        players.forEach(p => {
          if (p.id !== selfId) this.spawnRemotePlayer(p);
        });
        monsters.forEach(m => this.spawnMonster(m));
        drops.forEach(d => this.spawnDrop(d));
      },

      onAnnouncement: (announcement) => {
        this.ui.showAnnouncement(announcement);
        sound.playLevelUp();
      },

      onMobSpawned: (monster) => {
        this.spawnMonster(monster);
      },

      onSnapshot: (snapshot: ServerSnapshot) => {
        this.interpBuffer.pushSnapshot(snapshot);
        if (this.selfData) {
          const rec = this.prediction.reconcile(snapshot, this.platforms, this.selfData.stats.agi);
          this.selfData.x = rec.x;
          this.selfData.y = rec.y;
          this.selfData.vx = rec.vx;
          this.selfData.vy = rec.vy;
          this.playerSprite.setPosition(rec.x, rec.y);
        }
        if (this.threeWorld) {
          this.threeWorld.syncSnapshot(snapshot);
        }
      },

      onRefineResult: (result) => {
        const msg = result.message;
        this.ui.appendChat({
          sender: '🔨 [ช่างตีเหล็ก]',
          text: msg,
          channel: 'system',
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        });
        if (result.success) {
          this.showLevelUpEffect(this.playerSprite.x, this.playerSprite.y, `★ ตีบวกสำเร็จ +${result.newRefine}! ★`);
          sound.playLevelUp();
        } else {
          sound.playHit(true);
        }
      },

      onQuestClaimed: (questId, exp, jobExp, zeny) => {
        this.showLevelUpEffect(this.playerSprite.x, this.playerSprite.y, `🏆 ภารกิจสำเร็จ! +${exp} EXP`);
        sound.playLevelUp();
      },

      onPlayerJoined: (player) => {
        this.spawnRemotePlayer(player);
      },
      onPlayerMoved: (msg) => {
        const c = this.remotePlayerContainers.get(msg.id);
        if (c) {
          c.setPosition(msg.x, msg.y);
          c.setScale(msg.facing === 'left' ? -1 : 1, 1);
        }
      },
      onPlayerLeft: (id) => {
        const c = this.remotePlayerContainers.get(id);
        if (c) {
          c.destroy();
          this.remotePlayerContainers.delete(id);
        }
      },
      onPlayerAttacked: (id, skill, facing) => {
        const c = this.remotePlayerContainers.get(id);
        if (c) {
          this.showSkillEffect(c.x, c.y - 20, facing === 'left', skill);
          sound.playSlash();
        }
      },
      onPlayerUpdated: (player, leveledUp) => {
        if (this.selfData && this.selfData.id === player.id) {
          this.selfData = player;
          this.threeWorld?.onSelfUpdated(player);
          if (leveledUp) {
            this.showLevelUpEffect(this.playerSprite.x, this.playerSprite.y, '★ LEVEL UP! ★');
            sound.playLevelUp();
          }
          this.ui.updatePlayerHUD(player);
        }
      },
      onDamage: (damageEvent, mobHp) => {
        this.showDamagePopup(damageEvent.x, damageEvent.y, damageEvent.damage, damageEvent.isCrit);
        // 3D damage numbers are handled by ThreeWorld's own DAMAGE subscription
        if (!this.is3DMode) sound.playHit(damageEvent.isCrit);
      },
      onMobDied: (mobId, drops, mobType, mobName) => {
        const container = this.monsterContainers.get(mobId);
        if (container) {
          this.showMobDeathBurst(container.x, container.y);
          this.cameras.main.shake(100, 0.003);
          container.setVisible(false);
          this.time.delayedCall(8000, () => container.setVisible(true));
        }
        drops.forEach(d => this.spawnDrop(d));

      },
      onDropRemoved: (dropId, pickerId) => {
        const drop = this.dropContainers.get(dropId);
        if (drop) {
          if (this.selfData && pickerId === this.selfData.id) sound.playCoin();
          drop.container.destroy();
          this.dropContainers.delete(dropId);
        }
      },
      onChat: (chat) => {
        this.ui.appendChat(chat);
        if (this.selfData && chat.sender === this.selfData.name) {
          this.showChatBubble(this.playerSprite, chat.text);
        } else {
          for (const c of this.remotePlayerContainers.values()) {
            this.showChatBubble(c, chat.text);
          }
        }
      },
      onAiUpdate: (state) => {
        this.ui.updateAiCore(state);
      }
    });

    // Quest progress is tracked on the server; the journal just mirrors it
    this.network.on('QUEST_PROGRESS', (msg) => this.questManager.setProgress(msg.questProgress || {}));
    this.network.connect(this.token, this.character.id);
  }

  private spawnRemotePlayer(p: any) {
    if (this.remotePlayerContainers.has(p.id)) return;
    const c = this.add.container(p.x, p.y);
    this.drawPlayerVisuals(c, p.name, p.job, p.baseLevel, false, Boolean(p.isGm));
    this.remotePlayerContainers.set(p.id, c);
  }

  private spawnMonster(m: MonsterData) {
    if (this.monsterContainers.has(m.id)) return;
    const container = this.add.container(m.x, m.y);

    let tex = 'poring';
    let scale = 1.0;
    if (m.type === 'Sunbun') tex = 'sunbun';
    else if (m.type === 'Leafkin') tex = 'leafkin';
    else if (m.type === 'Aethercap') tex = 'aethercap';
    else if (m.type === 'Gryphlet') tex = 'gryphlet';
    else if (m.type === 'Solarion') {
      tex = 'solarion';
      scale = 1.25;
    }
    else if (m.type === 'Fabre') tex = 'fabre';
    else if (m.type === 'Spore') tex = 'spore';
    else if (m.type === 'BaphometJr') tex = 'baphomet';

    const sprite = this.add.sprite(0, -20, tex);
    sprite.setScale(scale);
    container.add(sprite);

    // MVP Boss aura effect
    if (m.type === 'Solarion') {
      const bossAura = this.add.circle(0, -20, 48, 0xff0054, 0.2);
      container.add(bossAura);
      this.tweens.add({
        targets: bossAura,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0.45,
        duration: 600,
        yoyo: true,
        repeat: -1
      });
    }

    const tagColor = m.type === 'Solarion' ? '#ffd166' : (m.type === 'BaphometJr' ? '#ff0055' : '#ffffff');
    const labelPrefix = m.type === 'Solarion' ? '👑 [MVP] ' : '';
    const tag = this.add.text(0, m.type === 'Solarion' ? -68 : -44, `${labelPrefix}Lv.${m.level} ${m.name}`, {
      fontFamily: 'Kanit, sans-serif',
      fontSize: m.type === 'Solarion' ? '12px' : '10px',
      fontStyle: 'bold',
      color: tagColor,
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5);
    container.add(tag);

    this.tweens.add({
      targets: sprite,
      scaleY: scale * 0.9,
      y: -16,
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.monsterContainers.set(m.id, container);
  }

  private spawnDrop(d: DropItemData) {
    if (this.dropContainers.has(d.id)) return;
    const container = this.add.container(d.x, d.groundY);
    const iconText = this.add.text(0, -12, d.icon, { fontSize: '20px' }).setOrigin(0.5);
    container.add(iconText);

    this.tweens.add({
      targets: iconText,
      y: -20,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.dropContainers.set(d.id, { container, data: d });
  }

  public update(time: number, delta: number) {
    if (!this.selfData) return;

    // Hotkey T: Toggle 3D / 2D
    if (this.keyT && Phaser.Input.Keyboard.JustDown(this.keyT)) {
      this.toggle3DMode();
      return;
    }

    if (this.is3DMode) {
      // In 3D mode, ThreeWorld handles movement, controls, and rendering
      return;
    }

    const dt = Math.min(0.06, delta / 1000);

    // Zone detection for top Map Banner
    this.updateZoneBanner(this.playerSprite.x);

    // Bot AI update
    const botInput = this.botEngine.update(this, dt);

    const mInput = this.mobileControls?.inputState;
    const isLeft = this.cursors.left.isDown || this.keyA.isDown || botInput.moveLeft || Boolean(mInput?.left);
    const isRight = this.cursors.right.isDown || this.keyD.isDown || botInput.moveRight || Boolean(mInput?.right);
    const isUp = this.cursors.up.isDown || this.keyW.isDown || Boolean(mInput?.up);
    const isDown = this.cursors.down.isDown || this.keyS.isDown || Boolean(mInput?.down);
    const isJumpJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.keyC) || botInput.jump || Boolean(mInput?.jump);

    const inputState = {
      left: isLeft,
      right: isRight,
      up: isUp,
      down: isDown,
      jump: isJumpJustDown
    };

    // 1. Client-Side Prediction (0ms latency movement)
    const predicted = this.prediction.predict(
      this.selfData,
      inputState,
      dt,
      this.platforms
    );

    this.playerSprite.setPosition(predicted.x, predicted.y);
    if (isLeft) {
      this.selfData.facing = 'left';
      this.playerSprite.setScale(-1, 1);
    } else if (isRight) {
      this.selfData.facing = 'right';
      this.playerSprite.setScale(1, 1);
    }

    // 2. Send input packet to Authoritative Server
    this.network.sendInput({
      seq: predicted.seq,
      ...inputState,
      dt
    });

    // 3. Viewport Frustum Asset Streaming
    this.assetStreamer.updateViewport(this.cameras.main.scrollX, this.cameras.main.width);

    // 4. Snapshot Interpolation for remote entities
    const { remotePlayers, monsters } = this.interpBuffer.getInterpolatedEntities();

    remotePlayers.forEach((p, id) => {
      const container = this.remotePlayerContainers.get(id);
      if (container) {
        container.setPosition(p.x, p.y);
        container.setScale(p.facing === 'left' ? -1 : 1, 1);
      }
    });

    monsters.forEach((m, id) => {
      const container = this.monsterContainers.get(id);
      if (container) {
        container.setPosition(m.x, m.y);
        container.setScale(m.facing === 'right' ? -1 : 1, 1);
        if (m.isDead !== undefined) container.setVisible(!m.isDead);
      }
    });

    // 5. Actions (Attack Z, Bash X, Loot V, Refine R, Bot F, Quest Q)
    if (Phaser.Input.Keyboard.JustDown(this.keyZ)) {
      this.performAttack('NORMAL');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyX)) {
      if (this.selfData.mp >= 15) {
        this.performAttack('BASH');
      } else {
        this.showMpWarning();
      }
    }

    // Hotkey 4: Primary Job Exclusive Skill
    if (Phaser.Input.Keyboard.JustDown(this.key4)) {
      const primarySkill = this.getJobPrimarySkill(this.selfData.job);
      this.performAttack(primarySkill);
    }

    // Hotkey 5: Secondary Job Exclusive Skill
    if (Phaser.Input.Keyboard.JustDown(this.key5)) {
      const secondarySkill = this.getJobSecondarySkill(this.selfData.job);
      this.performAttack(secondarySkill);
    }

    // Loot V
    if (Phaser.Input.Keyboard.JustDown(this.keyV)) {
      this.pickupNearbyDrops();
    }

    // Hotkey F: Toggle Bot
    if (Phaser.Input.Keyboard.JustDown(this.keyF)) {
      const active = this.botEngine.toggle();
      this.ui.appendChat({
        sender: '🤖 [AUTO PLAY]',
        text: active ? 'เปิดระบบช่วยเล่นอัตโนมัติ (Auto Play ON)' : 'ปิดระบบช่วยเล่นอัตโนมัติ (Auto Play OFF)',
        channel: 'system',
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      });
    }

    // Hotkey Q: Toggle Quest Journal
    if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
      this.ui.toggleWindow('quest-win');
    }

    // Hotkey R: Open Refine Window
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.ui.toggleWindow('refine-win');
    }

    // Hotkey G: Toggle GM Admin Panel
    if (Phaser.Input.Keyboard.JustDown(this.keyG)) {
      if (this.selfData?.isGm || this.character?.isGm) {
        this.ui.toggleWindow('admin-panel-win');
      }
    }

    // Hotkey Y: Toggle AI Neural Core Overseer
    if (Phaser.Input.Keyboard.JustDown(this.keyY)) {
      this.ui.toggleWindow('ai-core-win');
    }

    // Hotbar Items (1: Red, 2: Blue, 3: Fly Wing)
    if (Phaser.Input.Keyboard.JustDown(this.key1)) {
      const red = this.selfData.inventory.find(i => i.id.includes('red_potion') || i.name.includes('Red Potion'));
      if (red) {
        this.network.sendUseItem(red.id);
        sound.playPotion();
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.key2)) {
      const blue = this.selfData.inventory.find(i => i.id.includes('blue_potion') || i.name.includes('Blue Potion'));
      if (blue) {
        this.network.sendUseItem(blue.id);
        sound.playPotion();
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.key3)) {
      const wing = this.selfData.inventory.find(i => i.id.includes('fly_wing') || i.name.includes('Fly Wing'));
      if (wing) {
        this.network.sendUseItem(wing.id);
        this.playerSprite.setPosition(200 + Math.random() * 14000, 560);
        sound.playDoubleJump();
      }
    }
  }

  private handleMobileAction(action: string) {
    if (!this.selfData) return;

    if (action === 'ATTACK_NORMAL') {
      if (this.is3DMode && this.threeWorld) {
        this.threeWorld.performAttack('NORMAL');
      } else {
        this.performAttack('NORMAL');
      }
    } else if (action === 'ATTACK_BASH') {
      if (this.selfData.mp >= 15) {
        if (this.is3DMode && this.threeWorld) {
          this.threeWorld.performAttack('BASH');
        } else {
          this.performAttack('BASH');
        }
      } else {
        this.showMpWarning();
      }
    } else if (action === 'SKILL_4') {
      const primarySkill = this.getJobPrimarySkill(this.selfData.job);
      if (this.is3DMode && this.threeWorld) {
        this.threeWorld.performAttack(primarySkill);
      } else {
        this.performAttack(primarySkill);
      }
    } else if (action === 'SKILL_5') {
      const secondarySkill = this.getJobSecondarySkill(this.selfData.job);
      if (this.is3DMode && this.threeWorld) {
        this.threeWorld.performAttack(secondarySkill);
      } else {
        this.performAttack(secondarySkill);
      }
    } else if (action === 'LOOT') {
      if (this.is3DMode && this.threeWorld) {
        this.threeWorld.pickupLoot();
      } else {
        this.pickupNearbyDrops();
      }
    } else if (action === 'POTION_1') {
      const red = this.selfData.inventory.find(i => i.id.includes('red_potion') || i.name.includes('Red Potion'));
      if (red) {
        this.network.sendUseItem(red.id);
        sound.playPotion();
      }
    } else if (action === 'POTION_2') {
      const blue = this.selfData.inventory.find(i => i.id.includes('blue_potion') || i.name.includes('Blue Potion'));
      if (blue) {
        this.network.sendUseItem(blue.id);
        sound.playPotion();
      }
    } else if (action === 'TOGGLE_MENU') {
      document.getElementById('modal-mobile-menu')?.classList.toggle('hidden');
    }
  }

  private updateZoneBanner(playerX: number) {
    let zoneTitle: string;
    if (playerX >= 12000) {
      zoneTitle = 'CELESTIAL ECLIPSE 06 [MVP] (จักรวาลคราส)';
    } else if (playerX >= 9600) {
      zoneTitle = 'MAGMA CORE 05 (แกนลาวา)';
    } else if (playerX >= 7200) {
      zoneTitle = 'CURSED CATACOMBS 04 (ใต้ดินสาปแช่ง)';
    } else if (playerX >= 4800) {
      zoneTitle = 'MIRAGE DUNES 03 (ทะเลทรายมิราจ)';
    } else if (playerX >= 2400) {
      zoneTitle = 'WHISPERING AETHERWOODS 02 (ป่าเอเธอร์กระซิบ)';
    } else {
      zoneTitle = 'SOLARIA MEADOWS 01 (ทุ่งสุริยะ)';
    }

    if (this.currentZoneName !== zoneTitle) {
      this.currentZoneName = zoneTitle;
      this.ui.updateMapBanner(`⚔️ AETHERGARD ONLINE · ${zoneTitle} [CH.1]`);
    }
  }

  private getJobPrimarySkill(job: JobClass): string {
    return JOB_SKILL_BAR[job][0];
  }

  private getJobSecondarySkill(job: JobClass): string {
    return JOB_SKILL_BAR[job][1] || 'BASH';
  }

  private showMpWarning() {
    this.ui.appendChat({
      sender: '[ระบบ]',
      text: 'มานา (MP) ไม่เพียงพอสำหรับการใช้สกิล!',
      channel: 'system',
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    });
  }

  public performAttack(skill: string) {
    this.showSkillEffect(this.playerSprite.x, this.playerSprite.y - 20, this.selfData!.facing === 'left', skill);
    this.network.sendAttack(skill);
    sound.playSlash();
  }

  public showSkillEffect(x: number, y: number, isLeft: boolean, skill: string = 'NORMAL') {
    const dir = isLeft ? -1 : 1;

    if (skill === 'RADIANT_SLASH') {
      // Golden arc burst + radial glow
      const g = this.add.graphics();
      g.fillStyle(0xffd166, 0.85);
      g.fillTriangle(x, y - 20, x + dir * 90, y - 50, x + dir * 100, y + 20);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(x + dir * 55, y - 15, 18);
      g.setDepth(20);
      this.tweens.add({ targets: g, alpha: 0, scaleX: 1.8, scaleY: 1.8, duration: 280, onComplete: () => g.destroy() });
      this.cameras.main.flash(80, 255, 220, 80, false);

    } else if (skill === 'ASTRAL_METEOR') {
      // Large meteor with trail
      const g = this.add.graphics();
      g.fillStyle(0xff4500, 0.9); g.fillCircle(x + dir * 70, y - 80, 22);
      g.fillStyle(0xffd166, 0.7); g.fillCircle(x + dir * 70, y - 80, 14);
      g.setDepth(20);
      this.tweens.add({ targets: g, y: y + 20, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 320, ease: 'Quad.easeIn',
        onComplete: () => { this.cameras.main.shake(160, 0.008); g.destroy(); } });
      // Shockwave ring
      const ring = this.add.graphics();
      ring.lineStyle(4, 0xff7f00, 0.8); ring.strokeCircle(x + dir * 70, y + 20, 10);
      ring.setDepth(21);
      this.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 300, onComplete: () => ring.destroy() });

    } else if (skill === 'FROST_NOVA') {
      const g = this.add.graphics();
      g.fillStyle(0x4cc9f0, 0.7); g.fillCircle(x, y, 48);
      g.fillStyle(0xffffff, 0.5); g.fillCircle(x, y, 30);
      g.lineStyle(3, 0x4cc9f0, 0.9); g.strokeCircle(x, y, 55);
      g.setDepth(20);
      this.tweens.add({ targets: g, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 380, ease: 'Power2',
        onComplete: () => g.destroy() });
      this.cameras.main.flash(60, 100, 220, 255, false);

    } else if (skill === 'GALE_ARROW') {
      // Arrow streak
      const g = this.add.graphics();
      g.fillStyle(0x7bed9f, 0.9);
      g.fillTriangle(x + dir * 20, y, x + dir * 90, y - 10, x + dir * 90, y + 10);
      g.fillStyle(0xffffff, 0.5); g.fillEllipse(x + dir * 56, y, 60, 10);
      g.setDepth(20);
      this.tweens.add({ targets: g, x: dir * 120, alpha: 0, duration: 260, onComplete: () => g.destroy() });

    } else if (skill === 'RAIN_OF_LIGHT') {
      for (let i = 0; i < 8; i++) {
        const g = this.add.graphics();
        g.fillStyle(0xffd166, 0.85);
        const rx = x + (Math.random() * 160 - 80);
        g.fillTriangle(rx, y - 100, rx - 4, y + 20, rx + 4, y + 20);
        g.setDepth(20);
        this.time.delayedCall(i * 45, () => {
          this.tweens.add({ targets: g, y: 30, alpha: 0, duration: 300, onComplete: () => g.destroy() });
        });
      }

    } else if (skill === 'SHADOW_BLINK') {
      // Dark teleport flash
      const g = this.add.graphics();
      g.fillStyle(0x7209b7, 0.9); g.fillCircle(x, y - 15, 40);
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y - 15, 24);
      g.setDepth(20);
      this.tweens.add({ targets: g, alpha: 0, scaleX: 1.8, scaleY: 1.8, duration: 200, onComplete: () => g.destroy() });
      this.cameras.main.flash(60, 80, 0, 180, false);

    } else if (skill === 'BLADE_DANCE') {
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 60, () => {
          const g = this.add.graphics();
          const angle = (i / 5) * Math.PI * 2;
          const sx = x + Math.cos(angle) * 50, sy = y + Math.sin(angle) * 30 - 20;
          g.fillStyle(0x9d4edd, 0.85); g.fillTriangle(sx, sy - 14, sx + dir * 26, sy - 4, sx + dir * 26, sy + 4);
          g.setDepth(20);
          this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
        });
      }

    } else if (skill === 'SANCTUARY') {
      // Holy ring on ground
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.4); g.fillEllipse(x, y + 20, 100, 30);
      g.lineStyle(4, 0xffd700, 0.9); g.strokeEllipse(x, y + 20, 100, 30);
      g.fillStyle(0xffd700, 0.6); g.fillCircle(x, y - 30, 18);
      g.setDepth(20);
      this.tweens.add({ targets: g, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 500, onComplete: () => g.destroy() });

    } else if (skill === 'JUDGMENT_FIST') {
      const g = this.add.graphics();
      g.fillStyle(0xffd700, 0.9); g.fillCircle(x + dir * 50, y - 10, 28);
      g.fillStyle(0xff6d00, 0.7); g.fillCircle(x + dir * 50, y - 10, 18);
      g.setDepth(20);
      this.tweens.add({ targets: g, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 260, ease: 'Power2',
        onComplete: () => { this.cameras.main.shake(100, 0.006); g.destroy(); }});

    } else if (skill === 'COIN_BURST') {
      for (let i = 0; i < 8; i++) {
        const coin = this.add.text(x, y, '🪙', { fontSize: '20px' }).setOrigin(0.5).setDepth(20);
        this.tweens.add({ targets: coin, x: x + (Math.random() * 160 - 80), y: y + (Math.random() * 80 - 40),
          alpha: 0, duration: 480, onComplete: () => coin.destroy() });
      }

    } else if (skill === 'GREED_VACUUM') {
      const g = this.add.graphics();
      g.lineStyle(5, 0xffd700, 0.9); g.strokeCircle(x, y - 10, 60);
      g.fillStyle(0xffd700, 0.25); g.fillCircle(x, y - 10, 60);
      g.setDepth(20);
      this.tweens.add({ targets: g, scaleX: 0.1, scaleY: 0.1, alpha: 0, duration: 400, ease: 'Power3',
        onComplete: () => g.destroy() });

    } else if (skill === 'SOLAR_AEGIS') {
      // Shield bubble
      const g = this.add.graphics();
      g.lineStyle(6, 0xffd166, 0.9); g.strokeCircle(x, y - 20, 42);
      g.fillStyle(0xffd166, 0.2); g.fillCircle(x, y - 20, 42);
      g.setDepth(20);
      this.tweens.add({ targets: g, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 400,
        onComplete: () => g.destroy() });
      this.cameras.main.flash(50, 255, 240, 150, false);

    } else if (skill === 'BASH') {
      const g = this.add.graphics();
      g.fillStyle(0xff4e00, 0.85); g.fillTriangle(x + dir * 15, y - 30, x + dir * 65, y - 15, x + dir * 65, y + 10);
      g.fillStyle(0xffffff, 0.4); g.fillCircle(x + dir * 45, y - 12, 16);
      g.setDepth(20);
      this.tweens.add({ targets: g, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 200, onComplete: () => g.destroy() });
      this.cameras.main.shake(80, 0.004);

    } else {
      // NORMAL attack — quick slash
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.75);
      g.fillTriangle(x + dir * 12, y - 12, x + dir * 50, y - 5, x + dir * 50, y + 5);
      g.setDepth(20);
      this.tweens.add({ targets: g, alpha: 0, scaleX: 1.4, scaleY: 1.4, duration: 160, onComplete: () => g.destroy() });
    }
  }

  public findClosestAliveMonster(): MonsterData | null {
    if (!this.selfData) return null;
    let closest: MonsterData | null = null;
    let minDist = 750;
    this.monsterContainers.forEach((container, mobId) => {
      if (!container.visible) return;
      const dist = Phaser.Math.Distance.Between(this.playerSprite.x, this.playerSprite.y, container.x, container.y);
      if (dist < minDist) {
        minDist = dist;
        closest = {
          id: mobId,
          x: container.x,
          y: container.y
        } as any;
      }
    });
    return closest;
  }

  public pickupNearbyDrops() {
    if (!this.selfData) return;
    this.dropContainers.forEach(d => {
      const dist = Phaser.Math.Distance.Between(this.playerSprite.x, this.playerSprite.y, d.data.x, d.data.groundY);
      if (dist <= 95) {
        this.network.sendPickDrop(d.data.id);
      }
    });
  }

  public performBotSkill(skillName: string) {
    this.performAttack(skillName);
  }

  public getDropCount(): number {
    return this.dropContainers.size;
  }

  private showDamagePopup(x: number, y: number, damage: number, isCrit: boolean) {
    const color = isCrit ? '#fff176' : '#ffffff';
    const stroke = isCrit ? '#b71c1c' : '#ff6b35';
    const size = isCrit ? '26px' : '18px';
    const prefix = isCrit ? '💥 ' : '';

    const dmgText = this.add.text(x + (Math.random() * 22 - 11), y - 10, `${prefix}${damage}`, {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: size,
      color,
      stroke,
      strokeThickness: isCrit ? 5 : 3
    }).setOrigin(0.5).setDepth(30);

    if (isCrit) {
      // Extra crit burst ring
      const ring = this.add.graphics().setDepth(29);
      ring.lineStyle(3, 0xffd700, 0.85);
      ring.strokeCircle(x, y - 10, 20);
      this.tweens.add({ targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 250, onComplete: () => ring.destroy() });
    }

    this.tweens.add({
      targets: dmgText,
      y: y - (isCrit ? 65 : 50),
      alpha: 0,
      scaleX: isCrit ? 1.4 : 1.0,
      scaleY: isCrit ? 1.4 : 1.0,
      duration: isCrit ? 950 : 700,
      ease: 'Power1',
      onComplete: () => dmgText.destroy()
    });
  }

  private showMobDeathBurst(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      const g = this.add.graphics().setDepth(25);
      const colors = [0xffd700, 0xff4500, 0xffffff, 0x7209b7, 0x4cc9f0];
      g.fillStyle(colors[i % colors.length], 0.9);
      g.fillCircle(0, 0, 5 + Math.random() * 6);
      g.setPosition(x, y - 20);
      const angle = (i / 10) * Math.PI * 2;
      this.tweens.add({
        targets: g,
        x: x + Math.cos(angle) * (50 + Math.random() * 40),
        y: y - 20 + Math.sin(angle) * (40 + Math.random() * 30),
        alpha: 0,
        duration: 450 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => g.destroy()
      });
    }
    // Flash shockwave
    const wave = this.add.graphics().setDepth(24);
    wave.lineStyle(4, 0xffd700, 0.9);
    wave.strokeCircle(x, y - 10, 16);
    this.tweens.add({ targets: wave, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 350, onComplete: () => wave.destroy() });
  }

  private showLevelUpEffect(x: number, y: number, title: string = '★ LEVEL UP! ★') {
    const text = this.add.text(x, y - 70, title, {
      fontFamily: 'Impact, sans-serif',
      fontSize: '16px',
      color: '#ffea00',
      stroke: '#9d0208',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 110,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy()
    });
  }

  private showChatBubble(container: Phaser.GameObjects.Container, text: string) {
    const bubbleText = this.add.text(0, -80, text, {
      fontFamily: 'Kanit, sans-serif',
      fontSize: '12px',
      color: '#000000',
      backgroundColor: '#ffffff',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);

    container.add(bubbleText);
    this.time.delayedCall(4500, () => bubbleText.destroy());
  }
}
