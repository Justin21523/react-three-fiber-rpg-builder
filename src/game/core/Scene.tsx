import { Physics } from '@react-three/rapier';
import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useUiStore } from '../../stores/uiStore';
import { useEditorEnvironmentStore } from '../../stores/editorEnvironmentStore';
import { usePlayerStore } from '../../stores/playerStore';
import { DynamicAmbience } from '../world/DynamicAmbience';
import { EditModeAmbience } from '../edit/EditModeAmbience';
import { AreaRenderer } from '../world/AreaRenderer';
import { WeatherParticles } from '../world/WeatherParticles';
import { BiomeParticles } from '../world/BiomeParticles';
import { SceneEditorGizmo } from '../edit/SceneEditorGizmo';
import { FollowCamera } from '../camera/FollowCamera';
import { Player } from '../player/Player';

// Kit — the 3D scene: ambience (day/night or flat-bright edit lighting + sky backdrop), the current
// area (ground + set-pieces + travel gates via AreaRenderer), weather/biome particles, the player, and
// the camera. Switching areas (walk through a gate) just re-renders AreaRenderer with the new id.
// Adaptive resolution: when FPS drops, render at a lower device-pixel-ratio (the biggest fill-bound win
// with 4K textures / shadows); recover it when there's headroom. Bounds keep it readable.
const AdaptiveDpr = () => {
  const setDpr = useThree((s) => s.setDpr);
  return <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} onFallback={() => setDpr(1)} />;
};

export const Scene = () => {
  const editMode = useUiStore((s) => s.editMode);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  // Subscribe so the world reacts to environment edits.
  useEditorEnvironmentStore((s) => s.overrides);
  useEditorEnvironmentStore((s) => s.defaultMode);

  return (
    <>
      <AdaptiveDpr />
      {editMode ? <EditModeAmbience /> : <DynamicAmbience />}

      <Physics gravity={[0, -9.81, 0]}>
        <AreaRenderer areaId={areaId} />
        <Player />
      </Physics>

      {!editMode && (
        <>
          <WeatherParticles />
          <BiomeParticles />
        </>
      )}

      <FollowCamera />
      {editMode && <SceneEditorGizmo />}
    </>
  );
};
