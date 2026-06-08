import { create } from 'zustand';
import type { Combatant } from '../types/combat';
import type { EditorEncounter } from '../types/editorEncounter';
import { createDefaultEncounter } from '../types/editorEncounter';
import { editorSpawn } from './sceneEditStore';
import { useInventoryStore } from './inventoryStore';
import { useProgressionStore } from './progressionStore';
import { useFlagStore } from './flagStore';

// Kit — in-editor battle encounters + authored combatants. Encounters are resolved by
// startEditorEncounter; authored combatants merge into getCombatant. Persisted to localStorage.
interface EditorEncounterState {
  encounters: EditorEncounter[];
  combatants: Combatant[];
  selectedId: string | null;
  addEncounter: (zoneId: string) => string;
  updateEncounter: (id: string, patch: Partial<EditorEncounter>) => void;
  removeEncounter: (id: string) => void;
  selectEncounter: (id: string | null) => void;
  newCombatant: () => string;
  upsertCombatant: (c: Combatant) => void;
  removeCombatant: (id: string) => void;
  importState: (data: { encounters?: EditorEncounter[]; combatants?: Combatant[] }) => void;
  reset: () => void;
}

const STORAGE_KEY = 'r3f-rpg-builder-editor-encounter-v1';

function persist(s: Pick<EditorEncounterState, 'encounters' | 'combatants'>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ encounters: s.encounters, combatants: s.combatants })); } catch { /* ignore */ }
}
function load(): { encounters: EditorEncounter[]; combatants: Combatant[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { encounters: [], combatants: [] };
    const p = JSON.parse(raw);
    return { encounters: Array.isArray(p.encounters) ? p.encounters : [], combatants: Array.isArray(p.combatants) ? p.combatants : [] };
  } catch { return { encounters: [], combatants: [] }; }
}

export const useEditorEncounterStore = create<EditorEncounterState>((set, get) => ({
  ...load(),
  selectedId: null,

  addEncounter: (zoneId) => {
    const id = `enc_${Date.now().toString(36)}`;
    const enc = createDefaultEncounter(id, zoneId);
    // Spawn the encounter group at the camera focus point so its enemy models appear right in view.
    enc.position = [editorSpawn.x, editorSpawn.y, editorSpawn.z];
    const encounters = [...get().encounters, enc];
    set({ encounters, selectedId: id }); persist({ encounters, combatants: get().combatants });
    return id;
  },
  updateEncounter: (id, patch) => {
    const encounters = get().encounters.map((e) => (e.id === id ? { ...e, ...patch } : e));
    set({ encounters }); persist({ encounters, combatants: get().combatants });
  },
  removeEncounter: (id) => {
    const encounters = get().encounters.filter((e) => e.id !== id);
    set({ encounters, selectedId: get().selectedId === id ? null : get().selectedId }); persist({ encounters, combatants: get().combatants });
  },
  selectEncounter: (id) => set({ selectedId: id }),

  newCombatant: () => {
    const id = `cb_${Date.now().toString(36)}`;
    const c: Combatant = { id, name: 'New Foe', maxHp: 40, attack: 10, defense: 5, speed: 8, color: '#ef4444', skills: [] };
    const combatants = [...get().combatants, c];
    set({ combatants }); persist({ encounters: get().encounters, combatants });
    return id;
  },
  upsertCombatant: (c) => {
    const combatants = get().combatants.some((x) => x.id === c.id) ? get().combatants.map((x) => (x.id === c.id ? c : x)) : [...get().combatants, c];
    set({ combatants }); persist({ encounters: get().encounters, combatants });
  },
  removeCombatant: (id) => {
    const combatants = get().combatants.filter((c) => c.id !== id);
    set({ combatants }); persist({ encounters: get().encounters, combatants });
  },

  importState: (data) => {
    const next = { encounters: data.encounters ?? [], combatants: data.combatants ?? [] };
    set(next); persist(next);
  },
  reset: () => { set({ encounters: [], combatants: [] }); persist({ encounters: [], combatants: [] }); },
}));

// Non-hook accessors.
export function getEditorCombatant(id: string): Combatant | undefined {
  return useEditorEncounterStore.getState().combatants.find((c) => c.id === id);
}
export function getEditorEncounter(id: string | undefined): EditorEncounter | undefined {
  return id ? useEditorEncounterStore.getState().encounters.find((e) => e.id === id) : undefined;
}
export function getEditorEncounterByTrigger(triggerId: string): EditorEncounter | undefined {
  return useEditorEncounterStore.getState().encounters.find((e) => e.triggerId === triggerId);
}

// Grant an encounter's authored rewards (items + bonus exp + flags) on victory.
export function applyEncounterRewards(enc: EditorEncounter): void {
  const r = enc.rewards;
  if (!r) return;
  (r.itemIds ?? []).forEach((itemId) => useInventoryStore.getState().addItem(itemId, 1));
  if (r.bonusExp) useProgressionStore.getState().addExp(r.bonusExp);
  (r.worldFlags ?? []).forEach((f) => useFlagStore.getState().setFlag(f));
}
