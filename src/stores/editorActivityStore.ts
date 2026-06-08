import { create } from 'zustand';
import type {
  ActivityArena, ActivityObjective, ActivityParticipantSlot, ActivityReward, ActivitySlotRole,
  ActivityType, ArenaPointField, EditorActivity, Vec3Tuple,
} from '../types/activity';
import { ACTIVITY_SLOT_COLOR, createDefaultActivity, objectiveTypeFor, SINGLE_POINT_FIELDS } from '../types/activity';
import { editorSpawn } from './sceneEditStore';
import { useInventoryStore } from './inventoryStore';
import { useProgressionStore } from './progressionStore';
import { useFlagStore } from './flagStore';

// Kit — in-editor mini-game (activity) authoring, faithful to the original: full EditorActivity bundles
// (mode + arena + participants + objectives + rewards + per-mode config). Sub-edits act on the selected
// activity. `selectedPoint` drives the world gizmo (a placed participant or an arena point). Persisted;
// merges into getActivity().
export type SelectedActivityPoint = { field: ArenaPointField | 'participant'; index: number };

interface EditorActivityState {
  activities: EditorActivity[];
  selectedId: string | null;
  selectedPoint: SelectedActivityPoint | null;

  addActivity: (zoneId: string, type: ActivityType) => string;
  updateActivity: (id: string, patch: Partial<EditorActivity>) => void;
  removeActivity: (id: string) => void;
  duplicateActivity: (id: string) => void;
  selectActivity: (id: string | null) => void;

  // Sub-edits operate on the currently selected activity.
  addParticipant: (role: ActivitySlotRole) => void;
  updateParticipant: (index: number, patch: Partial<ActivityParticipantSlot>) => void;
  removeParticipant: (index: number) => void;

  addPoint: (field: ArenaPointField) => void;
  updatePoint: (field: ArenaPointField, index: number, pos: Vec3Tuple) => void;
  removePoint: (field: ArenaPointField, index: number) => void;
  setBounds: (patch: Partial<ActivityArena['bounds']>) => void;
  selectPoint: (p: SelectedActivityPoint | null) => void;

  setConfig: (patch: Record<string, unknown>) => void;

  addObjective: () => void;
  updateObjective: (index: number, patch: Partial<ActivityObjective>) => void;
  removeObjective: (index: number) => void;
  addReward: () => void;
  updateReward: (index: number, patch: Partial<ActivityReward>) => void;
  removeReward: (index: number) => void;

  importState: (data: { activities?: EditorActivity[] }) => void;
  reset: () => void;
}

const STORAGE_KEY = 'r3f-rpg-builder-editor-activity-v1';
const CONFIG_KEY: Record<ActivityType, keyof EditorActivity> = {
  race: 'raceConfig', itemRace: 'raceConfig', enemyRush: 'rushConfig', defenseZone: 'defenseConfig',
  collectionRush: 'collectionConfig', hideAndSeek: 'hideSeekConfig', bossPreparation: 'rushConfig',
};

function persist(activities: EditorActivity[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activities })); } catch { /* ignore */ }
}
function load(): EditorActivity[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p.activities)) return p.activities as EditorActivity[]; } } catch { /* ignore */ }
  return [];
}

