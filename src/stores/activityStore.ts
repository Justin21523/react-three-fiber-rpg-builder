import { create } from 'zustand';
import type { ActivityOutcome, EditorActivity } from '../types/activity';
import { getActivity } from '../data/activities';
import { applyActivityRewards } from './editorActivityStore';
import { useFlagStore } from './flagStore';
import { runQuestTracking } from '../game/quest/questTracking';

// Kit — runtime mini-game session. startActivity opens the activity (intro), begin() starts the in-world
// sim (ActivityRuntime, mounted in Scene), tick(dt) counts down + lets the mode controller drive score /
// objectives, finish(outcome) resolves it. A win grants the rewards + sets activity_completed_<id>
// (drives completeActivity quest objectives).
interface ActivityState {
  isActive: boolean;
  activity: EditorActivity | null;
  phase: 'intro' | 'running' | 'result';
  timeLeft: number;
  score: number;
  objectives: Record<string, number>; // objectiveId → current progress
  outcome: ActivityOutcome | null;

  startActivity: (id: string) => boolean;
  begin: () => void;
  tick: (dt: number) => void;
  addScore: (n: number) => void;
  setObjective: (id: string, value: number) => void;
  finish: (outcome: ActivityOutcome) => void;
  close: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  isActive: false,
  activity: null,
  phase: 'intro',
  timeLeft: 0,
  score: 0,
  objectives: {},
  outcome: null,

  startActivity: (id) => {
    if (get().isActive) return false;
    const activity = getActivity(id);
    if (!activity) return false;
    set({
      isActive: true, activity, phase: 'intro', timeLeft: activity.def.durationSeconds,
      score: 0, objectives: {}, outcome: null,
    });
    return true;
  },
  begin: () => { if (get().activity) set({ phase: 'running' }); },
  tick: (dt) => {
    const s = get();
    if (s.phase !== 'running') return;
    const timeLeft = Math.max(0, s.timeLeft - dt);
    set({ timeLeft });
    // Timeout resolves the activity — controllers may finish earlier on their own win/lose condition.
    if (timeLeft <= 0) {
      // surviveTime / enemyRush / collectionRush "win on timeout if any score"; others lose on timeout.
      const type = s.activity?.def.activityType;
      const survived = type === 'enemyRush' || type === 'collectionRush' || type === 'defenseZone' || type === 'bossPreparation';
      get().finish(survived ? 'win' : 'lose');
    }
  },
  addScore: (n) => set((s) => ({ score: s.score + n })),
  setObjective: (id, value) => set((s) => ({ objectives: { ...s.objectives, [id]: value } })),
  finish: (outcome) => {
    const a = get().activity;
    if (!a || get().phase === 'result') return;
    if (outcome === 'win') {
      applyActivityRewards(a);
      useFlagStore.getState().setFlag(`activity_completed_${a.def.id}`);
      runQuestTracking();
    }
    set({ phase: 'result', outcome });
  },
  close: () => set({ isActive: false, activity: null, phase: 'intro', timeLeft: 0, score: 0, objectives: {}, outcome: null }),
}));
