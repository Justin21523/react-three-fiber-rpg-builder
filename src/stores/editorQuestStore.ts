import { create } from 'zustand';
import type { Quest } from '../types/quest';
import type { Item } from '../types/item';
import { useQuestStore } from './questStore';

// Kit — in-editor Quest + Item authoring. Authored quests are registered into the runtime questStore
// (so the tracker / dialogue / turn-in all see them); authored items merge into getItem. Persisted to
// localStorage. Generic — rewards are item/exp/flag only (routed through questStore's onQuestReward).
interface EditorQuestState {
  quests: Quest[];
  items: Item[];
  newQuest: () => string;
  upsertQuest: (q: Quest) => void;
  removeQuest: (id: string) => void;
  newItem: () => string;
  upsertItem: (i: Item) => void;
  removeItem: (id: string) => void;
  load: (data: { quests?: Quest[]; items?: Item[] }) => void;
  reset: () => void;
}

const STORAGE_KEY = 'r3f-rpg-builder-editor-quest-v1';

function persist(s: Pick<EditorQuestState, 'quests' | 'items'>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ quests: s.quests, items: s.items })); } catch { /* ignore */ }
}
function load(): { quests: Quest[]; items: Item[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { quests: [], items: [] };
    const p = JSON.parse(raw);
    return { quests: p.quests ?? [], items: p.items ?? [] };
  } catch { return { quests: [], items: [] }; }
}

// Register all authored quests into the runtime questStore (source 'runtime'). Called on load + on edit.
export function syncEditorQuests(): void {
  for (const q of useEditorQuestStore.getState().quests) {
    if (!useQuestStore.getState().getQuestById(q.id)) useQuestStore.getState().registerRuntimeQuest(q);
  }
}

export const useEditorQuestStore = create<EditorQuestState>((set, get) => ({
  ...load(),

  newQuest: () => {
    const id = `quest_${Date.now().toString(36)}`;
    const q: Quest = {
      id, title: 'New Quest', description: 'Describe the quest…', status: 'NotStarted', source: 'runtime',
      objectives: [{ id: 'obj_1', description: 'First objective', isCompleted: false }],
      reward: { exp: 25 },
    };
    const quests = [...get().quests, q];
    set({ quests }); persist({ quests, items: get().items });
    useQuestStore.getState().registerRuntimeQuest(q);
    return id;
  },

  upsertQuest: (q) => {
    const quests = get().quests.some((x) => x.id === q.id) ? get().quests.map((x) => (x.id === q.id ? q : x)) : [...get().quests, q];
    set({ quests }); persist({ quests, items: get().items });
    useQuestStore.getState().registerRuntimeQuest(q);
  },

  removeQuest: (id) => {
    const quests = get().quests.filter((q) => q.id !== id);
    set({ quests }); persist({ quests, items: get().items });
  },

  newItem: () => {
    const id = `item_${Date.now().toString(36)}`;
    const i: Item = { id, name: 'New Item', description: '', icon: '◆' };
    const items = [...get().items, i];
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

  load: (data) => {
    const next = { quests: data.quests ?? [], items: data.items ?? [] };
    set(next); persist(next);
    next.quests.forEach((q) => useQuestStore.getState().registerRuntimeQuest(q));
  },

  reset: () => { set({ quests: [], items: [] }); persist({ quests: [], items: [] }); },
}));

export function getEditorItem(id: string): Item | undefined {
  return useEditorQuestStore.getState().items.find((i) => i.id === id);
}
export function getEditorItems(): Item[] {
  return useEditorQuestStore.getState().items;
}
