import type { DialogueEffect } from './dialogue';
import type { QuestStatus } from './quest';

// Kit — an Editor-authored world trigger. One unified data shape; behaviour dispatched by `triggerType`
// in fireEditorTrigger. Generic subset (battle/activity/randomEvent/hiddenYokai/questBoard dropped).
export type EditorTriggerType =
  | 'travelGate'
  | 'zoneGate'
  | 'explorationPoint'
  | 'interactionPoint'
  | 'itemPickup'
  | 'dialogueTrigger'
  | 'restPoint'
  | 'battleTrigger'
  | 'bossGate'
  | 'activityTrigger';

export type EditorTriggerDisplayMode = 'box' | 'marker' | 'debug';

export const EDITOR_TRIGGER_TYPES: EditorTriggerType[] = [
  'travelGate', 'zoneGate', 'explorationPoint', 'interactionPoint', 'itemPickup', 'dialogueTrigger', 'restPoint',
  'battleTrigger', 'bossGate', 'activityTrigger',
];

export type GateStyle = 'door' | 'portal' | 'stairs' | 'arch' | 'plain';

export interface TravelGateConfig {
  targetAreaId?: string;
  targetSpawnPointId?: string;
  targetPosition?: [number, number, number];
  label?: string;
  isLocked?: boolean;
  lockedMessage?: string;
  unlockQuestId?: string;
  unlockWorldFlag?: string;
  showOnMap?: boolean;
  gateStyle?: GateStyle;
  costItemId?: string;       // toll: consume an item to pass
  costQuantity?: number;
  confirmPrompt?: string;
}

export interface ExplorationPointConfig {
  discoveryText?: string;
  rewardItemIds?: string[];
  relatedQuestIds?: string[];
  consumeOnUse?: boolean;
  expReward?: number;
  setWorldFlags?: string[];
}

export interface BattleTriggerConfig { encounterId?: string; recommendedLevel?: number }
export interface ActivityTriggerConfig { activityId?: string }
export interface ItemPickupConfig { itemId?: string; quantity?: number; pickupMessage?: string }
export interface DialogueTriggerConfig { dialogueId?: string; startNodeId?: string; onceOnly?: boolean }
export interface RestPointConfig { message?: string; saveAfterRest?: boolean } // kit: no party HP to heal

export interface EditorTrigger {
  id: string;
  code?: string;
  triggerType: EditorTriggerType;
  displayName?: string;
  description?: string;
  zoneId: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  size: [number, number, number];
  interactionLabel: string;
  color?: string;
  displayModelAssetId?: string;
  displayModelAnimation?: string;
  isEnabled?: boolean;
  isVisibleInPlayMode?: boolean;
  tags?: string[];

  // conditions
  requiredQuestId?: string;
  requiredQuestStatus?: QuestStatus;
  requiredItemId?: string;
  requiredWorldFlag?: string;
  requiredPlayerLevel?: number;
  onceOnly?: boolean;
  cooldownSeconds?: number;

  // common on-fire grants (any type)
  grantItemIds?: string[];
  grantExp?: number;
  setWorldFlags?: string[];
  playDialogueId?: string;

  // nested config (per type)
  travelGate?: TravelGateConfig;
  exploration?: ExplorationPointConfig;
  itemPickup?: ItemPickupConfig;
  dialogue?: DialogueTriggerConfig;
  restPoint?: RestPointConfig;
  battle?: BattleTriggerConfig;
  activity?: ActivityTriggerConfig;
  onInteractEffects?: DialogueEffect[];
}

// Battle triggers fire on contact (walk into them); the rest fire on [E].
export const CONTACT_TRIGGER_TYPES: ReadonlySet<EditorTriggerType> = new Set<EditorTriggerType>(['battleTrigger', 'bossGate']);

export const TRIGGER_COLOR: Record<EditorTriggerType, string> = {
  travelGate: '#3b82f6', zoneGate: '#22d3ee', explorationPoint: '#fbbf24', interactionPoint: '#38bdf8',
  itemPickup: '#f472b6', dialogueTrigger: '#60a5fa', restPoint: '#86efac', battleTrigger: '#ef4444', bossGate: '#b91c1c', activityTrigger: '#34d399',
};

export const TRIGGER_TYPE_LABEL: Record<EditorTriggerType, string> = {
  travelGate: 'Travel Gate', zoneGate: 'Zone Gate', explorationPoint: 'Exploration Point',
  interactionPoint: 'Interaction Point', itemPickup: 'Item Pickup', dialogueTrigger: 'Dialogue Trigger', restPoint: 'Rest Point',
  battleTrigger: 'Battle Trigger', bossGate: 'Boss Gate', activityTrigger: 'Activity Trigger',
};

let codeSeq = 0;
function makeCode(triggerType: EditorTriggerType): string {
  codeSeq += 1;
  return `TRIG_${triggerType.toUpperCase()}_${Date.now().toString(36).slice(-4)}${codeSeq}`;
}

export function createDefaultTrigger(id: string, zoneId: string, triggerType: EditorTriggerType, position: [number, number, number]): EditorTrigger {
  const base: EditorTrigger = {
    id, code: makeCode(triggerType), triggerType, displayName: TRIGGER_TYPE_LABEL[triggerType], zoneId, position,
    rotation: [0, 0, 0], scale: 1, size: [3, 3, 3],
    interactionLabel: triggerType === 'travelGate' || triggerType === 'zoneGate' ? 'Travel' : 'Interact',
    color: TRIGGER_COLOR[triggerType], isEnabled: true, isVisibleInPlayMode: true,
    onceOnly: triggerType === 'itemPickup', cooldownSeconds: 0,
  };
  switch (triggerType) {
    case 'travelGate':
    case 'zoneGate': base.travelGate = { showOnMap: true, gateStyle: triggerType === 'travelGate' ? 'portal' : 'arch' }; break;
    case 'explorationPoint': base.exploration = { consumeOnUse: false }; break;
    case 'itemPickup': base.itemPickup = { quantity: 1 }; break;
    case 'dialogueTrigger': base.dialogue = {}; break;
    case 'restPoint': base.restPoint = { message: 'You rest for a moment.' }; break;
    case 'battleTrigger':
    case 'bossGate': base.battle = { recommendedLevel: 1 }; break;
    case 'activityTrigger': base.activity = {}; break;
  }
  return base;
}

// Merge accessors.
export const gateConfig = (t: EditorTrigger): TravelGateConfig => ({ ...t.travelGate });
export const explorationConfig = (t: EditorTrigger): ExplorationPointConfig => ({ ...t.exploration });
export const itemPickupConfig = (t: EditorTrigger): ItemPickupConfig => ({ quantity: 1, ...t.itemPickup });
export const dialogueConfig = (t: EditorTrigger): DialogueTriggerConfig => ({ ...t.dialogue });
export const restPointConfig = (t: EditorTrigger): RestPointConfig => ({ ...t.restPoint });
export const battleConfig = (t: EditorTrigger): BattleTriggerConfig => ({ ...t.battle });
export const activityConfig = (t: EditorTrigger): ActivityTriggerConfig => ({ ...t.activity });
