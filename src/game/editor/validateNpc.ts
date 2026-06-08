import type { EditorNpc } from '../../types/editorNPC';
import { getModelAsset } from '../../data/modelLibrary';
import { getDialogueTree } from '../dialogue/dialogueRegistry';
import { useEditorNpcStore } from '../../stores/editorNpcStore';
import { useQuestStore } from '../../stores/questStore';

// Kit — validate an Editor NPC against live registries. Blocking errors + non-blocking warnings; the
// inspector shows them, the project export never blocks on them.
export interface NpcValidation { ok: boolean; errors: string[]; warnings: string[]; }

function questKnown(id: string): boolean {
  return !!useQuestStore.getState().getQuestById(id);
}

export function validateNpc(n: EditorNpc, all: EditorNpc[]): NpcValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (n.code) {
    const dup = all.some((o) => o.id !== n.id && o.code && o.code === n.code);
    if (dup) errors.push(`code "${n.code}" is not unique`);
  }
  if (n.dialogueTreeId && !getDialogueTree(n.dialogueTreeId)) {
    errors.push(`dialogueTreeId "${n.dialogueTreeId}" not found`);
  }
  const questFields: [string, string[] | undefined][] = [
    ['startsQuestIds', n.startsQuestIds],
    ['completesQuestIds', n.completesQuestIds],
    ['relatedQuestIds', n.relatedQuestIds],
  ];
  for (const [field, ids] of questFields) {
    for (const id of ids ?? []) {
      if (!questKnown(id)) warnings.push(`${field}: quest "${id}" not found (sync it to the game?)`);
    }
  }
  if (n.modelAssetId && !getModelAsset(n.modelAssetId)) {
    errors.push(`modelAssetId "${n.modelAssetId}" not in catalog`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function validateNpcLive(n: EditorNpc): NpcValidation {
  return validateNpc(n, useEditorNpcStore.getState().addedNpcs);
}
