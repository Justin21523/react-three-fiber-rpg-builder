import { Color } from 'three';
import type { TimeOfDay, WeatherCondition } from '../../types/randomEvent';
import type { EnvironmentTheme } from '../../types/environment';

export interface WorldAmbience {
  skyColor: string;          // background + fog tint
  fogNear: number;
  fogFar: number;
  sunPosition: [number, number, number];
  turbidity: number;
  rayleigh: number;
  ambient: { color: string; intensity: number };
  directional: { color: string; intensity: number };
  hemisphere: { sky: string; ground: string; intensity: number };
}

// Per-phase visual preset. Sun height drives the drei <Sky> shader:
// high sun = bright day, low sun = warm dawn/evening, below horizon = dark night.
export const TIME_PRESET: Record<TimeOfDay, WorldAmbience> = {
  dawn: {
    skyColor: '#bcd0e0',
    fogNear: 55,
    fogFar: 175,
    sunPosition: [80, 12, 40],
    turbidity: 9,
    rayleigh: 2.4,
    ambient: { color: '#e8d8e0', intensity: 0.3 },
    directional: { color: '#ffcf9e', intensity: 0.7 },
    hemisphere: { sky: '#cdd9ec', ground: '#2c3320', intensity: 0.6 },
  },
  day: {
    skyColor: '#9cc9f5',
    fogNear: 65,
    fogFar: 185,
    sunPosition: [80, 45, 40],
    turbidity: 7,
    rayleigh: 1.8,
    ambient: { color: '#ffffff', intensity: 0.35 },
    directional: { color: '#ffffff', intensity: 1.2 },
    hemisphere: { sky: '#dbeafe', ground: '#365314', intensity: 0.8 },
  },
  evening: {
    skyColor: '#e89a63',
    fogNear: 50,
    fogFar: 165,
    sunPosition: [80, 6, 40],
    turbidity: 10,
    rayleigh: 3,
    ambient: { color: '#ffd9b0', intensity: 0.3 },
    directional: { color: '#ffb37a', intensity: 0.9 },
    hemisphere: { sky: '#fcd9b6', ground: '#3b2a14', intensity: 0.6 },
  },
  night: {
    // Phase 47: genuinely dark night — lamps/point lights (NightLights) supply
    // the lit-night feel rather than leftover ambient sunlight.
    skyColor: '#05060f',
    fogNear: 30,
    fogFar: 130,
    sunPosition: [80, -6, 40],
    turbidity: 12,
    rayleigh: 0.4,
    ambient: { color: '#3a4675', intensity: 0.07 },
    directional: { color: '#5567a8', intensity: 0.12 },
    hemisphere: { sky: '#10173a', ground: '#03040a', intensity: 0.12 },
  },
};

// Keyframes placed at each phase's "peak" minute of a 1440-minute day, looped.
// Interpolating between these gives a smooth sunrise→noon→sunset→midnight cycle.
interface Keyframe {
  t: number; // minute of day
  amb: WorldAmbience;
}
const KEYFRAMES: Keyframe[] = [
  { t: 0, amb: TIME_PRESET.night }, // 00:00 midnight
  { t: 390, amb: TIME_PRESET.dawn }, // 06:30 sunrise
  { t: 720, amb: TIME_PRESET.day }, // 12:00 noon
  { t: 1110, amb: TIME_PRESET.evening }, // 18:30 sunset
  { t: 1440, amb: TIME_PRESET.night }, // 24:00 midnight (loop)
];

// Reused scratch colors to avoid per-frame allocation.
const cA = new Color();
const cB = new Color();

