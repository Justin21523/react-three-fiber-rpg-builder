import type { EditorTrigger } from '../../types/editorTrigger';
import { gateConfig, explorationConfig, itemPickupConfig, dialogueConfig, restPointConfig, battleConfig } from '../../types/editorTrigger';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { getEditorEncounter, getEditorEncounterByTrigger } from '../../stores/editorEncounterStore';
import { startEditorEncounter } from '../battle/startEncounter';
import { evaluateTrigger } from './evaluateTrigger';
import { usePlayerStore } from '../../stores/playerStore';
import { useWorldStore } from '../../stores/worldStore';
import { useFlagStore } from '../../stores/flagStore';
import { useDialogueStore } from '../../stores/dialogueStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useQuestStore } from '../../stores/questStore';
import { useProgressionStore } from '../../stores/progressionStore';
import { executeEffect } from '../executeEffect';
import { runQuestTracking } from '../quest/questTracking';
import { SEED_AREAS } from '../../data/areas';

// Kit — central trigger dispatcher (7 generic types). Used by the InteractionHandler 'editorTrigger'
// branch (E-press) and the inspector Test button. `test` bypasses condition gating + once/cooldown.
// Every successful fire sets `trigger_fired_<id>` / `<code>` flags so quest objectives auto-complete.
export function fireEditorTrigger(t: EditorTrigger | undefined, opts?: { test?: boolean }): { ok: boolean; message: string } {
  if (!t) return { ok: false, message: 'no trigger' };
  if (t.isEnabled === false && !opts?.test) return { ok: false, message: 'Disabled' };
  if (!opts?.test) {
    const ev = evaluateTrigger(t);
    if (!ev.active) return { ok: false, message: ev.reasons.join(', ') };
  }

  let message = '';
  switch (t.triggerType) {
    case 'travelGate':
    case 'zoneGate': {
      const g = gateConfig(t);
      if (g.isLocked) {
        const flagOk = !g.unlockWorldFlag || useFlagStore.getState().hasFlag(g.unlockWorldFlag);
        const questOk = !g.unlockQuestId || useQuestStore.getState().getQuestById(g.unlockQuestId)?.status === 'Completed';
        if (!(flagOk && questOk)) return { ok: false, message: g.lockedMessage || 'This gate is locked.' };
      }
      if (g.costItemId) {
        const need = g.costQuantity ?? 1;
        if (!opts?.test && useInventoryStore.getState().getItemQuantity(g.costItemId) < need) return { ok: false, message: `Need ${need}× ${g.costItemId} to pass.` };
        if (!opts?.test) useInventoryStore.getState().removeItem(g.costItemId, need);
      }
      const area = SEED_AREAS.find((a) => a.id === g.targetAreaId);
      if (!area) return { ok: false, message: `Area not found: ${g.targetAreaId}` };
      const spawn = g.targetPosition ? { x: g.targetPosition[0], y: g.targetPosition[1], z: g.targetPosition[2] } : (area.spawnPoint ?? { x: 0, y: 3, z: 0 });
      usePlayerStore.getState().travelToArea(area.id, spawn);
      if (g.showOnMap !== false) useWorldStore.getState().discoverArea(area.id);
      message = `→ ${area.id}`;
      break;
    }
    case 'explorationPoint': {
      const ex = explorationConfig(t);
      useFlagStore.getState().setFlag(t.id);
      t.onInteractEffects?.forEach(executeEffect);
      (ex.rewardItemIds ?? []).forEach((itemId) => useInventoryStore.getState().addItem(itemId, 1));
      if (ex.expReward) useProgressionStore.getState().addExp(ex.expReward);
      (ex.setWorldFlags ?? []).forEach((f) => useFlagStore.getState().setFlag(f));
      if (ex.consumeOnUse) useEditorTriggerStore.getState().markFired(t.id);
      message = ex.discoveryText ? `explored: ${ex.discoveryText}` : 'explored';
      break;
    }
    case 'interactionPoint': {
      t.onInteractEffects?.forEach(executeEffect);
      message = 'interacted';
      break;
    }
    case 'itemPickup': {
      const ip = itemPickupConfig(t);
      if (!ip.itemId) return { ok: false, message: 'Missing itemId' };
      useInventoryStore.getState().addItem(ip.itemId, ip.quantity ?? 1);
      message = ip.pickupMessage || `got ${ip.itemId} ×${ip.quantity ?? 1}`;
      break;
    }
    case 'dialogueTrigger': {
      const dc = dialogueConfig(t);
      if (!dc.dialogueId) return { ok: false, message: 'Missing dialogueId' };
      useDialogueStore.getState().startDialogue(dc.dialogueId, dc.startNodeId);
      message = 'dialogue';
      break;
    }
    case 'restPoint': {
      const rp = restPointConfig(t);
      message = rp.message || 'rested';
      break;
    }
    case 'battleTrigger':
    case 'bossGate': {
      const b = battleConfig(t);
      const enc = getEditorEncounterByTrigger(t.id) ?? getEditorEncounter(b.encounterId);
      if (!enc) return { ok: false, message: 'No encounter linked (set encounterId)' };
      if (!startEditorEncounter(enc)) return { ok: false, message: 'Could not start battle' };
      message = 'battle';
      break;
    }
  }

  // Common on-fire grants (any type).
  if (!opts?.test) {
    (t.grantItemIds ?? []).forEach((itemId) => useInventoryStore.getState().addItem(itemId, 1));
    if (t.grantExp) useProgressionStore.getState().addExp(t.grantExp);
    (t.setWorldFlags ?? []).forEach((f) => useFlagStore.getState().setFlag(f));
    if (t.playDialogueId) useDialogueStore.getState().startDialogue(t.playDialogueId);
    // Generic "this trigger fired" flags drive useTravelGate / inspectObject / triggerEvent objectives.
    useFlagStore.getState().setFlag(`trigger_fired_${t.id}`);
    if (t.code) useFlagStore.getState().setFlag(`trigger_fired_${t.code}`);
  }

  if (!opts?.test && (t.onceOnly || (t.cooldownSeconds ?? 0) > 0)) useEditorTriggerStore.getState().markFired(t.id);
  runQuestTracking();
  return { ok: true, message };
}
