import { useMemo, useState } from 'react';
import { useEditorNpcStore } from '../../stores/editorNpcStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useDialogueStore } from '../../stores/dialogueStore';
import { MODEL_ASSET_LIST } from '../../data/modelLibrary';
import type { DialogueTree, DialogueNode, DialogueEffect } from '../../types/dialogue';

const inp = 'rounded bg-slate-800 px-1.5 py-1 text-[11px] text-slate-100 border border-slate-700';
const btn = 'rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] hover:bg-slate-700';

// Effect kinds the kit's executeEffect understands, with their primary id field label.
const EFFECT_KINDS: { type: DialogueEffect['type']; label: string; field?: string }[] = [
  { type: 'startQuest', label: 'Start quest', field: 'questId' },
  { type: 'completeQuest', label: 'Complete quest', field: 'questId' },
  { type: 'completeObjective', label: 'Complete objective', field: 'questId' },
  { type: 'giveItem', label: 'Give item', field: 'itemId' },
  { type: 'setWorldFlag', label: 'Set flag', field: 'flag' },
  { type: 'closeDialogue', label: 'Close dialogue' },
];

// Kit — NPC + dialogue authoring. Create/place NPCs per area, set their model/colour/position, and edit
// their dialogue tree (nodes, choices, effects). Everything merges into the runtime live (getNpcProfile /
// getDialogueTree) and persists to localStorage.
export const NpcEditorTab = () => {
  const npcs = useEditorNpcStore((s) => s.addedNpcs);
  const trees = useEditorNpcStore((s) => s.dialogueTrees);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  const [selId, setSelId] = useState<string | null>(null);

  const sel = npcs.find((n) => n.id === selId) ?? null;
  const tree = sel?.dialogueTreeId ? trees[sel.dialogueTreeId] : undefined;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-violet-300">NPC / Dialogue</h3>
        <button className={btn} onClick={() => setSelId(useEditorNpcStore.getState().addNpc(areaId, [0, 1, 0]))}>+ New NPC (in {areaId})</button>
      </div>

      {npcs.length === 0 ? (
        <p className="rounded bg-slate-900/60 px-2 py-2 text-[11px] text-slate-400">No NPCs yet. Click “+ New NPC” — it spawns in the current area; select it below to edit its model, position and dialogue.</p>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {npcs.map((n) => (
            <button key={n.id} onClick={() => setSelId(n.id)} className={`truncate rounded border px-2 py-1 text-left ${selId === n.id ? 'border-violet-500 bg-violet-900/30 text-violet-100' : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
              {n.name} <span className="text-[9px] text-slate-500">· {n.areaId}</span>
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="space-y-2 rounded border border-slate-700 bg-slate-900/50 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">id: {sel.id}</span>
            <div className="flex gap-1">
              <button className={btn} onClick={() => sel.dialogueTreeId && useDialogueStore.getState().startDialogue(sel.dialogueTreeId)}>▶ Test talk</button>
              <button className={`${btn} text-red-300`} onClick={() => { useEditorNpcStore.getState().removeNpc(sel.id); if (sel.dialogueTreeId) useEditorNpcStore.getState().removeDialogueTree(sel.dialogueTreeId); setSelId(null); }}>Delete</button>
            </div>
          </div>

          <label className="flex items-center gap-2">Name<input className={`flex-1 ${inp}`} value={sel.name} onChange={(e) => useEditorNpcStore.getState().updateNpc(sel.id, { name: e.target.value })} /></label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1">Colour<input type="color" value={sel.color ?? '#38bdf8'} onChange={(e) => useEditorNpcStore.getState().updateNpc(sel.id, { color: e.target.value })} className="h-6 w-8 rounded bg-slate-800" /></label>
            <label className="flex flex-1 items-center gap-1">Model
              <select className={`flex-1 ${inp}`} value={sel.modelAssetId ?? ''} onChange={(e) => useEditorNpcStore.getState().updateNpc(sel.id, { modelAssetId: e.target.value || undefined })}>
                <option value="">(capsule)</option>
                {MODEL_ASSET_LIST.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Pos</span>
            {(['x', 'y', 'z'] as const).map((axis, i) => (
              <input key={axis} type="number" step={0.5} value={sel.position[i]} onChange={(e) => { const p = [...sel.position] as [number, number, number]; p[i] = parseFloat(e.target.value) || 0; useEditorNpcStore.getState().updateNpc(sel.id, { position: p }); }} className={`w-16 ${inp}`} />
            ))}
          </div>

          {tree && <DialogueTreeEditor tree={tree} />}
        </div>
      )}
    </div>
  );
};

// --- Dialogue tree node editor ---------------------------------------------------------------------
const DialogueTreeEditor = ({ tree }: { tree: DialogueTree }) => {
  const nodeIds = useMemo(() => Object.keys(tree.nodes), [tree]);
  const update = (next: DialogueTree) => useEditorNpcStore.getState().setDialogueTree(next);

  const setNode = (nodeId: string, patch: Partial<DialogueNode>) =>
    update({ ...tree, nodes: { ...tree.nodes, [nodeId]: { ...tree.nodes[nodeId], ...patch } } });

  const addNode = () => {
    const id = `n_${Date.now().toString(36)}`;
    update({ ...tree, nodes: { ...tree.nodes, [id]: { id, speaker: tree.nodes[tree.rootNodeId]?.speaker ?? 'NPC', text: 'New line…', nextNodeId: null } } });
  };
  const removeNode = (nodeId: string) => {
    if (nodeId === tree.rootNodeId) return;
    const nodes = { ...tree.nodes };
    delete nodes[nodeId];
    update({ ...tree, nodes });
  };

  return (
    <div className="space-y-2 rounded border border-slate-700/70 bg-slate-950/40 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Dialogue · root: {tree.rootNodeId}</span>
        <button className={btn} onClick={addNode}>+ Node</button>
      </div>
      {nodeIds.map((nid) => {
        const node = tree.nodes[nid];
        return (
          <div key={nid} className="space-y-1 rounded border border-slate-700 bg-slate-900/60 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">{nid}{nid === tree.rootNodeId ? ' (root)' : ''}</span>
              <div className="flex gap-1">
                {nid !== tree.rootNodeId && <button className={btn} onClick={() => update({ ...tree, rootNodeId: nid })}>Set root</button>}
                {nid !== tree.rootNodeId && <button className={`${btn} text-red-300`} onClick={() => removeNode(nid)}>✕</button>}
              </div>
            </div>
            <input className={`w-full ${inp}`} value={node.speaker} onChange={(e) => setNode(nid, { speaker: e.target.value })} placeholder="Speaker" />
            <textarea className={`w-full ${inp}`} rows={2} value={node.text} onChange={(e) => setNode(nid, { text: e.target.value })} placeholder="Line text" />
            {!node.choices?.length && (
              <label className="flex items-center gap-1 text-[10px] text-slate-400">Then →
                <select className={`flex-1 ${inp}`} value={node.nextNodeId ?? ''} onChange={(e) => setNode(nid, { nextNodeId: e.target.value || null })}>
                  <option value="">(end)</option>
                  {nodeIds.filter((x) => x !== nid).map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
            )}
            <ChoicesEditor tree={tree} nid={nid} setNode={setNode} nodeIds={nodeIds} />
          </div>
        );
      })}
    </div>
  );
};

const ChoicesEditor = ({ tree, nid, setNode, nodeIds }: { tree: DialogueTree; nid: string; setNode: (n: string, p: Partial<DialogueNode>) => void; nodeIds: string[] }) => {
  const node = tree.nodes[nid];
  const choices = node.choices ?? [];
  const setChoices = (next: typeof choices) => setNode(nid, { choices: next.length ? next : undefined, nextNodeId: next.length ? undefined : node.nextNodeId ?? null });

  return (
    <div className="space-y-1 border-t border-slate-800 pt-1">
      <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500">Choices</span>
        <button className={btn} onClick={() => setChoices([...choices, { id: `c_${Date.now().toString(36)}`, text: 'Option', nextNodeId: null }])}>+ Choice</button>
      </div>
      {choices.map((c, ci) => {
        const eff = c.effect;
        const kind = EFFECT_KINDS.find((k) => k.type === eff?.type);
        return (
          <div key={c.id} className="space-y-1 rounded bg-slate-800/60 p-1">
            <div className="flex gap-1">
              <input className={`flex-1 ${inp}`} value={c.text} onChange={(e) => { const n = [...choices]; n[ci] = { ...c, text: e.target.value }; setChoices(n); }} placeholder="Choice text" />
              <select className={inp} value={c.nextNodeId ?? ''} onChange={(e) => { const n = [...choices]; n[ci] = { ...c, nextNodeId: e.target.value || null }; setChoices(n); }}>
                <option value="">→ end</option>
                {nodeIds.map((x) => <option key={x} value={x}>→ {x}</option>)}
              </select>
              <button className={`${btn} text-red-300`} onClick={() => setChoices(choices.filter((_, i) => i !== ci))}>✕</button>
            </div>
            <div className="flex gap-1">
              <select className={inp} value={eff?.type ?? ''} onChange={(e) => { const t = e.target.value as DialogueEffect['type'] | ''; const n = [...choices]; n[ci] = { ...c, effect: t ? buildEffect(t) : undefined }; setChoices(n); }}>
                <option value="">(no effect)</option>
                {EFFECT_KINDS.map((k) => <option key={k.type} value={k.type}>{k.label}</option>)}
              </select>
              {kind?.field && eff && <input className={`flex-1 ${inp}`} value={effPrimary(eff)} onChange={(e) => { const n = [...choices]; n[ci] = { ...c, effect: setEffPrimary(eff, e.target.value) }; setChoices(n); }} placeholder={kind.field} />}
              {eff?.type === 'completeObjective' && <input className={`w-24 ${inp}`} value={eff.objectiveId} onChange={(e) => { const n = [...choices]; n[ci] = { ...c, effect: { ...eff, objectiveId: e.target.value } }; setChoices(n); }} placeholder="objectiveId" />}
            </div>
          </div>
        );
      })}
    </div>
  );
};

function buildEffect(type: DialogueEffect['type']): DialogueEffect {
  switch (type) {
    case 'startQuest': return { type, questId: '' };
    case 'completeQuest': return { type, questId: '' };
    case 'completeObjective': return { type, questId: '', objectiveId: '' };
    case 'giveItem': return { type, itemId: '' };
    case 'setWorldFlag': return { type, flag: '' };
    default: return { type: 'closeDialogue' };
  }
}
function effPrimary(e: DialogueEffect): string {
  if ('questId' in e) return e.questId;
  if ('itemId' in e) return e.itemId;
  if ('flag' in e) return e.flag;
  return '';
}
function setEffPrimary(e: DialogueEffect, v: string): DialogueEffect {
  if (e.type === 'completeObjective') return { ...e, questId: v };
  if ('questId' in e) return { ...e, questId: v };
  if ('itemId' in e) return { ...e, itemId: v };
  if ('flag' in e) return { ...e, flag: v };
  return e;
}
