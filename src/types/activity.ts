// Kit — generic, de-yokai'd activity (mini-game) data model, faithful to the original framework:
// selectable game modes, per-mode numeric configs, an arena of placeable points, fully-configured
// participants (each a Combatant-backed character with model/animation/role/level/position), typed
// objectives + rewards. Positions are kit tuples [x,y,z] so they compose with EditablePlacement /
// useMergedTransform. Participants reuse Phase 6 Combatants (combatantId) for stats.

export type Vec3Tuple = [number, number, number];

// ── Enums / unions ───────────────────────────────────────────────────────────
export type ActivityType =
  | 'race' | 'itemRace' | 'enemyRush' | 'defenseZone'
  | 'collectionRush' | 'hideAndSeek' | 'bossPreparation';

export type ActivityObjectiveType =
  | 'reachFinishLine' | 'defeatEnemies' | 'collectItems' | 'protectTarget'
  | 'surviveTime' | 'findTarget' | 'completeCheckpoints' | 'solvePuzzle' | 'scorePoints';

export type ActivityRewardType = 'item' | 'exp' | 'unlockFlag';

export type ActivitySlotRole = 'player' | 'ally' | 'rival' | 'enemy';

export type ActivityOutcome = 'win' | 'lose' | 'cancelled';

// ── Objective / reward ───────────────────────────────────────────────────────
export interface ActivityObjective {
  id: string;
  objectiveType: ActivityObjectiveType;
  description: string;
  targetValue: number;
}

export interface ActivityReward {
  id: string;
  rewardType: ActivityRewardType;
  itemId?: string;
  exp?: number;
  unlockFlag?: string;
  quantity: number;
}

// ── Participant (placed, fully configured) ───────────────────────────────────
export interface ActivityParticipantSlot {
  id: string;
  role: ActivitySlotRole;
  combatantId?: string;   // reuse Phase 6 Combatant for stats (optional → visual-only placement)
  level?: number;
  modelAssetId?: string;  // overrides the combatant's model when set
  animation?: string;
  color?: string;
  position: Vec3Tuple;
}

// ── Arena ────────────────────────────────────────────────────────────────────
export type ArenaPointField =
  | 'start' | 'finish' | 'checkpoint' | 'speedBoost' | 'slowZone' | 'raceItemBox' | 'boundsCenter'
  | 'rushSpawn' | 'eliteSpawn' | 'safeZone' | 'scoreMarker'
  | 'defenseCore' | 'defenseSpawn' | 'repairPoint' | 'guardPoint'
  | 'collectionCenter' | 'collectionItem' | 'rareCollectible' | 'trapItem'
  | 'hideTarget' | 'hintZone' | 'searchRadius'
  | 'sealPoint' | 'bossGate' | 'cluePoint' | 'enemyGuard';

export interface ActivityArena {
  bounds: { center: Vec3Tuple; size: Vec3Tuple };
  points: Partial<Record<ArenaPointField, Vec3Tuple[]>>;
}

// ── Per-mode configs (de-yokai'd numeric params) ─────────────────────────────
export interface RaceConfig {
  lapCount: number; allowItems: boolean; zoneRadius: number;
  baseSpeed: number; boostMult: number; slowMult: number;
}
export interface EnemyRushConfig {
  durationSeconds: number; maxActiveEnemies: number; spawnIntervalSeconds: number;
  combatantIds: string[]; eliteCombatantIds: string[]; eliteChance: number;
  scoreNormal: number; scoreElite: number; comboStep: number;
  enemyHpScale: number; moveSpeed: number;
}
export interface DefenseConfig {
  coreHp: number; waveCount: number; enemiesPerWave: number; combatantIds: string[];
  waveIntervalSeconds: number; enemyHpScale: number; moveSpeed: number; enemyCoreDamage: number;
}
export interface CollectionConfig {
  durationSeconds: number; maxActiveItems: number; spawnIntervalSeconds: number; initialItems: number;
  collectRadius: number; scoreNormal: number; scoreRare: number; scoreTrap: number;
  rareChance: number; trapChance: number;
}
export interface HideSeekConfig {
  durationSeconds: number; findRadius: number; hintRadius: number; scorePerTarget: number; targetCount: number;
}

// ── Definition + editor bundle ───────────────────────────────────────────────
export interface ActivityDefinition {
  id: string;
  title: string;
  description: string;
  activityType: ActivityType;
  zoneId: string;
  recommendedLevel: number;
  durationSeconds: number;
  minParticipants: number;
  maxParticipants: number;
  tags: string[];
}

