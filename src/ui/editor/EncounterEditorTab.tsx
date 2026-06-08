import type { EditorEncounter, EditorEnemySlot, EditorBossPhase, EncounterType } from '../../types/editorEncounter';
import { ENCOUNTER_TYPES, makeEnemySlot } from '../../types/editorEncounter';
import type { Combatant, CombatSkill } from '../../types/combat';
import { SEED_COMBATANTS } from '../../data/combatants';
import { useEditorEncounterStore } from '../../stores/editorEncounterStore';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useWorldSelectStore } from '../../stores/worldSelectStore';
import { startEditorEncounter } from '../../game/battle/startEncounter';
import { Field, inp, csv, parseCsv, useItemOptions, useQuestOptions } from './editorShared';
import { IdSelect, IdMultiPicker, type IdOption } from './idPickers';
import { ModelPicker } from './ModelPicker';

const btn = 'rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700';

// Kit — the ⚔ Encounters tab: encounter list + inspector (Overview / Team / Boss Phases / Dialogue) and a
// Combatants authoring section. Encounters launch a generic battle via startEditorEncounter.
export const EncounterEditorTab = () => {
  const encounters = useEditorEncounterStore((s) => s.encounters);
  const combatants = useEditorEncounterStore((s) => s.combatants);
  const selId = useEditorEncounterStore((s) => s.selectedId);
  const select = useEditorEncounterStore((s) => s.selectEncounter);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  const sel = encounters.find((e) => e.id === selId) ?? null;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex gap-3">
        <div className="w-44 shrink-0 space-y-2">
          <button className={`w-full ${btn}`} onClick={() => useEditorEncounterStore.getState().addEncounter(areaId)}>+ New Encounter</button>
          <div className="max-h-[55vh] space-y-0.5 overflow-y-auto">
            {encounters.map((e) => (
              <button key={e.id} onClick={() => select(e.id)} className={`block w-full truncate rounded px-2 py-1 text-left ${selId === e.id ? 'bg-red-600/30 text-red-100' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}>
                {e.displayName} <span className="text-[9px] text-slate-500">· {e.enemyTeam.length}</span>
              </button>
            ))}
            {encounters.length === 0 && <p className="px-1 text-[10px] text-slate-500">No encounters yet.</p>}
          </div>
        </div>
        <div className="min-w-0 flex-1">{sel ? <EncounterInspector enc={sel} combatants={combatants} /> : <p className="text-[11px] text-slate-500">Select or create an encounter.</p>}</div>
      </div>

      <CombatantSection combatants={combatants} />
    </div>
  );
};

const EncounterInspector = ({ enc, combatants }: { enc: EditorEncounter; combatants: Combatant[] }) => {
  const update = useEditorEncounterStore((s) => s.updateEncounter);
  const remove = useEditorEncounterStore((s) => s.removeEncounter);
  const triggers = useEditorTriggerStore((s) => s.triggers);
  const itemOptions = useItemOptions();
  const questOptions = useQuestOptions();
  const set = (patch: Partial<EditorEncounter>) => update(enc.id, patch);
  const combatantOptions: IdOption[] = [...combatants.map((c) => ({ id: c.id, label: c.name })), ...SEED_COMBATANTS.map((c) => ({ id: c.id, label: `${c.name} (seed)` }))];
  const triggerOptions: IdOption[] = triggers.map((t) => ({ id: t.id, label: t.displayName || t.triggerType }));
  const survive = enc.winCondition?.type === 'surviveTurns';

  const setSlot = (i: number, patch: Partial<EditorEnemySlot>) => set({ enemyTeam: enc.enemyTeam.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setPhase = (i: number, patch: Partial<EditorBossPhase>) => set({ bossPhases: (enc.bossPhases ?? []).map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const r = enc.rewards ?? {};
  const d = enc.battleDialogue ?? {};

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 truncate text-base font-bold text-red-100">{enc.displayName}</h3>
        <button onClick={() => startEditorEncounter(enc)} className="rounded border border-violet-600/50 bg-violet-600/25 px-2 py-1 text-xs text-violet-100 hover:bg-violet-600/35">▶ Test battle</button>
        <button onClick={() => remove(enc.id)} className="rounded border border-red-700/50 bg-red-700/15 px-2 py-1 text-xs text-red-200 hover:bg-red-700/25">🗑</button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="displayName"><input value={enc.displayName} onChange={(e) => set({ displayName: e.target.value })} className={inp} /></Field>
        <Field label="encounterType"><select value={enc.encounterType} onChange={(e) => set({ encounterType: e.target.value as EncounterType })} className={inp}>{ENCOUNTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
        <Field label="recommendedLevel"><input type="number" min={1} value={enc.recommendedLevel} onChange={(e) => set({ recommendedLevel: parseInt(e.target.value, 10) || 1 })} className={inp} /></Field>
        <Field label="linked trigger"><IdSelect value={enc.triggerId} onChange={(v) => set({ triggerId: v })} options={triggerOptions} placeholder="(none)" /></Field>
        <Field label="world position (x / y / z)">
          <div className="flex items-center gap-1">
            {([0, 1, 2] as const).map((ax) => {
              const p = enc.position ?? [0, 0, 4];
              return <input key={ax} type="number" step={0.5} value={p[ax]} onChange={(e) => { const np = [...p] as [number, number, number]; np[ax] = parseFloat(e.target.value) || 0; set({ position: np }); }} className={inp} title={['x', 'y', 'z'][ax]} />;
            })}
            <button onClick={() => useWorldSelectStore.getState().select(`enc:${enc.id}`)} title="Select in the world to drag with the gizmo (Edit Mode)" className="shrink-0 rounded border border-sky-700/50 bg-sky-700/20 px-1.5 py-1 text-[10px] text-sky-100 hover:bg-sky-700/30">📍</button>
          </div>
        </Field>
        <Field label="winCondition">
          <select value={enc.winCondition?.type ?? 'defeatAll'} onChange={(e) => set({ winCondition: e.target.value === 'surviveTurns' ? { type: 'surviveTurns', turns: 5 } : { type: 'defeatAll' } })} className={inp}>
            <option value="defeatAll">defeatAll</option><option value="surviveTurns">surviveTurns</option>
          </select>
        </Field>
        {survive && <Field label="turns"><input type="number" min={1} value={enc.winCondition?.type === 'surviveTurns' ? enc.winCondition.turns : 5} onChange={(e) => set({ winCondition: { type: 'surviveTurns', turns: parseInt(e.target.value, 10) || 1 } })} className={inp} /></Field>}
        <Field label="relatedQuestIds"><IdMultiPicker ids={enc.relatedQuestIds} onChange={(v) => set({ relatedQuestIds: v })} options={questOptions} addLabel="+ related quest…" /></Field>
      </div>

      {/* Rewards */}
      <div className="rounded border border-amber-700/30 bg-amber-950/20 p-2">
        <div className="mb-1 text-[10px] font-bold uppercase text-amber-300">Rewards</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="itemIds"><IdMultiPicker ids={r.itemIds ?? []} onChange={(v) => set({ rewards: { ...r, itemIds: v } })} options={itemOptions} addLabel="+ item…" /></Field>
          <Field label="bonusExp"><input type="number" min={0} value={r.bonusExp ?? 0} onChange={(e) => set({ rewards: { ...r, bonusExp: parseInt(e.target.value, 10) || 0 } })} className={inp} /></Field>
          <Field label="worldFlags (,)"><input value={csv(r.worldFlags)} onChange={(e) => set({ rewards: { ...r, worldFlags: parseCsv(e.target.value) } })} className={`col-span-2 ${inp}`} /></Field>
        </div>
      </div>

      {/* Team */}
      <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Enemy team · {enc.enemyTeam.length}</span>
        <button className={btn} onClick={() => set({ enemyTeam: [...enc.enemyTeam, makeEnemySlot(enc.enemyTeam.length)] })}>+ Enemy</button>
      </div>
      {enc.enemyTeam.map((s, i) => (
        <div key={i} className="flex items-center gap-1 rounded border border-slate-700/60 bg-slate-900/50 p-1.5">
          <span className="font-mono text-[10px] text-slate-500">#{i + 1}</span>
          <select value={s.combatantId} onChange={(e) => setSlot(i, { combatantId: e.target.value })} className={`flex-1 ${inp}`}>{combatantOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
          <label className="flex items-center gap-1 text-[10px] text-slate-400">Lv<input type="number" min={1} value={s.level} onChange={(e) => setSlot(i, { level: parseInt(e.target.value, 10) || 1 })} className={`w-12 ${inp}`} /></label>
          <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={!!s.isBoss} onChange={(e) => setSlot(i, { isBoss: e.target.checked })} />boss</label>
          <button className={`${btn} text-red-300`} onClick={() => set({ enemyTeam: enc.enemyTeam.filter((_, j) => j !== i) })}>✕</button>
        </div>
      ))}

      {/* Boss phases */}
      <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Boss phases · {(enc.bossPhases ?? []).length}</span>
        <button className={btn} onClick={() => set({ bossPhases: [...(enc.bossPhases ?? []), { hpThreshold: 0.5, phaseName: 'Phase 2' }] })}>+ Phase</button>
      </div>
      {(enc.bossPhases ?? []).map((p, i) => (
        <div key={i} className="grid grid-cols-2 gap-1.5 rounded border border-red-800/40 bg-red-950/20 p-1.5">
          <Field label="phaseName"><input value={p.phaseName} onChange={(e) => setPhase(i, { phaseName: e.target.value })} className={inp} /></Field>
          <Field label="hpThreshold (0..1)"><input type="number" step={0.05} min={0} max={1} value={p.hpThreshold} onChange={(e) => setPhase(i, { hpThreshold: parseFloat(e.target.value) || 0 })} className={inp} /></Field>
          <Field label="atk mult"><input type="number" step={0.1} value={p.statMult?.attack ?? 1} onChange={(e) => setPhase(i, { statMult: { ...p.statMult, attack: parseFloat(e.target.value) || 1 } })} className={inp} /></Field>
          <Field label="def mult"><input type="number" step={0.1} value={p.statMult?.defense ?? 1} onChange={(e) => setPhase(i, { statMult: { ...p.statMult, defense: parseFloat(e.target.value) || 1 } })} className={inp} /></Field>
          <Field label="dialogueLine"><input value={p.dialogueLine ?? ''} onChange={(e) => setPhase(i, { dialogueLine: e.target.value })} className={`col-span-2 ${inp}`} /></Field>
          <button className={`${btn} col-span-2 text-red-300`} onClick={() => set({ bossPhases: (enc.bossPhases ?? []).filter((_, j) => j !== i) })}>Remove phase</button>
        </div>
      ))}

      {/* Battle dialogue */}
      <div className="rounded border border-sky-800/40 bg-sky-950/20 p-2">
        <div className="mb-1 text-[10px] font-bold uppercase text-sky-300">Battle dialogue (one line per row)</div>
        {(['battleStart', 'victory', 'defeat'] as const).map((k) => (
          <label key={k} className="mb-1 block">
            <span className="text-[10px] text-slate-400">{k}</span>
            <textarea value={(d[k] ?? []).join('\n')} onChange={(e) => set({ battleDialogue: { ...d, [k]: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) } })} rows={2} className={`w-full ${inp}`} />
          </label>
        ))}
      </div>
    </div>
  );
};

// ── Combatant authoring ─────────────────────────────────────────────────────
const CombatantSection = ({ combatants }: { combatants: Combatant[] }) => (
  <div className="space-y-1 rounded border border-slate-700 bg-slate-900/50 p-2">
    <div className="flex items-center justify-between"><h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Combatants</h4>
      <button className={btn} onClick={() => useEditorEncounterStore.getState().newCombatant()}>+ New Combatant</button>
    </div>
    {combatants.length === 0 && <p className="text-[10px] text-slate-400">No authored combatants. Seed foes (Slime/Brigand/Golem) are always available.</p>}
    {combatants.map((c) => <CombatantRow key={c.id} c={c} />)}
  </div>
);

const CombatantRow = ({ c }: { c: Combatant }) => {
  const save = (patch: Partial<Combatant>) => useEditorEncounterStore.getState().upsertCombatant({ ...c, ...patch });
  const setSkill = (i: number, patch: Partial<CombatSkill>) => save({ skills: c.skills.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return (
    <div className="space-y-1 rounded border border-slate-700/60 bg-slate-950/40 p-1.5">
      <div className="flex items-center gap-1">
        <input value={c.name} onChange={(e) => save({ name: e.target.value })} className={`w-32 ${inp}`} />
        {(['maxHp', 'attack', 'defense', 'speed'] as const).map((k) => (
          <label key={k} className="flex items-center gap-0.5 text-[9px] text-slate-400">{k.slice(0, 3)}<input type="number" value={c[k]} onChange={(e) => save({ [k]: parseInt(e.target.value, 10) || 0 })} className={`w-12 ${inp}`} /></label>
        ))}
        <input type="color" value={c.color ?? '#ef4444'} onChange={(e) => save({ color: e.target.value })} className="h-6 w-7 rounded bg-slate-800" />
        <button className={`${btn} text-red-300`} onClick={() => useEditorEncounterStore.getState().removeCombatant(c.id)}>🗑</button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-slate-500">model</span>
        <div className="flex-1"><ModelPicker value={c.modelAssetId} onChange={(v) => save({ modelAssetId: v })} /></div>
      </div>
      <div className="space-y-0.5 pl-2">
        <div className="flex items-center gap-1 text-[9px] text-slate-500">skills<button className="rounded px-1 text-emerald-300 hover:bg-emerald-700/20" onClick={() => save({ skills: [...c.skills, { id: `sk_${Date.now().toString(36)}`, name: 'Skill', power: 5, kind: 'damage' }] })}>+ add</button></div>
        {c.skills.map((sk, i) => (
          <div key={sk.id} className="flex items-center gap-1">
            <input value={sk.name} onChange={(e) => setSkill(i, { name: e.target.value })} className={`w-24 ${inp}`} />
            <select value={sk.kind} onChange={(e) => setSkill(i, { kind: e.target.value as 'damage' | 'heal' })} className={inp}><option value="damage">damage</option><option value="heal">heal</option></select>
            <label className="flex items-center gap-0.5 text-[9px] text-slate-400">pow<input type="number" value={sk.power} onChange={(e) => setSkill(i, { power: parseInt(e.target.value, 10) || 0 })} className={`w-12 ${inp}`} /></label>
            <label className="flex items-center gap-0.5 text-[9px] text-slate-400">cd<input type="number" min={0} value={sk.cooldown ?? 0} onChange={(e) => setSkill(i, { cooldown: parseInt(e.target.value, 10) || 0 })} className={`w-10 ${inp}`} /></label>
            <button className="rounded px-1 text-[10px] text-red-300 hover:bg-red-700/30" onClick={() => save({ skills: c.skills.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
};
