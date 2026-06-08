// Kit — an Editor-authored quest. Persisted to its own store; converted at runtime into the kit Quest
// shape (editorQuestToQuest) and registered into questStore, so the existing tracker / UI / reward / NPC
// giver / turn-in machinery applies. Generic subset — yokai objective/reward kinds are dropped.

export type QuestCategory = 'main' | 'side' | 'daily' | 'exploration' | 'activity' | 'tutorial';
export const QUEST_CATEGORIES: QuestCategory[] = ['main', 'side', 'daily', 'exploration', 'activity', 'tutorial'];

// Objective kinds the editor exposes (mapped to a generic `track` hint by the converter).
export type EditorObjectiveType =
  | 'talkToNPC'
  | 'collectItem'
  | 'visitArea'
  | 'inspectObject'
  | 'unlockDoor'
  | 'triggerEvent'
  | 'reachLocation'
  | 'useTravelGate'
  | 'defeatEnemy'
  | 'custom';

export const EDITOR_OBJECTIVE_TYPES: EditorObjectiveType[] = [
  'talkToNPC', 'collectItem', 'visitArea', 'inspectObject', 'unlockDoor',
  'triggerEvent', 'reachLocation', 'useTravelGate', 'defeatEnemy', 'custom',
];

export interface EditorObjective {
  id: string;
  type: EditorObjectiveType;
  description?: string;          // optional override; else auto-described
  targetId?: string;            // primary target (npc/item/area/object/door/event/gate)
  requiredCount?: number;       // count-based objectives (collect…)
  isOptional?: boolean;
  markerPosition?: [number, number, number]; // world quest marker
  markerModelAssetId?: string;
  markerColor?: string;
  markerAnimation?: string;
  relatedTriggerId?: string;    // links to an editor trigger (inspect / gate / event)
  relatedAreaId?: string;       // links to an area (reachLocation / visit)
}

export type EditorRewardType = 'exp' | 'item' | 'unlockArea' | 'unlockQuest' | 'worldFlag' | 'currency';
export const EDITOR_REWARD_TYPES: EditorRewardType[] = ['exp', 'item', 'unlockArea', 'unlockQuest', 'worldFlag', 'currency'];

export interface EditorReward {
  id: string;
  type: EditorRewardType;
  amount?: number;
  targetId?: string;  // item id / area id / quest id / flag
}

export interface EditorQuest {
  id: string;
  code: string;
  title: string;
  description: string;
  category: QuestCategory;
  recommendedLevel: number;
  startingNPCId?: string;       // NPC who offers it (becomes giverNpcId)
  prerequisiteQuestIds: string[];
  relatedAreaIds: string[];
  relatedNPCIds: string[];
  objectives: EditorObjective[];
  rewards: EditorReward[];
  unlocksAreaIds: string[];
  unlocksQuestIds: string[];
  setsWorldFlags: string[];
  repeatable?: boolean;
  daily?: boolean;
  tags: string[];
  isEnabled?: boolean;
}

let qSeq = 0;
const rid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(qSeq += 1)}`;

export function makeObjective(type: EditorObjectiveType = 'talkToNPC'): EditorObjective {
  return { id: rid('obj'), type, requiredCount: 1 };
}
export function makeReward(type: EditorRewardType = 'exp'): EditorReward {
  return { id: rid('rwd'), type, amount: type === 'exp' ? 50 : 1 };
}
export function createDefaultEditorQuest(id: string): EditorQuest {
  return {
    id,
    code: `QUEST_${Date.now().toString(36).slice(-4)}${(qSeq += 1)}`,
    title: 'New Quest',
    description: '',
    category: 'side',
    recommendedLevel: 1,
    prerequisiteQuestIds: [],
    relatedAreaIds: [],
    relatedNPCIds: [],
    objectives: [makeObjective('talkToNPC')],
    rewards: [makeReward('exp')],
    unlocksAreaIds: [],
    unlocksQuestIds: [],
    setsWorldFlags: [],
    tags: [],
    isEnabled: true,
  };
}
