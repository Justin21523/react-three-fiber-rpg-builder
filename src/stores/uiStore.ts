import { create } from 'zustand';

// Kit — central UI shell state: one modal panel open at a time, plus Edit Mode + the Editor Hub.
export type PanelId =
  | 'project'
  | 'assets'
  | 'environment'
  | 'sim'
  | 'graphics'
  | 'saveSlots'
  | 'contentFiles';

interface UiState {
  activePanel: PanelId | null;
  editMode: boolean;        // F1 — in-game Edit Mode (free-pan camera + transform gizmos)
  editorHubOpen: boolean;   // the tabbed Editor Hub
  hintsVisible: boolean;
  togglePanel: (id: PanelId) => void;
  openPanel: (id: PanelId) => void;
  closePanel: () => void;
  toggleEditMode: () => void;
  setEditMode: (on: boolean) => void;
  toggleEditorHub: () => void;
  toggleHints: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activePanel: null,
  editMode: false,
  editorHubOpen: false,
  hintsVisible: false,
  togglePanel: (id) => set((s) => ({ activePanel: s.activePanel === id ? null : id })),
  openPanel: (id) => set({ activePanel: id }),
  closePanel: () => set({ activePanel: null }),
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  setEditMode: (on) => set({ editMode: on }),
  toggleEditorHub: () => set((s) => ({ editorHubOpen: !s.editorHubOpen })),
  toggleHints: () => set((s) => ({ hintsVisible: !s.hintsVisible })),
}));
