import type { DialogueNode, DialogueTree } from '../../types/dialogue';
import { useEditorNpcStore } from '../../stores/editorNpcStore';
import { validateDialogue } from '../../game/editor/validateDialogue';
import { DialogueNodeEditor } from './DialogueNodeEditor';

let idSeq = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${idSeq++}`;

// Kit — dialogue tree editor. Lists nodes (each edited via DialogueNodeEditor), supports add/duplicate/
// delete + set-root, and shows a live validation summary. Rebuilds the tree immutably on each change.
export const DialogueTreeEditor = ({ treeId }: { treeId: string }) => {
  const tree = useEditorNpcStore((s) => s.dialogueTrees[treeId]);
  const upsert = useEditorNpcStore((s) => s.setDialogueTree);
  if (!tree) return <p className="text-xs text-slate-500">Dialogue tree not found.</p>;

  const nodeIds = Object.keys(tree.nodes);
  const save = (next: DialogueTree) => upsert(next);
  const valid = validateDialogue(tree);

  const patchNode = (nodeId: string, patch: Partial<DialogueNode>) =>
    save({ ...tree, nodes: { ...tree.nodes, [nodeId]: { ...tree.nodes[nodeId], ...patch } } });

  const addNode = () => {
    const id = newId('node');
    save({ ...tree, nodes: { ...tree.nodes, [id]: { id, speaker: 'NPC', text: '...', nextNodeId: null } } });
  };

  const duplicateNode = (nodeId: string) => {
    const src = tree.nodes[nodeId];
    if (!src) return;
    const id = newId('node');
    const clone: DialogueNode = { ...src, id, choices: src.choices?.map((c) => ({ ...c, id: newId('choice') })) };
    save({ ...tree, nodes: { ...tree.nodes, [id]: clone } });
  };

  const deleteNode = (nodeId: string) => {
    if (nodeIds.length <= 1) return;
    const nodes = { ...tree.nodes };
    delete nodes[nodeId];
    const rootNodeId = tree.rootNodeId === nodeId ? Object.keys(nodes)[0] : tree.rootNodeId;
    save({ ...tree, rootNodeId, nodes });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Tree <span className="text-slate-300">{tree.id}</span> · root {tree.rootNodeId}</span>
        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1 text-[10px] text-slate-400">
            <input type="checkbox" checked={!!tree.allowLoop} onChange={(e) => save({ ...tree, allowLoop: e.target.checked })} className="accent-sky-500" /> allowLoop
          </label>
          <button onClick={addNode} className="rounded border border-violet-600/50 bg-violet-600/20 px-2 py-0.5 text-[11px] text-violet-100 hover:bg-violet-600/30">+ Node</button>
        </div>
      </div>

      {(!valid.ok || valid.warnings.length > 0) && (
        <div className={`rounded border px-2 py-1 text-[10px] ${valid.ok ? 'border-amber-700/50 bg-amber-900/20 text-amber-200' : 'border-red-700/50 bg-red-900/30 text-red-200'}`}>
          {[...valid.errors.map((e) => `⛔ ${e}`), ...valid.warnings.map((w) => `⚠ ${w}`)].join(' · ')}
        </div>
      )}

      <div className="space-y-2">
        {nodeIds.map((nid) => (
          <DialogueNodeEditor
            key={nid}
            node={tree.nodes[nid]}
            nodeIds={nodeIds}
            isRoot={tree.rootNodeId === nid}
            canDelete={nodeIds.length > 1}
            onPatch={(patch) => patchNode(nid, patch)}
            onSetRoot={() => save({ ...tree, rootNodeId: nid })}
            onDuplicate={() => duplicateNode(nid)}
            onDelete={() => deleteNode(nid)}
          />
        ))}
      </div>
    </div>
  );
};
