import { create } from 'zustand';
import type { Object3D } from 'three';
import { usePlayerStore } from './playerStore';
import { SCENE_EDIT_OVERRIDES, SCENE_EDIT_DELETED, SCENE_EDIT_ADDED } from '../data/sceneEditOverrides';
import { mergeTransform, objKey, defaultCollisionForKind, defaultCollisionShapeForKind, type AddedPiece, type AddedYokai, type AddedYokaiBehavior, type BaseTransform, type CollisionShape, type EditKind, type EditOverride, type MergedTransform } from '../game/edit/sceneEditMerge';

// Normalize persisted yokai entries: pre-Phase C saved `battle:boolean`; map it to the
// new `behavior` field so old localStorage / baked data keeps working.
function normalizeAddedYokai(arr: AddedYokai[]): AddedYokai[] {
  return arr.map((y) => {
    if (y.behavior) return y;
    return { ...y, behavior: y.battle ? 'battle' : 'observe' };
  });
}

// Phase 89/90 — live store for in-game Edit Mode (F1). Per-placement transform edits,
// deletions, and duplicated set-pieces persist to their OWN localStorage key (not the
// game save) and are merged over the authored seed data + the baked sceneEditOverrides
// file at render time, so everything applies in normal play too. Mirrors modelStudioStore.

const STORAGE_KEY = 'lost-yokai-scene-editor-v1';

export type GizmoMode = 'translate' | 'rotate' | 'scale';

interface PersistShape {
  overrides: Record<string, EditOverride>;
  deleted: Record<string, true>;
  added: AddedPiece[];
  addedYokai: AddedYokai[];
}

function loadState(): PersistShape {
  const empty: PersistShape = { overrides: {}, deleted: {}, added: [], addedYokai: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Partial<PersistShape>;
    if (!p || typeof p !== 'object') return empty;
    return {
      overrides: p.overrides && typeof p.overrides === 'object' ? p.overrides : {},
      deleted: p.deleted && typeof p.deleted === 'object' ? p.deleted : {},
      added: dedupeAddedById(Array.isArray(p.added) ? p.added : []),
      addedYokai: normalizeAddedYokai(Array.isArray(p.addedYokai) ? p.addedYokai : []),
    };
  } catch {
    return empty;
  }
}

// Drop duplicate-id entries from a persisted `added` array (defensive against past corruption).
function dedupeAddedById(list: AddedPiece[]): AddedPiece[] {
  const byId = new Map<string, AddedPiece>();
  for (const a of list) if (a && typeof a.id === 'string') byId.set(a.id, a);
  return [...byId.values()];
}

interface SceneEditState extends PersistShape {
  selectedKey: string | null;
  selectedObject: Object3D | null;
  selectedAssetId: string | null;     // set-piece assetId (for duplicate)
  // Phase 101 — additional (shift-clicked) selections for batch transform / delete / duplicate.
  // The primary stays selectedKey/selectedObject; the gizmo applies its drag delta to all.
  extraSelected: { key: string; object: Object3D; assetId: string | null }[];
  pendingSelectKey: string | null;    // a just-created piece to auto-select (primary) when it mounts
  pendingExtraKeys: string[];         // Phase 101 — batch-duplicate copies to add as extras on mount
  mode: GizmoMode;
  history: PersistShape[];            // undo stack (session only, not persisted)
  paletteScale: number;               // 0.5–1.0 UI zoom for the Add-Model palette
  inspectorScale: number;             // 0.5–1.0 UI zoom for the inspector
  panelHints: boolean;                // show/hide the explanatory caption text
  hideBackdrop: boolean;              // hide distant backdrop + terrain relief while building
  clearedAreas: Record<string, true>; // areas whose seed/generated placeholders are hidden (models-only)
  clearAllAreas: boolean;             // global: clear EVERY area at once
  // Full wipe: hide ALL authored seed/generated content for the area (incl. buildings/decorations),
  // keeping only the user's own editor placements + imports. Used to give imports a blank canvas.
  fullClearedAreas: Record<string, true>;
  setPaletteScale: (n: number) => void;
  setInspectorScale: (n: number) => void;
  togglePanelHints: () => void;
  toggleHideBackdrop: () => void;
  toggleAreaCleared: (areaId: string) => void;
  toggleClearAllAreas: () => void;
  setAreaFullCleared: (areaId: string, on: boolean) => void;
  setOverride: (key: string, patch: EditOverride) => void;
  select: (key: string, object: Object3D, assetId?: string | null) => void;
  toggleSelect: (key: string, object: Object3D, assetId?: string | null) => void; // Phase 101 — shift-click multi-select
  clearExtra: () => void;
  clearSelection: () => void;
  clearPendingSelect: () => void;
  setMode: (mode: GizmoMode) => void;
  resetKey: (key: string) => void;
  resetAll: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  addModel: (areaId: string, assetId: string, count: number) => void;
  addYokai: (areaId: string, yokaiId: string) => void;
  setYokaiBehavior: (id: string, behavior: AddedYokaiBehavior) => void;
  setYokaiLevel: (id: string, level: number) => void;
  setYokaiAnimation: (id: string, animation: string) => void;
  removeYokai: (id: string) => void;
  importPersist: (data: unknown) => void; // Phase 85: load a serialized scene-edit slice (project import)
  pushHistory: (force?: boolean) => void;
  undo: () => void;
}

