import { create } from 'zustand';

// Kit — arbitrary boolean world flags (story progress, "talked to X", switches). Read/written by
// dialogue conditions & effects and the interaction handler. Generic; no game-specific keys.
interface FlagState {
  flags: Record<string, boolean>;
  setFlag: (key: string, value?: boolean) => void;
  hasFlag: (key: string) => boolean;
  setFlags: (flags: Record<string, boolean>) => void;
  reset: () => void;
}

export const useFlagStore = create<FlagState>((set, get) => ({
  flags: {},
  setFlag: (key, value = true) => set((state) => ({ flags: { ...state.flags, [key]: value } })),
  hasFlag: (key) => get().flags[key] === true,
  setFlags: (flags) => set({ flags }),
  reset: () => set({ flags: {} }),
}));
