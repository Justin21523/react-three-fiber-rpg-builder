import { create } from 'zustand';

// Phase 98d — ephemeral terrain brush state (NOT persisted). Drives the sculpt + paint tools and the
// region-selection marquee in HeightfieldGround, and is read by FollowCamera to suspend OrbitControls
// rotation while a tool is active (so left-drag edits the terrain instead of orbiting the camera).

export type TerrainTool =
  | 'none'
  | 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise' | 'sharpen' | 'terrace' | 'setLevel'
  | 'paint' | 'select';

export const SCULPT_TOOLS: TerrainTool[] = ['raise', 'lower', 'smooth', 'flatten', 'noise', 'sharpen', 'terrace', 'setLevel'];

// World-space rectangular selection (XZ).
export interface TerrainRegion { x0: number; z0: number; x1: number; z1: number; }
export type RegionApplyKind = 'fillLayer' | 'raise' | 'lower' | 'flatten';

interface TerrainBrushState {
  tool: TerrainTool;
  radius: number;     // world units
  strength: number;   // 0..1
  paintLayer: number; // 0..3 (splat layer to paint / fill)
  terraceStep: number; // 'terrace' step height
  targetLevel: number; // 'setLevel' target Y
  shiftHeld: boolean;  // Shift held → temporarily yield drag to the camera (orbit/pan) instead of brush
  regions: TerrainRegion[];
  pendingApply: { kind: RegionApplyKind; layer: number; nonce: number };
  setTool: (t: TerrainTool) => void;
  setShiftHeld: (v: boolean) => void;
  setRadius: (r: number) => void;
  setStrength: (s: number) => void;
  setPaintLayer: (i: number) => void;
  setTerraceStep: (v: number) => void;
  setTargetLevel: (v: number) => void;
  addRegion: (r: TerrainRegion) => void;
  clearRegions: () => void;
  requestApply: (kind: RegionApplyKind, layer?: number) => void;
}

export const useTerrainBrushStore = create<TerrainBrushState>((set) => ({
  tool: 'none',
  radius: 12,
  strength: 0.5,
  paintLayer: 0,
  terraceStep: 1,
  targetLevel: 0,
  shiftHeld: false,
  regions: [],
  pendingApply: { kind: 'fillLayer', layer: 0, nonce: 0 },
  setTool: (tool) => set({ tool }),
  setShiftHeld: (shiftHeld) => set({ shiftHeld }),
  setRadius: (radius) => set({ radius }),
  setStrength: (strength) => set({ strength }),
  setPaintLayer: (paintLayer) => set({ paintLayer }),
  setTerraceStep: (terraceStep) => set({ terraceStep }),
  setTargetLevel: (targetLevel) => set({ targetLevel }),
  addRegion: (r) => set((s) => ({ regions: [...s.regions, r] })),
  clearRegions: () => set({ regions: [] }),
  requestApply: (kind, layer = 0) => set((s) => ({ pendingApply: { kind, layer, nonce: s.pendingApply.nonce + 1 } })),
}));

// True while any terrain tool is active (camera rotation should be suspended).
export function isTerrainToolActive(): boolean {
  return useTerrainBrushStore.getState().tool !== 'none';
}
