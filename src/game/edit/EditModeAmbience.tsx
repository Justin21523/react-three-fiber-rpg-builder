import { useGraphicsSettingsStore } from '../../stores/graphicsSettingsStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useEditorEnvironmentStore } from '../../stores/editorEnvironmentStore';
import { resolveAreaEnvironment, resolvedBackgroundColor } from '../environment/resolveAreaEnvironment';
import { EnvironmentBackdrop } from '../world/EnvironmentBackdrop';

// Phase 90 — while Edit Mode is on we replace the dynamic day/night + weather system
// with flat, bright, neutral daylight (and no fog) so darkness/rain never obscures
// what you're placing. No useFrame, no clock ticking — fully static.
// Phase 98a — but we still render the area's chosen backdrop (Sky/gradient/solid + ground-catch) so
// the sky can be previewed/tuned from the Environment hub while editing; bright lights stay.
export const EditModeAmbience = () => {
  const preset = useGraphicsSettingsStore((s) => s.preset)();
  const areaId = usePlayerStore((s) => s.currentAreaId);
  useEditorEnvironmentStore((s) => s.overrides);
  useEditorEnvironmentStore((s) => s.defaultMode);
  const env = resolveAreaEnvironment(areaId);
  const bg = !env.isIndoor && env.backgroundMode !== 'dynamic' ? resolvedBackgroundColor(env) : '#9fb3c8';
  return (
    <>
      <color attach="background" args={[bg]} />
      <hemisphereLight args={['#ffffff', '#9aa7b4', 1.0]} />
      <ambientLight color="#ffffff" intensity={1.15} />
      <directionalLight
        position={[24, 36, 18]}
        color="#ffffff"
        intensity={1.5}
        castShadow={preset.shadows}
        shadow-mapSize-width={preset.shadowMapSize}
        shadow-mapSize-height={preset.shadowMapSize}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-preset.shadowRadius}
        shadow-camera-right={preset.shadowRadius}
        shadow-camera-top={preset.shadowRadius}
        shadow-camera-bottom={-preset.shadowRadius}
        shadow-bias={-0.0005}
      />
      <EnvironmentBackdrop />
    </>
  );
};
