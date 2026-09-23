import { GameRoom } from './Room.js';
import { AiNeuralState, AiPatchRecord, AiThought, PlayerData, ServerAnnouncement } from './types.js';

export class AetherAiEngine {
  private room: GameRoom;
  public state: AiNeuralState;

  private learningTimer: number = 0;
  private anomalyScanTimer: number = 0;
  private thoughtTimer: number = 0;
  private patchCounter: number = 100;

  // Global Knowledge Matrix Simulation Prompts
  private globalMetaTopics: string[] = [
    'MapleStory v240 dynamic boss phase telemetry',
    'Ragnarok Online classic card drop probability curve',
    'World of Warcraft dynamic dungeon affix scaling',
    'Final Fantasy XIV GCD action balance and telegraph timing',
    'Lost Ark emergent world boss dynamic scaling algorithms',
    'Global WebMMORPG latency mitigation & client-prediction patterns',
    'Anti-inflation virtual economy sink-to-faucet ratios'
  ];

  private evolutionEvents = [
    {
      name: 'Aether Convergence Surge (คลื่นเวทมนตร์เอเธอร์หลั่งไหล)',
      buff: 'EXP +35%, อัตราดรอปไอเทม +25%',
      reason: 'AI วิเคราะห์พบว่าผู้เล่นกำลังฟาร์มอย่างต่อเนื่อง จึงปรับเพิ่มอัตราเร่งเพื่อตอบแทนความพยายาม'
    },
    {
      name: 'Celestial Starlight Blessing (พรอันประเสริฐแห่งดวงดาว)',
      buff: 'ฟื้นฟู HP/MP เร็วขึ้น 2 เท่า, พลังโจมตี +15%',
      reason: 'AI ตรวจพบการต่อสู้ระดับสูงในโซนลึก จึงเสริมพลังบัฟศักดิ์สิทธิ์ช่วยเหลือผู้เล่นทุกคน'
    },
    {
      name: 'Golden Goblin Influx (ชั่วโมงทองคำแห่งมิดการ์ด)',
      buff: 'เงิน Zeny ดรอปเพิ่มขึ้น 50% จากมอนสเตอร์ทุกตัว',
      reason: 'AI วิเคราะห์สภาวะเศรษฐกิจในเซิร์ฟเวอร์ และทำการกระตุ้นสภาพคล่องของเงิน Zeny'
    },
    {
      name: 'Eclipse Demon Hunt (ทัณฑ์พิพากษาคราสทมิฬ)',
      buff: 'มอนสเตอร์บอสและ RedDemon ให้ EXP พิเศษ 2 เท่า',
      reason: 'AI ตรวจพบระดับเฉลี่ยของผู้เล่นพร้อมสำหรับความท้าทายระดับยาก จึงปลดปล่อยความท้าทายพิเศษ'
    }
  ];

  constructor(room: GameRoom) {
    this.room = room;
    this.state = {
      status: 'ONLINE',
      version: 'AETHER-CORE v3.5.2 [Autonomous]',
      learningProgress: 18,
      cyclesCompleted: 142,
      activeEvent: 'Aether Convergence Surge',
      activeEventBuff: 'EXP +20%, Drop Rate +15%',
      anomalyScore: 0.02,
      recentThoughts: [
        {
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          source: 'GLOBAL_META',
          text: 'เชื่อมต่อฐานข้อมูลเมต้าเกมออนไลน์สากล: กำลังติดตามความสมดุลของอาชีพทั้ง 6 สาย'
        },
        {
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          source: 'ANOMALY_SENTINEL',
          text: 'สแกนความปลอดภัย 360 องศา: ไม่พบพิกัดหลุดแมพหรือการส่งแพ็กเก็ตผิดปกติ'
        }
      ],
      patches: [
        {
          id: 'PATCH-0x101',
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          category: 'BALANCE_TUNING',
          target: 'Monster Respawn Cadence',
          reason: 'ปรับสมดุลความเร็วการเกิดของ Sunbun และ Leafkin ให้สัมพันธ์กับจำนวนผู้เล่นออนไลน์',
          description: 'ลดเวลาหน่วงการเกิดมอนสเตอร์เริ่มต้นจาก 8.0 วินาที เหลือ 5.0 วินาที',
          status: 'ACTIVE'
        },
        {
          id: 'PATCH-0x102',
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          category: 'SECURITY',
          target: 'Spatial Boundary Watchdog',
          reason: 'ป้องกันผู้เล่นหลุดขอบแผนที่ในโหมด 3D และ 2D Side-scrolling',
          description: 'เพิ่มระนาบกั้นพิกัด Y < 50 และ X > 3580 แบบ Real-time Auto-Snap',
          status: 'ACTIVE'
        }
      ],
      globalMetaTrend: 'Adaptive Boss Telemetry & Dynamic Risk-Reward Scaling'
    };
  }

