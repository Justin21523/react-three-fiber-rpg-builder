import type { EditorTrigger, ExplorationPointConfig } from '../../types/editorTrigger';
import { explorationConfig } from '../../types/editorTrigger';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { Field, Check, inp, csv, parseCsv, useItemOptions, useQuestOptions } from './editorShared';
import { IdMultiPicker } from './idPickers';

// Kit — edits the nested exploration config of an exploration point.
export const ExplorationPointConfigEditor = ({ trigger }: { trigger: EditorTrigger }) => {
  const updateTrigger = useEditorTriggerStore((s) => s.updateTrigger);
  const itemOptions = useItemOptions();
  const questOptions = useQuestOptions();
  const ex = explorationConfig(trigger);
  const set = (patch: Partial<ExplorationPointConfig>) => updateTrigger(trigger.id, { exploration: { ...ex, ...patch } });

  return (
    <div className="grid grid-cols-2 gap-2 rounded border border-amber-700/30 bg-amber-950/20 p-2">
      <Field label="discoveryText"><input value={ex.discoveryText ?? ''} onChange={(e) => set({ discoveryText: e.target.value || undefined })} className={`col-span-2 ${inp}`} /></Field>
      <Field label="rewardItemIds"><IdMultiPicker ids={ex.rewardItemIds ?? []} onChange={(v) => set({ rewardItemIds: v })} options={itemOptions} addLabel="+ reward item…" /></Field>
      <Field label="relatedQuestIds"><IdMultiPicker ids={ex.relatedQuestIds ?? []} onChange={(v) => set({ relatedQuestIds: v })} options={questOptions} addLabel="+ related quest…" /></Field>
      <Field label="expReward"><input type="number" min={0} value={ex.expReward ?? 0} onChange={(e) => set({ expReward: parseInt(e.target.value, 10) || 0 })} className={inp} /></Field>
      <Field label="setWorldFlags (,)"><input value={csv(ex.setWorldFlags)} onChange={(e) => set({ setWorldFlags: parseCsv(e.target.value) })} className={inp} /></Field>
      <Check label="consumeOnUse (fire once then disable)" checked={!!ex.consumeOnUse} onChange={(v) => set({ consumeOnUse: v })} />
    </div>
  );
};
