import { useState } from 'react';
import type { ReactNode } from 'react';
import type { QuestStatus } from '../../types/quest';
import { useWorldClockStore, formatClock } from '../../stores/worldClockStore';
import { useAudioStore } from '../../stores/audioStore';
import { useProgressionStore } from '../../stores/progressionStore';
import { useQuestStore } from '../../stores/questStore';
import { useFlagStore } from '../../stores/flagStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { getItem } from '../../data/items';
import { Field, inp, useItemOptions } from './editorShared';
import { IdSelect } from './idPickers';

const btn = 'rounded-md border px-2.5 py-1 text-xs font-semibold disabled:opacity-40';
const tones: Record<string, string> = {
  slate: 'border-slate-600 bg-slate-800/70 hover:bg-slate-700 text-slate-100',
  violet: 'border-violet-600/50 bg-violet-600/25 hover:bg-violet-600/35 text-violet-100',
  emerald: 'border-emerald-700/50 bg-emerald-700/20 hover:bg-emerald-700/30 text-emerald-100',
  amber: 'border-amber-700/50 bg-amber-700/15 hover:bg-amber-700/25 text-amber-100',
  red: 'border-red-700/50 bg-red-700/20 hover:bg-red-700/30 text-red-100',
};
const Btn = ({ onClick, children, tone = 'slate', disabled }: { onClick: () => void; children: ReactNode; tone?: keyof typeof tones; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled} className={`${btn} ${tones[tone]}`}>{children}</button>
);
const Head = ({ children }: { children: ReactNode }) => <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">{children}</h4>;

// ── World (time / weather / particles) ──────────────────────────────────────
const WorldSection = () => {
  const time = useWorldClockStore((s) => s.timeMinutes);
  const phase = useWorldClockStore((s) => s.timeOfDay);
  const weather = useWorldClockStore((s) => s.weather);
  const particlesEnabled = useAudioStore((s) => s.particlesEnabled);
  const density = useAudioStore((s) => s.particleDensity);
  return (
    <section className="space-y-2">
      <Head>World — {formatClock(time)} · {phase} · {weather}</Head>
      <div className="flex flex-wrap gap-1.5">
        <Btn onClick={() => useWorldClockStore.getState().advanceTime()}>⏭ Skip phase</Btn>
        <Btn onClick={() => useWorldClockStore.getState().cycleWeather()}>🌧 Cycle weather</Btn>
        <Btn tone={particlesEnabled ? 'emerald' : 'slate'} onClick={() => useAudioStore.getState().toggleParticles()}>✨ Particles {particlesEnabled ? 'on' : 'off'}</Btn>
        {particlesEnabled && (
          <select value={density} onChange={(e) => useAudioStore.getState().setParticleDensity(e.target.value as 'low' | 'medium' | 'high')} className="rounded bg-slate-800 px-1.5 py-1 text-[11px] text-slate-100">
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
          </select>
        )}
      </div>
    </section>
  );
};

// ── Player level / exp ──────────────────────────────────────────────────────
const PlayerSection = () => {
  const level = useProgressionStore((s) => s.level);
  const exp = useProgressionStore((s) => s.exp);
  const [lv, setLv] = useState(level);
  const [xp, setXp] = useState(exp);
  const apply = (nextLv: number, nextXp: number) => {
    const L = Math.max(1, nextLv), X = Math.max(0, nextXp);
    useProgressionStore.setState({ level: L, exp: X });
    setLv(L); setXp(X);
  };
  return (
    <section className="space-y-2">
      <Head>Player level / exp</Head>
      <div className="flex items-center gap-2 text-xs">
        <label className="flex items-center gap-1">Lv <input type="number" min={1} value={lv} onChange={(e) => setLv(parseInt(e.target.value, 10) || 1)} className="w-16 rounded bg-slate-800 px-1.5 py-0.5 text-right text-slate-100" /></label>
        <label className="flex items-center gap-1">EXP <input type="number" min={0} value={xp} onChange={(e) => setXp(parseInt(e.target.value, 10) || 0)} className="w-20 rounded bg-slate-800 px-1.5 py-0.5 text-right text-slate-100" /></label>
        <Btn tone="violet" onClick={() => apply(lv, xp)}>Apply</Btn>
      </div>
      <div className="flex gap-1.5"><Btn onClick={() => apply(1, 0)}>Lv 1</Btn><Btn onClick={() => apply(25, 0)}>Lv 25</Btn><Btn onClick={() => apply(50, 0)}>Lv 50</Btn></div>
      <p className="text-[11px] text-slate-500">Current: Lv {level} · {exp} exp</p>
    </section>
  );
};

