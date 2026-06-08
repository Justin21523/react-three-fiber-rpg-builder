import { create } from 'zustand';
import { MODEL_ASSETS, type ModelAsset, type Vec3 } from '../data/modelLibrary';

export type { ModelAsset, Vec3 };

// Kit — per-model transform tuning (scale/position/rotation), persisted to localStorage. resolveModelAsset
// merges these overrides onto the auto-discovered model so the GLB renderers (CollidableGlb / SceneGlbModel)
// pick them up. (The full yokai-game Model Studio also tuned animation clips; kept minimal here.)
export interface ModelAssetOverride { scale?: number; position?: Vec3; rotation?: Vec3; clips?: Record<string, number>; }

const STORAGE_KEY = 'r3f-rpg-model-studio-v1';
function loadOverrides(): Record<string, ModelAssetOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') return p as Record<string, ModelAssetOverride>; }
  } catch { /* ignore */ }
  return {};
}

interface ModelStudioState {
  overrides: Record<string, ModelAssetOverride>;
  setTransform: (assetId: string, patch: Pick<ModelAssetOverride, 'scale' | 'position' | 'rotation'>) => void;
  resetAsset: (assetId: string) => void;
  importState: (data: unknown) => void;
  reset: () => void;
}

export const useModelStudioStore = create<ModelStudioState>((set) => ({
  overrides: loadOverrides(),
  setTransform: (assetId, patch) => set((s) => ({ overrides: { ...s.overrides, [assetId]: { ...s.overrides[assetId], ...patch } } })),
  resetAsset: (assetId) => set((s) => { const n = { ...s.overrides }; delete n[assetId]; return { overrides: n }; }),
  importState: (data) => { if (data && typeof data === 'object') set({ overrides: data as Record<string, ModelAssetOverride> }); },
  reset: () => set({ overrides: {} }),
}));

useModelStudioStore.subscribe((s) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s.overrides)); } catch { /* ignore */ } });

export function resolveModelAsset(assetId: string | undefined): ModelAsset | undefined {
  if (!assetId) return undefined;
  const base = MODEL_ASSETS[assetId];
  if (!base) return undefined;
  const o = useModelStudioStore.getState().overrides[assetId];
  if (!o) return base;
  return { ...base, scale: o.scale ?? base.scale, position: o.position ?? base.position, rotation: o.rotation ?? base.rotation, clips: o.clips ?? base.clips };
}
