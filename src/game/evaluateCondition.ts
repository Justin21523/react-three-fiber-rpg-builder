import type { DialogueCondition } from '../types/dialogue';
import { useInventoryStore } from '../stores/inventoryStore';
import { useQuestStore } from '../stores/questStore';
import { useDoorStore } from '../stores/doorStore';
import { useFlagStore } from '../stores/flagStore';
import { useProgressionStore } from '../stores/progressionStore';

// Kit — evaluate a generic dialogue/choice condition against the live stores. Add a case here when you
// add a condition kind to DialogueCondition.
export function evaluateCondition(cond: DialogueCondition): boolean {
  switch (cond.type) {
    case 'hasItem':
      return useInventoryStore.getState().hasItem(cond.targetId);
    case 'questInProgress':
      return useQuestStore.getState().getQuestById(cond.targetId)?.status === 'InProgress';
    case 'questCompleted':
      return useQuestStore.getState().getQuestById(cond.targetId)?.status === 'Completed';
    case 'objectiveCompleted': {
      const quest = useQuestStore.getState().getQuestById(cond.questId);
      return quest?.objectives.find((o) => o.id === cond.objectiveId)?.isCompleted ?? false;
    }
    case 'doorUnlocked':
      return useDoorStore.getState().isUnlocked(cond.doorId);
    case 'worldFlagSet':
      return useFlagStore.getState().hasFlag(cond.flag);
    case 'playerLevel':
      return useProgressionStore.getState().level >= cond.level;
  }
}
