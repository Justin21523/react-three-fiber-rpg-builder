import type { DialogueNode, DialogueChoice, DialogueEmotion, DialogueEffect, DialogueCondition } from '../../types/dialogue';
import { DIALOGUE_EMOTIONS } from '../../types/editorDialogue';
import { MechListEditor, NodeTarget, dinp } from './dialogueEditorShared';
import { DialogueChoiceEditor } from './DialogueChoiceEditor';

// Kit — edit a single dialogue node: speaker/text/emotion, branch (nextNodeId), node-entry actions,
// node-entry conditions (+ fallback), and its choices.
export const DialogueNodeEditor = ({ node, nodeIds, isRoot, onPatch, onSetRoot, onDuplicate, onDelete, canDelete }: {
  node: DialogueNode;
  nodeIds: string[];
  isRoot: boolean;
  onPatch: (patch: Partial<DialogueNode>) => void;
  onSetRoot: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) => {
  const choices = node.choices ?? [];
  const setChoices = (next: DialogueChoice[]) => onPatch({ choices: next.length ? next : undefined });
  const patchChoice = (id: string, patch: Partial<DialogueChoice>) =>
    setChoices(choices.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const addChoice = () => {
    const id = `choice_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    setChoices([...choices, { id, text: 'Option', nextNodeId: null }]);
  };

  return (
    <div className="space-y-1 rounded bg-slate-900/60 p-1.5">
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="font-mono text-slate-500">{node.id}</span>
        {isRoot ? <span className="rounded bg-amber-600/30 px-1 text-amber-200">root</span>
          : <button onClick={onSetRoot} className="rounded px-1 text-slate-400 hover:bg-slate-800">Set as root</button>}
        <button onClick={onDuplicate} className="ml-auto rounded px-1 text-sky-300 hover:bg-sky-700/30">⧉ dup</button>
        <button onClick={onDelete} disabled={!canDelete} className="rounded px-1 text-red-300 hover:bg-red-700/30 disabled:opacity-30">🗑</button>
      </div>

      <div className="flex gap-1.5">
        <input value={node.speaker} onChange={(e) => onPatch({ speaker: e.target.value })} placeholder="speaker" className={`w-28 ${dinp}`} />
        <input value={node.text} onChange={(e) => onPatch({ text: e.target.value })} placeholder="text" className={`flex-1 ${dinp}`} />
        <select value={node.emotion ?? 'neutral'} onChange={(e) => onPatch({ emotion: e.target.value as DialogueEmotion })} className={dinp}>
          {DIALOGUE_EMOTIONS.map((em) => <option key={em} value={em}>{em}</option>)}
        </select>
      </div>

      {!choices.length && (
        <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-12 shrink-0">next →</span>
          <NodeTarget nodeIds={nodeIds} value={node.nextNodeId} onChange={(v) => onPatch({ nextNodeId: v })} />
        </label>
      )}

      <MechListEditor label="actions" kind="effect" items={node.actions} onChange={(v) => onPatch({ actions: v as DialogueEffect[] | undefined })} />
      <MechListEditor label="cond (gate)" kind="condition" items={node.conditions} onChange={(v) => onPatch({ conditions: v as DialogueCondition[] | undefined })} />
      {!!node.conditions?.length && (
        <label className="flex items-center gap-1.5 pl-6 text-[10px] text-slate-400">
          <span className="w-16 shrink-0">fallback →</span>
          <NodeTarget nodeIds={nodeIds} value={node.fallbackNodeId} onChange={(v) => onPatch({ fallbackNodeId: v })} />
        </label>
      )}

      {choices.map((c) => (
        <DialogueChoiceEditor key={c.id} choice={c} nodeIds={nodeIds} onChange={(patch) => patchChoice(c.id, patch)} onRemove={() => setChoices(choices.filter((x) => x.id !== c.id))} />
      ))}
      <button onClick={addChoice} className="ml-3 rounded px-1.5 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-700/20">+ Choice (branch)</button>
    </div>
  );
};