// Coalesce rapid edits (e.g. a gizmo/slider drag) into one undo step.
let lastHistoryPush = 0;
const HISTORY_LIMIT = 60;

// Where newly-added models spawn: the camera's focus point (written each frame by
// FollowCamera while editing). A plain mutable singleton so it never triggers renders.
export const editorSpawn = { x: 0, y: 0, z: 0 };

// Editor UI preferences (panel zoom / help visibility) persist separately from the
// scene edits so they survive reload but never pollute the baked overrides file.
const UI_KEY = 'lost-yokai-scene-editor-ui-v1';
interface UiPrefs { paletteScale: number; inspectorScale: number; panelHints: boolean; hideBackdrop: boolean; clearedAreas: Record<string, true>; clearAllAreas: boolean; fullClearedAreas: Record<string, true> }
function loadUiPrefs(): UiPrefs {
  const def: UiPrefs = { paletteScale: 1, inspectorScale: 1, panelHints: true, hideBackdrop: false, clearedAreas: {}, clearAllAreas: false, fullClearedAreas: {} };
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<UiPrefs>;
      return {
        paletteScale: typeof p.paletteScale === 'number' ? p.paletteScale : 1,
        inspectorScale: typeof p.inspectorScale === 'number' ? p.inspectorScale : 1,
        panelHints: p.panelHints !== false,
        hideBackdrop: p.hideBackdrop === true,
        clearedAreas: p.clearedAreas && typeof p.clearedAreas === 'object' ? p.clearedAreas : {},
        clearAllAreas: p.clearAllAreas === true,
        fullClearedAreas: p.fullClearedAreas && typeof p.fullClearedAreas === 'object' ? p.fullClearedAreas : {},
      };
    }
  } catch { /* ignore */ }
  return def;
}
const uiPrefs = loadUiPrefs();

