import type { ActivityDefinition, ActivityType } from '../../types/activity';
import { ACTIVITY_TYPES } from '../../types/activity';
import { useEditorActivityStore } from '../../stores/editorActivityStore';
import { useActivityStore } from '../../stores/activityStore';
import { useUiStore } from '../../stores/uiStore';
import { Field, inp, csv, parseCsv, useItemOptions } from './editorShared';
import { IdMultiPicker } from './idPickers';
import { ModelPicker } from './ModelPicker';

const btn = 'rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700';

// Kit — the 🎮 Mini-games tab: activity list + inspector. Activities are playable DOM mini-games
// (reaction / clicker / memory); win when score ≥ targetScore, granting the reward.
export const ActivityEditorTab = () => {
  const activities = useEditorActivityStore((s) => s.activities);
  const selId = useEditorActivityStore((s) => s.selectedId);
  const select = useEditorActivityStore((s) => s.selectActivity);
  const sel = activities.find((a) => a.id === selId) ?? null;

  return (
    <div className="flex gap-3 text-xs">
      <div className="w-44 shrink-0 space-y-2">
        <button className={`w-full ${btn}`} onClick={() => useEditorActivityStore.getState().newActivity()}>+ New Mini-game</button>
        <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
          {activities.map((a) => (
            <button key={a.id} onClick={() => select(a.id)} className={`block w-full truncate rounded px-2 py-1 text-left ${selId === a.id ? 'bg-emerald-600/30 text-emerald-100' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}>
              {a.name} <span className="text-[9px] text-slate-500">· {a.type}</span>
            </button>
          ))}
          {activities.length === 0 && <p className="px-1 text-[10px] text-slate-500">No mini-games yet. Seed games (reaction/clicker/memory) are always available.</p>}
        </div>
      </div>
      <div className="min-w-0 flex-1">{sel ? <ActivityInspector a={sel} /> : <p className="text-[11px] text-slate-500">Select or create a mini-game.</p>}</div>
    </div>
  );
};

const ActivityInspector = ({ a }: { a: ActivityDefinition }) => {
  const update = useEditorActivityStore((s) => s.updateActivity);
  const remove = useEditorActivityStore((s) => s.removeActivity);
  const closeHub = useUiStore((s) => s.toggleEditorHub);
  const itemOptions = useItemOptions();
  const set = (patch: Partial<ActivityDefinition>) => update(a.id, patch);
  const r = a.reward;

  const test = () => { closeHub(); useActivityStore.getState().startActivity(a.id); };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 truncate text-base font-bold text-emerald-100">{a.name}</h3>
        <button onClick={test} className="rounded border border-violet-600/50 bg-violet-600/25 px-2 py-1 text-xs text-violet-100 hover:bg-violet-600/35">▶ Test</button>
        <button onClick={() => remove(a.id)} className="rounded border border-red-700/50 bg-red-700/15 px-2 py-1 text-xs text-red-200 hover:bg-red-700/25">🗑</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="name"><input value={a.name} onChange={(e) => set({ name: e.target.value })} className={inp} /></Field>
        <Field label="type">
          <select value={a.type} onChange={(e) => set({ type: e.target.value as ActivityType })} className={inp}>{ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        </Field>
        <Field label="durationSec"><input type="number" min={1} value={a.durationSec} onChange={(e) => set({ durationSec: parseInt(e.target.value, 10) || 1 })} className={inp} /></Field>
        <Field label="targetScore"><input type="number" min={1} value={a.targetScore} onChange={(e) => set({ targetScore: parseInt(e.target.value, 10) || 1 })} className={inp} /></Field>
        <Field label="description"><input value={a.description} onChange={(e) => set({ description: e.target.value })} className={`col-span-2 ${inp}`} /></Field>
        <Field label="display model (optional)"><ModelPicker value={a.modelAssetId} onChange={(v) => set({ modelAssetId: v })} /></Field>
      </div>

      <div className="rounded border border-amber-700/30 bg-amber-950/20 p-2">
        <div className="mb-1 text-[10px] font-bold uppercase text-amber-300">Reward (on win)</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="items"><IdMultiPicker ids={(r.items ?? []).map((i) => i.itemId)} onChange={(v) => set({ reward: { ...r, items: v.map((itemId) => ({ itemId, quantity: 1 })) } })} options={itemOptions} addLabel="+ item…" /></Field>
          <Field label="exp"><input type="number" min={0} value={r.exp ?? 0} onChange={(e) => set({ reward: { ...r, exp: parseInt(e.target.value, 10) || 0 } })} className={inp} /></Field>
          <Field label="flags (,)"><input value={csv(r.flags)} onChange={(e) => set({ reward: { ...r, flags: parseCsv(e.target.value) } })} className={`col-span-2 ${inp}`} /></Field>
        </div>
      </div>

      <p className="text-[10px] leading-snug text-slate-500">
        {a.type === 'reaction' ? 'Reaction: click the instant it turns green (target score 1 = succeed).'
          : a.type === 'clicker' ? 'Clicker: click targets for durationSec; score = hits (reach targetScore to win).'
            : 'Memory: repeat a growing colour sequence; score = rounds (reach targetScore to win).'}
      </p>
    </div>
  );
};