function lerpColor(a: string, b: string, t: number): string {
  cA.set(a);
  cB.set(b);
  return `#${cA.lerp(cB, t).getHexString()}`;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function lerpAmbience(a: WorldAmbience, b: WorldAmbience, t: number): WorldAmbience {
  return {
    skyColor: lerpColor(a.skyColor, b.skyColor, t),
    fogNear: lerp(a.fogNear, b.fogNear, t),
    fogFar: lerp(a.fogFar, b.fogFar, t),
    sunPosition: [
      lerp(a.sunPosition[0], b.sunPosition[0], t),
      lerp(a.sunPosition[1], b.sunPosition[1], t),
      lerp(a.sunPosition[2], b.sunPosition[2], t),
    ],
    turbidity: lerp(a.turbidity, b.turbidity, t),
    rayleigh: lerp(a.rayleigh, b.rayleigh, t),
    ambient: {
      color: lerpColor(a.ambient.color, b.ambient.color, t),
      intensity: lerp(a.ambient.intensity, b.ambient.intensity, t),
    },
    directional: {
      color: lerpColor(a.directional.color, b.directional.color, t),
      intensity: lerp(a.directional.intensity, b.directional.intensity, t),
    },
    hemisphere: {
      sky: lerpColor(a.hemisphere.sky, b.hemisphere.sky, t),
      ground: lerpColor(a.hemisphere.ground, b.hemisphere.ground, t),
      intensity: lerp(a.hemisphere.intensity, b.hemisphere.intensity, t),
    },
  };
}

// Weather layers on top of the (clear) time ambience: rain darkens and pulls fog
// in, fog collapses visibility and desaturates toward gray.
function applyWeather(base: WorldAmbience, weather: WeatherCondition): WorldAmbience {
  if (weather === 'rain') {
    return {
      ...base,
      skyColor: lerpColor(base.skyColor, '#6b7686', 0.6),
      fogNear: Math.min(base.fogNear, 22),
      fogFar: Math.min(base.fogFar, 80),
      turbidity: base.turbidity + 4,
      ambient: { ...base.ambient, intensity: base.ambient.intensity * 0.8 },
      directional: { ...base.directional, intensity: base.directional.intensity * 0.6 },
      hemisphere: { ...base.hemisphere, intensity: base.hemisphere.intensity * 0.7 },
    };
  }
  if (weather === 'fog') {
    return {
      ...base,
      skyColor: lerpColor(base.skyColor, '#b8bcc2', 0.7),
      fogNear: 6,
      fogFar: 42,
      turbidity: base.turbidity + 6,
      ambient: { ...base.ambient, intensity: base.ambient.intensity * 0.9 },
      directional: { ...base.directional, intensity: base.directional.intensity * 0.5 },
      hemisphere: { ...base.hemisphere, intensity: base.hemisphere.intensity * 0.75 },
    };
  }
  return base;
}

// Per-biome fog reach multiplier: enclosed biomes (forest, marsh) pull fog in for
// intimacy; open biomes (mountain, sky, coast) push it out for grandeur.
const BIOME_FOG_SCALE: Partial<Record<string, number>> = {
  forest: 0.78,
  shrine: 0.9,
  mountain: 1.25,
  coast: 1.15,
  ocean: 1.2,
  port: 1.1,
  sky: 1.45,
  yokaiRealm: 0.7,
  city: 0.95,
};

// Phase 60 — give each OUTDOOR biome its own atmosphere by tinting the shared
// time/weather ambience toward the biome's palette. Sky/fog tint is scaled by how
// bright the moment is (dayFactor) so night never gets washed out, while the
// hemisphere ground always leans to the biome ground for a grounded sense of place.
export function applyBiomeTint(base: WorldAmbience, theme: EnvironmentTheme): WorldAmbience {
  const dayFactor = Math.max(0, Math.min(1, base.directional.intensity / 1.2));
  const skyTint = 0.38 * dayFactor;
  const fogScale = BIOME_FOG_SCALE[theme.biomeType] ?? 1;
  // Mild per-biome light bias around the campus baseline (ambient 0.4 / dir 1.1).
  const lightScale = 0.8 + 0.2 * (theme.directionalLightIntensity / 1.1);
  return {
    ...base,
    skyColor: lerpColor(base.skyColor, theme.fogColor, skyTint),
    fogNear: base.fogNear * fogScale,
    fogFar: base.fogFar * fogScale,
    ambient: { ...base.ambient, intensity: base.ambient.intensity * lightScale },
    directional: { ...base.directional, intensity: base.directional.intensity * lightScale },
    hemisphere: {
      sky: lerpColor(base.hemisphere.sky, theme.fogColor, skyTint),
      ground: lerpColor(base.hemisphere.ground, theme.groundColor, 0.5),
      intensity: base.hemisphere.intensity,
    },
  };
}

// Fixed interior ambience derived from a theme — no day/night cycle, so large
// indoor scenes stay readable at any time. Ambient is floored so it never goes dark.
export function getIndoorAmbience(theme: EnvironmentTheme): WorldAmbience {
  return {
    skyColor: theme.fogColor,
    fogNear: 22,
    fogFar: 90,
    sunPosition: [12, 22, 10],
    turbidity: 2,
    rayleigh: 1,
    ambient: { color: '#fff5e6', intensity: Math.max(theme.ambientLightIntensity, 0.55) },
    directional: { color: '#ffffff', intensity: Math.max(theme.directionalLightIntensity, 0.6) },
    hemisphere: { sky: '#ffffff', ground: theme.groundColor, intensity: 0.6 },
  };
}

// Continuous ambience for a given minute-of-day (0–1440) and weather.
export function getInterpolatedAmbience(minutes: number, weather: WeatherCondition): WorldAmbience {
  const m = ((minutes % 1440) + 1440) % 1440;
  let i = 0;
  while (i < KEYFRAMES.length - 1 && m > KEYFRAMES[i + 1].t) i++;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[i + 1];
  const span = b.t - a.t;
  const t = span > 0 ? (m - a.t) / span : 0;
  return applyWeather(lerpAmbience(a.amb, b.amb, t), weather);
}
