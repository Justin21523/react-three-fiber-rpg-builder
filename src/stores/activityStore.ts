import { create } from 'zustand';
import type { ActivityDefinition } from '../types/activity';
import { getActivity } from '../data/activities';
import { applyActivityRewards } from './editorActivityStore';
import { useFlagStore } from './flagStore';
import { runQuestTracking } from '../game/quest/questTracking';

// Kit — runtime mini-game session. startActivity opens the overlay; the sim reports a final score to
// finish(); a win (score ≥ targetScore) grants the reward + sets activity_completed_<id> (drives
// completeActivity quest objectives).
interface ActivityState {
  isActive: boolean;
  activity: ActivityDefinition | null;
  phase: 'running' | 'result';
  score: number;
  won: boolean;
  startActivity: (id: string) => boolean;
  finish: (score: number) => void;
  close: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  isActive: false,
  activity: null,
  phase: 'running',
  score: 0,
  won: false,

  startActivity: (id) => {
    if (get().isActive) return false;
    const activity = getActivity(id);
    if (!activity) return false;
    set({ isActive: true, activity, phase: 'running', score: 0, won: false });
    return true;
  },
  finish: (score) => {
    const a = get().activity;
    if (!a) return;
    const won = score >= a.targetScore;
    if (won) {
      applyActivityRewards(a);
      useFlagStore.getState().setFlag(`activity_completed_${a.id}`);
      runQuestTracking();
    }
    set({ phase: 'result', score, won });
  },
  close: () => set({ isActive: false, activity: null, phase: 'running', score: 0, won: false }),
}));
