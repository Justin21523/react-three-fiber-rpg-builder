import { useEffect } from 'react';
import { useActivityStore } from '../stores/activityStore';
import { ACTIVITY_TYPE_LABEL } from '../types/activity';

// Kit — DOM HUD layered over the 3D arena. Intro card (Start) → running HUD (timer / score / objective
// progress) → result banner (win/lose + granted rewards). The in-world sim (ActivityRuntime, 7R-D) drives
// tick(dt) + score/objectives; until then this HUD owns a fallback countdown so the flow is testable.
export const ActivityHud = () => {
  const isActive = useActivityStore((s) => s.isActive);
  const activity = useActivityStore((s) => s.activity);
  const phase = useActivityStore((s) => s.phase);
  const timeLeft = useActivityStore((s) => s.timeLeft);
  const score = useActivityStore((s) => s.score);
  const objectives = useActivityStore((s) => s.objectives);
  const outcome = useActivityStore((s) => s.outcome);

  // Fallback countdown (removed once ActivityRuntime drives tick from useFrame).
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => useActivityStore.getState().tick(0.25), 250);
    return () => clearInterval(id);
  }, [phase]);

  if (!isActive || !activity) return null;
  const d = activity.def;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex flex-col items-center text-slate-100">
      {phase === 'intro' && (
        <div className="pointer-events-auto m-auto flex w-[26rem] flex-col gap-3 rounded-2xl border border-teal-600/50 bg-slate-950/90 p-5 backdrop-blur">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-xl font-bold text-teal-200">{d.title}</h2>
            <span className="rounded bg-teal-900/50 px-2 py-0.5 text-[11px] text-teal-200">{ACTIVITY_TYPE_LABEL[d.activityType]}</span>
          </div>
          {d.description && <p className="text-sm text-slate-300">{d.description}</p>}
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-2 text-xs">
            <div className="mb-1 font-semibold text-slate-400">Objectives</div>
            <ul className="space-y-0.5 text-slate-200">
              {activity.objectives.map((o) => <li key={o.id}>• {o.description || o.objectiveType} {o.targetValue > 1 ? `(×${o.targetValue})` : ''}</li>)}
            </ul>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>⏱ {d.durationSeconds}s</span><span>· Lv {d.recommendedLevel}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => useActivityStore.getState().begin()} className="flex-1 rounded-lg bg-teal-500 py-2 text-sm font-bold text-slate-950 hover:bg-teal-300">▶ Start</button>
            <button onClick={() => useActivityStore.getState().close()} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <div className="pointer-events-auto mt-4 flex flex-col items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-950/80 px-5 py-2 backdrop-blur">
          <div className="flex items-center gap-5 text-sm font-semibold">
            <span className="text-cyan-200">{d.title}</span>
            <span className="text-amber-200">⏱ {Math.ceil(timeLeft)}s</span>
            <span className="text-emerald-200">🎯 {score}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-[11px]">
            {activity.objectives.map((o) => {
              const cur = objectives[o.id] ?? 0;
              return <span key={o.id} className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">{o.description || o.objectiveType}: {cur}/{o.targetValue}</span>;
            })}
          </div>
          <div className="flex gap-2 text-[11px]">
            <button onClick={() => useActivityStore.getState().finish('win')} className="rounded border border-emerald-700/50 bg-emerald-700/20 px-2 py-0.5 text-emerald-100 hover:bg-emerald-700/30">✓ Complete</button>
            <button onClick={() => useActivityStore.getState().finish('lose')} className="rounded border border-red-700/50 bg-red-700/20 px-2 py-0.5 text-red-200 hover:bg-red-700/30">✗ Forfeit</button>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="pointer-events-auto m-auto flex w-[24rem] flex-col items-center gap-3 rounded-2xl border border-violet-600/50 bg-slate-950/90 p-6 backdrop-blur">
          <span className={`text-2xl font-bold ${outcome === 'win' ? 'text-emerald-300' : 'text-red-300'}`}>{outcome === 'win' ? '🏆 Cleared!' : '✗ Failed'}</span>
          <span className="text-sm text-slate-300">Score {score}</span>
          {outcome === 'win' && activity.rewards.length > 0 && (
            <div className="text-center text-xs text-amber-200">
              Rewards: {activity.rewards.map((r) => r.rewardType === 'exp' ? `${r.exp} EXP` : r.rewardType === 'item' ? `${r.itemId} ×${r.quantity}` : `flag ${r.unlockFlag}`).join(' · ')}
            </div>
          )}
          <button onClick={() => useActivityStore.getState().close()} className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Close</button>
        </div>
      )}
    </div>
  );
};
