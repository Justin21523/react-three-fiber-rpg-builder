import { useMemo, useState } from 'react';
import type {
  ActivityObjective, ActivityParticipantSlot, ActivityReward, ActivityType, EditorActivity, Vec3Tuple,
} from '../../types/activity';
import {
  ACTIVITY_SLOT_COLOR, ACTIVITY_SLOT_ROLES, ACTIVITY_TYPE_LABEL, ACTIVITY_TYPES, ARENA_POINT_COLOR,
  ARENA_POINT_LABEL, OBJECTIVE_TYPES, REWARD_TYPES, pointFieldsForType, SINGLE_POINT_FIELDS,
} from '../../types/activity';
import { useEditorActivityStore } from '../../stores/editorActivityStore';
import { useEditorEncounterStore } from '../../stores/editorEncounterStore';
import { SEED_COMBATANTS } from '../../data/combatants';
import { useActivityStore } from '../../stores/activityStore';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useWorldSelectStore } from '../../stores/worldSelectStore';
import { useUiStore } from '../../stores/uiStore';
import { Field, inp, lbl, csv, parseCsv, useItemOptions, useAreaOptions } from './editorShared';
import { IdSelect, IdMultiPicker } from './idPickers';
import type { IdOption } from './idPickers';
import { ModelPicker } from './ModelPicker';
import { AnimationPicker } from './AnimationPicker';

const btn = 'rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700';
const num = 'w-full rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-100';
const CONFIG_KEY: Record<ActivityType, keyof EditorActivity> = {
  race: 'raceConfig', itemRace: 'raceConfig', enemyRush: 'rushConfig', defenseZone: 'defenseConfig',
  collectionRush: 'collectionConfig', hideAndSeek: 'hideSeekConfig', bossPreparation: 'rushConfig',
};

// Numeric / boolean / combatant-list config fields per mode (drives the Mode sub-tab).
type NumF = { key: string; label: string; step?: number };
const MODE_NUM: Record<ActivityType, NumF[]> = {
  race: [{ key: 'lapCount', label: 'laps' }, { key: 'zoneRadius', label: 'zone radius', step: 0.1 }, { key: 'baseSpeed', label: 'base speed', step: 0.5 }, { key: 'boostMult', label: 'boost ×', step: 0.1 }, { key: 'slowMult', label: 'slow ×', step: 0.1 }],
  itemRace: [{ key: 'lapCount', label: 'laps' }, { key: 'zoneRadius', label: 'zone radius', step: 0.1 }, { key: 'baseSpeed', label: 'base speed', step: 0.5 }, { key: 'boostMult', label: 'boost ×', step: 0.1 }, { key: 'slowMult', label: 'slow ×', step: 0.1 }],
  enemyRush: [{ key: 'durationSeconds', label: 'duration s' }, { key: 'maxActiveEnemies', label: 'max active' }, { key: 'spawnIntervalSeconds', label: 'spawn every s', step: 0.5 }, { key: 'eliteChance', label: 'elite chance', step: 0.05 }, { key: 'scoreNormal', label: 'score normal' }, { key: 'scoreElite', label: 'score elite' }, { key: 'comboStep', label: 'combo step' }, { key: 'enemyHpScale', label: 'enemy hp ×', step: 0.1 }, { key: 'moveSpeed', label: 'enemy speed', step: 0.5 }],
  defenseZone: [{ key: 'coreHp', label: 'core hp' }, { key: 'waveCount', label: 'waves' }, { key: 'enemiesPerWave', label: 'per wave' }, { key: 'waveIntervalSeconds', label: 'wave every s' }, { key: 'enemyHpScale', label: 'enemy hp ×', step: 0.1 }, { key: 'moveSpeed', label: 'enemy speed', step: 0.5 }, { key: 'enemyCoreDamage', label: 'core dmg' }],
  collectionRush: [{ key: 'durationSeconds', label: 'duration s' }, { key: 'maxActiveItems', label: 'max items' }, { key: 'spawnIntervalSeconds', label: 'spawn every s', step: 0.5 }, { key: 'initialItems', label: 'initial' }, { key: 'collectRadius', label: 'collect radius', step: 0.1 }, { key: 'scoreNormal', label: 'score normal' }, { key: 'scoreRare', label: 'score rare' }, { key: 'scoreTrap', label: 'score trap' }, { key: 'rareChance', label: 'rare chance', step: 0.05 }, { key: 'trapChance', label: 'trap chance', step: 0.05 }],
  hideAndSeek: [{ key: 'durationSeconds', label: 'duration s' }, { key: 'findRadius', label: 'find radius', step: 0.1 }, { key: 'hintRadius', label: 'hint radius', step: 0.5 }, { key: 'scorePerTarget', label: 'score / target' }, { key: 'targetCount', label: 'targets' }],
  bossPreparation: [],
};
const MODE_BOOL: Partial<Record<ActivityType, { key: string; label: string }[]>> = {
  race: [{ key: 'allowItems', label: 'allow items' }], itemRace: [{ key: 'allowItems', label: 'allow items' }],
};
const MODE_COMBATANTS: Partial<Record<ActivityType, { key: string; label: string }[]>> = {
  enemyRush: [{ key: 'combatantIds', label: 'enemy combatants' }, { key: 'eliteCombatantIds', label: 'elite combatants' }],
  defenseZone: [{ key: 'combatantIds', label: 'enemy combatants' }],
};