export const useSceneEditStore = create<SceneEditState>((set, get) => ({
  ...loadState(),
  selectedKey: null,
  selectedObject: null,
  selectedAssetId: null,
  extraSelected: [],
  pendingSelectKey: null,
  pendingExtraKeys: [],
  mode: 'translate',
  history: [],
  paletteScale: uiPrefs.paletteScale,
  inspectorScale: uiPrefs.inspectorScale,
  panelHints: uiPrefs.panelHints,
  hideBackdrop: uiPrefs.hideBackdrop,
  clearedAreas: uiPrefs.clearedAreas,
  clearAllAreas: uiPrefs.clearAllAreas,
  fullClearedAreas: uiPrefs.fullClearedAreas,

  setPaletteScale: (n) => set({ paletteScale: Math.max(0.6, Math.min(2, Math.round(n * 100) / 100)) }),
  setInspectorScale: (n) => set({ inspectorScale: Math.max(0.6, Math.min(2, Math.round(n * 100) / 100)) }),
  togglePanelHints: () => set((s) => ({ panelHints: !s.panelHints })),
  toggleHideBackdrop: () => set((s) => ({ hideBackdrop: !s.hideBackdrop })),
  toggleAreaCleared: (areaId) => set((s) => {
    const next = { ...s.clearedAreas };
    if (next[areaId]) delete next[areaId]; else next[areaId] = true;
    return { clearedAreas: next };
  }),
  toggleClearAllAreas: () => set((s) => ({ clearAllAreas: !s.clearAllAreas })),
  setAreaFullCleared: (areaId, on) => set((s) => {
    const next = { ...s.fullClearedAreas };
    if (on) next[areaId] = true; else delete next[areaId];
    return { fullClearedAreas: next };
  }),

  // Snapshot the current edits so the next change can be undone. Coalesced unless
  // forced (so a continuous drag becomes a single undo step).
  pushHistory: (force = false) =>
    set((s) => {
      const now = Date.now();
      if (!force && now - lastHistoryPush < 350) return {};
      lastHistoryPush = now;
      const snap: PersistShape = { overrides: s.overrides, deleted: s.deleted, added: s.added, addedYokai: s.addedYokai };
      return { history: [...s.history, snap].slice(-HISTORY_LIMIT) };
    }),

  undo: () =>
    set((s) => {
      if (s.history.length === 0) return {};
      const prev = s.history[s.history.length - 1];
      return {
        overrides: prev.overrides,
        deleted: prev.deleted,
        added: prev.added,
        addedYokai: prev.addedYokai,
        history: s.history.slice(0, -1),
        selectedKey: null,
        selectedObject: null,
        selectedAssetId: null,
        extraSelected: [],
      };
    }),

  setOverride: (key, patch) =>
    set((s) => ({ overrides: { ...s.overrides, [key]: { ...s.overrides[key], ...patch } } })),

  select: (key, object, assetId = null) => set({ selectedKey: key, selectedObject: object, selectedAssetId: assetId, extraSelected: [], pendingExtraKeys: [] }),

  // Shift-click: toggle a placement in/out of the batch selection. Becomes the primary if
  // nothing is selected yet; otherwise joins (or leaves) the extra set.
  toggleSelect: (key, object, assetId = null) => set((s) => {
    if (s.selectedKey === key) return s;
    if (s.extraSelected.some((e) => e.key === key)) return { extraSelected: s.extraSelected.filter((e) => e.key !== key) };
    if (!s.selectedKey) return { selectedKey: key, selectedObject: object, selectedAssetId: assetId };
    return { extraSelected: [...s.extraSelected, { key, object, assetId }] };
  }),
  clearExtra: () => set({ extraSelected: [] }),

  clearSelection: () => set({ selectedKey: null, selectedObject: null, selectedAssetId: null, extraSelected: [], pendingExtraKeys: [] }),
  clearPendingSelect: () => set({ pendingSelectKey: null }),
  setMode: (mode) => set({ mode }),

  resetKey: (key) => {
    get().pushHistory(true);
    set((s) => {
      const next = { ...s.overrides };
      delete next[key];
      return { overrides: next };
    });
  },

  resetAll: () => {
    get().pushHistory(true);
    set({ overrides: {}, deleted: {}, added: [], addedYokai: [] });
  },

  // Delete: hide the selected placement(s) — primary + any shift-selected extras. Reversible
  // via undo / Reset All.
  deleteSelected: () => {
    const s0 = get();
    const keys = [s0.selectedKey, ...s0.extraSelected.map((e) => e.key)].filter((k): k is string => !!k);
    if (keys.length === 0) return;
    get().pushHistory(true);
    set((s) => ({
      deleted: { ...s.deleted, ...Object.fromEntries(keys.map((k) => [k, true])) },
      selectedKey: null,
      selectedObject: null,
      selectedAssetId: null,
      extraSelected: [],
    }));
  },

  // Duplicate (any GLB-backed object — set-pieces & ground tiles): clone the selected
  // piece(s) offset by a few units. With a batch selection, every selected GLB-backed
  // object is duplicated together. Copies render as "added" set-pieces; the last is
  // queued to auto-select once it mounts.
  duplicateSelected: () => {
    const s = get();
    // Build the set of duplicable targets (primary + extras that have an assetId).
    const targets: { key: string; object: Object3D; assetId: string }[] = [];
    if (s.selectedKey && s.selectedObject && s.selectedAssetId) {
      targets.push({ key: s.selectedKey, object: s.selectedObject, assetId: s.selectedAssetId });
    }
    for (const e of s.extraSelected) {
      if (e.assetId && e.object) targets.push({ key: e.key, object: e.object, assetId: e.assetId });
    }
    if (targets.length === 0) return; // nothing GLB-backed to duplicate
    get().pushHistory(true);
    const stamp = Date.now().toString(36);
    const pieces: AddedPiece[] = [];
    const copyKeys: string[] = [];
    targets.forEach((t, i) => {
      const areaId = t.key.split('#')[0];
      const id = `${stamp}_${Math.floor(Math.random() * 1e6)}_${i}`;
      pieces.push({
        id,
        areaId,
        assetId: t.assetId,
        position: [t.object.position.x + 2, t.object.position.y, t.object.position.z + 2],
        rotation: [t.object.rotation.x, t.object.rotation.y, t.object.rotation.z],
        scale: t.object.scale.x,
      });
      copyKeys.push(objKey(areaId, 'setpiece', `added_${id}`));
    });
    // Select the whole copied batch (first = primary, rest = extras) so they're immediately
    // movable together; clear the originals' selection.
    set({
      added: [...s.added, ...pieces],
      selectedKey: null, selectedObject: null, selectedAssetId: null, extraSelected: [],
      pendingSelectKey: copyKeys[0] ?? null,
      pendingExtraKeys: copyKeys.slice(1),
    });
  },

  // Spawn `count` copies of a catalog model at the camera focus point (small offsets),
  // rendered as added set-pieces. Auto-selects the last one.
  addModel: (areaId, assetId, count) => {
    get().pushHistory(true);
    const n = Math.max(1, Math.min(50, Math.floor(count) || 1));
    const stamp = Date.now().toString(36);
    const pieces: AddedPiece[] = [];
    let lastKey: string | null = null;
    for (let i = 0; i < n; i += 1) {
      const id = `${stamp}_${Math.floor(Math.random() * 1e6)}_${i}`;
      pieces.push({
        id,
        areaId,
        assetId,
        position: [editorSpawn.x + (i % 8) * 2, editorSpawn.y, editorSpawn.z + Math.floor(i / 8) * 2],
        rotation: [0, 0, 0],
        scale: 1,
      });
      lastKey = objKey(areaId, 'setpiece', `added_${id}`);
    }
    set((s) => ({ added: [...s.added, ...pieces], pendingSelectKey: lastKey }));
  },

  // Add a functional yokai (real interaction/battle) at the camera focus point.
  addYokai: (areaId, yokaiId) => {
    get().pushHistory(true);
    const id = `y_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
    const entry: AddedYokai = { id, areaId, yokaiId, position: [editorSpawn.x, editorSpawn.y, editorSpawn.z], behavior: 'observe', animation: 'idle' };
    set((s) => ({ addedYokai: [...s.addedYokai, entry], pendingSelectKey: objKey(areaId, 'yokai', id) }));
  },

  setYokaiBehavior: (id, behavior) => {
    get().pushHistory(true);
    set((s) => ({ addedYokai: s.addedYokai.map((y) => (y.id === id ? { ...y, behavior } : y)) }));
  },

  setYokaiLevel: (id, level) => {
    get().pushHistory(true);
    const lv = Math.max(1, Math.min(99, Math.round(level) || 1));
    set((s) => ({ addedYokai: s.addedYokai.map((y) => (y.id === id ? { ...y, level: lv } : y)) }));
  },

  setYokaiAnimation: (id, animation) => {
    get().pushHistory(true);
    set((s) => ({ addedYokai: s.addedYokai.map((y) => (y.id === id ? { ...y, animation } : y)) }));
  },

  removeYokai: (id) => {
    get().pushHistory(true);
    set((s) => {
      const wasSelected = !!s.selectedKey && s.selectedKey.endsWith(`#${id}`);
      return {
        addedYokai: s.addedYokai.filter((y) => y.id !== id),
        ...(wasSelected ? { selectedKey: null, selectedObject: null, selectedAssetId: null } : {}),
      };
    });
  },

  importPersist: (data) => {
    if (!data || typeof data !== 'object') return;
    const p = data as Partial<PersistShape>;
    set({
      overrides: p.overrides && typeof p.overrides === 'object' ? p.overrides : {},
      deleted: p.deleted && typeof p.deleted === 'object' ? p.deleted : {},
      added: Array.isArray(p.added) ? p.added : [],
      addedYokai: normalizeAddedYokai(Array.isArray(p.addedYokai) ? p.addedYokai : []),
      selectedKey: null,
      selectedObject: null,
      selectedAssetId: null,
      history: [],
    });
  },
}));

