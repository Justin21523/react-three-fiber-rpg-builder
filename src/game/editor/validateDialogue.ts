import type { DialogueTree, DialogueNode, DialogueEffect } from '../../types/dialogue';
import { useQuestStore } from '../../stores/questStore';

// Kit — validate an editor dialogue tree: structural integrity (node references), reachability, loop
// detection, and best-effort effect-target resolution (quest targets only — no yokai in the kit).
export interface DialogueValidation { ok: boolean; errors: string[]; warnings: string[]; }

function outEdges(node: DialogueNode): string[] {
  const ids: string[] = [];
  if (node.nextNodeId) ids.push(node.nextNodeId);
  if (node.fallbackNodeId) ids.push(node.fallbackNodeId);
  for (const c of node.choices ?? []) if (c.nextNodeId) ids.push(c.nextNodeId);
  return ids;
}

function effectTargetWarning(e: DialogueEffect): string | null {
  switch (e.type) {
    case 'startQuest':
    case 'completeQuest':
    case 'updateObjective':
    case 'completeObjective':
      if (!useQuestStore.getState().getQuestById(e.questId)) return `effect ${e.type}: quest "${e.questId}" not found`;
      return null;
    default:
      return null;
  }
}

export function validateDialogue(tree: DialogueTree): DialogueValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set(Object.keys(tree.nodes));

  if (!ids.has(tree.rootNodeId)) errors.push(`rootNodeId "${tree.rootNodeId}" not found`);

  for (const node of Object.values(tree.nodes)) {
    if (node.nextNodeId && !ids.has(node.nextNodeId)) errors.push(`node ${node.id}: nextNodeId "${node.nextNodeId}" not found`);
    if (node.fallbackNodeId && !ids.has(node.fallbackNodeId)) errors.push(`node ${node.id}: fallbackNodeId "${node.fallbackNodeId}" not found`);
    for (const c of node.choices ?? []) {
      if (c.nextNodeId && !ids.has(c.nextNodeId)) errors.push(`choice ${c.id} (node ${node.id}): nextNodeId "${c.nextNodeId}" not found`);
      if (c.effect) { const w = effectTargetWarning(c.effect); if (w) warnings.push(w); }
    }
    for (const a of node.actions ?? []) { const w = effectTargetWarning(a); if (w) warnings.push(w); }
  }

  const reachable = new Set<string>();
  const queue = ids.has(tree.rootNodeId) ? [tree.rootNodeId] : [];
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const node = tree.nodes[id];
    if (node) for (const next of outEdges(node)) if (ids.has(next) && !reachable.has(next)) queue.push(next);
  }
  for (const id of ids) if (!reachable.has(id)) warnings.push(`node ${id} is unreachable from root`);

  if (!tree.allowLoop) {
    const WHITE = 0, GREY = 1, BLACK = 2;
    const color: Record<string, number> = {};
    let cycle = false;
    const visit = (id: string) => {
      color[id] = GREY;
      const node = tree.nodes[id];
      for (const next of node ? outEdges(node) : []) {
        if (!ids.has(next)) continue;
        if (color[next] === GREY) { cycle = true; return; }
        if ((color[next] ?? WHITE) === WHITE) { visit(next); if (cycle) return; }
      }
      color[id] = BLACK;
    };
    if (ids.has(tree.rootNodeId)) visit(tree.rootNodeId);
    if (cycle) warnings.push('dialogue contains a loop (set allowLoop to silence)');
  }

  return { ok: errors.length === 0, errors, warnings };
}
