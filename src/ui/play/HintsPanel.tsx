import { useMemo } from 'react';
import { useQuestStore } from '../../stores/questStore';
import { useUiStore } from '../../stores/uiStore';
import { PanelCard } from './playShared';

// Kit — play-mode 💡 Hints: controls reference + the current quest objectives, so the player always knows
// what to do next. Toggled via uiStore.hintsVisible (its own flag, independent of the modal panels).
export const HintsPanel = () => {
  // Select the stable quests record, derive active with useMemo — selecting getActiveQuests() directly
  // returns a NEW array each render (uncached snapshot) → infinite render loop.
  const quests = useQuestStore((s) => s.quests);
  const active = useMemo(() => Object.values(quests).filter((q) => q.status === 'InProgress'), [quests]);
  return (
    <PanelCard title="Hints" icon="💡" onClose={() => useUiStore.getState().toggleHints()} width="24rem">
      <div className="space-y-2 text-xs">
        <div className="rounded bg-slate-900/60 p-2">
          <div className="mb-1 font-semibold text-slate-300">Controls</div>
          <p className="text-slate-400">WASD move · Space jump · E interact · F1 Edit Mode</p>
        </div>
        <div className="rounded bg-slate-900/60 p-2">
          <div className="mb-1 font-semibold text-slate-300">Active objectives</div>
          {active.length === 0 ? <p className="text-slate-500">No active quests. Talk to NPCs (▢E) to start one.</p> : (
            <ul className="space-y-1">
              {active.map((q) => (
                <li key={q.id}>
                  <div className="text-slate-200">• {q.title}</div>
                  <ul className="ml-3 text-[11px] text-slate-400">
                    {q.objectives.map((o) => <li key={o.id}>{o.isCompleted ? '✓' : '○'} {o.description}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PanelCard>
  );
};
