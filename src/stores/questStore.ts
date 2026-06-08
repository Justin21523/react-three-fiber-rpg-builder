import { create } from 'zustand';
import type { Quest, QuestReward } from '../types/quest';
import { SEED_QUESTS } from '../data/quests';
import { useInventoryStore } from './inventoryStore';
import { useProgressionStore } from './progressionStore';
import { useFlagStore } from './flagStore';

// Kit — the single reward seam. By default a completed quest grants its items, player exp, and flags.
// Plug your own combat/loot/economy by reassigning this via setQuestRewardHandler — the quest system
// never references anything game-specific.
let onQuestReward: (reward: QuestReward, quest: Quest) => void = (reward) => {
  reward.items?.forEach((it) => useInventoryStore.getState().addItem(it.itemId, it.quantity ?? 1));
  if (reward.exp) useProgressionStore.getState().addExp(reward.exp);
  reward.flags?.forEach((f) => useFlagStore.getState().setFlag(f));
};

/** Replace the default reward handler (item/exp/flag) with your own. */
export function setQuestRewardHandler(handler: (reward: QuestReward, quest: Quest) => void): void {
  onQuestReward = handler;
}

interface QuestState {
  quests: Record<string, Quest>;
  startQuest: (questId: string) => void;
  updateObjective: (questId: string, objectiveId: string, isCompleted: boolean) => void;
  completeQuest: (questId: string) => void;
  getActiveQuests: () => Quest[];
  getQuestById: (questId: string) => Quest | undefined;
  registerRuntimeQuest: (quest: Quest) => void;
  setQuestStatuses: (statuses: Partial<Record<string, Quest['status']>>) => void;
  setObjectiveStates: (data: Record<string, Record<string, boolean>>) => void;
  reset: () => void;
}

const createInitialQuests = (): Record<string, Quest> =>
  SEED_QUESTS.reduce((acc, q) => ({ ...acc, [q.id]: q }), {} as Record<string, Quest>);

export const useQuestStore = create<QuestState>((set, get) => ({
  quests: createInitialQuests(),

  startQuest: (questId) =>
    set((state) => {
      const quest = state.quests[questId];
      if (!quest || quest.status !== 'NotStarted') return state;
      return { quests: { ...state.quests, [questId]: { ...quest, status: 'InProgress' } } };
    }),

  updateObjective: (questId, objectiveId, isCompleted) => {
    set((state) => {
      const quest = state.quests[questId];
      if (!quest) return state;
      const objectives = quest.objectives.map((o) => (o.id === objectiveId ? { ...o, isCompleted } : o));
      return { quests: { ...state.quests, [questId]: { ...quest, objectives } } };
    });
    // Auto-complete when every objective is done (generic, satisfying default).
    const q = get().quests[questId];
    if (q && q.status === 'InProgress' && q.objectives.every((o) => o.isCompleted)) {
      get().completeQuest(questId);
    }
  },

  completeQuest: (questId) => {
    const quest = get().quests[questId];
    if (!quest || quest.status === 'Completed') return;
    if (quest.reward) onQuestReward(quest.reward, quest);
    set((state) => ({ quests: { ...state.quests, [questId]: { ...quest, status: 'Completed' } } }));
  },

  getActiveQuests: () => Object.values(get().quests).filter((q) => q.status === 'InProgress'),
  getQuestById: (questId) => get().quests[questId],

  registerRuntimeQuest: (quest) =>
    set((s) => ({ quests: { ...s.quests, [quest.id]: { ...quest, source: 'runtime' } } })),

  setQuestStatuses: (statuses) =>
    set((state) => {
      const quests = { ...state.quests };
      for (const [id, status] of Object.entries(statuses)) {
        if (status && quests[id]) quests[id] = { ...quests[id], status };
      }
      return { quests };
    }),

  setObjectiveStates: (data) =>
    set((state) => {
      const quests = { ...state.quests };
      for (const [id, objs] of Object.entries(data)) {
        if (quests[id]) {
          quests[id] = {
            ...quests[id],
            objectives: quests[id].objectives.map((o) => ({ ...o, isCompleted: objs[o.id] ?? o.isCompleted })),
          };
        }
      }
      return { quests };
    }),

  reset: () => set({ quests: createInitialQuests() }),
}));
