import type { BattleWinCondition } from './combat';

// Kit — an Editor-authored battle encounter (generic): a list of combatant slots + level + rewards +
// optional boss phases + battle dialogue. Resolved into a battle by startEditorEncounter.
export type EncounterType = 'normal' | 'boss' | 'ambush' | 'event';
export const ENCOUNTER_TYPES: EncounterType[] = ['normal', 'boss', 'ambush', 'event'];

export interface EditorEnemySlot {
  combatantId: string;
  level: number;
  slotId: number;
  isBoss?: boolean;
}

export interface EditorEncounterRewards {
  itemIds?: string[];
  bonusExp?: number;
  worldFlags?: string[];
}

export interface EditorBossPhase {
  hpThreshold: number;          // 0..1 — enter this phase when boss hp drops below it
  phaseName: string;
  dialogueLine?: string;        // pushed to the battle log on entry
  statMult?: { attack?: number; defense?: number };
}

export interface EditorBattleDialogue {
  battleStart?: string[];
  victory?: string[];
  defeat?: string[];
}

export interface EditorEncounter {
  id: string;
  displayName: string;
  encounterType: EncounterType;
  zoneId: string;
  recommendedLevel: number;
  triggerId?: string;           // links to a battleTrigger / bossGate
  enemyTeam: EditorEnemySlot[];
  rewards?: EditorEncounterRewards;
  relatedQuestIds: string[];
  bossPhases?: EditorBossPhase[];
  battleDialogue?: EditorBattleDialogue;
  winCondition?: BattleWinCondition;
}

export function createDefaultEncounter(id: string, zoneId: string): EditorEncounter {
  return {
    id,
    displayName: 'New Encounter',
    encounterType: 'normal',
    zoneId,
    recommendedLevel: 1,
    enemyTeam: [{ combatantId: 'cb_slime', level: 1, slotId: 0 }],
    rewards: { bonusExp: 20 },
    relatedQuestIds: [],
    battleDialogue: {},
    winCondition: { type: 'defeatAll' },
  };
}

export function makeEnemySlot(slotId: number): EditorEnemySlot {
  return { combatantId: 'cb_slime', level: 1, slotId };
}
