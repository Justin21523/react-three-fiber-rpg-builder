import type { DialogueTree } from '../../types/dialogue';
import { SEED_DIALOGUES } from '../../data/dialogues';
import { getEditorDialogueTree, useEditorNpcStore } from '../../stores/editorNpcStore';

// Kit — resolve a dialogue tree by id from editor-authored trees (🧑 NPC tab) ⊕ the authored seed trees.
// Runtime `tempTrees` are handled by the dialogue store directly (checked before this).
export function getDialogueTree(id: string | null | undefined): DialogueTree | undefined {
  if (!id) return undefined;
  return getEditorDialogueTree(id) ?? SEED_DIALOGUES.find((t) => t.id === id);
}

export function listDialogueTreeIds(): { id: string; source: 'editor' | 'seed' }[] {
  const editor = Object.keys(useEditorNpcStore.getState().dialogueTrees).map((id) => ({ id, source: 'editor' as const }));
  const seedIds = new Set(editor.map((e) => e.id));
  const seed = SEED_DIALOGUES.filter((t) => !seedIds.has(t.id)).map((t) => ({ id: t.id, source: 'seed' as const }));
  return [...editor, ...seed];
}
