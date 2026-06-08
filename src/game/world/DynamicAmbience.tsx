import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { AmbientLight, Color, DirectionalLight, Fog, HemisphereLight } from 'three';
import { useWorldClockStore } from '../../stores/worldClockStore';
import { usePlayerStore } from '../../stores/playerStore';
import { isIndoorBiome } from '../environment/environmentTheme';
import { resolveAreaTheme } from '../environment/areaBiome';
import { applyBiomeTint, getIndoorAmbience, getInterpolatedAmbience } from './worldAmbience';
import { useGraphicsSettingsStore } from '../../stores/graphicsSettingsStore';
import { resolveAreaEnvironment, resolvedBackgroundColor } from '../environment/resolveAreaEnvironment';
import { LOCK_TIME_MINUTE } from '../../types/environmentOverride';
import { EnvironmentBackdrop } from './EnvironmentBackdrop';

// Drives the real-time day/night cycle. Each frame it advances the world clock
// and writes the interpolated ambience straight into the light/fog/background
// objects via refs — no React re-render, so the whole Scene stays untouched.
export const DynamicAmbience = () => {
  const preset = useGraphicsSettingsStore((s) => s.preset)();
  const shadows = preset.shadows;
  const shadowMapSize = preset.shadowMapSize;
  const shadowRadius = preset.shadowRadius;
  const bgRef = useRef<Color>(null);
  const fogRef = useRef<Fog>(null);
  const ambientRef = useRef<AmbientLight>(null);
  const dirRef = useRef<DirectionalLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);

  useFrame((_, delta) => {
    useWorldClockStore.getState().tickTime(delta);
    const { timeMinutes, weather } = useWorldClockStore.getState();
    const areaId = usePlayerStore.getState().currentAreaId;
    const theme = resolveAreaTheme(areaId);
    const env = resolveAreaEnvironment(areaId);
    const indoor = isIndoorBiome(theme.biomeType);

    // Lighting source: indoor keeps fixed indoor ambience; otherwise a locked time-of-day pins the
    // look (never darkens with the clock/weather), else the live day/night + weather cycle runs.
    const a = indoor
      ? getIndoorAmbience(theme)
      : env.lockTimeOfDay !== 'none'
        ? applyBiomeTint(getInterpolatedAmbience(LOCK_TIME_MINUTE[env.lockTimeOfDay], 'clear'), theme)
        : applyBiomeTint(getInterpolatedAmbience(timeMinutes, weather), theme);

    // Background: when a non-dynamic backdrop (Sky/gradient/solid) owns the view, pin scene.background
    // to a stable colour behind it; otherwise track the live sky colour as before.
    const bg = !indoor && env.backgroundMode !== 'dynamic' ? resolvedBackgroundColor(env) : a.skyColor;
    bgRef.current?.set(bg);
    if (fogRef.current) {
      const fogOff = !indoor && env.fogEnabled === false;
      fogRef.current.color.set(env.fogColor ?? bg);
      fogRef.current.near = fogOff ? 4000 : env.fogNear ?? a.fogNear;
      fogRef.current.far = fogOff ? 8000 : env.fogFar ?? a.fogFar;
    }
    if (ambientRef.current) {
      ambientRef.current.color.set(a.ambient.color);
      ambientRef.current.intensity = a.ambient.intensity * (env.ambientIntensity ?? 1);
    }
    if (dirRef.current) {
      dirRef.current.color.set(a.directional.color);
      dirRef.current.intensity = a.directional.intensity * (env.directionalIntensity ?? 1);
      // Move the "sun" with time-of-day; keep it above the horizon so night still casts soft light.
      dirRef.current.position.set(
        a.sunPosition[0] * 0.5,
        Math.max(a.sunPosition[1], 8),
        a.sunPosition[2] * 0.5,
      );
    }
    if (hemiRef.current) {
      hemiRef.current.color.set(a.hemisphere.sky);
      hemiRef.current.groundColor.set(a.hemisphere.ground);
      hemiRef.current.intensity = a.hemisphere.intensity;
    }
  });

  // Seed initial values from the current clock + biome so the first frame isn't default-coloured.
  const clock = useWorldClockStore.getState();
  const initTheme = resolveAreaTheme(usePlayerStore.getState().currentAreaId);
  const init = isIndoorBiome(initTheme.biomeType)
    ? getIndoorAmbience(initTheme)
    : applyBiomeTint(getInterpolatedAmbience(clock.timeMinutes, clock.weather), initTheme);

  return (
    <>
      <color ref={bgRef} attach="background" args={[init.skyColor]} />
      <fog ref={fogRef} attach="fog" args={[init.skyColor, init.fogNear, init.fogFar]} />
      <hemisphereLight
        ref={hemiRef}
        args={[init.hemisphere.sky, init.hemisphere.ground, init.hemisphere.intensity]}
      />
      <ambientLight ref={ambientRef} color={init.ambient.color} intensity={init.ambient.intensity} />
      <directionalLight
        ref={dirRef}
        position={[18, 26, 12]}
        color={init.directional.color}
        intensity={init.directional.intensity}
        castShadow={shadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-shadowRadius}
        shadow-camera-right={shadowRadius}
        shadow-camera-top={shadowRadius}
        shadow-camera-bottom={-shadowRadius}
        shadow-bias={-0.0005}
      />
      <EnvironmentBackdrop />
    </>
  );
};
