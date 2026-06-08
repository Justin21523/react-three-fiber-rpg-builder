import type { EditorQuest } from '../../types/editorQuest';
import { useEditorQuestStore } from '../../stores/editorQuestStore';
import { getQuest } from './editorQuestToQuest';
import { getNpcProfile } from '../../data/npcs';
import { getItem } from '../../data/items';
import { SEED_AREAS } from '../../data/areas';

// Kit — validate an editor quest. Blocking errors (structural) + non-blocking warnings (best-effort
// reference resolution). The inspector shows them; nothing blocks authoring/export.
export interface QuestValidation { ok: boolean; errors: string[]; warnings: string[]; }

const areaExists = (id: string): boolean => SEED_AREAS.some((a) => a.id === id);

// Objective kinds that don't strictly require a target id.
const TARGET_OPTIONAL = new Set(['visitArea', 'reachLocation', 'collectItem', 'custom']);

export function validateQuest(eq: EditorQuest, all: EditorQuest[]): QuestValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (eq.code && all.some((o) => o.id !== eq.id && o.code === eq.code)) errors.push(`code "${eq.code}" is not unique`);
  if (!eq.title.trim()) errors.push('title is empty');

  const seen = new Set<string>();
  for (const o of eq.objectives) {
    if (seen.has(o.id)) errors.push(`duplicate objective id ${o.id}`);
    seen.add(o.id);
    if (!TARGET_OPTIONAL.has(o.type) && !o.targetId && !o.relatedTriggerId && !o.relatedAreaId) {
      warnings.push(`objective "${o.type}" has no target`);
    }
  }
  if (eq.objectives.length === 0) errors.push('quest has no objectives');

  for (const r of eq.rewards) {
    if (r.type === 'item' && r.targetId && !getItem(r.targetId)) warnings.push(`reward item "${r.targetId}" not found`);
    if (r.type === 'unlockArea' && r.targetId && !areaExists(r.targetId)) warnings.push(`reward unlockArea: area "${r.targetId}" not found`);
  }

  if (eq.startingNPCId && !getNpcProfile(eq.startingNPCId)) warnings.push(`startingNPCId "${eq.startingNPCId}" not found`);
  for (const p of eq.prerequisiteQuestIds) if (!getQuest(p)) warnings.push(`prerequisite quest "${p}" not found`);
  for (const a of eq.unlocksAreaIds) if (!areaExists(a)) warnings.push(`unlocksAreaIds: area "${a}" not found`);

  return { ok: errors.length === 0, errors, warnings };
}

export function validateQuestLive(eq: EditorQuest): QuestValidation {
  return validateQuest(eq, useEditorQuestStore.getState().quests);
}
