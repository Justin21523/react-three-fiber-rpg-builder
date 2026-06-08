import { useEffect, useRef, useState } from 'react';
import { useActivityStore } from '../stores/activityStore';
import type { ActivityDefinition } from '../types/activity';

// Kit — full-screen mini-game overlay. Runs one of three generic, playable sims by type and reports a
// final score to activityStore.finish(). Shown when an activity is active; gates the overworld HUD.
export const ActivityOverlay = () => {
  const isActive = useActivityStore((s) => s.isActive);
  const activity = useActivityStore((s) => s.activity);
  const phase = useActivityStore((s) => s.phase);
  const score = useActivityStore((s) => s.score);
  const won = useActivityStore((s) => s.won);

  if (!isActive || !activity) return null;
  const finish = (sc: number) => useActivityStore.getState().finish(sc);

  return (
    <div className="pointer-events-auto fixed inset-0 z-[90] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm text-slate-100">
      <div className="mb-3 text-center">
        <h2 className="text-xl font-bold text-cyan-200">{activity.name}</h2>
        <p className="text-xs text-slate-400">{activity.description}</p>
      </div>

      {phase === 'running' ? (
        activity.type === 'reaction' ? <Reaction onFinish={finish} />
          : activity.type === 'clicker' ? <Clicker activity={activity} onFinish={finish} />
            : <Memory activity={activity} onFinish={finish} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-violet-600/50 bg-violet-950/40 p-6">
          <span className={`text-2xl font-bold ${won ? 'text-emerald-300' : 'text-red-300'}`}>{won ? '🏆 Cleared!' : '✗ Try again'}</span>
          <span className="text-sm text-slate-300">Score {score} / target {activity.targetScore}</span>
          <button onClick={() => useActivityStore.getState().close()} className="rounded-md bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Close</button>
        </div>
      )}
    </div>
  );
};

// ── Reaction: click the instant it turns green (clicking early fails). ───────────────────────────────
const Reaction = ({ onFinish }: { onFinish: (score: number) => void }) => {
  const [state, setState] = useState<'wait' | 'go'>('wait');
  const startRef = useRef(0);
  useEffect(() => {
    const id = setTimeout(() => { setState('go'); startRef.current = performance.now(); }, 900 + Math.random() * 2600);
    return () => clearTimeout(id);
  }, []);
  const click = () => {
    if (state === 'wait') onFinish(0);
    else onFinish(1);
  };
  return (
    <button onClick={click} className={`flex h-64 w-96 items-center justify-center rounded-2xl text-2xl font-bold ${state === 'go' ? 'bg-emerald-500 text-slate-950' : 'bg-red-700 text-red-100'}`}>
      {state === 'go' ? 'CLICK!' : 'Wait for green…'}
    </button>
  );
};

// ── Clicker: click as many targets as possible before time runs out. ────────────────────────────────
const randomPos = () => ({ left: `${8 + Math.random() * 80}%`, top: `${8 + Math.random() * 80}%` });
const Clicker = ({ activity, onFinish }: { activity: ActivityDefinition; onFinish: (score: number) => void }) => {
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState(randomPos);
  const [time, setTime] = useState(activity.durationSec);
  const scoreRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => setTime((t) => { if (t <= 1) { clearInterval(id); onFinish(scoreRef.current); return 0; } return t - 1; }), 1000);
    return () => clearInterval(id);
  }, [onFinish]);
  const hit = () => { scoreRef.current += 1; setScore(scoreRef.current); setPos(randomPos()); };
  return (
    <div className="relative h-80 w-[32rem] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70">
      <div className="absolute left-2 top-2 z-10 text-sm font-semibold text-cyan-200">⏱ {time}s · 🎯 {score}</div>
      <button onClick={hit} className="absolute h-12 w-12 rounded-full bg-pink-500 shadow-lg transition-all hover:bg-pink-400" style={pos} />
    </div>
  );
};

// ── Memory: repeat the growing colour sequence. ─────────────────────────────────────────────────────
const COLORS = ['#ef4444', '#22d3ee', '#fbbf24', '#4ade80'];
const Memory = ({ activity, onFinish }: { activity: ActivityDefinition; onFinish: (score: number) => void }) => {
  const [seq, setSeq] = useState<number[]>([]);
  const [flash, setFlash] = useState(-1);
  const [accepting, setAccepting] = useState(false);
  const inputRef = useRef(0);
  const seqRef = useRef<number[]>([]);

  // Start a new round: append a step, then play the whole sequence back.
  useEffect(() => {
    const next = [...seqRef.current, Math.floor(Math.random() * COLORS.length)];
    seqRef.current = next; setSeq(next); setAccepting(false); inputRef.current = 0;
    let i = 0;
    const tick = () => {
      if (i >= next.length) { setFlash(-1); setAccepting(true); return; }
      setFlash(next[i]); i += 1;
      setTimeout(() => { setFlash(-1); setTimeout(tick, 220); }, 480);
    };
    const id = setTimeout(tick, 600);
    return () => clearTimeout(id);
  }, []);

  const press = (c: number) => {
    if (!accepting) return;
    if (c !== seqRef.current[inputRef.current]) { onFinish(seqRef.current.length - 1); return; }
    inputRef.current += 1;
    setFlash(c); setTimeout(() => setFlash(-1), 150);
    if (inputRef.current >= seqRef.current.length) {
      const score = seqRef.current.length;
      if (score >= activity.targetScore) { onFinish(score); return; }
      // next round
      setAccepting(false);
      setTimeout(() => {
        const next = [...seqRef.current, Math.floor(Math.random() * COLORS.length)];
        seqRef.current = next; setSeq(next); inputRef.current = 0;
        let i = 0;
        const tick = () => { if (i >= next.length) { setFlash(-1); setAccepting(true); return; } setFlash(next[i]); i += 1; setTimeout(() => { setFlash(-1); setTimeout(tick, 220); }, 480); };
        setTimeout(tick, 500);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs text-slate-400">Round {seq.length} · target {activity.targetScore} · {accepting ? 'your turn' : 'watch…'}</div>
      <div className="grid grid-cols-2 gap-2">
        {COLORS.map((c, i) => (
          <button key={i} onClick={() => press(i)} className="h-24 w-24 rounded-xl transition-all" style={{ backgroundColor: c, opacity: flash === i ? 1 : 0.45, transform: flash === i ? 'scale(1.05)' : 'none' }} />
        ))}
      </div>
    </div>
  );
};
