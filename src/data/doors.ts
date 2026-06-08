// Kit — sample lockable doors. A door is opened by consuming/holding its `unlockItemId`; unlocking can
// optionally tick a quest objective.
export interface DoorDef {
  id: string;
  label: string;
  unlockItemId: string;
  linkedQuestId?: string;
  linkedObjectiveId?: string;
}

export const SEED_DOORS: DoorDef[] = [
  {
    id: 'door_storehouse',
    label: 'Storehouse Door',
    unlockItemId: 'item_old_key',
    linkedQuestId: 'quest_intro',
    linkedObjectiveId: 'obj_open_door',
  },
];

export function getDoorDef(id: string): DoorDef | undefined {
  return SEED_DOORS.find((d) => d.id === id);
}
