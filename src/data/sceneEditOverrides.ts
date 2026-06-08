import type { AddedPiece, EditOverride } from '../game/edit/sceneEditMerge';

// Kit — baked scene edits (empty in a fresh project). In Edit Mode the "Save to file" action would
// regenerate this file's contents so hand-placed/edited objects become part of the seed scene.
export const SCENE_EDIT_OVERRIDES: Record<string, EditOverride> = {};
export const SCENE_EDIT_DELETED: Record<string, true> = {};
export const SCENE_EDIT_ADDED: AddedPiece[] = [];
