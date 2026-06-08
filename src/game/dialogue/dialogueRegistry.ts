import type { DialogueTree } from '../../types/dialogue';
import { SEED_DIALOGUES } from '../../data/dialogues';

// Kit — resolve a dialogue tree by id from the authored seed trees. (The yokai game also merged
// in-editor-authored trees here; that NPC/dialogue editor is a Phase-D extension point.) Runtime
// `tempTrees` are handled by the dialogue store directly.
export function getDialogueTree(id: string | null | undefined): DialogueTree | undefined {
  if (!id) return undefined;
  return SEED_DIALOGUES.find((t) => t.id === id);
}

export function listDialogueTreeIds(): string[] {
  return SEED_DIALOGUES.map((t) => t.id);
}
