import { create } from 'zustand';
import { SEED_AREAS } from '../data/areas';

// Kit — tracks which areas the player has discovered (reached at least once). The starting area is
// discovered up front. Travel gates only let you walk to connected areas; discovery is what a map /
// fast-travel UI would read. Generic — no yokai/quest coupling.
const START_AREA_ID = SEED_AREAS[0]?.id ?? 'area_field';

interface WorldState {
  discoveredAreaIds: string[];
  discoverArea: (id: string) => void;
  isDiscovered: (id: string) => boolean;
  setDiscoveredAreaIds: (ids: string[]) => void;
  reset: () => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  discoveredAreaIds: [START_AREA_ID],
  discoverArea: (id) =>
    set((state) =>
      state.discoveredAreaIds.includes(id)
        ? state
        : { discoveredAreaIds: [...state.discoveredAreaIds, id] },
    ),
  isDiscovered: (id) => get().discoveredAreaIds.includes(id),
  setDiscoveredAreaIds: (ids) => set({ discoveredAreaIds: [...new Set(ids)] }),
  reset: () => set({ discoveredAreaIds: [START_AREA_ID] }),
}));
