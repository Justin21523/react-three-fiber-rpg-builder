import type { TimeOfDay } from './randomEvent';

// Phase 98a — per-area Environment override (sky / fog / lighting). Stored in editorEnvironmentStore
// (localStorage + registry export), merged over the biome theme by resolveAreaEnvironment. Every
// field is optional so an override only changes what it sets; the rest falls back to the resolver's
// stable default or the live day/night system. No source data is written.

export type BackgroundMode = 'dynamic' | 'sky' | 'gradient' | 'solid';

// Lock the area's lighting to one time-of-day so it never darkens with the clock/weather.
export type LockTime = TimeOfDay | 'none';

// Ground rendering: 'default' = existing GLB tiles + flat colour ZoneFloor; 'flatPbr' = a flat
// three.js plane with a PBR material; 'heightfield' = a walkable undulating terrain (noise +
// optional heightmap) with trimesh collision. Textures referenced by library key or path/URL.
export type GroundType = 'default' | 'flatPbr' | 'heightfield';

// A placeable PBR patch/decal — an overlapping textured rectangle on the ground (Phase 98d).
export interface PbrPatch {
  id: string;
  albedoKey?: string;       // image texture-library key OR url
  normalKey?: string;
  gltfMaterialUrl?: string; // OR a GLB material
  x: number;                // world centre X
  z: number;                // world centre Z
  sizeX: number;            // world size along X
  sizeZ: number;            // world size along Z
  rotationDeg: number;      // block rotation about Y
  repeat: number;           // texture tiling / scale within the block
  y?: number;               // height above the ground, default 0.05
  conform?: boolean;        // drape over heightfield terrain (default true); flat otherwise
}

// Heightfield terrain (Phase 98c) — parametric fBm noise + optional grayscale heightmap image.
export interface TerrainConfig {
  size?: number;             // patch world size, default 400
  segments?: number;         // grid resolution per side, default 96
  amplitude?: number;        // noise vertical scale, default 3
  frequency?: number;        // noise horizontal scale, default 0.05
  octaves?: number;          // fBm octaves 1–5, default 3
  seed?: number;             // default 1
  baseOffset?: number;       // vertical shift, default 0
  flattenRadius?: number;    // flatten near origin/spawn, default 10
  heightmapUrl?: string;     // library key OR url (grayscale); optional
  heightmapAmplitude?: number; // default 0 (off); image drives extra height
  heightmapInvert?: boolean;
  water?: TerrainWaterConfig; // automatic valley water (Phase 98d)
  sculpt?: TerrainSculptData; // brush-sculpted height deltas layered over the noise (Phase 98d)
  splat?: TerrainSplatConfig; // multi-material blending (auto + painted) (Phase 98d)
  lod?: TerrainLodConfig;     // distance-based visual resolution (Phase 98d)
}

export interface TerrainLodConfig {
  enabled?: boolean;
  far?: number;          // distance (world units) to switch to the low-res mesh, default 160
  highSegments?: number; // near resolution, default = terrain segments
  lowSegments?: number;  // far resolution, default 24
}

export interface TerrainSculptData {
  res: number;   // grid resolution per side
  data: string;  // base64 Float32Array(res*res) of height deltas
}

export interface TerrainSplatLayer {
  albedoKey?: string;       // image texture-library key OR url
  normalKey?: string;       // optional normal-map key OR url (rotated with the layer)
  gltfMaterialUrl?: string; // OR a GLB material (its base-colour + normal maps are used)
  repeat?: number;          // tiling / scale, default 8
  rotationDeg?: number;     // UV rotation in degrees, default 0
}

export interface TerrainSplatConfig {
  enabled?: boolean;
  layers?: TerrainSplatLayer[]; // up to 4
  res?: number;                 // weight grid resolution, default 128
  mode?: 'auto' | 'paint';      // auto = height/slope rules; paint = brush-edited weights
  weights?: string;             // base64 Uint8Array(res*res*4) layer weights (painted)
  bandLow?: number;             // auto: height below this → layer 0
  bandHigh?: number;            // auto: height above this → layer 2
  slopeRock?: number;           // auto: slope (0..1) above this → layer 3 (rock)
}

export interface TerrainWaterConfig {
  enabled?: boolean;
  level?: number;    // world Y of the water surface, default 0
  color?: string;    // default '#2d6a8f'
  opacity?: number;  // default 0.6
}

export interface PbrGroundConfig {
  gltfMaterialUrl?: string; // a GLB material set (src/assets/materials) — supplies all maps as a base
  albedoUrl?: string;     // base colour map (sRGB) — overrides the gltf base colour when set
  normalUrl?: string;     // tangent-space normal map (linear)
  roughnessUrl?: string;  // roughness map (linear)
  aoUrl?: string;         // ambient-occlusion map (linear, needs uv1)
  repeat?: number;        // uniform tiling, default 8
  rotationDeg?: number;   // UV rotation in degrees, default 0
  normalScale?: number;   // default 1
  roughness?: number;     // scalar fallback / multiplier, default 1
  metalness?: number;     // default 0
  tint?: string;          // colour multiply, default '#ffffff'
}

export interface EnvironmentOverride {
  backgroundMode?: BackgroundMode;

  // drei <Sky> params (used when backgroundMode === 'sky').
  sunElevationDeg?: number;   // 0 = horizon, 90 = straight up
  sunAzimuthDeg?: number;     // compass direction of the sun
  turbidity?: number;
  rayleigh?: number;
  mieCoefficient?: number;
  mieDirectionalG?: number;

  // Flat / gradient background colours.
  solidColor?: string;        // backgroundMode === 'solid'
  gradientTop?: string;       // backgroundMode === 'gradient'
  gradientBottom?: string;

  // Fog override (independent of background mode).
  fogEnabled?: boolean;
  fogColor?: string;
  fogNear?: number;
  fogFar?: number;

  // Pin lighting to a fixed time-of-day ('none' = follow the live clock).
  lockTimeOfDay?: LockTime;

  // Optional flat multipliers on the resolved ambient / directional intensity.
  ambientIntensity?: number;
  directionalIntensity?: number;

  // Colour of the large ground-catch plane (falls back to the area theme's groundColor).
  groundCatchColor?: string;

  // Ground surface (Phase 98b).
  groundType?: GroundType;
  pbrGround?: PbrGroundConfig;

  // Overlapping placeable PBR patches/decals on top of the ground (Phase 98d).
  pbrPatches?: PbrPatch[];

  // Heightfield terrain (Phase 98c).
  terrain?: TerrainConfig;
}

// The stable, good-looking default applied to every OUTDOOR area when the global default mode is
// 'stableSky': a clear daytime drei Sky with lighting locked to noon (so it never goes dark).
export const DEFAULT_STABLE_OVERRIDE: EnvironmentOverride = {
  backgroundMode: 'sky',
  sunElevationDeg: 38,
  sunAzimuthDeg: 165,
  turbidity: 7,
  rayleigh: 1.6,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  fogEnabled: true,
  lockTimeOfDay: 'day',
};

// Minute-of-day for each phase peak (mirrors the keyframes in worldAmbience.ts) so locked lighting
// can reuse getInterpolatedAmbience without the live clock.
export const LOCK_TIME_MINUTE: Record<TimeOfDay, number> = {
  night: 0,
  dawn: 390,
  day: 720,
  evening: 1110,
};
