import type { BackgroundMode, EnvironmentOverride, GroundType, LockTime, PbrGroundConfig, PbrPatch, TerrainConfig } from '../../types/environmentOverride';
import { DEFAULT_STABLE_OVERRIDE } from '../../types/environmentOverride';
import { getEnvDefaultMode, getEnvironmentOverride } from '../../stores/editorEnvironmentStore';
import { resolveAreaTheme } from './areaBiome';
import { isIndoorBiome } from './environmentTheme';

// Phase 98a — collapse the biome theme + global default mode + per-area override into one concrete
// config that EnvironmentBackdrop and DynamicAmbience read. Indoor biomes are kept on the original
// dynamic ambience (no sky) unless explicitly overridden, so interiors look unchanged.

export interface ResolvedEnvironment {
  isIndoor: boolean;
  backgroundMode: BackgroundMode;
  // sky
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  // flat / gradient
  solidColor: string;
  gradientTop: string;
  gradientBottom: string;
  // fog
  fogEnabled: boolean;
  fogColor?: string;
  fogNear?: number;
  fogFar?: number;
  // lighting
  lockTimeOfDay: LockTime;
  ambientIntensity?: number;
  directionalIntensity?: number;
  // ground
  groundCatchColor: string;
  groundType: GroundType;
  pbrGround: Required<Pick<PbrGroundConfig, 'repeat' | 'rotationDeg' | 'normalScale' | 'roughness' | 'metalness' | 'tint'>> & PbrGroundConfig;
  terrain: Required<Pick<TerrainConfig, 'size' | 'segments' | 'amplitude' | 'frequency' | 'octaves' | 'seed' | 'baseOffset' | 'flattenRadius' | 'heightmapAmplitude' | 'heightmapInvert'>> & TerrainConfig;
  // Y of the distant ground-catch plane / terrain safety net — drops below valleys for heightfields.
  groundCatchY: number;
  pbrPatches: PbrPatch[];
}

export function resolveAreaEnvironment(areaId: string): ResolvedEnvironment {
  const theme = resolveAreaTheme(areaId);
  const indoor = isIndoorBiome(theme.biomeType);
  const override = getEnvironmentOverride(areaId);

  // Base layer: indoor → keep dynamic (unchanged); outdoor → global default mode.
  const base: EnvironmentOverride =
    indoor || getEnvDefaultMode() === 'dynamic'
      ? { backgroundMode: 'dynamic', lockTimeOfDay: 'none' }
      : DEFAULT_STABLE_OVERRIDE;

  const m: EnvironmentOverride = { ...base, ...override };

  return {
    isIndoor: indoor,
    backgroundMode: m.backgroundMode ?? 'dynamic',
    sunElevationDeg: m.sunElevationDeg ?? 38,
    sunAzimuthDeg: m.sunAzimuthDeg ?? 165,
    turbidity: m.turbidity ?? 7,
    rayleigh: m.rayleigh ?? 1.6,
    mieCoefficient: m.mieCoefficient ?? 0.005,
    mieDirectionalG: m.mieDirectionalG ?? 0.8,
    solidColor: m.solidColor ?? theme.fogColor,
    gradientTop: m.gradientTop ?? '#7fb2e8',
    gradientBottom: m.gradientBottom ?? theme.fogColor,
    fogEnabled: m.fogEnabled ?? true,
    fogColor: m.fogColor,
    fogNear: m.fogNear,
    fogFar: m.fogFar,
    lockTimeOfDay: m.lockTimeOfDay ?? 'none',
    ambientIntensity: m.ambientIntensity,
    directionalIntensity: m.directionalIntensity,
    groundCatchColor: m.groundCatchColor ?? theme.groundColor,
    groundType: m.groundType ?? 'default',
    pbrGround: {
      albedoUrl: m.pbrGround?.albedoUrl,
      normalUrl: m.pbrGround?.normalUrl,
      roughnessUrl: m.pbrGround?.roughnessUrl,
      aoUrl: m.pbrGround?.aoUrl,
      repeat: m.pbrGround?.repeat ?? 8,
      rotationDeg: m.pbrGround?.rotationDeg ?? 0,
      normalScale: m.pbrGround?.normalScale ?? 1,
      roughness: m.pbrGround?.roughness ?? 1,
      metalness: m.pbrGround?.metalness ?? 0,
      tint: m.pbrGround?.tint ?? '#ffffff',
    },
    terrain: {
      size: m.terrain?.size ?? 400,
      segments: m.terrain?.segments ?? 96,
      amplitude: m.terrain?.amplitude ?? 3,
      frequency: m.terrain?.frequency ?? 0.05,
      octaves: m.terrain?.octaves ?? 3,
      seed: m.terrain?.seed ?? 1,
      baseOffset: m.terrain?.baseOffset ?? 0,
      flattenRadius: m.terrain?.flattenRadius ?? 10,
      heightmapUrl: m.terrain?.heightmapUrl,
      heightmapAmplitude: m.terrain?.heightmapAmplitude ?? 0,
      heightmapInvert: m.terrain?.heightmapInvert ?? false,
      water: m.terrain?.water,
      sculpt: m.terrain?.sculpt,
      splat: m.terrain?.splat,
      lod: m.terrain?.lod,
    },
    groundCatchY:
      (m.groundType ?? 'default') === 'heightfield'
        ? (m.terrain?.baseOffset ?? 0) - ((m.terrain?.amplitude ?? 3) + (m.terrain?.heightmapAmplitude ?? 0)) - 1
        : 0,
    pbrPatches: m.pbrPatches ?? [],
  };
}

// The stable scene.background colour behind the backdrop dome (kept sensible per mode so the
// horizon/fog never shows a wrong colour). DynamicAmbience writes this when mode !== 'dynamic'.
export function resolvedBackgroundColor(env: ResolvedEnvironment): string {
  if (env.backgroundMode === 'solid') return env.solidColor;
  if (env.backgroundMode === 'gradient') return env.gradientBottom;
  return env.gradientBottom; // sky → horizon tint behind the dome
}

// Convert sun elevation/azimuth (degrees) to a drei <Sky> sunPosition vector.
export function sunPositionFrom(elevationDeg: number, azimuthDeg: number): [number, number, number] {
  const el = (elevationDeg * Math.PI) / 180;
  const az = (azimuthDeg * Math.PI) / 180;
  const cosEl = Math.cos(el);
  return [Math.cos(az) * cosEl, Math.sin(el), Math.sin(az) * cosEl];
}
