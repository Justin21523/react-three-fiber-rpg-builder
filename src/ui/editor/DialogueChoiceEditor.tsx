import type { DialogueChoice, DialogueCondition, DialogueEffect } from '../../types/dialogue';
import { MechEditor, NodeTarget, dinp } from './dialogueEditorShared';

type Mech = Record<string, unknown> & { type: string };

// Kit — edit a single dialogue choice: text, branch target, gating condition, effect.
export const DialogueChoiceEditor = ({ choice, nodeIds, onChange, onRemove }: {
  choice: DialogueChoice;
  nodeIds: string[];
  onChange: (patch: Partial<DialogueChoice>) => void;
  onRemove?: () => void;
}) => (
  <div className="space-y-0.5 rounded bg-slate-950/30 p-1">
    <div className="flex items-center gap-1 pl-3 text-[10px]">
      <span className="text-slate-500">↳</span>
      <input value={choice.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="choice" className={`flex-1 ${dinp}`} />
      <NodeTarget nodeIds={nodeIds} value={choice.nextNodeId} onChange={(v) => onChange({ nextNodeId: v })} />
      {onRemove && <button onClick={onRemove} className="rounded px-1 text-red-300 hover:bg-red-700/30">✕</button>}
    </div>
    <div className="flex items-center gap-1 pl-6 text-[10px] text-slate-400">
      <span className="w-10 shrink-0">cond</span>
      <MechEditor kind="condition" value={choice.condition as Mech | undefined} onChange={(v) => onChange({ condition: v as unknown as DialogueCondition | undefined })} />
    </div>
    <div className="flex items-center gap-1 pl-6 text-[10px] text-slate-400">
      <span className="w-10 shrink-0">effect</span>
      <MechEditor kind="effect" value={choice.effect as Mech | undefined} onChange={(v) => onChange({ effect: v as unknown as DialogueEffect | undefined })} />
    </div>
  </div>
);
