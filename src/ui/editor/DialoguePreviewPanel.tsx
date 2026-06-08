import type { DialogueNode } from '../../types/dialogue';
import { getDialogueTree } from '../../game/dialogue/dialogueRegistry';
import { useDialogueStore } from '../../stores/dialogueStore';
import { useUiStore } from '../../stores/uiStore';
import { validateDialogue } from '../../game/editor/validateDialogue';

// Kit — read-only walkthrough of a dialogue tree + a button to play it in the real in-game DialogueBox
// (which resolves editor trees via getDialogueTree).
export const DialoguePreviewPanel = ({ treeId }: { treeId: string }) => {
  const tree = getDialogueTree(treeId);
  const startDialogue = useDialogueStore((s) => s.startDialogue);
  const closeHub = useUiStore((s) => s.toggleEditorHub);
  if (!tree) return <p className="text-xs text-slate-500">Dialogue tree not found.</p>;

  const seen = new Set<string>();
  const flow: DialogueNode[] = [];
  let cur: string | null = tree.rootNodeId;
  while (cur && tree.nodes[cur] && !seen.has(cur)) {
    seen.add(cur);
    const node: DialogueNode = tree.nodes[cur];
    flow.push(node);
    cur = node.choices?.length ? null : (node.nextNodeId ?? null);
  }

  const play = () => { closeHub(); startDialogue(tree.id); };
  const valid = validateDialogue(tree);

  return (
    <div className="space-y-2">
      <button onClick={play} className="rounded-md border border-violet-600/50 bg-violet-600/25 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-600/35">▶ Preview in game</button>
      {(!valid.ok || valid.warnings.length > 0) && (
        <div className={`rounded border px-2 py-1 text-[10px] ${valid.ok ? 'border-amber-700/50 bg-amber-900/20 text-amber-200' : 'border-red-700/50 bg-red-900/30 text-red-200'}`}>
          {[...valid.errors.map((e) => `⛔ ${e}`), ...valid.warnings.map((w) => `⚠ ${w}`)].join(' · ')}
        </div>
      )}
      <div className="space-y-1 rounded bg-slate-900/60 p-2 text-[11px]">
        {flow.map((node) => (
          <div key={node.id}>
            <span className="font-semibold text-fuchsia-200">{node.speaker}:</span>{' '}
            <span className="text-slate-200">{node.text}</span>
            {node.choices?.length ? (
              <div className="mt-0.5 space-y-0.5 pl-3 text-slate-400">
                {node.choices.map((c) => <div key={c.id}>↳ {c.text} → {c.nextNodeId ?? '(end)'}</div>)}
              </div>
            ) : null}
          </div>
        ))}
        {flow.length === 0 && <p className="text-slate-500">(empty dialogue tree)</p>}
      </div>
    </div>
  );
};
