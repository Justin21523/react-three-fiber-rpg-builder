import { Text } from '@react-three/drei';
import { useEditorActivityStore } from '../../stores/editorActivityStore';
import { useUiStore } from '../../stores/uiStore';
import { getCombatant } from '../../data/combatants';
import type { ActivityParticipantSlot, ArenaPointField, EditorActivity, Vec3Tuple } from '../../types/activity';
import { ACTIVITY_SLOT_COLOR, ARENA_POINT_COLOR, ARENA_POINT_LABEL } from '../../types/activity';
import { DataBackedPlacement } from '../edit/DataBackedPlacement';
import { AnimatedGlbModel } from '../world/AnimatedGlbModel';

// Kit — authoring visuals for the SELECTED activity in the current area: each participant (animated model /
// capsule) and each arena point is a DataBackedPlacement — click in the viewport or press 📍 to select,
// then drag the translate gizmo. Moves write straight back into the activity data (updateParticipant /
// updatePoint), so the editor's numeric fields + the runtime use the same positions. Edit Mode only.
export const ActivityArenaRenderer = ({ areaId }: { areaId: string }) => {
  const editMode = useUiStore((s) => s.editMode);
  const activities = useEditorActivityStore((s) => s.activities);
  const selId = useEditorActivityStore((s) => s.selectedId);
  if (!editMode) return null;
  const ea = activities.find((a) => a.def.id === selId);
  if (!ea || ea.def.zoneId !== areaId) return null;

  return (
    <>
      {ea.participants.map((p, i) => <ParticipantVisual key={p.id} ea={ea} slot={p} index={i} />)}
      {(Object.entries(ea.arena.points) as [ArenaPointField, Vec3Tuple[]][]).flatMap(([field, pts]) =>
        (pts ?? []).map((pos, i) => <PointVisual key={`${field}:${i}`} ea={ea} field={field} pos={pos} index={i} />),
      )}
    </>
  );
};

const Capsule = ({ color }: { color: string }) => (
  <mesh castShadow position={[0, 0.9, 0]}><capsuleGeometry args={[0.4, 0.9, 4, 12]} /><meshStandardMaterial color={color} /></mesh>
);

const ParticipantVisual = ({ ea, slot, index }: { ea: EditorActivity; slot: ActivityParticipantSlot; index: number }) => {
  const combatant = getCombatant(slot.combatantId);
  const model = slot.modelAssetId ?? combatant?.modelAssetId;
  const color = slot.color ?? combatant?.color ?? ACTIVITY_SLOT_COLOR[slot.role];
  const name = combatant?.name ?? slot.role;
  return (
    <DataBackedPlacement objKey={`act:${ea.def.id}:p:${index}`} position={slot.position} color={color}
      onMove={(pos) => useEditorActivityStore.getState().updateParticipant(index, { position: pos })}>
      {model ? <AnimatedGlbModel assetId={model} animation={slot.animation} fallback={<Capsule color={color} />} /> : <Capsule color={color} />}
      <Text position={[0, 2, 0]} fontSize={0.3} color={color} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">{`${slot.role}: ${name}`}</Text>
    </DataBackedPlacement>
  );
};

const PointVisual = ({ ea, field, pos, index }: { ea: EditorActivity; field: ArenaPointField; pos: Vec3Tuple; index: number }) => {
  const color = ARENA_POINT_COLOR[field];
  return (
    <DataBackedPlacement objKey={`act:${ea.def.id}:${field}:${index}`} position={pos} color={color}
      onMove={(p) => useEditorActivityStore.getState().updatePoint(field, index, p)}>
      <mesh position={[0, 0.4, 0]}><sphereGeometry args={[0.35, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} /></mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.5, 0.7, 24]} /><meshBasicMaterial color={color} transparent opacity={0.6} /></mesh>
      <Text position={[0, 1.1, 0]} fontSize={0.26} color={color} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">{ARENA_POINT_LABEL[field]}{index > 0 ? ` ${index + 1}` : ''}</Text>
    </DataBackedPlacement>
  );
};
