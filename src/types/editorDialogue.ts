import type { DialogueEffect, DialogueCondition, DialogueEmotion } from './dialogue';

// Kit — editor metadata for authoring dialogue effects/conditions. The runtime unions in dialogue.ts are
// the source of truth; these tables drive the UI and carry per-field kinds so number fields coerce
// correctly. Only the kit's GENERIC effect/condition kinds are listed (no yokai/battle/activity).
export type DialogueEffectType = DialogueEffect['type'];
export type DialogueConditionType = DialogueCondition['type'];

export interface MechField {
  key: string;
  label: string;
  kind: 'string' | 'number';
  optional?: boolean;
}

export const DIALOGUE_EMOTIONS: DialogueEmotion[] = [
  'neutral', 'happy', 'sad', 'angry', 'surprised', 'worried', 'thinking', 'excited',
];

export const DIALOGUE_EFFECT_TYPES: DialogueEffectType[] = [
  'startQuest', 'completeQuest', 'updateObjective', 'completeObjective',
  'addItem', 'giveItem', 'setWorldFlag', 'startBattle', 'closeDialogue',
];

export const DIALOGUE_CONDITION_TYPES: DialogueConditionType[] = [
  'hasItem', 'questInProgress', 'questCompleted', 'objectiveCompleted',
  'doorUnlocked', 'worldFlagSet', 'playerLevel',
];

export const EFFECT_FIELDS: Record<DialogueEffectType, MechField[]> = {
  startQuest: [{ key: 'questId', label: 'questId', kind: 'string' }],
  completeQuest: [{ key: 'questId', label: 'questId', kind: 'string' }],
  updateObjective: [{ key: 'questId', label: 'questId', kind: 'string' }, { key: 'objectiveId', label: 'objectiveId', kind: 'string' }],
  completeObjective: [{ key: 'questId', label: 'questId', kind: 'string' }, { key: 'objectiveId', label: 'objectiveId', kind: 'string' }],
  addItem: [{ key: 'itemId', label: 'itemId', kind: 'string' }, { key: 'quantity', label: 'quantity', kind: 'number', optional: true }],
  giveItem: [{ key: 'itemId', label: 'itemId', kind: 'string' }, { key: 'quantity', label: 'quantity', kind: 'number', optional: true }],
  setWorldFlag: [{ key: 'flag', label: 'flag', kind: 'string' }],
  startBattle: [{ key: 'encounterId', label: 'encounterId', kind: 'string' }],
  closeDialogue: [],
};

export const COND_FIELDS: Record<DialogueConditionType, MechField[]> = {
  hasItem: [{ key: 'targetId', label: 'itemId', kind: 'string' }],
  questInProgress: [{ key: 'targetId', label: 'questId', kind: 'string' }],
  questCompleted: [{ key: 'targetId', label: 'questId', kind: 'string' }],
  objectiveCompleted: [{ key: 'questId', label: 'questId', kind: 'string' }, { key: 'objectiveId', label: 'objectiveId', kind: 'string' }],
  doorUnlocked: [{ key: 'doorId', label: 'doorId', kind: 'string' }],
  worldFlagSet: [{ key: 'flag', label: 'flag', kind: 'string' }],
  playerLevel: [{ key: 'level', label: 'level', kind: 'number' }],
};

// Build a typed object from string/number field inputs (coerces number fields).
export function buildMech<T extends Record<string, unknown>>(type: string, fields: MechField[], raw: Record<string, string>): T {
  const out: Record<string, unknown> = { type };
  for (const f of fields) {
    const v = raw[f.key];
    if (v === undefined || v === '') {
      if (!f.optional) out[f.key] = f.kind === 'number' ? 0 : '';
      continue;
    }
    out[f.key] = f.kind === 'number' ? (parseFloat(v) || 0) : v;
  }
  return out as T;
}
