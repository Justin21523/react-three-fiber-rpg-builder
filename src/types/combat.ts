// Kit — generic turn-based combat model (de-yokai'd). A Combatant is defined by plain stats + a few
// skills; battles are 1 player combatant vs N enemies. No elements / befriend / friendship / party.
export interface CombatSkill {
  id: string;
  name: string;
  power: number;
  kind: 'damage' | 'heal';
  cooldown?: number; // turns before reuse (0/undefined = always available)
}

export interface Combatant {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  skills: CombatSkill[];
  modelAssetId?: string;
  color?: string;
}

export type BattlePhase = 'intro' | 'playerTurn' | 'enemyTurn' | 'won' | 'lost';

// A combatant instance in an active battle.
export interface BattleParticipant {
  battleId: string;
  combatantId?: string; // source Combatant id (for defeated_<id> flags / quest defeatEnemy)
  side: 'player' | 'enemy';
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  skills: CombatSkill[];
  cooldowns: Record<string, number>;
  isDefending: boolean;
  isAlive: boolean;
  isBoss?: boolean;
  bossPhaseIndex?: number; // current boss phase (for hp-threshold transitions)
  modelAssetId?: string;
  color?: string;
}

export type BattleWinCondition = { type: 'defeatAll' } | { type: 'surviveTurns'; turns: number };
