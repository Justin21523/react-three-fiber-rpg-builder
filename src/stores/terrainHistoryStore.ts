import { create } from 'zustand';
import { useEditorEnvironmentStore } from './editorEnvironmentStore';
import type { TerrainConfig } from '../types/environmentOverride';

// Phase 98d/100 — undo+redo stack for terrain edits (sculpt / paint / region apply). Before each commit
// we push the area's PRE-edit terrain override; Ctrl+Z pops/restores it (pushing the current state onto
// the redo stack), Ctrl+Shift+Z/Ctrl+Y redoes. Snapshots reference the immutable override objects
// (setOverride always creates new ones), so no deep copy is needed. A new edit clears the redo stack.

interface Snapshot { areaId: string; terrain: TerrainConfig | undefined; }
const MAX = 40;
const curTerrain = (areaId: string): TerrainConfig | undefined => useEditorEnvironmentStore.getState().overrides[areaId]?.terrain;

interface TerrainHistoryState {
  past: Snapshot[];
  future: Snapshot[];
  push: (areaId: string) => void;
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;
}

export const useTerrainHistoryStore = create<TerrainHistoryState>((set, get) => ({
  past: [],
  future: [],
  push: (areaId) =>
    set((s) => ({ past: [...s.past, { areaId, terrain: curTerrain(areaId) }].slice(-MAX), future: [] })),
  undo: () => {
    const { past } = get();
    if (past.length === 0) return false;
    const snap = past[past.length - 1];
    set((s) => ({ past: s.past.slice(0, -1), future: [...s.future, { areaId: snap.areaId, terrain: curTerrain(snap.areaId) }].slice(-MAX) }));
    useEditorEnvironmentStore.getState().setOverride(snap.areaId, { terrain: snap.terrain });
    return true;
  },
  redo: () => {
    const { future } = get();
    if (future.length === 0) return false;
    const snap = future[future.length - 1];
    set((s) => ({ future: s.future.slice(0, -1), past: [...s.past, { areaId: snap.areaId, terrain: curTerrain(snap.areaId) }].slice(-MAX) }));
    useEditorEnvironmentStore.getState().setOverride(snap.areaId, { terrain: snap.terrain });
    return true;
  },
  clear: () => set({ past: [], future: [] }),
}));
