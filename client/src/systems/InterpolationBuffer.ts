import { ServerSnapshot } from '../../../server/src/types.js';

export interface InterpolatedEntity {
  id: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  anim: 'idle' | 'walk' | 'jump' | 'attack' | 'dead';
  hp?: number;
  maxHp?: number;
  isDead?: boolean;
}

export class InterpolationBuffer {
  private snapshots: ServerSnapshot[] = [];
  public static readonly INTERPOLATION_DELAY_MS = 75; // 75ms interpolation buffer
  public static readonly MAX_BUFFER_SIZE = 40;

  public pushSnapshot(snapshot: ServerSnapshot) {
    this.snapshots.push(snapshot);
    // Keep buffer bounded
    if (this.snapshots.length > InterpolationBuffer.MAX_BUFFER_SIZE) {
      this.snapshots.shift();
    }
  }

  /**
   * Get interpolated states for remote players and monsters at target render time
   */
  public getInterpolatedEntities(): {
    remotePlayers: Map<string, InterpolatedEntity>;
    monsters: Map<string, InterpolatedEntity>;
  } {
    const remotePlayers = new Map<string, InterpolatedEntity>();
    const monsters = new Map<string, InterpolatedEntity>();

    if (this.snapshots.length === 0) {
      return { remotePlayers, monsters };
    }

    const renderTime = Date.now() - InterpolationBuffer.INTERPOLATION_DELAY_MS;

    // 1. Find the two surrounding snapshots: S1.timestamp <= renderTime <= S2.timestamp
    let s0: ServerSnapshot | null = null;
    let s1: ServerSnapshot | null = null;

    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      if (this.snapshots[i].timestamp <= renderTime) {
        s0 = this.snapshots[i];
        s1 = this.snapshots[i + 1] || s0;
        break;
      }
    }

    // If renderTime is older than all snapshots, use oldest
    if (!s0) {
      s0 = this.snapshots[0];
      s1 = s0;
    }
    if (!s1) {
      s1 = s0;
    }

    // Interpolation factor t between [0, 1]
    let t = 0;
    if (s1.timestamp > s0.timestamp) {
      t = Math.max(0, Math.min(1, (renderTime - s0.timestamp) / (s1.timestamp - s0.timestamp)));
    }

    // 2. Interpolate Remote Players
    const s1PlayerMap = new Map(s1.players.map(p => [p.id, p]));
    s0.players.forEach(p0 => {
      const p1 = s1PlayerMap.get(p0.id) || p0;
      const interpX = p0.x + (p1.x - p0.x) * t;
      const interpY = p0.y + (p1.y - p0.y) * t;

      remotePlayers.set(p0.id, {
        id: p0.id,
        x: interpX,
        y: interpY,
        facing: p1.facing,
        anim: p1.anim
      });
    });

    // 3. Interpolate Monsters
    const s1MobMap = new Map(s1.monsters.map(m => [m.id, m]));
    s0.monsters.forEach(m0 => {
      const m1 = s1MobMap.get(m0.id) || m0;
      const interpX = m0.x + (m1.x - m0.x) * t;
      const interpY = m0.y + (m1.y - m0.y) * t;

      monsters.set(m0.id, {
        id: m0.id,
        x: interpX,
        y: interpY,
        facing: m1.facing,
        anim: 'walk',
        hp: m1.hp,
        maxHp: m1.maxHp,
        isDead: m1.isDead
      });
    });

    return { remotePlayers, monsters };
  }
}
