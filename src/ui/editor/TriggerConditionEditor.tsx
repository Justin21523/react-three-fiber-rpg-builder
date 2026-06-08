import type { EditorTrigger } from '../../types/editorTrigger';
import type { QuestStatus } from '../../types/quest';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { Field, Check, inp, useQuestOptions, useItemOptions } from './editorShared';
import { IdSelect } from './idPickers';

const QUEST_STATUSES: QuestStatus[] = ['NotStarted', 'InProgress', 'Completed', 'Failed'];

// Kit — shared gating conditions (quest / item / flag / level / once / cooldown).
export const TriggerConditionEditor = ({ trigger }: { trigger: EditorTrigger }) => {
  const updateTrigger = useEditorTriggerStore((s) => s.updateTrigger);
  const questOptions = useQuestOptions();
  const itemOptions = useItemOptions();
  const t = trigger;
  const set = (patch: Partial<EditorTrigger>) => updateTrigger(t.id, patch);

  return (
    <div className="grid grid-cols-2 gap-2 rounded border border-slate-700/40 bg-slate-900/40 p-2">
      <Field label="requiredQuestId"><IdSelect value={t.requiredQuestId} onChange={(v) => set({ requiredQuestId: v })} options={questOptions} placeholder="(none)" /></Field>
      <Field label="requiredQuestStatus">
        <select value={t.requiredQuestStatus ?? 'Completed'} onChange={(e) => set({ requiredQuestStatus: e.target.value as QuestStatus })} disabled={!t.requiredQuestId} className={inp}>
          {QUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="requiredItemId"><IdSelect value={t.requiredItemId} onChange={(v) => set({ requiredItemId: v })} options={itemOptions} placeholder="(none)" /></Field>
      <Field label="requiredWorldFlag"><input value={t.requiredWorldFlag ?? ''} onChange={(e) => set({ requiredWorldFlag: e.target.value || undefined })} className={inp} /></Field>
      <Field label="requiredPlayerLevel"><input type="number" min={0} max={99} value={t.requiredPlayerLevel ?? 0} onChange={(e) => set({ requiredPlayerLevel: parseInt(e.target.value, 10) || undefined })} className={inp} /></Field>
      <Field label="cooldownSeconds"><input type="number" min={0} value={t.cooldownSeconds ?? 0} onChange={(e) => set({ cooldownSeconds: parseInt(e.target.value, 10) || 0 })} className={inp} /></Field>
      <Check label="onceOnly (fires once)" checked={!!t.onceOnly} onChange={(v) => set({ onceOnly: v })} />
    </div>
  );
};
