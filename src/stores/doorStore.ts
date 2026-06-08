import { create } from 'zustand';

// Kit — tracks which doors the player has unlocked (consume a key item → unlock). Read by dialogue
// conditions and the interaction handler.
interface DoorState {
  unlockedDoorIds: string[];
  unlockDoor: (doorId: string) => void;
  isUnlocked: (doorId: string) => boolean;
  setUnlockedDoorIds: (doorIds: string[]) => void;
  reset: () => void;
}

export const useDoorStore = create<DoorState>((set, get) => ({
  unlockedDoorIds: [],
  unlockDoor: (doorId) =>
    set((state) =>
      state.unlockedDoorIds.includes(doorId) ? state : { unlockedDoorIds: [...state.unlockedDoorIds, doorId] },
    ),
  isUnlocked: (doorId) => get().unlockedDoorIds.includes(doorId),
  setUnlockedDoorIds: (doorIds) => set({ unlockedDoorIds: [...new Set(doorIds)] }),
  reset: () => set({ unlockedDoorIds: [] }),
}));
