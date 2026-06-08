import type { DialogueEffect } from '../types/dialogue';

// Kit — per-area interactable placements (NPCs, world items, doors). Data-driven so SampleEntities can
// render them and the InteractionHandler can resolve pickup effects. This is the generic stand-in for
// the yokai game's much larger area-content definitions; place your own here or via the editor.
export interface NpcPlacement {
  npcId: string;
  position: [number, number, number];
}
export interface ItemPlacement {
  itemId: string;
  position: [number, number, number];
  onPickupEffects?: DialogueEffect[]; // e.g. tick a quest objective when collected
}
export interface DoorPlacement {
  doorId: string;
  position: [number, number, number];
}
export interface AreaEntities {
  npcs?: NpcPlacement[];
  items?: ItemPlacement[];
  doors?: DoorPlacement[];
}

export const AREA_ENTITIES: Record<string, AreaEntities> = {
  area_field: {
    npcs: [{ npcId: 'npc_guide', position: [4, 1, 5] }],
    items: [
      {
        itemId: 'item_old_key',
        position: [-8, 1, 10],
        onPickupEffects: [{ type: 'completeObjective', questId: 'quest_intro', objectiveId: 'obj_key' }],
      },
    ],
    doors: [{ doorId: 'door_storehouse', position: [12, 1.5, -4] }],
  },
};

export function getAreaEntities(areaId: string): AreaEntities | undefined {
  return AREA_ENTITIES[areaId];
}
