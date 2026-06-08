import { create } from 'zustand';

export interface PlayerState {
  position: { x: number; y: number; z: number } | null;
  currentAreaId: string;
  spawnRequest: { x: number; y: number; z: number } | null;
  distanceTraveled: number;
  setPosition: (pos: { x: number; y: number; z: number }) => void;
  setCurrentAreaId: (id: string) => void;
  requestSpawn: (pos: { x: number; y: number; z: number }) => void;
  clearSpawnRequest: () => void;
  travelToArea: (areaId: string, spawnPoint: { x: number; y: number; z: number }) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  position: null,
  currentAreaId: 'area_field',
  spawnRequest: null,
  distanceTraveled: 0,
  setPosition: (pos) => {
    const prev = get().position;
    const delta = prev
      ? Math.sqrt((pos.x - prev.x) ** 2 + (pos.z - prev.z) ** 2)
      : 0;
    set({ position: pos, distanceTraveled: get().distanceTraveled + delta });
  },
  setCurrentAreaId: (id) => set({ currentAreaId: id }),
  requestSpawn: (pos) => set({ spawnRequest: pos }),
  clearSpawnRequest: () => set({ spawnRequest: null }),
  travelToArea: (areaId, spawnPoint) =>
    set({ currentAreaId: areaId, spawnRequest: spawnPoint }),
}));
