import { create } from 'zustand';

// Phase 98d — ephemeral selection/gizmo state for PBR patches (which patch is selected + the gizmo
// mode). Read by PbrPatchLayer (renders a TransformControls on the selected patch) and the App key
// handler (Delete / Shift+D / W / E shortcuts when a patch is selected).
export type PbrPatchGizmoMode = 'translate' | 'rotate' | 'scale';

interface PbrPatchEditState {
  selectedId: string | null;
  mode: PbrPatchGizmoMode;
  select: (id: string | null) => void;
  setMode: (m: PbrPatchGizmoMode) => void;
}

export const usePbrPatchEditStore = create<PbrPatchEditState>((set) => ({
  selectedId: null,
  mode: 'translate',
  select: (selectedId) => set({ selectedId }),
  setMode: (mode) => set({ mode }),
}));
