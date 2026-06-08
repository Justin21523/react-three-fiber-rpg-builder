import { create } from 'zustand';
import type { Item } from '../types/item';
import type { EditorQuest, EditorObjective, EditorReward, EditorObjectiveType, EditorRewardType } from '../types/editorQuest';
import { createDefaultEditorQuest, makeObjective, makeReward } from '../types/editorQuest';
import { syncEditorQuests } from '../game/editor/editorQuestToQuest';

// Kit — in-editor Quest + Item authoring. Quests are rich EditorQuests; every mutation re-syncs them into
// the runtime questStore (objectives auto-track via the generic tracker; rewards via onQuestReward).
// Authored items merge into getItem. Persisted to localStorage.
interface EditorQuestState {
  quests: EditorQuest[];
  items: Item[];
  // quest CRUD
  newQuest: () => string;
  updateQuest: (id: string, patch: Partial<EditorQuest>) => void;
  removeQuest: (id: string) => void;
  duplicateQuest: (id: string) => string | null;
  // objectives
  addObjective: (questId: string, type?: EditorObjectiveType) => void;
  updateObjective: (questId: string, objId: string, patch: Partial<EditorObjective>) => void;
  removeObjective: (questId: string, objId: string) => void;
  moveObjective: (questId: string, objId: string, dir: -1 | 1) => void;
  // rewards
  addReward: (questId: string, type?: EditorRewardType) => void;
  updateReward: (questId: string, rewardId: string, patch: Partial<EditorReward>) => void;
  removeReward: (questId: string, rewardId: string) => void;
  // items
  newItem: () => string;
  upsertItem: (i: Item) => void;
  removeItem: (id: string) => void;
  // io
  importState: (data: { quests?: EditorQuest[]; items?: Item[] }) => void;
  reset: () => void;
}

const STORAGE_KEY = 'r3f-rpg-builder-editor-quest-v2';

function persist(s: Pick<EditorQuestState, 'quests' | 'items'>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ quests: s.quests, items: s.items })); } catch { /* ignore */ }
}
function load(): { quests: EditorQuest[]; items: Item[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { quests: [], items: [] };
    const p = JSON.parse(raw);
    return { quests: Array.isArray(p.quests) ? p.quests : [], items: Array.isArray(p.items) ? p.items : [] };
  } catch {
    return { quests: [], items: [] };
  }
}

export const useEditorQuestStore = create<EditorQuestState>((set, get) => {
  // Commit a new quest list: persist + re-sync into the runtime questStore.
  const commit = (quests: EditorQuest[]) => {
    set({ quests });
    persist({ quests, items: get().items });
    syncEditorQuests();
  };
  const patchQuest = (id: string, fn: (q: EditorQuest) => EditorQuest) =>
    commit(get().quests.map((q) => (q.id === id ? fn(q) : q)));

  return {
    ...load(),

    newQuest: () => {
      const id = `quest_${Date.now().toString(36)}`;
      commit([...get().quests, createDefaultEditorQuest(id)]);
      return id;
    },
    updateQuest: (id, patch) => patchQuest(id, (q) => ({ ...q, ...patch })),
    removeQuest: (id) => commit(get().quests.filter((q) => q.id !== id)),
    duplicateQuest: (id) => {
      const src = get().quests.find((q) => q.id === id);
      if (!src) return null;
      const nid = `quest_${Date.now().toString(36)}`;
      const copy: EditorQuest = { ...src, id: nid, code: `${src.code}_COPY`, title: `${src.title} (copy)`, objectives: src.objectives.map((o) => ({ ...o })), rewards: src.rewards.map((r) => ({ ...r })) };
      commit([...get().quests, copy]);
      return nid;
    },

    addObjective: (questId, type) => patchQuest(questId, (q) => ({ ...q, objectives: [...q.objectives, makeObjective(type)] })),
    updateObjective: (questId, objId, patch) => patchQuest(questId, (q) => ({ ...q, objectives: q.objectives.map((o) => (o.id === objId ? { ...o, ...patch } : o)) })),
    removeObjective: (questId, objId) => patchQuest(questId, (q) => ({ ...q, objectives: q.objectives.filter((o) => o.id !== objId) })),
    moveObjective: (questId, objId, dir) => patchQuest(questId, (q) => {
      const i = q.objectives.findIndex((o) => o.id === objId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= q.objectives.length) return q;
      const objectives = [...q.objectives];
      [objectives[i], objectives[j]] = [objectives[j], objectives[i]];
      return { ...q, objectives };
    }),

    addReward: (questId, type) => patchQuest(questId, (q) => ({ ...q, rewards: [...q.rewards, makeReward(type)] })),
    updateReward: (questId, rewardId, patch) => patchQuest(questId, (q) => ({ ...q, rewards: q.rewards.map((r) => (r.id === rewardId ? { ...r, ...patch } : r)) })),
    removeReward: (questId, rewardId) => patchQuest(questId, (q) => ({ ...q, rewards: q.rewards.filter((r) => r.id !== rewardId) })),

    newItem: () => {
      const id = `item_${Date.now().toString(36)}`;
      const items = [...get().items, { id, name: 'New Item', description: '', icon: '◆' } as Item];
      set({ items }); persist({ quests: get().quests, items });
      return id;
    },
    upsertItem: (i) => {
      const items = get().items.some((x) => x.id === i.id) ? get().items.map((x) => (x.id === i.id ? i : x)) : [...get().items, i];
      set({ items }); persist({ quests: get().quests, items });
    },
    removeItem: (id) => {
      const items = get().items.filter((i) => i.id !== id);
      set({ items }); persist({ quests: get().quests, items });
    },

    importState: (data) => {
      const next = { quests: data.quests ?? [], items: data.items ?? [] };
      set(next); persist(next); syncEditorQuests();
    },
    reset: () => { set({ quests: [], items: [] }); persist({ quests: [], items: [] }); },
  };
});

export function getEditorItem(id: string): Item | undefined {
  return useEditorQuestStore.getState().items.find((i) => i.id === id);
}
export function getEditorItems(): Item[] {
  return useEditorQuestStore.getState().items;
}
