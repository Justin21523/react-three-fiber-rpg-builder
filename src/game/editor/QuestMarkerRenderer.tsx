import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import type { Group } from 'three';
import { useEditorQuestStore } from '../../stores/editorQuestStore';
import { useQuestStore } from '../../stores/questStore';
import { useUiStore } from '../../stores/uiStore';
import { DataBackedPlacement } from '../edit/DataBackedPlacement';
import { SceneGlbModel } from '../world/SceneGlbModel';

// Kit — renders editor quest objective markers (model or floating diamond) in the world. Edit Mode: each
// is a DataBackedPlacement (click / 📍 then drag → writes back to the objective's markerPosition). Play
// mode: shows only for InProgress quests, as a plain marker. Appears for any objective with a
// markerPosition OR a markerModelAssetId.
type Marker = { questId: string; objId: string; pos: [number, number, number]; model?: string; animation?: string; color?: string; label: string };

export const QuestMarkerRenderer = ({ areaId }: { areaId: string }) => {
  const editMode = useUiStore((s) => s.editMode);
  const quests = useEditorQuestStore((s) => s.quests);
  const runtime = useQuestStore((s) => s.quests);

  const markers: Marker[] = [];
  for (const q of quests) {
    const inArea = q.relatedAreaIds.length === 0 || q.relatedAreaIds.includes(areaId);
    for (const o of q.objectives) {
      if (!o.markerPosition && !o.markerModelAssetId) continue;
      const objInArea = o.relatedAreaId ? o.relatedAreaId === areaId : inArea;
      if (!objInArea) continue;
      if (!editMode && runtime[q.id]?.status !== 'InProgress') continue;
      markers.push({ questId: q.id, objId: o.id, pos: o.markerPosition ?? [0, 0, 0], model: o.markerModelAssetId, animation: o.markerAnimation, color: o.markerColor, label: o.description?.trim() || o.type });
    }
  }
  if (markers.length === 0) return null;
  return <>{markers.map((m) => <QuestMarkerEntity key={`${m.questId}:${m.objId}`} marker={m} editMode={editMode} />)}</>;
};

const Diamond = ({ color = '#fbbf24' }: { color?: string }) => {
  const ref = useRef<Group>(null);
  useFrame((s) => { if (ref.current) { ref.current.rotation.y = s.clock.elapsedTime; ref.current.position.y = 1.4 + Math.sin(s.clock.elapsedTime * 2) * 0.15; } });
  return (
    <group ref={ref} position={[0, 1.4, 0]}>
      <mesh><octahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} /></mesh>
    </group>
  );
};

const QuestMarkerEntity = ({ marker, editMode }: { marker: Marker; editMode: boolean }) => {
  const visual = (
    <>
      {marker.model ? <SceneGlbModel assetId={marker.model} fallback={<Diamond color={marker.color} />} /> : <Diamond color={marker.color} />}
      <Text position={[0, 2.1, 0]} fontSize={0.28} color="#fde68a" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">{marker.label}</Text>
    </>
  );
  if (editMode) {
    return (
      <DataBackedPlacement objKey={`qm:${marker.questId}:${marker.objId}`} position={marker.pos} color={marker.color ?? '#fbbf24'}
        onMove={(pos) => useEditorQuestStore.getState().updateObjective(marker.questId, marker.objId, { markerPosition: pos })}>
        {visual}
      </DataBackedPlacement>
    );
  }
  return <group position={marker.pos}>{visual}</group>;
};
