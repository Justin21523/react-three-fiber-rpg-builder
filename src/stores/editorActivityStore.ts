import { create } from 'zustand';
import type { ActivityDefinition } from '../types/activity';
import { useInventoryStore } from './inventoryStore';
import { useProgressionStore } from './progressionStore';
import { useFlagStore } from './flagStore';

// Kit — in-editor mini-game (activity) authoring. Activities merge into getActivity. Persisted.
interface EditorActivityState {
  activities: ActivityDefinition[];
  selectedId: string | null;
  newActivity: () => string;
  updateActivity: (id: string, patch: Partial<ActivityDefinition>) => void;
  removeActivity: (id: string) => void;
  selectActivity: (id: string | null) => void;
  importState: (data: { activities?: ActivityDefinition[] }) => void;
  reset: () => void;
}

const STORAGE_KEY = 'r3f-rpg-builder-editor-activity-v1';

function persist(activities: ActivityDefinition[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activities })); } catch { /* ignore */ }
}
function load(): ActivityDefinition[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const p = JSON.parse(raw); return Array.isArray(p.activities) ? p.activities : []; } } catch { /* ignore */ }
  return [];
}

export const useEditorActivityStore = create<EditorActivityState>((set, get) => ({
  activities: load(),
  selectedId: null,

  newActivity: () => {
    const id = `act_${Date.now().toString(36)}`;
    const a: ActivityDefinition = { id, name: 'New Mini-game', type: 'clicker', description: '', durationSec: 10, targetScore: 5, reward: { exp: 20 } };
    const activities = [...get().activities, a];
    set({ activities, selectedId: id }); persist(activities);
    return id;
  },
  updateActivity: (id, patch) => { const activities = get().activities.map((a) => (a.id === id ? { ...a, ...patch } : a)); set({ activities }); persist(activities); },
  removeActivity: (id) => { const activities = get().activities.filter((a) => a.id !== id); set({ activities, selectedId: get().selectedId === id ? null : get().selectedId }); persist(activities); },
  selectActivity: (id) => set({ selectedId: id }),
  importState: (data) => { const activities = data.activities ?? []; set({ activities }); persist(activities); },
  reset: () => { set({ activities: [] }); persist([]); },
}));

export function getEditorActivity(id: string): ActivityDefinition | undefined {
  return useEditorActivityStore.getState().activities.find((a) => a.id === id);
}

// Grant an activity's reward (items + exp + flags) on a win.
export function applyActivityRewards(a: ActivityDefinition): void {
  const r = a.reward;
  (r.items ?? []).forEach((it) => useInventoryStore.getState().addItem(it.itemId, it.quantity ?? 1));
  if (r.exp) useProgressionStore.getState().addExp(r.exp);
  (r.flags ?? []).forEach((f) => useFlagStore.getState().setFlag(f));
}
