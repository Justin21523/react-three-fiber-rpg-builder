import { create } from 'zustand';
import type { EditorTrigger, EditorTriggerDisplayMode, EditorTriggerType } from '../types/editorTrigger';
import { createDefaultTrigger } from '../types/editorTrigger';
import { editorSpawn, useSceneEditStore } from './sceneEditStore';
import { objKey } from '../game/edit/sceneEditMerge';

// Kit — Editor world triggers (gates / exploration / item / dialogue / rest). Persisted to localStorage;
// read live by fireEditorTrigger + the renderer so a placed trigger is immediately active.
const STORAGE_KEY = 'r3f-rpg-builder-editor-trigger-v1';

interface PersistShape { triggers: EditorTrigger[]; firedOnce: Record<string, true>; }

function loadState(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<PersistShape>;
      return { triggers: Array.isArray(p.triggers) ? p.triggers : [], firedOnce: p.firedOnce && typeof p.firedOnce === 'object' ? p.firedOnce : {} };
    }
  } catch { /* ignore */ }
  return { triggers: [], firedOnce: {} };
}

interface EditorTriggerState extends PersistShape {
  selectedTriggerId: string | null;
  displayMode: EditorTriggerDisplayMode;
  lastFiredAt: Record<string, number>;
  addTrigger: (zoneId: string, triggerType: EditorTriggerType) => string;
  updateTrigger: (id: string, patch: Partial<EditorTrigger>) => void;
  removeTrigger: (id: string) => void;
  selectTrigger: (id: string | null) => void;
  setDisplayMode: (m: EditorTriggerDisplayMode) => void;
  moveToFocus: (id: string) => void;
  markFired: (id: string) => void;
  importState: (data: unknown) => void;
  reset: () => void;
}

export const useEditorTriggerStore = create<EditorTriggerState>((set) => ({
  ...loadState(),
  selectedTriggerId: null,
  displayMode: 'box',
  lastFiredAt: {},

  addTrigger: (zoneId, triggerType) => {
    const id = `etr_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
    const trigger = createDefaultTrigger(id, zoneId, triggerType, [editorSpawn.x, editorSpawn.y, editorSpawn.z]);
    set((s) => ({ triggers: [...s.triggers, trigger], selectedTriggerId: id }));
    // Auto-grab with the transform gizmo the moment it mounts (parity with addNpc).
    useSceneEditStore.setState({ pendingSelectKey: objKey(zoneId, 'trigger', id) });
    return id;
  },
  updateTrigger: (id, patch) => set((s) => ({ triggers: s.triggers.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeTrigger: (id) => set((s) => ({ triggers: s.triggers.filter((t) => t.id !== id), selectedTriggerId: s.selectedTriggerId === id ? null : s.selectedTriggerId })),
  selectTrigger: (id) => set({ selectedTriggerId: id }),
  setDisplayMode: (m) => set({ displayMode: m }),
  moveToFocus: (id) => set((s) => ({ triggers: s.triggers.map((t) => (t.id === id ? { ...t, position: [editorSpawn.x, editorSpawn.y, editorSpawn.z] } : t)) })),
  markFired: (id) => set((s) => ({ firedOnce: { ...s.firedOnce, [id]: true }, lastFiredAt: { ...s.lastFiredAt, [id]: Date.now() } })),
  importState: (data) => {
    if (!data || typeof data !== 'object') return;
    const p = data as Partial<PersistShape>;
    set({ triggers: Array.isArray(p.triggers) ? p.triggers : [], firedOnce: p.firedOnce && typeof p.firedOnce === 'object' ? p.firedOnce : {} });
  },
  reset: () => set({ triggers: [], firedOnce: {}, lastFiredAt: {}, selectedTriggerId: null }),
}));

let lastSerialized = JSON.stringify(loadState());
useEditorTriggerStore.subscribe((s) => {
  const serialized = JSON.stringify({ triggers: s.triggers, firedOnce: s.firedOnce });
  if (serialized === lastSerialized) return;
  lastSerialized = serialized;
  try { localStorage.setItem(STORAGE_KEY, serialized); } catch { /* ignore */ }
});

export function getEditorTrigger(id: string): EditorTrigger | undefined {
  return useEditorTriggerStore.getState().triggers.find((t) => t.id === id);
}
