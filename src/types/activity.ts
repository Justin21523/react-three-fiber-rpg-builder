// Kit — generic, playable mini-game (activity) model. Each activity is a self-contained DOM mini-game
// (no 3D arena / yokai). Win when the final score reaches targetScore.
export type ActivityType = 'reaction' | 'clicker' | 'memory';
export const ACTIVITY_TYPES: ActivityType[] = ['reaction', 'clicker', 'memory'];

export interface ActivityReward {
  items?: { itemId: string; quantity?: number }[];
  exp?: number;
  flags?: string[];
}

export interface ActivityDefinition {
  id: string;
  name: string;
  type: ActivityType;
  description: string;
  durationSec: number;   // clicker: time limit; reaction/memory: soft cap
  targetScore: number;   // score needed to "win"
  reward: ActivityReward;
  modelAssetId?: string;
}
