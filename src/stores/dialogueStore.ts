import { create } from 'zustand';
import type { DialogueTree, DialogueNode } from '../types/dialogue';
import { getDialogueTree } from '../game/dialogue/dialogueRegistry';
import { executeEffect } from '../game/executeEffect';
import { evaluateCondition } from '../game/evaluateCondition';

// Kit — active dialogue traversal. Resolves trees from runtime `tempTrees` first (e.g. a procedurally
// built conversation) then the seed registry. Node-entry actions fire exactly once per visit; node
// conditions can redirect to a fallback node. Generic — engine-agnostic effects/conditions only.
interface DialogueState {
  isActive: boolean;
  currentTreeId: string | null;
  currentNodeId: string | null;
  tempTrees: DialogueTree[];
  startDialogue: (treeId: string, startNodeId?: string) => void;
  selectChoice: (choiceId: string) => void;
  advanceDialogue: () => void;
  endDialogue: () => void;
  registerTempTree: (tree: DialogueTree) => void;
  clearTempTrees: () => void;
}

let lastActionedKey: string | null = null;

export const useDialogueStore = create<DialogueState>((set, get) => {
  const resolveTree = (treeId: string): DialogueTree | undefined =>
    get().tempTrees.find((t) => t.id === treeId) ?? getDialogueTree(treeId);

  const enterNode = (treeId: string, nodeId: string): void => {
    const tree = resolveTree(treeId);
    let node: DialogueNode | undefined = tree?.nodes[nodeId];
    let guard = 0;
    while (node && node.conditions && node.conditions.length > 0 && !node.conditions.every(evaluateCondition)) {
      const fb = node.fallbackNodeId;
      if (!fb) { get().endDialogue(); return; }
      nodeId = fb;
      node = tree?.nodes[fb];
      if (++guard > 32) { get().endDialogue(); return; }
    }
    if (!node) { get().endDialogue(); return; }

    set({ isActive: true, currentTreeId: treeId, currentNodeId: nodeId });

    const key = `${treeId}::${nodeId}`;
    if (node.actions && node.actions.length > 0 && lastActionedKey !== key) {
      lastActionedKey = key;
      node.actions.forEach(executeEffect);
    }
  };

  return {
    isActive: false,
    currentTreeId: null,
    currentNodeId: null,
    tempTrees: [],

    startDialogue: (treeId, startNodeId) => {
      const tree = resolveTree(treeId);
      if (!tree) return;
      lastActionedKey = null;
      enterNode(treeId, startNodeId ?? tree.rootNodeId);
    },

    selectChoice: (choiceId) => {
      const { currentTreeId, currentNodeId } = get();
      if (!currentTreeId || !currentNodeId) return;
      const tree = resolveTree(currentTreeId);
      const selected = tree?.nodes[currentNodeId]?.choices?.find((c) => c.id === choiceId);
      if (!selected) return;
      if (selected.effect) executeEffect(selected.effect);
      if (selected.nextNodeId) enterNode(currentTreeId, selected.nextNodeId);
      else get().endDialogue();
    },

    advanceDialogue: () => {
      const { currentTreeId, currentNodeId } = get();
      if (!currentTreeId || !currentNodeId) return;
      const node = resolveTree(currentTreeId)?.nodes[currentNodeId];
      if (node?.nextNodeId) enterNode(currentTreeId, node.nextNodeId);
      else get().endDialogue();
    },

    endDialogue: () => {
      lastActionedKey = null;
      set({ isActive: false, currentTreeId: null, currentNodeId: null });
    },

    registerTempTree: (tree) => set((s) => ({ tempTrees: [...s.tempTrees, tree] })),
    clearTempTrees: () => set({ tempTrees: [] }),
  };
});
