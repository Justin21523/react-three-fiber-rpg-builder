import type { EditorReward, EditorRewardType } from '../../types/editorQuest';
import { EDITOR_REWARD_TYPES } from '../../types/editorQuest';
import { useEditorQuestStore } from '../../stores/editorQuestStore';
import { Field, inp, useItemOptions, useAreaOptions, useQuestOptions } from './editorShared';
import { IdSelect } from './idPickers';

// Kit — edit one quest reward: type + amount + (optional) target. Object-reference targets are dropdowns
// of existing items / areas / quests; only `worldFlag` uses free text.
export const QuestRewardEditor = ({ questId, reward }: { questId: string; reward: EditorReward }) => {
  const update = useEditorQuestStore((s) => s.updateReward);
  const remove = useEditorQuestStore((s) => s.removeReward);
  const itemOptions = useItemOptions();
  const areaOptions = useAreaOptions();
  const questOptions = useQuestOptions();
  const set = (patch: Partial<EditorReward>) => update(questId, reward.id, patch);

  const targetField = () => {
    switch (reward.type) {
      case 'item': return <Field label="item"><IdSelect value={reward.targetId} onChange={(v) => set({ targetId: v })} options={itemOptions} placeholder="(choose item)" /></Field>;
      case 'unlockArea': return <Field label="area"><IdSelect value={reward.targetId} onChange={(v) => set({ targetId: v })} options={areaOptions} placeholder="(choose area)" /></Field>;
      case 'unlockQuest': return <Field label="quest"><IdSelect value={reward.targetId} onChange={(v) => set({ targetId: v })} options={questOptions} placeholder="(choose quest)" /></Field>;
      case 'worldFlag': return <Field label="flag"><input value={reward.targetId ?? ''} onChange={(e) => set({ targetId: e.target.value || undefined })} className={inp} placeholder="flag id" /></Field>;
      default: return <div className="flex-1" />;
    }
  };

  return (
    <div className="flex items-end gap-2 rounded border border-slate-700/60 bg-slate-900/50 p-2">
      <Field label="type">
        <select value={reward.type} onChange={(e) => set({ type: e.target.value as EditorRewardType })} className={inp}>
          {EDITOR_REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="amount"><input type="number" min={0} value={reward.amount ?? 0} onChange={(e) => set({ amount: parseInt(e.target.value, 10) || 0 })} className={inp} /></Field>
      <div className="flex-1">{targetField()}</div>
      <button onClick={() => remove(questId, reward.id)} className="mb-0.5 shrink-0 rounded px-1.5 py-1 text-xs text-red-300 hover:bg-red-700/30">🗑</button>
    </div>
  );
};
