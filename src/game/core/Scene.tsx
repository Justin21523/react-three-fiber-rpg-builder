import { Physics } from '@react-three/rapier';
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
export const Scene = () => {
  const editMode = useUiStore((s) => s.editMode);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  // Subscribe so the world reacts to environment edits.
  useEditorEnvironmentStore((s) => s.overrides);
  useEditorEnvironmentStore((s) => s.defaultMode);

  return (
    <>
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