// Persist overrides + deleted + added (selection/object are transient).
let lastSerialized = '';
function persist(state: SceneEditState) {
  const data: PersistShape = { overrides: state.overrides, deleted: state.deleted, added: state.added, addedYokai: state.addedYokai };
  const serialized = JSON.stringify(data);
  if (serialized === lastSerialized) return;
  lastSerialized = serialized;
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // ignore unavailable storage
  }
}
lastSerialized = JSON.stringify({
  overrides: useSceneEditStore.getState().overrides,
  deleted: useSceneEditStore.getState().deleted,
  added: useSceneEditStore.getState().added,
  addedYokai: useSceneEditStore.getState().addedYokai,
});

// Persist editor UI prefs (panel scales + help visibility) separately.
let lastUiSerialized = JSON.stringify(uiPrefs);
function persistUi(state: SceneEditState) {
  const ui = JSON.stringify({ paletteScale: state.paletteScale, inspectorScale: state.inspectorScale, panelHints: state.panelHints, hideBackdrop: state.hideBackdrop, clearedAreas: state.clearedAreas, clearAllAreas: state.clearAllAreas, fullClearedAreas: state.fullClearedAreas });
  if (ui === lastUiSerialized) return;
  lastUiSerialized = ui;
  try {
    localStorage.setItem(UI_KEY, ui);
  } catch {
    // ignore unavailable storage
  }
}

