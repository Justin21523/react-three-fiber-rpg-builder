import type { DialogueEffect } from '../types/dialogue';
import { useInventoryStore } from '../stores/inventoryStore';
import { useQuestStore } from '../stores/questStore';
import { useFlagStore } from '../stores/flagStore';
import { useDialogueStore } from '../stores/dialogueStore';
import { getEditorEncounter } from '../stores/editorEncounterStore';
import { startEditorEncounter } from './battle/startEncounter';
import { useActivityStore } from '../stores/activityStore';

// Kit — apply a generic dialogue/choice/quest effect to the live stores. Add a case here when you add
// an effect kind to DialogueEffect.
export function executeEffect(effect: DialogueEffect): void {
  switch (effect.type) {
    case 'addItem':
    case 'giveItem':
      useInventoryStore.getState().addItem(effect.itemId, effect.quantity ?? 1);
      break;
    case 'updateObjective':
    case 'completeObjective':
      useQuestStore.getState().updateObjective(effect.questId, effect.objectiveId, true);
      break;
    case 'startQuest':
      useQuestStore.getState().startQuest(effect.questId);
      break;
    case 'completeQuest':
      useQuestStore.getState().completeQuest(effect.questId);
      break;
    case 'setWorldFlag':
      useFlagStore.getState().setFlag(effect.flag);
      break;
    case 'startBattle':
      useDialogueStore.getState().endDialogue();
      startEditorEncounter(getEditorEncounter(effect.encounterId));
      break;
    case 'startActivity':
      useDialogueStore.getState().endDialogue();
      useActivityStore.getState().startActivity(effect.activityId);
      break;
    case 'closeDialogue':
      useDialogueStore.getState().endDialogue();
      break;
  }
}
