import { MonsterType, QuestProgressMap } from '../../../server/src/types.js';
import { QUEST_DB, ITEM_DB, getQuestState } from '../../../server/src/GameData.js';
import { NetworkClient } from './Network.js';
import { sound } from '../engine/Sound.js';

export interface Quest {
  id: string;
  title: string;
  category: 'active' | 'daily' | 'completed';
  description: string;
  targetMob: MonsterType;
  requiredKills: number;
  currentKills: number;
  rewardExp: number;
  rewardJobExp: number;
  rewardZeny: number;
  rewardItem?: string;
  completed: boolean;
  claimed: boolean;
}

/**
 * Read-only mirror of the server's quest state. Kills are counted and
 * rewards granted by the server; this class only formats them for the UI.
 */
export class QuestManager {
  public quests: Quest[] = [];
  private progress: QuestProgressMap = {};
  private onUpdateCallback?: () => void;

  constructor(onUpdate?: () => void) {
    this.onUpdateCallback = onUpdate;
    this.rebuild();
  }

  public setOnUpdate(cb: () => void) {
    this.onUpdateCallback = cb;
  }

  public setProgress(progress: QuestProgressMap) {
    const before = this.getClaimableQuestCount();
    this.progress = progress;
    this.rebuild();
    if (this.getClaimableQuestCount() > before) sound.playLevelUp();
    this.onUpdateCallback?.();
  }

  private rebuild() {
    const now = Date.now();
    this.quests = QUEST_DB.map(def => {
      const state = getQuestState(def, this.progress[def.id], now);
      return {
        id: def.id,
        title: def.title,
        category: def.category,
        description: def.description,
        targetMob: def.targets[0],
        requiredKills: def.requiredKills,
        currentKills: state.kills,
        rewardExp: def.rewardExp,
        rewardJobExp: def.rewardJobExp,
        rewardZeny: def.rewardZeny,
        rewardItem: def.rewardItems.map(r => `${ITEM_DB[r.defId]?.name || r.defId} x${r.qty}`).join(', ') || undefined,
        completed: state.completed,
        claimed: state.claimed
      };
    });
  }

  public claimQuest(questId: string, network: NetworkClient): boolean {
    const q = this.quests.find(item => item.id === questId);
    if (!q || !q.completed || q.claimed) return false;
    network.sendClaimQuest(q.id);
    sound.playCoin();
    return true;
  }

  public getQuestsByCategory(category: 'active' | 'daily' | 'completed'): Quest[] {
    if (category === 'completed') {
      return this.quests.filter(q => q.claimed);
    }
    return this.quests.filter(q => q.category === category && !q.claimed);
  }

  public getActiveQuestCount(): number {
    return this.quests.filter(q => !q.claimed).length;
  }

  public getClaimableQuestCount(): number {
    return this.quests.filter(q => q.completed && !q.claimed).length;
  }
}
