import type { DialogueTree } from '../../types/dialogue';
import { SEED_DIALOGUES } from '../../data/dialogues';
import { getEditorDialogueTree, useEditorNpcStore } from '../../stores/editorNpcStore';

// Kit — resolve a dialogue tree by id from editor-authored trees (🧑 NPC tab) ⊕ the authored seed trees.
// Runtime `tempTrees` are handled by the dialogue store directly (checked before this).
export function getDialogueTree(id: string | null | undefined): DialogueTree | undefined {
  if (!id) return undefined;
  return getEditorDialogueTree(id) ?? SEED_DIALOGUES.find((t) => t.id === id);
}

export function listDialogueTreeIds(): string[] {
  const editor = Object.keys(useEditorNpcStore.getState().dialogueTrees);
  return [...new Set([...editor, ...SEED_DIALOGUES.map((t) => t.id)])];
}