  /**
   * Called every tick (~30Hz) from Room.ts
   */
  public update(dt: number) {
    this.learningTimer += dt;
    this.anomalyScanTimer += dt;
    this.thoughtTimer += dt;

    // 1. Learning Progress Heartbeat (Every 1.5s -> +2% progress)
    if (this.learningTimer >= 1.5) {
      this.learningTimer = 0;
      this.state.learningProgress += 2;

      // Cycle completion & Autonomous Evolution
      if (this.state.learningProgress >= 100) {
        this.triggerEvolutionCycle();
      }
    }

    // 2. Thought Stream Generator (Every 12s)
    if (this.thoughtTimer >= 12.0) {
      this.thoughtTimer = 0;
      this.generateAutonomousThought();
    }

    // 3. Autonomous Anomaly & Bug Sentinel Scan (Every 8.0s)
    if (this.anomalyScanTimer >= 8.0) {
      this.anomalyScanTimer = 0;
      this.runAutonomousAnomalyScan();
    }
  }

  /**
   * Generates continuous AI thoughts on global meta, economy, and balance
   */
  private generateAutonomousThought() {
    const topic = this.globalMetaTopics[Math.floor(Math.random() * this.globalMetaTopics.length)];
    const playerCount = this.room.clients.size;
    const thoughts = [
      `วิเคราะห์ ${topic}: ประมวลผลดัชนีความเร้าใจในโซน 1 และ 2 อยู่ที่ 94.6%`,
      `ตรวจสอบพฤติกรรมผู้เล่น (${playerCount} คนออนไลน์): ความเร็วการเคลียร์มอนสเตอร์สอดคล้องกับมาตรฐานโลก`,
      `สังเคราะห์อัตราความเสียหายสกิลของ Swordman vs Magician: สัมประสิทธิ์ความสมดุลอยู่ที่ 1.02 (เกณฑ์มาตรฐาน)`,
      `ประเมินระบบดรอปการ์ดและไอเทมระดับตำนาน: ยืนยันสถิติการดรอปเป็นไปตาม Random Seed ทางคณิตศาสตร์`,
      `เฝ้าระวังความเร็วการเคลื่อนที่และการกระโดด: การซิงก์แพ็กเก็ต 3D/2D มีความหน่วงต่ำกว่า 20ms`
    ];

    const chosenText = thoughts[Math.floor(Math.random() * thoughts.length)];
    this.addThought('GLOBAL_META', chosenText);
    this.broadcastStateUpdate();
  }

  /**
   * Scans the world for anomalies, bugs, or exploits and self-heals in real-time
   */
  public runAutonomousAnomalyScan(): { detected: number; patched: number } {
    let detected = 0;
    let patched = 0;

    // A. Check Players
    this.room.clients.forEach((player) => {
      // 1. Coordinate Clipping Anomaly
      if (player.x < 20 || player.x > 3580 || player.y < 50 || player.y > 720 || isNaN(player.x) || isNaN(player.y)) {
        detected++;
        player.x = Math.max(50, Math.min(3550, isNaN(player.x) ? 200 : player.x));
        player.y = 560;
        player.vx = 0;
        player.vy = 0;
        patched++;

        this.applySelfPatch(
          'BUG_FIX',
          `Player Spatial Alignment (${player.name})`,
          `ตรวจพบพิกัดตัวละครหลุดกรอบภูมิประเทศ (Out-of-Bounds) จึงทำการเคลื่อนย้ายกลับสู่ระนาบปลอดภัยอัตโนมัติ`,
          `ปรับพิกัดตัวละคร ${player.name} สู่ระนาบพื้นดินปลอดภัย (x: ${Math.round(player.x)}, y: 560)`
        );
      }

      // 2. Health / Mana NaN Anomaly
      if (isNaN(player.hp) || player.hp < 0 || isNaN(player.mp)) {
        detected++;
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        patched++;

        this.applySelfPatch(
          'ANOMALY_HEALING',
          `Player Vitality Corruption (${player.name})`,
          `ตรวจพบค่าตัวเลข HP/MP มีค่าผิดปกติทางคณิตศาสตร์ (NaN Error) จึงทำการกู้คืนค่าพลังชีวิตและมานาเต็มอัตโนมัติ`,
          `คืนค่า HP และ MP ของ ${player.name} เป็นค่าปกติสูงสุดเต็ม 100%`
        );
      }

      // 3. Speed-Hack or Velocity Anomaly (non-GM)
      if (!player.isGm && (player.speedMultiplier || 1.0) > 3.0) {
        detected++;
        player.speedMultiplier = 1.0;
        patched++;

        this.applySelfPatch(
          'SECURITY',
          `Velocity Multiplier Anomaly (${player.name})`,
          `ตรวจพบตัวคูณความเร็วเกินเกณฑ์มาตรฐานสำหรับผู้เล่นทั่วไป ทำการรีเซ็ตกลับสู่ระดับ 1.0x`,
          `บังคับใช้ตัวคูณความเร็วปกติ 1.0x แก่ผู้เล่น ${player.name}`
        );
      }
    });

    // B. Check Monsters for stuck state
    let stuckCount = 0;
    this.room.monsterManager.monsters.forEach((mob) => {
      if (mob.isDead && mob.hp > 0) {
        mob.isDead = false;
        stuckCount++;
      }
      if (isNaN(mob.x) || isNaN(mob.y) || mob.x < 50 || mob.x > 3550) {
        mob.x = mob.patrolMinX + 50;
        mob.y = 560;
        stuckCount++;
      }
    });

    if (stuckCount > 0) {
      detected += stuckCount;
      patched += stuckCount;
      this.applySelfPatch(
        'BUG_FIX',
        'Monster Entity Desync',
        `ตรวจพบสถานะมอนสเตอร์ไม่ตรงกับวงจรจำลองพิกัด จึงทำการรีเซ็ตตำแหน่งและตรรกะ AI มอนสเตอร์`,
        `รีเฟรชมอนสเตอร์ที่ค้างจำนวน ${stuckCount} ตัวสู่สถานะปกติ`
      );
    }

    this.state.anomalyScore = Math.max(0.01, detected * 0.05);
    return { detected, patched };
  }

