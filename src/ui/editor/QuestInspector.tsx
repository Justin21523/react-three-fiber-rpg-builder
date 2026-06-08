import { useState } from 'react';
import type { EditorQuest, QuestCategory } from '../../types/editorQuest';
import { QUEST_CATEGORIES } from '../../types/editorQuest';
import { useEditorQuestStore } from '../../stores/editorQuestStore';
import { useUiStore } from '../../stores/uiStore';
import { useQuestStore } from '../../stores/questStore';
import { syncEditorQuests } from '../../game/editor/editorQuestToQuest';
import { validateQuestLive } from '../../game/editor/validateQuest';
import { Field, inp, csv, parseCsv, useNpcOptions, useQuestOptions, useAreaOptions } from './editorShared';
import { IdSelect, IdMultiPicker } from './idPickers';
import { QuestObjectiveEditor } from './QuestObjectiveEditor';
import { QuestRewardEditor } from './QuestRewardEditor';
import { QuestFlowPreview } from './QuestFlowPreview';

// Kit — full inspector for one editor quest: identity + bindings + objectives + rewards + validation +
// "Sync to game" (register into questStore) + a Test (start it) + a flow preview.
export const QuestInspector = ({ eq }: { eq: EditorQuest }) => {
  const update = useEditorQuestStore((s) => s.updateQuest);
  const remove = useEditorQuestStore((s) => s.removeQuest);
  const duplicate = useEditorQuestStore((s) => s.duplicateQuest);
  const addObjective = useEditorQuestStore((s) => s.addObjective);
  const addReward = useEditorQuestStore((s) => s.addReward);
  const closeHub = useUiStore((s) => s.toggleEditorHub);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (patch: Partial<EditorQuest>) => update(eq.id, patch);
  const valid = validateQuestLive(eq);
  const npcOptions = useNpcOptions();
  const areaOptions = useAreaOptions();
  const questOptions = useQuestOptions().filter((o) => o.id !== eq.id);

  const sync = () => { const n = syncEditorQuests(); setMsg(`✅ Synced ${n} editor quest(s) into the game.`); };
  const test = () => {
    syncEditorQuests();
    useQuestStore.getState().startQuest(eq.id);
    closeHub();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 truncate text-base font-bold text-amber-100">{eq.title}</h3>
        <button onClick={sync} className="rounded border border-emerald-700/50 bg-emerald-700/20 px-2 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-700/30">⟳ Sync</button>
        <button onClick={test} className="rounded border border-sky-600/50 bg-sky-600/20 px-2 py-1 text-xs text-sky-100 hover:bg-sky-600/30">▶ Test</button>
        <button onClick={() => duplicate(eq.id)} className="rounded border border-slate-600 bg-slate-800/70 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">⧉</button>
        <button onClick={() => remove(eq.id)} className="rounded border border-red-700/50 bg-red-700/15 px-2 py-1 text-xs text-red-200 hover:bg-red-700/25">🗑</button>
      </div>

      {(!valid.ok || valid.warnings.length > 0) && (
        <div className={`rounded border px-2 py-1 text-[11px] ${valid.ok ? 'border-amber-700/50 bg-amber-900/20 text-amber-200' : 'border-red-700/50 bg-red-900/30 text-red-200'}`}>
          {[...valid.errors.map((e) => `⛔ ${e}`), ...valid.warnings.map((w) => `⚠ ${w}`)].join(' · ')}
        </div>
      )}

      {/* identity */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="title"><input value={eq.title} onChange={(e) => set({ title: e.target.value })} className={inp} /></Field>
        <Field label="code"><input value={eq.code} onChange={(e) => set({ code: e.target.value })} className={inp} /></Field>
        <Field label="category">
          <select value={eq.category} onChange={(e) => set({ category: e.target.value as QuestCategory })} className={inp}>
            {QUEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="recommendedLevel"><input type="number" min={1} value={eq.recommendedLevel} onChange={(e) => set({ recommendedLevel: parseInt(e.target.value, 10) || 1 })} className={inp} /></Field>
        <Field label="description"><input value={eq.description} onChange={(e) => set({ description: e.target.value })} className={`col-span-2 ${inp}`} /></Field>
        <Field label="startingNPCId (giver)"><IdSelect value={eq.startingNPCId} onChange={(v) => set({ startingNPCId: v })} options={npcOptions} placeholder="(no giver — board)" /></Field>
        <Field label="prerequisiteQuestIds"><IdMultiPicker ids={eq.prerequisiteQuestIds} onChange={(v) => set({ prerequisiteQuestIds: v })} options={questOptions} addLabel="+ add prerequisite…" /></Field>
        <label className="col-span-2 flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><input type="checkbox" checked={!!eq.repeatable} onChange={(e) => set({ repeatable: e.target.checked })} className="accent-sky-500" />repeatable</span>
          <span className="flex items-center gap-1"><input type="checkbox" checked={!!eq.daily} onChange={(e) => set({ daily: e.target.checked })} className="accent-sky-500" />daily</span>
          <span className="flex items-center gap-1"><input type="checkbox" checked={eq.isEnabled !== false} onChange={(e) => set({ isEnabled: e.target.checked })} className="accent-sky-500" />enabled</span>
        </label>
      </div>

      {/* objectives */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Objectives · {eq.objectives.length}</span>
        <button onClick={() => addObjective(eq.id)} className="rounded border border-emerald-700/50 bg-emerald-700/20 px-2 py-0.5 text-[11px] text-emerald-100 hover:bg-emerald-700/30">+ Objective</button>
      </div>
      <div className="space-y-1.5">
        {eq.objectives.map((o, i) => <QuestObjectiveEditor key={o.id} questId={eq.id} obj={o} index={i} count={eq.objectives.length} />)}
      </div>

      {/* rewards */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rewards · {eq.rewards.length}</span>
        <button onClick={() => addReward(eq.id)} className="rounded border border-emerald-700/50 bg-emerald-700/20 px-2 py-0.5 text-[11px] text-emerald-100 hover:bg-emerald-700/30">+ Reward</button>
      </div>
      <div className="space-y-1.5">
        {eq.rewards.map((r) => <QuestRewardEditor key={r.id} questId={eq.id} reward={r} />)}
      </div>

      {/* unlocks / refs */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="unlocksAreaIds"><IdMultiPicker ids={eq.unlocksAreaIds} onChange={(v) => set({ unlocksAreaIds: v })} options={areaOptions} addLabel="+ unlock area…" /></Field>
        <Field label="unlocksQuestIds"><IdMultiPicker ids={eq.unlocksQuestIds} onChange={(v) => set({ unlocksQuestIds: v })} options={questOptions} addLabel="+ unlock quest…" /></Field>
        <Field label="relatedAreaIds"><IdMultiPicker ids={eq.relatedAreaIds} onChange={(v) => set({ relatedAreaIds: v })} options={areaOptions} addLabel="+ related area…" /></Field>
        <Field label="setsWorldFlags (,)"><input value={csv(eq.setsWorldFlags)} onChange={(e) => set({ setsWorldFlags: parseCsv(e.target.value) })} className={inp} placeholder="flag ids" /></Field>
        <Field label="tags (,)"><input value={csv(eq.tags)} onChange={(e) => set({ tags: parseCsv(e.target.value) })} className={inp} /></Field>
      </div>

      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Flow preview</div>
      <QuestFlowPreview eq={eq} />

      {msg && <p className="rounded bg-slate-900/60 px-2 py-1 text-[11px] text-slate-300">{msg}</p>}
    </div>
  );
};
