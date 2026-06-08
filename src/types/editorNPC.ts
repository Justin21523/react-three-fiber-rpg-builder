import type { Vec3 } from '../game/edit/sceneEditMerge';

// Kit — NPC archetype (drives the default role label, the stub colour, and the palette). Generic set
// (the yokai-specific 'yokaiFriend' archetype was dropped).
export type NpcType =
  | 'guide'
  | 'researcher'
  | 'teacher'
  | 'student'
  | 'shopkeeper'
  | 'trainer'
  | 'questGiver'
  | 'guard'
  | 'traveler'
  | 'mysterious'
  | 'activityHost';

export const NPC_TYPES: NpcType[] = [
  'guide', 'researcher', 'teacher', 'student', 'shopkeeper', 'trainer',
  'questGiver', 'guard', 'traveler', 'mysterious', 'activityHost',
];

export const NPC_TYPE_LABEL: Record<NpcType, string> = {
  guide: 'Guide', researcher: 'Researcher', teacher: 'Teacher', student: 'Student',
  shopkeeper: 'Shopkeeper', trainer: 'Trainer', questGiver: 'Quest Giver', guard: 'Guard',
  traveler: 'Traveler', mysterious: 'Mysterious', activityHost: 'Activity Host',
};

export const NPC_TYPE_COLOR: Record<NpcType, string> = {
  guide: '#38bdf8', researcher: '#a78bfa', teacher: '#f59e0b', student: '#fbbf24',
  shopkeeper: '#34d399', trainer: '#ef4444', questGiver: '#facc15', guard: '#94a3b8',
  traveler: '#fb923c', mysterious: '#6366f1', activityHost: '#22d3ee',
};

export const NPC_TYPE_DEFAULT_ROLE: Record<NpcType, string> = {
  guide: 'Guide', researcher: 'Researcher', teacher: 'Teacher', student: 'Student',
  shopkeeper: 'Shopkeeper', trainer: 'Trainer', questGiver: 'Quest Giver', guard: 'Guard',
  traveler: 'Traveler', mysterious: 'Mysterious Figure', activityHost: 'Activity Host',
};

// An NPC created in Editor Mode. Fully data-driven: placed/moved like any editable object, resolved into
// an NpcProfile at runtime by getNpcProfile so the existing interaction + dialogue pipeline treats it
// like a seed NPC. Persists to its own store; a linked dialogueTreeId points at an editor-authored tree.
export interface EditorNpc {
  id: string;
  code?: string;                 // unique human-readable code (validation key)
  areaId: string;                // placement area
  position: Vec3;
  rotation?: Vec3;               // radians
  scale?: number;                // uniform scale
  displayName: string;
  npcType?: NpcType;             // archetype (drives colour + default role)
  role: string;
  description?: string;          // editor note / flavor
  dialogueTreeId: string | null;
  relatedQuestIds: string[];
  startsQuestIds?: string[];     // quests this NPC offers on interaction
  completesQuestIds?: string[];  // quests this NPC accepts turn-in for
  scheduleProfileId?: string | null;
  behaviorProfileId?: string | null;
  shopId?: string | null;
  modelAssetId: string | null;   // when set, a GLB replaces the capsule stub
  animation?: string;            // named animation clip for the GLB
  interactionLabel: string;      // proximity prompt, e.g. 'Talk to Mina'
  color: string;
  tags: string[];
}

let npcCodeSeq = 0;
export function makeNpcCode(npcType: NpcType = 'student'): string {
  npcCodeSeq += 1;
  return `NPC_${npcType.toUpperCase()}_${Date.now().toString(36).slice(-4)}${npcCodeSeq}`;
}

export function createDefaultEditorNpc(id: string, areaId: string, position: Vec3): EditorNpc {
  const npcType: NpcType = 'student';
  return {
    id, code: makeNpcCode(npcType), areaId, position, rotation: [0, 0, 0], scale: 1,
    displayName: 'New NPC', npcType, role: '', description: '', dialogueTreeId: null,
    relatedQuestIds: [], startsQuestIds: [], completesQuestIds: [],
    scheduleProfileId: null, behaviorProfileId: null, shopId: null,
    modelAssetId: null, interactionLabel: 'Talk', color: NPC_TYPE_COLOR[npcType], tags: [],
  };
}