useSceneEditStore.subscribe((state) => {
  persist(state);
  persistUi(state);
});

// Cross-window live sync (parity with modelStudioStore).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      const next = loadState();
      lastSerialized = e.newValue ?? '';
      useSceneEditStore.setState(next);
    }
  });
}

// React hook: merged transform (base ⊕ baked ⊕ live). Re-renders when this key's live
// override changes, so gizmo edits apply instantly.
export function useMergedTransform(key: string, base: BaseTransform): MergedTransform {
  const live = useSceneEditStore((s) => s.overrides[key]);
  return mergeTransform(base, SCENE_EDIT_OVERRIDES[key], live);
}

// Is a placement key hidden (baked or live delete)?
export function isKeyDeleted(key: string, live: Record<string, true>): boolean {
  return !!SCENE_EDIT_DELETED[key] || !!live[key];
}

// "Models-only" clear: when the CURRENT area is cleared, hide every placement EXCEPT
// the ground tiles and the user's own Add-Model placements (keys `added_…` / `y_…`).
// Keyed on the player's current area (objects may use a different key prefix, e.g.
// outdoor zone.id, so we must check the area the player is in — not the key prefix).
export function useIsAreaClearActive(): boolean {
  const areaId = usePlayerStore((s) => s.currentAreaId);
  return useSceneEditStore((s) => s.clearAllAreas || !!s.clearedAreas[areaId] || !!s.fullClearedAreas[areaId]);
}
// Whether the CURRENT area is FULL-cleared (wipe everything authored, incl. decorative GLBs).
export function useIsAreaFullClearActive(): boolean {
  const areaId = usePlayerStore((s) => s.currentAreaId);
  return useSceneEditStore((s) => !!s.fullClearedAreas[areaId]);
}
// Kinds kept on a models-only clear = real-GLB decorative/scene objects (not gameplay/interactive,
// not pure primitives). Cleared = npc/yokai/item/trigger (interactive) + scatter/
// regional/structure/platform (primitives) + anything generated (id `gen_…`).
const CLEAR_KEEP_KINDS = new Set(['groundtile', 'setpiece', 'decoration', 'landmark', 'building', 'prop']);
// Editor-placed / imported objects are ALWAYS kept on any clear.
const isEditorPlacement = (id: string): boolean => /^(added_|y_|eyk_|enpc_|etr_|enc_|imp_)/.test(id);
export function useIsHiddenByClear(key: string): boolean {
  const full = useIsAreaFullClearActive();
  const active = useIsAreaClearActive();
  if (!active) return false;
  const parts = key.split('#');
  const id = parts[2] ?? '';
  if (isEditorPlacement(id)) return false;     // keep your own placements + imports
  if (parts[1] === 'groundtile') return false; // always keep the floor tiles
  if (full) return true;                        // FULL wipe → hide all remaining authored content
  if (id.startsWith('gen_')) return parts[1] !== 'groundtile';      // generated = primitive placeholders → clear
  return !CLEAR_KEEP_KINDS.has(parts[1]);
}