export interface EditorActivity {
  def: ActivityDefinition;
  arena: ActivityArena;
  participants: ActivityParticipantSlot[];
  objectives: ActivityObjective[];
  rewards: ActivityReward[];
  raceConfig?: RaceConfig;
  rushConfig?: EnemyRushConfig;
  defenseConfig?: DefenseConfig;
  collectionConfig?: CollectionConfig;
  hideSeekConfig?: HideSeekConfig;
  code?: string;
}

// ── Labels / palette / colours ───────────────────────────────────────────────
export const ACTIVITY_TYPES: ActivityType[] = [
  'race', 'itemRace', 'enemyRush', 'defenseZone', 'collectionRush', 'hideAndSeek', 'bossPreparation',
];
export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  race: 'Race', itemRace: 'Item Race', enemyRush: 'Enemy Rush', defenseZone: 'Defense Zone',
  collectionRush: 'Collection Rush', hideAndSeek: 'Hide & Seek', bossPreparation: 'Boss Preparation',
};
export const OBJECTIVE_TYPES: ActivityObjectiveType[] = [
  'reachFinishLine', 'defeatEnemies', 'collectItems', 'protectTarget', 'surviveTime',
  'findTarget', 'completeCheckpoints', 'solvePuzzle', 'scorePoints',
];
export const REWARD_TYPES: ActivityRewardType[] = ['item', 'exp', 'unlockFlag'];

export const ACTIVITY_SLOT_ROLES: ActivitySlotRole[] = ['player', 'ally', 'rival', 'enemy'];
export const ACTIVITY_SLOT_COLOR: Record<ActivitySlotRole, string> = {
  player: '#22c55e', ally: '#38bdf8', rival: '#f59e0b', enemy: '#ef4444',
};

export const ARENA_POINT_LABEL: Record<ArenaPointField, string> = {
  start: 'Start', finish: 'Finish', checkpoint: 'Checkpoint', speedBoost: 'Speed Boost', slowZone: 'Slow Zone',
  raceItemBox: 'Item Box', boundsCenter: 'Bounds Center', rushSpawn: 'Enemy Spawn', eliteSpawn: 'Elite Spawn',
  safeZone: 'Safe Zone', scoreMarker: 'Score Marker', defenseCore: 'Defense Core', defenseSpawn: 'Wave Spawn',
  repairPoint: 'Repair Point', guardPoint: 'Guard Point', collectionCenter: 'Collection Center',
  collectionItem: 'Collectible', rareCollectible: 'Rare Collectible', trapItem: 'Trap Item',
  hideTarget: 'Hidden Target', hintZone: 'Hint Zone', searchRadius: 'Search Radius',
  sealPoint: 'Seal Point', bossGate: 'Boss Gate', cluePoint: 'Clue Point', enemyGuard: 'Enemy Guard',
};
export const ARENA_POINT_COLOR: Record<ArenaPointField, string> = {
  start: '#22c55e', finish: '#facc15', checkpoint: '#3b82f6', speedBoost: '#10b981', slowZone: '#6366f1',
  raceItemBox: '#a855f7', boundsCenter: '#38bdf8', rushSpawn: '#ef4444', eliteSpawn: '#b91c1c',
  safeZone: '#34d399', scoreMarker: '#fde047', defenseCore: '#f59e0b', defenseSpawn: '#ef4444',
  repairPoint: '#22d3ee', guardPoint: '#38bdf8', collectionCenter: '#ffffff', collectionItem: '#ffffff',
  rareCollectible: '#e879f9', trapItem: '#f97316', hideTarget: '#94a3b8', hintZone: '#c084fc',
  searchRadius: '#a78bfa', sealPoint: '#a78bfa', bossGate: '#7f1d1d', cluePoint: '#fcd34d', enemyGuard: '#fb7185',
};

// Which placement tools each mode offers (drives the Arena tool buttons).
export function pointFieldsForType(type: ActivityType): ArenaPointField[] {
  switch (type) {
    case 'race': case 'itemRace':
      return ['start', 'finish', 'checkpoint', 'speedBoost', 'slowZone', 'raceItemBox', 'boundsCenter'];
    case 'enemyRush':
      return ['boundsCenter', 'rushSpawn', 'eliteSpawn', 'safeZone', 'scoreMarker'];
    case 'defenseZone':
      return ['boundsCenter', 'defenseCore', 'defenseSpawn', 'repairPoint', 'guardPoint'];
    case 'collectionRush':
      return ['boundsCenter', 'collectionCenter', 'collectionItem', 'rareCollectible', 'trapItem'];
    case 'hideAndSeek':
      return ['boundsCenter', 'hideTarget', 'hintZone', 'searchRadius'];
    case 'bossPreparation':
      return ['boundsCenter', 'sealPoint', 'bossGate', 'cluePoint', 'enemyGuard'];
    default:
      return ['boundsCenter', 'start'];
  }
}

