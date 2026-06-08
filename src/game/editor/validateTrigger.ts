import type { EditorTrigger } from '../../types/editorTrigger';
import { EDITOR_TRIGGER_TYPES, gateConfig } from '../../types/editorTrigger';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { useQuestStore } from '../../stores/questStore';
import { SEED_AREAS } from '../../data/areas';

// Kit — validate an editor trigger. Pure (takes a context). Human-readable errors; the UI shows them.
export interface TriggerValidationContext {
  allTriggers: EditorTrigger[];
  knownAreaIds: Set<string>;
  knownQuestIds: Set<string>;
}

const COORD_LIMIT = 5000;

export function validateTrigger(t: EditorTrigger, ctx: TriggerValidationContext): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!EDITOR_TRIGGER_TYPES.includes(t.triggerType)) errors.push(`Unknown triggerType "${t.triggerType}"`);
  if (t.code) {
    const dupes = ctx.allTriggers.filter((o) => o.code === t.code);
    if (dupes.length > 1) errors.push(`Duplicate code "${t.code}"`);
  }
  const isGate = t.triggerType === 'travelGate' || t.triggerType === 'zoneGate';
  if (isGate) {
    const g = gateConfig(t);
    if (!g.targetAreaId) errors.push('Gate is missing targetAreaId');
    else if (!ctx.knownAreaIds.has(g.targetAreaId)) errors.push(`targetAreaId "${g.targetAreaId}" does not exist`);
  }
  if (t.triggerType === 'itemPickup' && !t.itemPickup?.itemId) errors.push('Item Pickup needs itemId');
  if (t.triggerType === 'dialogueTrigger' && !t.dialogue?.dialogueId) errors.push('Dialogue Trigger needs dialogueId');
  if (t.requiredQuestId && !ctx.knownQuestIds.has(t.requiredQuestId)) errors.push(`requiredQuestId "${t.requiredQuestId}" does not exist`);
  if (t.position.some((c) => !Number.isFinite(c) || Math.abs(c) > COORD_LIMIT)) errors.push('Position out of range');
  if ((t.scale ?? 1) <= 0) errors.push('Scale must be > 0');
  if (t.size.some((c) => c <= 0)) errors.push('Size components must be > 0');
  return { ok: errors.length === 0, errors };
}

function buildContext(): TriggerValidationContext {
  return {
    allTriggers: useEditorTriggerStore.getState().triggers,
    knownAreaIds: new Set<string>(SEED_AREAS.map((a) => a.id)),
    knownQuestIds: new Set<string>(Object.keys(useQuestStore.getState().quests)),
  };
}

export function validateTriggerLive(t: EditorTrigger): { ok: boolean; errors: string[] } {
  return validateTrigger(t, buildContext());
}