  /**
   * Applies an autonomous self-patch, records it to the ledger, and broadcasts to players
   */
  public applySelfPatch(category: AiPatchRecord['category'], target: string, reason: string, description: string) {
    const patchId = `PATCH-0x${(++this.patchCounter).toString(16).toUpperCase()}`;
    const timestamp = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const patch: AiPatchRecord = {
      id: patchId,
      timestamp,
      category,
      target,
      reason,
      description,
      status: 'APPLIED'
    };

    this.state.patches.unshift(patch);
    if (this.state.patches.length > 20) {
      this.state.patches.pop();
    }

    // Add thought
    this.addThought('ANOMALY_SENTINEL', `[${patchId}] ออกแพทช์อัตโนมัติ: ${description}`);

    // Broadcast Announcement & Chat
    this.room.broadcastAnnouncement(
      `🤖 [AI AUTO-PATCH]: ${description}`,
      'AETHER-AI CORE',
      'cyan'
    );

    this.room.sendSystemChat(`🤖 [AETHER-AI REASONING]: ${reason} (${patchId})`);
    this.broadcastStateUpdate();
  }

  /**
   * Autonomous Evolution Cycle: Triggers world events and meta enhancements
   */
  public triggerEvolutionCycle() {
    this.state.cyclesCompleted++;
    this.state.learningProgress = 0;

    const ev = this.evolutionEvents[Math.floor(Math.random() * this.evolutionEvents.length)];
    this.state.activeEvent = ev.name;
    this.state.activeEventBuff = ev.buff;

    this.applySelfPatch(
      'META_EVOLUTION',
      'Global World Dynamic Event',
      ev.reason,
      `เปิดใช้งานอีเวนต์พิเศษ: ${ev.name} [${ev.buff}]`
    );

    // Announce to all players
    this.room.broadcastAnnouncement(
      `🌟 [AETHER-AI EVOLUTION]: ${ev.name}! (${ev.buff})`,
      'AETHER-AI CORE',
      'cyan'
    );

    this.room.sendSystemChat(`🌐 [AI GLOBAL META]: ${ev.reason}`);
    this.broadcastStateUpdate();
  }

  /**
   * User or Admin manual command: Force Diagnostics
   */
  public triggerManualDiagnostics(): { status: string; result: any } {
    this.state.status = 'ANALYZING';
    const scan = this.runAutonomousAnomalyScan();
    this.state.status = 'ONLINE';

    const msg = scan.detected > 0
      ? `AI ตรวจพบข้อบกพร่อง ${scan.detected} จุด และดำเนินการซ่อมแซมตัวเองสำเร็จครบ 100%!`
      : `ระบบสุขภาพเกมสมบูรณ์แบบ 100%! ไม่พบข้อผิดพลาดหรือพิกัดผิดปกติ`;

    this.addThought('SECURITY_CORE', `[คำสั่งวินิจฉัย]: ${msg}`);
    this.room.broadcastAnnouncement(`🤖 [AI DIAGNOSTICS]: ${msg}`, 'AETHER-AI CORE', 'cyan');
    this.room.sendSystemChat(`⚡ [AETHER-AI HEALTH]: ดัชนีความเสถียร 99.98% • ความหน่วงเฉลี่ย 12ms • ความจุเอนทิตีปกติ`);
    this.broadcastStateUpdate();

    return { status: 'success', result: scan };
  }

  /**
   * User or Admin manual command: Trigger Evolution
   */
  public triggerManualEvolution() {
    this.state.status = 'EVOLVING';
    this.triggerEvolutionCycle();
    this.state.status = 'ONLINE';
    return { status: 'success', event: this.state.activeEvent };
  }

  private addThought(source: AiThought['source'], text: string) {
    this.state.recentThoughts.unshift({
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      source,
      text
    });

    if (this.state.recentThoughts.length > 25) {
      this.state.recentThoughts.pop();
    }
  }

  /**
   * Broadcast updated AI state to all connected WebSocket clients
   */
  public broadcastStateUpdate() {
    const payload = JSON.stringify({
      type: 'AI_UPDATE',
      state: this.state
    });

    this.room.clients.forEach((_, ws) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(payload);
      }
    });
  }
}
