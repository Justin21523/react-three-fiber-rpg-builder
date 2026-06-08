import { create } from 'zustand';

// Kit — minimal player progression (level + experience). The yokai game tracked per-yokai friendship
// exp here too; that was removed. Level curve: each level needs level*100 exp. Swap the curve freely.
const expForLevel = (level: number): number => level * 100;

interface ProgressionState {
  level: number;
  exp: number;
  addExp: (amount: number) => void;
  reset: () => void;
}

export const useProgressionStore = create<ProgressionState>((set, get) => ({
  level: 1,
  exp: 0,
  addExp: (amount) => {
    if (amount <= 0) return;
    let { level, exp } = get();
    exp += amount;
    while (exp >= expForLevel(level)) {
      exp -= expForLevel(level);
      level += 1;
    }
    set({ level, exp });
  },
  reset: () => set({ level: 1, exp: 0 }),
}));
