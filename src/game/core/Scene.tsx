import { Physics } from '@react-three/rapier';
import { useUiStore } from '../../stores/uiStore';
import { useEditorEnvironmentStore } from '../../stores/editorEnvironmentStore';
import { usePlayerStore } from '../../stores/playerStore';
import { resolveAreaEnvironment } from '../environment/resolveAreaEnvironment';
import { resolveAreaTheme } from '../environment/areaBiome';
import { DynamicAmbience } from '../world/DynamicAmbience';
import { EditModeAmbience } from '../edit/EditModeAmbience';
import { ZoneFloor } from '../world/ZoneFloor';
import { HeightfieldGround } from '../world/HeightfieldGround';
import { FlatPbrGround } from '../world/FlatPbrGround';
import { PbrPatchLayer } from '../world/PbrPatchLayer';
import { SceneSetPieceLayer } from '../world/SceneSetPieceLayer';
import { SceneEditorGizmo } from '../edit/SceneEditorGizmo';
import { FollowCamera } from '../camera/FollowCamera';
import { Player } from '../player/Player';

// Kit — the 3D scene: ambience (day/night or flat-bright edit lighting + sky backdrop), the ground
// (default flat / flat-PBR / heightfield terrain), placed GLB set-pieces, the player, and the camera.
export const Scene = () => {
  const editMode = useUiStore((s) => s.editMode);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  // Subscribe so the ground type reacts to environment edits.
  useEditorEnvironmentStore((s) => s.overrides);
  useEditorEnvironmentStore((s) => s.defaultMode);
  const env = resolveAreaEnvironment(areaId);
  const theme = resolveAreaTheme(areaId);

  return (
    <>
      {editMode ? <EditModeAmbience /> : <DynamicAmbience />}

      <Physics gravity={[0, -9.81, 0]}>
        {env.groundType !== 'heightfield' && <ZoneFloor color={theme.groundColor} />}
        <HeightfieldGround areaId={areaId} />
        <FlatPbrGround areaId={areaId} />
        <PbrPatchLayer areaId={areaId} />
        <SceneSetPieceLayer areaId={areaId} />
        <Player />
      </Physics>

      <FollowCamera />
      {editMode && <SceneEditorGizmo />}
    </>
  );
};
