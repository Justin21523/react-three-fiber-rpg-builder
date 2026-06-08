import { resolveAreaEnvironment } from '../environment/resolveAreaEnvironment';
import { resolveAreaTheme } from '../environment/areaBiome';
import { getKitArea } from '../../data/areas';
import { edgeGate } from './gateLayout';
import { ZoneFloor } from './ZoneFloor';
import { HeightfieldGround } from './HeightfieldGround';
import { FlatPbrGround } from './FlatPbrGround';
import { PbrPatchLayer } from './PbrPatchLayer';
import { SceneSetPieceLayer } from './SceneSetPieceLayer';
import { SampleEntities } from './SampleEntities';
import { EditableNpcLayer } from './EditableNpcLayer';
import { EditableTriggerRenderer } from '../editor/EditableTriggerRenderer';
import { ZoneGate } from './ZoneGate';

// Kit — renders one area's world: the ground stack (flat / flat-PBR / heightfield terrain via the
// environment system), placed GLB set-pieces, PBR patch decals, and a travel gate to every connected
// area. Yokai-free: no spawns / encounters — extend this (or add sibling layers) to render your own
// entities. Driven entirely by data (areas.ts) + the per-area environment override.
export const AreaRenderer = ({ areaId }: { areaId: string }) => {
  const env = resolveAreaEnvironment(areaId);
  const theme = resolveAreaTheme(areaId);
  const area = getKitArea(areaId);

  return (
    <>
      {env.groundType !== 'heightfield' && <ZoneFloor color={theme.groundColor} />}
      <HeightfieldGround areaId={areaId} />
      <FlatPbrGround areaId={areaId} />
      <PbrPatchLayer areaId={areaId} />
      <SceneSetPieceLayer areaId={areaId} />
      <SampleEntities areaId={areaId} />
      <EditableNpcLayer areaId={areaId} />
      <EditableTriggerRenderer areaId={areaId} />

      {(area?.connectedAreaIds ?? []).map((targetId) => {
        const g = edgeGate(targetId);
        return (
          <ZoneGate
            key={targetId}
            targetAreaId={targetId}
            label={getKitArea(targetId)?.name ?? targetId}
            position={g.position}
          />
        );
      })}
    </>
  );
};