export const useEditorActivityStore = create<EditorActivityState>((set, get) => {
  // Replace the selected activity via a producer fn, then persist.
  const mutate = (fn: (ea: EditorActivity) => EditorActivity) => {
    const id = get().selectedId;
    if (!id) return;
    const activities = get().activities.map((a) => (a.def.id === id ? fn(a) : a));
    set({ activities }); persist(activities);
  };
  // New participants / arena points spawn at the camera focus point (like placed models/triggers), so they
  // appear right where the user is looking — not at fixed world coords off-screen.
  const defaultPos = (): Vec3Tuple => [editorSpawn.x, editorSpawn.y, editorSpawn.z];

  return {
    activities: load(),
    selectedId: null,
    selectedPoint: null,

    addActivity: (zoneId, type) => {
      const ea = createDefaultActivity(zoneId, type);
      // Re-anchor the whole arena (bounds + points + participants) to the camera focus so it spawns in view.
      const sp: Vec3Tuple = [editorSpawn.x, editorSpawn.y, editorSpawn.z];
      const [cx, cy, cz] = ea.arena.bounds.center;
      const shift = (p: Vec3Tuple): Vec3Tuple => [p[0] - cx + sp[0], p[1] - cy + sp[1], p[2] - cz + sp[2]];
      ea.arena.bounds.center = sp;
      for (const f of Object.keys(ea.arena.points) as (keyof typeof ea.arena.points)[]) {
        ea.arena.points[f] = (ea.arena.points[f] ?? []).map(shift);
      }
      ea.participants = ea.participants.map((p) => ({ ...p, position: shift(p.position) }));
      const activities = [...get().activities, ea];
      set({ activities, selectedId: ea.def.id, selectedPoint: null }); persist(activities);
      return ea.def.id;
    },
    updateActivity: (id, patch) => {
      const activities = get().activities.map((a) => (a.def.id === id ? { ...a, ...patch } : a));
      set({ activities }); persist(activities);
    },
    removeActivity: (id) => {
      const activities = get().activities.filter((a) => a.def.id !== id);
      set({ activities, selectedId: get().selectedId === id ? null : get().selectedId, selectedPoint: null }); persist(activities);
    },
    duplicateActivity: (id) => {
      const src = get().activities.find((a) => a.def.id === id);
      if (!src) return;
      const nid = `eact_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
      const copy: EditorActivity = JSON.parse(JSON.stringify(src));
      copy.def = { ...copy.def, id: nid, title: `${src.def.title} (copy)` };
      copy.code = nid;
      const activities = [...get().activities, copy];
      set({ activities, selectedId: nid }); persist(activities);
    },
    selectActivity: (id) => set({ selectedId: id, selectedPoint: null }),

    addParticipant: (role) => mutate((ea) => {
      const slot: ActivityParticipantSlot = {
        id: `${ea.def.id}_p${ea.participants.length}_${Math.floor(Math.random() * 1e4)}`,
        role, level: ea.def.recommendedLevel, color: ACTIVITY_SLOT_COLOR[role], position: defaultPos(),
      };
      return { ...ea, participants: [...ea.participants, slot] };
    }),
    updateParticipant: (index, patch) => mutate((ea) => ({
      ...ea, participants: ea.participants.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    })),
    removeParticipant: (index) => mutate((ea) => ({ ...ea, participants: ea.participants.filter((_, i) => i !== index) })),

    addPoint: (field) => mutate((ea) => {
      const cur = ea.arena.points[field] ?? [];
      if (SINGLE_POINT_FIELDS.has(field) && cur.length >= 1) return ea;
      return { ...ea, arena: { ...ea.arena, points: { ...ea.arena.points, [field]: [...cur, defaultPos()] } } };
    }),
    updatePoint: (field, index, pos) => mutate((ea) => ({
      ...ea, arena: { ...ea.arena, points: { ...ea.arena.points, [field]: (ea.arena.points[field] ?? []).map((p, i) => (i === index ? pos : p)) } },
    })),
    removePoint: (field, index) => mutate((ea) => ({
      ...ea, arena: { ...ea.arena, points: { ...ea.arena.points, [field]: (ea.arena.points[field] ?? []).filter((_, i) => i !== index) } },
    })),
    setBounds: (patch) => mutate((ea) => ({ ...ea, arena: { ...ea.arena, bounds: { ...ea.arena.bounds, ...patch } } })),
    selectPoint: (p) => set({ selectedPoint: p }),

    setConfig: (patch) => mutate((ea) => {
      const key = CONFIG_KEY[ea.def.activityType];
      const cur = (ea[key] ?? {}) as Record<string, unknown>;
      return { ...ea, [key]: { ...cur, ...patch } };
    }),

    addObjective: () => mutate((ea) => ({
      ...ea, objectives: [...ea.objectives, { id: `${ea.def.id}_obj${ea.objectives.length}`, objectiveType: objectiveTypeFor(ea.def.activityType), description: '', targetValue: 1 }],
    })),
    updateObjective: (index, patch) => mutate((ea) => ({ ...ea, objectives: ea.objectives.map((o, i) => (i === index ? { ...o, ...patch } : o)) })),
    removeObjective: (index) => mutate((ea) => ({ ...ea, objectives: ea.objectives.filter((_, i) => i !== index) })),
    addReward: () => mutate((ea) => ({
      ...ea, rewards: [...ea.rewards, { id: `${ea.def.id}_rw${ea.rewards.length}`, rewardType: 'exp', exp: 20, quantity: 1 }],
    })),
    updateReward: (index, patch) => mutate((ea) => ({ ...ea, rewards: ea.rewards.map((r, i) => (i === index ? { ...r, ...patch } : r)) })),
    removeReward: (index) => mutate((ea) => ({ ...ea, rewards: ea.rewards.filter((_, i) => i !== index) })),

    importState: (data) => { const activities = data.activities ?? []; set({ activities, selectedId: null, selectedPoint: null }); persist(activities); },
    reset: () => { set({ activities: [], selectedId: null, selectedPoint: null }); persist([]); },
  };
});

export function getEditorActivity(id: string): EditorActivity | undefined {
  return useEditorActivityStore.getState().activities.find((a) => a.def.id === id);
}

// Grant an activity's rewards (item / exp / unlockFlag) on a win.
export function applyActivityRewards(ea: EditorActivity): void {
  for (const r of ea.rewards) {
    if (r.rewardType === 'item' && r.itemId) useInventoryStore.getState().addItem(r.itemId, r.quantity || 1);
    else if (r.rewardType === 'exp' && r.exp) useProgressionStore.getState().addExp(r.exp);
    else if (r.rewardType === 'unlockFlag' && r.unlockFlag) useFlagStore.getState().setFlag(r.unlockFlag);
  }
}
