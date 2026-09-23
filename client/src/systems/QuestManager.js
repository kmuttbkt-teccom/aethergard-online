import { QUEST_DB, ITEM_DB, getQuestState } from '../../../server/src/GameData.js';
import { sound } from '../engine/Sound.js';
/**
 * Read-only mirror of the server's quest state. Kills are counted and
 * rewards granted by the server; this class only formats them for the UI.
 */
export class QuestManager {
    quests = [];
    progress = {};
    onUpdateCallback;
    constructor(onUpdate) {
        this.onUpdateCallback = onUpdate;
        this.rebuild();
    }
    setOnUpdate(cb) {
        this.onUpdateCallback = cb;
    }
    setProgress(progress) {
        const before = this.getClaimableQuestCount();
        this.progress = progress;
        this.rebuild();
        if (this.getClaimableQuestCount() > before)
            sound.playLevelUp();
        this.onUpdateCallback?.();
    }
    rebuild() {
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
    claimQuest(questId, network) {
        const q = this.quests.find(item => item.id === questId);
        if (!q || !q.completed || q.claimed)
            return false;
        network.sendClaimQuest(q.id);
        sound.playCoin();
        return true;
    }
    getQuestsByCategory(category) {
        if (category === 'completed') {
            return this.quests.filter(q => q.claimed);
        }
        return this.quests.filter(q => q.category === category && !q.claimed);
    }
    getActiveQuestCount() {
        return this.quests.filter(q => !q.claimed).length;
    }
    getClaimableQuestCount() {
        return this.quests.filter(q => q.completed && !q.claimed).length;
    }
}
