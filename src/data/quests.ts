import type { Quest } from '../types/quest';

// Kit — sample quest. Objectives auto-complete the quest when all are done; the reward (items + player
// exp + a world flag) flows through questStore's onQuestReward hook.
export const SEED_QUESTS: Quest[] = [
  {
    id: 'quest_intro',
    title: 'A Helping Hand',
    description: 'Talk to the Village Guide, find the Old Key in the field, and open the storehouse.',
    status: 'NotStarted',
    source: 'seed',
    giverNpcId: 'npc_guide',
    objectives: [
      { id: 'obj_talk', description: 'Speak with the Village Guide', isCompleted: false },
      { id: 'obj_key', description: 'Find the Old Key', isCompleted: false },
      { id: 'obj_open_door', description: 'Open the storehouse door', isCompleted: false },
    ],
    reward: { items: [{ itemId: 'item_herb', quantity: 2 }], exp: 50, flags: ['intro_done'] },
  },
];
