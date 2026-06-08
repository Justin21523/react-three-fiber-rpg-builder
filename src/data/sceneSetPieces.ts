import type { Vec3 } from './modelLibrary';

// Kit — authored GLB set-pieces per area (empty by default; the yokai game shipped hand-authored
// scenery here). In the kit you place models via Edit Mode (stored as sceneEdit "added" pieces).
export interface SceneSetPiece { assetId: string; position: Vec3; scale?: number; rotationY?: number; }

export const SCENE_SET_PIECES: Record<string, SceneSetPiece[]> = {};
export const SCENE_SPREAD = 0;
export function spreadOutward(position: Vec3): Vec3 { return position; }