// Effective collision for a placement: live ⊕ baked override, else per-kind default.
export function useCollision(key: string): boolean {
  const live = useSceneEditStore((s) => s.overrides[key]?.collision);
  if (live !== undefined) return live;
  const baked = SCENE_EDIT_OVERRIDES[key]?.collision;
  if (baked !== undefined) return baked;
  return defaultCollisionForKind((key.split('#')[1] ?? '') as EditKind);
}

// Effective collider SHAPE (live ⊕ baked override, else per-kind default). Use together
// with useCollision: the object is only solid when collision is on, then uses this shape.
export function useCollisionShape(key: string): CollisionShape {
  const live = useSceneEditStore((s) => s.overrides[key]?.collisionShape);
  if (live !== undefined) return live;
  const baked = SCENE_EDIT_OVERRIDES[key]?.collisionShape;
  if (baked !== undefined) return baked;
  return defaultCollisionShapeForKind((key.split('#')[1] ?? '') as EditKind);
}

// All added (duplicated) set-pieces for an area (baked + live), DEDUPED by id. A piece can exist in
// both the baked constant and the live store (e.g. after baking without clearing the live layer);
// rendering both produced duplicate React keys and doubled the GLB/VRAM cost. Live wins on conflict.
export function addedForArea(areaId: string, live: AddedPiece[]): AddedPiece[] {
  const byId = new Map<string, AddedPiece>();
  for (const a of SCENE_EDIT_ADDED) if (a.areaId === areaId) byId.set(a.id, a);
  for (const a of live) if (a.areaId === areaId) byId.set(a.id, a);
  return [...byId.values()];
}

// Count of edits affecting an area (overrides + deletes + added), live + baked.
export function countEditsForArea(areaId: string, s: SceneEditState): number {
  const prefix = `${areaId}#`;
  const keys = new Set<string>([
    ...Object.keys(SCENE_EDIT_OVERRIDES), ...Object.keys(s.overrides),
    ...Object.keys(SCENE_EDIT_DELETED), ...Object.keys(s.deleted),
  ]);
  let n = 0;
  for (const k of keys) if (k.startsWith(prefix)) n += 1;
  n += addedForArea(areaId, s.added).length;
  return n;
}

// Build the full text of src/data/sceneEditOverrides.ts (baked ⊕ live) for "Save to file".
export function buildOverridesFile(): string {
  const s = useSceneEditStore.getState();
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const fv = (v: [number, number, number]) => `[${v.map(round).join(', ')}]`;

  const overrides = { ...SCENE_EDIT_OVERRIDES, ...s.overrides };
  const ovLines = Object.keys(overrides).sort().map((k) => {
    const o = overrides[k];
    const parts: string[] = [];
    if (o.position) parts.push(`position: ${fv(o.position)}`);
    if (o.rotation) parts.push(`rotation: ${fv(o.rotation)}`);
    if (o.scale !== undefined) parts.push(`scale: ${round(o.scale)}`);
    if (o.collision !== undefined) parts.push(`collision: ${o.collision}`);
    if (o.collisionShape !== undefined) parts.push(`collisionShape: ${JSON.stringify(o.collisionShape)}`);
    return `  ${JSON.stringify(k)}: { ${parts.join(', ')} },`;
  });

  const deleted = { ...SCENE_EDIT_DELETED, ...s.deleted };
  const delLines = Object.keys(deleted).sort().map((k) => `  ${JSON.stringify(k)}: true,`);

  const added = [...SCENE_EDIT_ADDED, ...s.added];
  const addLines = added.map((a) =>
    `  { id: ${JSON.stringify(a.id)}, areaId: ${JSON.stringify(a.areaId)}, assetId: ${JSON.stringify(a.assetId)}, position: ${fv(a.position)}, rotation: ${fv(a.rotation)}, scale: ${round(a.scale)} },`);

  return [
    "import type { AddedPiece, EditOverride } from '../game/edit/sceneEditMerge';",
    '',
    '// Phase 89/90 — BAKED in-game Edit Mode (F1) edits (generated by "Save to file").',
    'export const SCENE_EDIT_OVERRIDES: Record<string, EditOverride> = {',
    ...ovLines,
    '};',
    '',
    'export const SCENE_EDIT_DELETED: Record<string, true> = {',
    ...delLines,
    '};',
    '',
    'export const SCENE_EDIT_ADDED: AddedPiece[] = [',
    ...addLines,
    '];',
    '',
  ].join('\n');
}

export { STORAGE_KEY as SCENE_EDIT_STORAGE_KEY };
