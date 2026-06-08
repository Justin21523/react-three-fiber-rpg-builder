// Phase 89 — In-game Edit Mode: shared types + pure merge helpers for per-placement
// transform overrides. No store/React imports here so it can't create cycles.

export type Vec3 = [number, number, number];

// Every editable placement kind in the world.
export type EditKind = 'setpiece' | 'groundtile' | 'decoration' | 'building' | 'npc' | 'item' | 'trigger' | 'scatter' | 'regional' | 'prop' | 'landmark' | 'yokai' | 'structure' | 'platform' | 'encounter' | 'questmarker' | 'activity';

// Phase C — collider shape when an object is solid. 'cuboid' = loose bounding box (cheap),
// 'hull' = convex hull (tight-ish), 'trimesh' = exact per-mesh (walk slopes / through gaps),
// 'none' = no physics. Falls back to defaultCollisionShapeForKind when unset.
export type CollisionShape = 'none' | 'cuboid' | 'hull' | 'trimesh';

// A saved override for one placement (any subset of fields).
export interface EditOverride {
  position?: Vec3;
  rotation?: Vec3; // radians (x, y, z)
  scale?: number;  // uniform
  collision?: boolean; // Phase A: solid collider in normal play (overrides per-kind default)
  collisionShape?: CollisionShape; // Phase C: collider shape used when solid
}

// Per-kind default for whether an object blocks the player (solid collider) in normal
// play. Big solid scenery blocks; flat ground tiles / markers / physics-owning kinds don't.
export function defaultCollisionForKind(kind: EditKind): boolean {
  switch (kind) {
    case 'setpiece':
    case 'decoration':
    case 'regional':
    case 'landmark':
    case 'platform': // bridges / elevation platforms — you stand on them
      return true;
    // structure (flat patches / water / roads) = visual ground, no block by default
    // groundtile/scatter default OFF (flat / hundreds of instances → perf); toggle per-object.
    // building/npc/item/prop/trigger/yokai own their own physics via EditablePlacement.
    default:
      return false;
  }
}

// Per-kind default collider SHAPE used when an object is solid. GLB scenery → trimesh
// (exact: walk on slopes, through arches, no empty-space blocking); small/scattered props
// → hull (cheaper); flat ground tiles → cuboid (perf, hundreds of instances).
export function defaultCollisionShapeForKind(kind: EditKind): CollisionShape {
  switch (kind) {
    case 'setpiece':
    case 'landmark':
    case 'regional':
    case 'structure':
    case 'platform':
    case 'building':
      return 'trimesh';
    case 'decoration':
    case 'prop':
    case 'scatter':
      return 'hull';
    case 'groundtile':
      return 'cuboid';
    default:
      return 'cuboid';
  }
}

// The authored/base transform a renderer starts from.
export interface BaseTransform {
  position: Vec3;
  rotation?: Vec3; // radians
  scale?: number;
}

export interface MergedTransform {
  position: Vec3;
  rotation: Vec3;
  scale: number;
}

// A set-piece created in Edit Mode via duplicate (Ctrl+D). Rendered as an extra
// editable set-piece in its area; its transform is then tuned like any other.
export interface AddedPiece {
  id: string;
  areaId: string;
  assetId: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
}

// How a placed yokai behaves in normal play (Phase C):
//   observe  → walk up to observe / unlock codex (YokaiPlaceholder)
//   interact → talk on E: gain friendship + discover (Interactable)
//   battle   → touch starts a normal encounter at `level`
//   boss     → touch starts a boss battle at `level`
export type AddedYokaiBehavior = 'observe' | 'interact' | 'battle' | 'boss';

// A functional yokai placed in Edit Mode: rendered through the real YokaiPlaceholder
// (observe / interact) or EncounterTrigger (battle / boss), and movable like any object.
export interface AddedYokai {
  id: string;
  areaId: string;
  yokaiId: string;   // a YOKAI_DEFINITIONS id (doubles as the encounter enemyId)
  position: Vec3;
  behavior: AddedYokaiBehavior;
  level?: number;    // battle/boss encounter level (overrides rarity-derived default)
  animation?: string; // named animation clip for observe/interact visual ('idle','walk'…)
  battle?: boolean;  // deprecated (pre-Phase C); normalized to `behavior` on load
}

// Stable key for a placement. `idOrIndex` should be a stable id when available
// (npcId / itemId / decoration id), else the array index in the area's list.
export function objKey(areaId: string, kind: EditKind, idOrIndex: string | number): string {
  return `${areaId}#${kind}#${idOrIndex}`;
}

// base ⊕ committed ⊕ live (later layers win). Undefined layers are skipped.
export function mergeTransform(base: BaseTransform, ...layers: (EditOverride | undefined)[]): MergedTransform {
  let position = base.position;
  let rotation = base.rotation ?? [0, 0, 0];
  let scale = base.scale ?? 1;
  for (const o of layers) {
    if (!o) continue;
    if (o.position) position = o.position;
    if (o.rotation) rotation = o.rotation;
    if (o.scale !== undefined) scale = o.scale;
  }
  return { position, rotation, scale };
}
