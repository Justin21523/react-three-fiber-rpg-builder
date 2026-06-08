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
      {/* No shadows while editing: it's a builder view, and the shadow pass would re-render every
          placed model (which all render uncapped in Edit Mode) — a big, avoidable GPU cost. */}
      <directionalLight position={[24, 36, 18]} color="#ffffff" intensity={1.5} castShadow={false} />
      <EnvironmentBackdrop />
    </>
  );
};