// ── Quests ──────────────────────────────────────────────────────────────────
const QUEST_STATUSES: QuestStatus[] = ['NotStarted', 'InProgress', 'Completed', 'Failed'];
const QuestSection = () => {
  const quests = useQuestStore((s) => s.quests);
  const list = Object.values(quests);
  return (
    <section className="space-y-2">
      <Head>Quests · {list.length}</Head>
      <div className="flex gap-1.5">
        <Btn tone="emerald" onClick={() => useQuestStore.getState().setQuestStatuses(Object.fromEntries(list.map((q) => [q.id, 'Completed' as QuestStatus])))}>Complete all</Btn>
        <Btn tone="amber" onClick={() => useQuestStore.getState().setQuestStatuses(Object.fromEntries(list.map((q) => [q.id, 'NotStarted' as QuestStatus])))}>Reset all</Btn>
      </div>
      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {list.map((q) => (
          <div key={q.id} className="rounded bg-slate-900/50 px-2 py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate font-semibold text-slate-200">{q.title}</span>
              <select value={q.status} onChange={(e) => useQuestStore.getState().setQuestStatuses({ [q.id]: e.target.value as QuestStatus })} className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-100">
                {QUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {q.objectives.length > 0 && (
              <div className="mt-1 space-y-0.5 pl-1">
                {q.objectives.map((o) => (
                  <label key={o.id} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <input type="checkbox" checked={o.isCompleted} onChange={(e) => useQuestStore.getState().setObjectiveStates({ [q.id]: { [o.id]: e.target.checked } })} className="accent-violet-500" />
                    <span className="truncate">{o.description}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-[11px] text-slate-500">No quests registered.</p>}
      </div>
    </section>
  );
};

// ── Flags ───────────────────────────────────────────────────────────────────
const FlagSection = () => {
  const flags = useFlagStore((s) => s.flags);
  const set = Object.entries(flags).filter(([, v]) => v).map(([k]) => k);
  const [name, setName] = useState('');
  return (
    <section className="space-y-2">
      <Head>World flags · {set.length} set</Head>
      <div className="flex items-center gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="flag id" className={`flex-1 ${inp}`} />
        <Btn tone="emerald" disabled={!name.trim()} onClick={() => { useFlagStore.getState().setFlag(name.trim(), true); setName(''); }}>Set</Btn>
        <Btn tone="red" onClick={() => useFlagStore.getState().reset()}>Clear all</Btn>
      </div>
      <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
        {set.map((k) => (
          <span key={k} className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200">
            {k}<button onClick={() => useFlagStore.getState().setFlag(k, false)} className="text-red-300 hover:text-red-200">✕</button>
          </span>
        ))}
        {set.length === 0 && <span className="text-[11px] text-slate-500">No flags set.</span>}
      </div>
    </section>
  );
};

// ── Inventory ───────────────────────────────────────────────────────────────
const InventorySection = () => {
  const items = useInventoryStore((s) => s.items);
  const itemOptions = useItemOptions();
  const [pick, setPick] = useState<string | undefined>(undefined);
  const [qty, setQty] = useState(1);
  const entries = Object.entries(items).filter(([, n]) => n > 0);
  return (
    <section className="space-y-2">
      <Head>Inventory</Head>
      <div className="flex items-end gap-1.5">
        <Field label="item"><IdSelect value={pick} onChange={setPick} options={itemOptions} placeholder="(choose item)" /></Field>
        <label className="flex items-center gap-1 text-[11px] text-slate-400">×<input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))} className={`w-14 ${inp}`} /></label>
        <Btn tone="emerald" disabled={!pick} onClick={() => { if (pick) useInventoryStore.getState().addItem(pick, qty); }}>+ Add</Btn>
      </div>
      <div className="max-h-32 space-y-0.5 overflow-y-auto">
        {entries.map(([id, n]) => (
          <div key={id} className="flex items-center gap-1.5 text-[11px]">
            <span className="flex-1 truncate text-slate-300">{getItem(id)?.icon ?? '◆'} {getItem(id)?.name ?? id}</span>
            <span className="tabular-nums text-slate-400">×{n}</span>
            <button onClick={() => useInventoryStore.getState().removeItem(id, 1)} className="rounded px-1 text-slate-400 hover:bg-slate-800">−</button>
            <button onClick={() => useInventoryStore.getState().removeItem(id, n)} className="rounded px-1 text-red-300 hover:bg-red-700/30">✕</button>
          </div>
        ))}
        {entries.length === 0 && <p className="text-[11px] text-slate-500">Empty.</p>}
      </div>
    </section>
  );
};

// Kit — 🧪 Debug tab: a generic director console (world/time, player level, quest status board, flags,
// inventory). All changes hit the live stores and reflect immediately in play mode.
export const DebugTab = () => (
  <div className="space-y-4 text-sm">
    <WorldSection />
    <PlayerSection />
    <QuestSection />
    <FlagSection />
    <InventorySection />
  </div>
);
