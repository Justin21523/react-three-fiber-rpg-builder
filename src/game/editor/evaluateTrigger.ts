import type { EditorTrigger } from '../../types/editorTrigger';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useQuestStore } from '../../stores/questStore';
import { useFlagStore } from '../../stores/flagStore';
import { useProgressionStore } from '../../stores/progressionStore';

// Kit — whether a trigger can fire right now: enabled, required quest/item/flag/level, not already used
// (onceOnly), past its cooldown. Shared by the renderer (debug), inspector preview, and the dispatcher.
export function evaluateTrigger(t: EditorTrigger): { active: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const store = useEditorTriggerStore.getState();

  if (t.isEnabled === false) reasons.push('Disabled');
  if (t.requiredQuestId) {
    const want = t.requiredQuestStatus ?? 'Completed';
    if (useQuestStore.getState().getQuestById(t.requiredQuestId)?.status !== want) reasons.push(`Requires quest ${t.requiredQuestId} = ${want}`);
  }
  if (t.requiredPlayerLevel && useProgressionStore.getState().level < t.requiredPlayerLevel) reasons.push(`Requires player level ${t.requiredPlayerLevel}`);
  if (t.requiredItemId && !useInventoryStore.getState().hasItem(t.requiredItemId)) reasons.push(`Requires item ${t.requiredItemId}`);
  if (t.requiredWorldFlag && !useFlagStore.getState().hasFlag(t.requiredWorldFlag)) reasons.push(`Requires flag ${t.requiredWorldFlag}`);
  if (t.onceOnly && store.firedOnce[t.id]) reasons.push('Already fired (onceOnly)');
  if (t.cooldownSeconds && t.cooldownSeconds > 0) {
    const last = store.lastFiredAt[t.id];
    if (last !== undefined && Date.now() - last < t.cooldownSeconds * 1000) reasons.push(`On cooldown (${t.cooldownSeconds}s)`);
  }
  return { active: reasons.length === 0, reasons };
}