// Point fields that hold a single Vec3 (vs a list of them).
export const SINGLE_POINT_FIELDS: ReadonlySet<ArenaPointField> = new Set<ArenaPointField>([
  'finish', 'boundsCenter', 'defenseCore', 'collectionCenter', 'bossGate',
]);

export function objectiveTypeFor(type: ActivityType): ActivityObjectiveType {
  switch (type) {
    case 'race': case 'itemRace': return 'reachFinishLine';
    case 'enemyRush': return 'defeatEnemies';
    case 'defenseZone': return 'protectTarget';
    case 'collectionRush': return 'collectItems';
    case 'hideAndSeek': return 'findTarget';
    case 'bossPreparation': return 'surviveTime';
    default: return 'scorePoints';
  }
}

// ── Default builder (no seed imports → no import cycle) ───────────────────────
export function createDefaultActivity(zoneId: string, type: ActivityType): EditorActivity {
  const base = `eact_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const isRace = type === 'race' || type === 'itemRace';

  const points: ActivityArena['points'] = { boundsCenter: [[0, 0, 8]] };
  if (isRace) {
    points.start = [[-2, 0, 0], [0, 0, 0], [2, 0, 0]];
    points.finish = [[0, 0, 36]];
    points.checkpoint = [[0, 0, 12], [0, 0, 24]];
    if (type === 'itemRace') points.raceItemBox = [[0, 0, 18]];
  } else if (type === 'enemyRush') {
    points.rushSpawn = [[-6, 0, 8], [6, 0, 8], [0, 0, 14]];
  } else if (type === 'defenseZone') {
    points.defenseCore = [[0, 0, 8]];
    points.defenseSpawn = [[-8, 0, 8], [8, 0, 8], [0, 0, 16]];
  } else if (type === 'collectionRush') {
    points.collectionCenter = [[0, 0, 8]];
  } else if (type === 'hideAndSeek') {
    points.hideTarget = [[6, 0, 6], [-6, 0, 10]];
  } else if (type === 'bossPreparation') {
    points.sealPoint = [[0, 0, 8]];
    points.bossGate = [[0, 0, 20]];
  }

  const ea: EditorActivity = {
    def: {
      id: base, title: 'New Activity', description: '', activityType: type, zoneId,
      recommendedLevel: 5, durationSeconds: 60, minParticipants: 1, maxParticipants: 4, tags: ['editor'],
    },
    arena: { bounds: { center: [0, 0, 8], size: [20, 4, 40] }, points },
    participants: [
      { id: `${base}_p0`, role: 'player', level: 5, color: ACTIVITY_SLOT_COLOR.player, position: [0, 0, 0] },
    ],
    objectives: [
      {
        id: `${base}_obj`, objectiveType: objectiveTypeFor(type), description: 'Complete the activity.',
        targetValue: type === 'enemyRush' || type === 'collectionRush' ? 5 : 1,
      },
    ],
    rewards: [
      { id: `${base}_rw`, rewardType: 'exp', exp: 40, quantity: 1 },
    ],
    code: base,
  };

  if (isRace) {
    ea.raceConfig = { lapCount: 1, allowItems: type === 'itemRace', zoneRadius: 1.2, baseSpeed: 6, boostMult: 1.6, slowMult: 0.6 };
  } else if (type === 'enemyRush') {
    ea.rushConfig = {
      durationSeconds: 60, maxActiveEnemies: 8, spawnIntervalSeconds: 2, combatantIds: [], eliteCombatantIds: [],
      eliteChance: 0.1, scoreNormal: 10, scoreElite: 30, comboStep: 2, enemyHpScale: 0.4, moveSpeed: 3,
    };
  } else if (type === 'defenseZone') {
    ea.defenseConfig = {
      coreHp: 200, waveCount: 5, enemiesPerWave: 6, combatantIds: [], waveIntervalSeconds: 6,
      enemyHpScale: 0.4, moveSpeed: 3, enemyCoreDamage: 10,
    };
  } else if (type === 'collectionRush') {
    ea.collectionConfig = {
      durationSeconds: 60, maxActiveItems: 12, spawnIntervalSeconds: 1, initialItems: 6, collectRadius: 1.4,
      scoreNormal: 10, scoreRare: 30, scoreTrap: -15, rareChance: 0.15, trapChance: 0.15,
    };
  } else if (type === 'hideAndSeek') {
    ea.hideSeekConfig = { durationSeconds: 120, findRadius: 2.5, hintRadius: 8, scorePerTarget: 25, targetCount: 2 };
  }

  return ea;
}
