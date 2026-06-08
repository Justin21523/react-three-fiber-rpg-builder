// Kit — generic quest model. The yokai-flavoured rewards (party exp, friendship, codex, weakness, …)
// and the auto-director / board / chain machinery were game-specific and removed. A quest grants a
// plain QuestReward on completion (items + player exp + world flags) routed through a single, swappable
// `onQuestReward` hook (see questStore) so a consumer can plug their own combat/loot/economy.
export type QuestStatus = 'NotStarted' | 'InProgress' | 'Completed' | 'Failed';

export interface QuestObjective {
  id: string;
  description: string;
  isCompleted: boolean;
  // Optional auto-tracking hint (from the Quest editor): the generic tracker flips isCompleted when the
  // matching live store signal is satisfied (e.g. collectItem → inventory has `count` of `targetId`).
  track?: { type: string; targetId?: string; count?: number };
}

export interface QuestReward {
  items?: { itemId: string; quantity?: number }[];
  exp?: number;      // player experience
  flags?: string[];  // world flags set on completion
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  status: QuestStatus;
  reward?: QuestReward;
  source?: 'seed' | 'runtime'; // seed quests rebuild from data; runtime quests are saved in full
  giverNpcId?: string;         // NPC that offers / receives this quest (optional)
  requiredPlayerLevel?: number;
}