function useCombatantOptions(): IdOption[] {
  const editor = useEditorEncounterStore((s) => s.combatants);
  return useMemo(() => [
    ...editor.map((c) => ({ id: c.id, label: c.name })),
    ...SEED_COMBATANTS.map((c) => ({ id: c.id, label: `${c.name} (seed)` })),
  ], [editor]);
}

type Tab = 'overview' | 'mode' | 'arena' | 'objectives' | 'rewards' | 'participants';

// Kit — the 🎮 Mini-games tab: palette (game modes) + activity list + faithful inspector with sub-tabs.
export const ActivityEditorTab = () => {
  const activities = useEditorActivityStore((s) => s.activities);
  const selId = useEditorActivityStore((s) => s.selectedId);
  const select = useEditorActivityStore((s) => s.selectActivity);
  const add = useEditorActivityStore((s) => s.addActivity);
  const area = usePlayerStore((s) => s.currentAreaId);
  const sel = activities.find((a) => a.def.id === selId) ?? null;

  return (
    <div className="flex gap-3 text-xs">
      <div className="w-48 shrink-0 space-y-2">
        <div>
          <div className={lbl}>+ New (mode)</div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {ACTIVITY_TYPES.map((t) => (
              <button key={t} onClick={() => add(area, t)} className={btn} title={`New ${ACTIVITY_TYPE_LABEL[t]}`}>{ACTIVITY_TYPE_LABEL[t]}</button>
            ))}
          </div>
        </div>
        <div className="max-h-[58vh] space-y-0.5 overflow-y-auto">
          {activities.map((a) => (
            <button key={a.def.id} onClick={() => select(a.def.id)} className={`block w-full truncate rounded px-2 py-1 text-left ${selId === a.def.id ? 'bg-emerald-600/30 text-emerald-100' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}>
              {a.def.title} <span className="text-[9px] text-slate-500">· {ACTIVITY_TYPE_LABEL[a.def.activityType]}</span>
            </button>
          ))}
          {activities.length === 0 && <p className="px-1 text-[10px] text-slate-500">No mini-games yet. Pick a mode above, or use the seed games.</p>}
        </div>
      </div>
      <div className="min-w-0 flex-1">{sel ? <ActivityInspector ea={sel} /> : <p className="text-[11px] text-slate-500">Select or create a mini-game.</p>}</div>
    </div>
  );
};

const ActivityInspector = ({ ea }: { ea: EditorActivity }) => {
  const remove = useEditorActivityStore((s) => s.removeActivity);
  const dup = useEditorActivityStore((s) => s.duplicateActivity);
  const closeHub = useUiStore((s) => s.toggleEditorHub);
  const [tab, setTab] = useState<Tab>('overview');
  const [msg, setMsg] = useState<string | null>(null);
  const d = ea.def;

  const test = () => { closeHub(); useActivityStore.getState().startActivity(d.id); };
  const placeTrigger = () => {
    const id = useEditorTriggerStore.getState().addTrigger(d.zoneId, 'activityTrigger');
    useEditorTriggerStore.getState().updateTrigger(id, { activity: { activityId: d.id } });
    setMsg('Placed an activityTrigger (adjust position/conditions in ⚡ Triggers).');
  };
  const warnings = [
    ea.participants.length === 0 ? 'no participants placed' : '',
    ea.objectives.length === 0 ? 'no objectives' : '',
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 truncate text-base font-bold text-emerald-100">{d.title}</h3>
        <span className="rounded bg-teal-900/40 px-1.5 py-0.5 text-[10px] text-teal-200">{ACTIVITY_TYPE_LABEL[d.activityType]}</span>
        <button onClick={test} className="rounded border border-violet-600/50 bg-violet-600/25 px-2 py-1 text-xs text-violet-100 hover:bg-violet-600/35">▶ Test</button>
        <button onClick={placeTrigger} title="Place an activityTrigger linked to this activity" className="rounded border border-amber-700/50 bg-amber-700/15 px-2 py-1 text-xs text-amber-100 hover:bg-amber-700/25">⚡ Trigger</button>
        <button onClick={() => dup(d.id)} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700">⎘</button>
        <button onClick={() => remove(d.id)} className="rounded border border-red-700/50 bg-red-700/15 px-2 py-1 text-xs text-red-200 hover:bg-red-700/25">🗑</button>
      </div>
      {warnings.length > 0 && <div className="rounded border border-amber-700/50 bg-amber-900/20 px-2 py-1 text-[11px] text-amber-200">⚠ {warnings.join(' · ')}</div>}
      {msg && <p className="rounded bg-slate-900/60 px-2 py-1 text-[11px] text-slate-300">{msg}</p>}

      <div className="flex flex-wrap gap-1.5">
        {(['overview', 'mode', 'arena', 'objectives', 'rewards', 'participants'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded px-2.5 py-1 text-xs font-semibold capitalize ${tab === t ? 'bg-violet-600/30 text-violet-100' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab ea={ea} />}
      {tab === 'mode' && <ModeTab ea={ea} />}
      {tab === 'arena' && <ArenaTab ea={ea} />}
      {tab === 'objectives' && <ObjectivesTab ea={ea} />}
      {tab === 'rewards' && <RewardsTab ea={ea} />}
      {tab === 'participants' && <ParticipantsTab ea={ea} />}
    </div>
  );
};

// ── Overview ─────────────────────────────────────────────────────────────────
const OverviewTab = ({ ea }: { ea: EditorActivity }) => {
  const update = useEditorActivityStore((s) => s.updateActivity);
  const areaOptions = useAreaOptions();
  const d = ea.def;
  const setDef = (patch: Partial<typeof d>) => update(d.id, { def: { ...d, ...patch } });
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="title"><input value={d.title} onChange={(e) => setDef({ title: e.target.value })} className={inp} /></Field>
      <Field label="code"><input value={ea.code ?? ''} onChange={(e) => update(d.id, { code: e.target.value })} className={inp} /></Field>
      <Field label="zone (area)"><IdSelect value={d.zoneId} onChange={(v) => setDef({ zoneId: v ?? d.zoneId })} options={areaOptions} /></Field>
      <Field label="recommendedLevel"><input type="number" min={1} value={d.recommendedLevel} onChange={(e) => setDef({ recommendedLevel: parseInt(e.target.value, 10) || 1 })} className={inp} /></Field>
      <Field label="durationSeconds"><input type="number" min={1} value={d.durationSeconds} onChange={(e) => setDef({ durationSeconds: parseInt(e.target.value, 10) || 1 })} className={inp} /></Field>
      <Field label="min participants"><input type="number" min={1} value={d.minParticipants} onChange={(e) => setDef({ minParticipants: parseInt(e.target.value, 10) || 1 })} className={inp} /></Field>
      <Field label="max participants"><input type="number" min={1} value={d.maxParticipants} onChange={(e) => setDef({ maxParticipants: parseInt(e.target.value, 10) || 1 })} className={inp} /></Field>
      <Field label="description"><input value={d.description} onChange={(e) => setDef({ description: e.target.value })} className={`col-span-2 ${inp}`} /></Field>
      <Field label="tags (,)"><input value={csv(d.tags)} onChange={(e) => setDef({ tags: parseCsv(e.target.value) })} className={`col-span-2 ${inp}`} /></Field>
    </div>
  );
};

// ── Mode config ──────────────────────────────────────────────────────────────
const ModeTab = ({ ea }: { ea: EditorActivity }) => {
  const setConfig = useEditorActivityStore((s) => s.setConfig);
  const combatantOptions = useCombatantOptions();
  const type = ea.def.activityType;
  const cfg = (ea[CONFIG_KEY[type]] ?? {}) as Record<string, unknown>;
  const nums = MODE_NUM[type];
  const bools = MODE_BOOL[type] ?? [];
  const combatants = MODE_COMBATANTS[type] ?? [];
  if (nums.length === 0 && bools.length === 0 && combatants.length === 0) {
    return <p className="text-[11px] text-slate-500">No extra parameters for {ACTIVITY_TYPE_LABEL[type]} — uses the survive timer + objectives.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {nums.map((f) => (
          <label key={f.key} className="flex flex-col gap-0.5"><span className={lbl}>{f.label}</span>
            <input type="number" step={f.step ?? 1} value={Number(cfg[f.key] ?? 0)} onChange={(e) => setConfig({ [f.key]: parseFloat(e.target.value) || 0 })} className={num} />
          </label>
        ))}
      </div>
      {bools.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {bools.map((b) => (
            <label key={b.key} className="flex items-center gap-1.5 text-xs text-slate-300"><input type="checkbox" checked={Boolean(cfg[b.key])} onChange={(e) => setConfig({ [b.key]: e.target.checked })} className="accent-emerald-500" />{b.label}</label>
          ))}
        </div>
      )}
      {combatants.map((c) => (
        <Field key={c.key} label={c.label}>
          <IdMultiPicker ids={(cfg[c.key] as string[]) ?? []} onChange={(v) => setConfig({ [c.key]: v })} options={combatantOptions} addLabel="+ combatant…" />
        </Field>
      ))}
    </div>
  );
};

// ── Arena ────────────────────────────────────────────────────────────────────
const Vec3Row = ({ v, onChange }: { v: Vec3Tuple; onChange: (v: Vec3Tuple) => void }) => (
  <div className="flex gap-1">
    {(['x', 'y', 'z'] as const).map((axis, i) => (
      <input key={axis} type="number" step={0.5} value={v[i]} onChange={(e) => { const nv = [...v] as Vec3Tuple; nv[i] = parseFloat(e.target.value) || 0; onChange(nv); }} className={num} title={axis} />
    ))}
  </div>
);
const ArenaTab = ({ ea }: { ea: EditorActivity }) => {
  const store = useEditorActivityStore;
  const selectedPoint = store((s) => s.selectedPoint);
  const fields = pointFieldsForType(ea.def.activityType);
  const b = ea.arena.bounds;
  return (
    <div className="space-y-3">
      <section className="rounded border border-slate-700/60 bg-slate-900/40 p-2">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">Bounds</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="center"><Vec3Row v={b.center} onChange={(center) => store.getState().setBounds({ center })} /></Field>
          <Field label="size"><Vec3Row v={b.size} onChange={(size) => store.getState().setBounds({ size })} /></Field>
        </div>
      </section>
      <p className="text-[10px] text-sky-200">💡 Click <strong>📍</strong> on a point, then drag it with the world gizmo (positions persist).</p>
      {fields.map((field) => {
        const pts = ea.arena.points[field] ?? [];
        const single = SINGLE_POINT_FIELDS.has(field);
        return (
          <section key={field}>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ARENA_POINT_COLOR[field] }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{ARENA_POINT_LABEL[field]} · {pts.length}</span>
              {!(single && pts.length >= 1) && <button onClick={() => store.getState().addPoint(field)} className="ml-auto rounded border border-emerald-700/50 bg-emerald-700/20 px-1.5 py-0.5 text-[10px] text-emerald-100 hover:bg-emerald-700/30">+ add</button>}
            </div>
            <div className="space-y-1">
              {pts.map((p, i) => {
                const placed = selectedPoint?.field === field && selectedPoint.index === i;
                return (
                  <div key={i} className="flex items-center gap-1">
                    <button onClick={() => { store.getState().selectPoint({ field, index: i }); useWorldSelectStore.getState().select(`act:${ea.def.id}:${field}:${i}`); }} className={`rounded px-1.5 py-0.5 text-[10px] ${placed ? 'bg-sky-600/40 text-sky-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} title="Select to drag with the world gizmo">📍</button>
                    <Vec3Row v={p} onChange={(nv) => store.getState().updatePoint(field, i, nv)} />
                    <button onClick={() => store.getState().removePoint(field, i)} className="rounded px-1 text-[11px] text-red-300 hover:bg-red-700/30">✕</button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

// ── Objectives ───────────────────────────────────────────────────────────────
const ObjectivesTab = ({ ea }: { ea: EditorActivity }) => {
  const store = useEditorActivityStore;
  const upd = (i: number, patch: Partial<ActivityObjective>) => store.getState().updateObjective(i, patch);
  return (
    <div className="space-y-2">
      <button onClick={() => store.getState().addObjective()} className={btn}>+ objective</button>
      {ea.objectives.map((o, i) => (
        <div key={o.id} className="space-y-1 rounded border border-slate-700/60 bg-slate-900/50 p-2">
          <div className="flex items-center gap-1">
            <select value={o.objectiveType} onChange={(e) => upd(i, { objectiveType: e.target.value as ActivityObjective['objectiveType'] })} className={num}>
              {OBJECTIVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-1 text-[10px] text-slate-400">target<input type="number" min={1} value={o.targetValue} onChange={(e) => upd(i, { targetValue: parseInt(e.target.value, 10) || 1 })} className="w-16 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-100" /></label>
            <button onClick={() => store.getState().removeObjective(i)} className="ml-auto rounded px-1 text-[11px] text-red-300 hover:bg-red-700/30">✕</button>
          </div>
          <input value={o.description} placeholder="description" onChange={(e) => upd(i, { description: e.target.value })} className={inp} />
        </div>
      ))}
      {ea.objectives.length === 0 && <p className="text-[10px] text-slate-500">No objectives.</p>}
    </div>
  );
};

// ── Rewards ──────────────────────────────────────────────────────────────────
const RewardsTab = ({ ea }: { ea: EditorActivity }) => {
  const store = useEditorActivityStore;
  const itemOptions = useItemOptions();
  const upd = (i: number, patch: Partial<ActivityReward>) => store.getState().updateReward(i, patch);
  return (
    <div className="space-y-2">
      <button onClick={() => store.getState().addReward()} className={btn}>+ reward</button>
      {ea.rewards.map((r, i) => (
        <div key={r.id} className="flex items-center gap-1 rounded border border-amber-700/30 bg-amber-950/20 p-2">
          <select value={r.rewardType} onChange={(e) => upd(i, { rewardType: e.target.value as ActivityReward['rewardType'] })} className="w-24 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-100">
            {REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {r.rewardType === 'item' && <div className="flex-1"><IdSelect value={r.itemId} onChange={(v) => upd(i, { itemId: v })} options={itemOptions} placeholder="(item)" /></div>}
          {r.rewardType === 'item' && <input type="number" min={1} value={r.quantity} onChange={(e) => upd(i, { quantity: parseInt(e.target.value, 10) || 1 })} className="w-14 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-100" title="quantity" />}
          {r.rewardType === 'exp' && <input type="number" min={0} value={r.exp ?? 0} onChange={(e) => upd(i, { exp: parseInt(e.target.value, 10) || 0 })} className="flex-1 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-100" placeholder="exp" />}
          {r.rewardType === 'unlockFlag' && <input value={r.unlockFlag ?? ''} onChange={(e) => upd(i, { unlockFlag: e.target.value })} className="flex-1 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-100" placeholder="flag id" />}
          <button onClick={() => store.getState().removeReward(i)} className="rounded px-1 text-[11px] text-red-300 hover:bg-red-700/30">✕</button>
        </div>
      ))}
      {ea.rewards.length === 0 && <p className="text-[10px] text-slate-500">No rewards.</p>}
    </div>
  );
};

// ── Participants ─────────────────────────────────────────────────────────────
const ParticipantsTab = ({ ea }: { ea: EditorActivity }) => {
  const store = useEditorActivityStore;
  const selectedPoint = store((s) => s.selectedPoint);
  const combatantOptions = useCombatantOptions();
  const upd = (i: number, patch: Partial<ActivityParticipantSlot>) => store.getState().updateParticipant(i, patch);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Participants · {ea.participants.length}</span>
        <div className="ml-auto flex gap-1">
          {ACTIVITY_SLOT_ROLES.map((role) => (
            <button key={role} onClick={() => store.getState().addParticipant(role)} className="rounded border border-emerald-700/50 bg-emerald-700/20 px-1.5 py-0.5 text-[10px] text-emerald-100 hover:bg-emerald-700/30">+ {role}</button>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-sky-200">💡 Set each participant&apos;s combatant / model / animation / level, then click <strong>📍</strong> to drag its position with the world gizmo.</p>
      {ea.participants.map((p, i) => {
        const placed = selectedPoint?.field === 'participant' && selectedPoint.index === i;
        return (
          <div key={p.id} className="space-y-1 rounded border border-slate-700/60 bg-slate-900/50 p-2">
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? ACTIVITY_SLOT_COLOR[p.role] }} />
              <select value={p.role} onChange={(e) => { const role = e.target.value as ActivityParticipantSlot['role']; upd(i, { role, color: ACTIVITY_SLOT_COLOR[role] }); }} className={num}>
                {ACTIVITY_SLOT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => { store.getState().selectPoint({ field: 'participant', index: i }); useWorldSelectStore.getState().select(`act:${ea.def.id}:p:${i}`); }} className={`rounded px-1.5 py-0.5 text-[10px] ${placed ? 'bg-sky-600/40 text-sky-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} title="Select to drag with the world gizmo">📍 place</button>
              <button onClick={() => store.getState().removeParticipant(i)} className="ml-auto rounded px-1 text-[11px] text-red-300 hover:bg-red-700/30">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Field label="combatant"><IdSelect value={p.combatantId} onChange={(v) => upd(i, { combatantId: v })} options={combatantOptions} placeholder="(stats: none)" /></Field>
              <label className="flex flex-col gap-0.5"><span className={lbl}>level</span><input type="number" min={1} value={p.level ?? 1} onChange={(e) => upd(i, { level: parseInt(e.target.value, 10) || 1 })} className={num} /></label>
              <Field label="model"><ModelPicker value={p.modelAssetId} onChange={(v) => upd(i, { modelAssetId: v })} /></Field>
              <Field label="animation"><AnimationPicker modelAssetId={p.modelAssetId} value={p.animation} onChange={(v) => upd(i, { animation: v })} /></Field>
              <label className="flex items-center gap-1 text-[10px] text-slate-400">color<input type="color" value={p.color ?? ACTIVITY_SLOT_COLOR[p.role]} onChange={(e) => upd(i, { color: e.target.value })} className="h-6 w-full rounded bg-slate-800" /></label>
            </div>
          </div>
        );
      })}
      {ea.participants.length === 0 && <p className="text-[10px] text-slate-500">No participants — add one above.</p>}
    </div>
  );
};
