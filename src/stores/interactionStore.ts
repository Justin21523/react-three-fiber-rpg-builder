import { create } from 'zustand';

// Kit — the single "what is the player standing next to" slot. World objects (gates, NPCs, items,
// doors) wrap themselves in a sensor collider that calls setTarget on enter / clearTarget on exit; the
// InteractionHandler reads this on [E]. Generic target types only (no yokai/encounter).
export type InteractionTargetType = 'npc' | 'door' | 'item' | 'gate' | 'editorTrigger';

interface InteractionState {
  currentTargetId: string | null;
  targetType: InteractionTargetType | null;
  actionLabel: string;
  setTarget: (id: string, type: InteractionTargetType, label: string) => void;
  clearTarget: (id: string) => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  currentTargetId: null,
  targetType: null,
  actionLabel: '',
  setTarget: (id, type, label) => set({ currentTargetId: id, targetType: type, actionLabel: label }),
  clearTarget: (id) =>
    set((state) =>
      state.currentTargetId === id ? { currentTargetId: null, targetType: null, actionLabel: '' } : {},
    ),
}));
