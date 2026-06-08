import { create } from 'zustand';

// Kit — the single "selected editor world placement" shared by all DataBackedPlacement objects (activity
// participants / arena points, encounter markers, quest markers). Unlike sceneEditStore (which stores
// gizmo *overrides*), these placements write their moves straight back into their owning data store, so
// the editor's numeric fields, the gizmo, and the runtime all use the same position. One selection at a
// time; clicking a placement or pressing 📍 selects it; Escape (App) clears it.
interface WorldSelectState {
  selectedKey: string | null;
  select: (key: string | null) => void;
}

export const useWorldSelectStore = create<WorldSelectState>((set) => ({
  selectedKey: null,
  select: (key) => set({ selectedKey: key }),
}));
