import type { DialogueTree } from '../types/dialogue';

// Kit — sample dialogue trees. `dlg_guide` shows choices, a startQuest effect, a node-entry action
// (completeObjective), and a condition-gated branch. The door trees are system messages reused by the
// interaction handler.
export const SEED_DIALOGUES: DialogueTree[] = [
  {
    id: 'dlg_guide',
    rootNodeId: 'start',
    nodes: {
      // Once the quest is done, greet differently (condition redirect → fallback).
      start: {
        id: 'start',
        speaker: 'Village Guide',
        text: 'Ah, you again! Could you help me open the old storehouse?',
        emotion: 'happy',
        conditions: [{ type: 'questCompleted', targetId: 'quest_intro' }],
        fallbackNodeId: 'offer',
        nextNodeId: 'thanks',
      },
      thanks: {
        id: 'thanks',
        speaker: 'Village Guide',
        text: 'Thanks again for opening that storehouse. The herbs inside were a fine reward!',
        emotion: 'excited',
        nextNodeId: null,
      },
      offer: {
        id: 'offer',
        speaker: 'Village Guide',
        text: 'The storehouse has been locked for years. Will you find the key and open it?',
        choices: [
          { id: 'accept', text: 'Of course — I will help.', nextNodeId: 'accepted', effect: { type: 'startQuest', questId: 'quest_intro' } },
          { id: 'decline', text: 'Maybe later.', nextNodeId: null },
        ],
      },
      accepted: {
        id: 'accepted',
        speaker: 'Village Guide',
        text: 'Wonderful! The Old Key is somewhere out in the field. Bring it to the storehouse door.',
        emotion: 'happy',
        actions: [{ type: 'completeObjective', questId: 'quest_intro', objectiveId: 'obj_talk' }],
        nextNodeId: null,
      },
    },
  },
  {
    id: 'dialogue_door_locked',
    rootNodeId: 'n',
    nodes: { n: { id: 'n', speaker: 'System', text: 'The storehouse door is locked tight. You need a key.', nextNodeId: null } },
  },
  {
    id: 'dialogue_door_unlocked',
    rootNodeId: 'n',
    nodes: { n: { id: 'n', speaker: 'System', text: 'The old key turns with a satisfying clunk — the storehouse creaks open!', nextNodeId: null } },
  },
];
