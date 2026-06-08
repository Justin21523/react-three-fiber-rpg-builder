import { Text } from '@react-three/drei';
import { useEditorEncounterStore } from '../../stores/editorEncounterStore';
import { useUiStore } from '../../stores/uiStore';
import { getCombatant } from '../../data/combatants';
import type { EditorEncounter, EditorEnemySlot } from '../../types/editorEncounter';
import { DataBackedPlacement } from '../edit/DataBackedPlacement';
import { SceneGlbModel } from '../world/SceneGlbModel';

// Kit — authoring visuals for editor encounters in the current area: EVERY enemy slot's model (or a ⚔
// banner) shown in the world at its position, each a DataBackedPlacement (click / 📍 then drag → writes
// back to that slot's position). Add/remove slots in the Team editor. Edit Mode only; positions are
// cosmetic for the turn-based battle (they place where the enemies stand in the world).
const spread = (enc: EditorEncounter, i: number): [number, number, number] => {
  const [x, y, z] = enc.position ?? [0, 0, 4];
  const n = enc.enemyTeam.length;
  return [x + (i - (n - 1) / 2) * 1.6, y, z];
};

export const EncounterMarkerRenderer = ({ areaId }: { areaId: string }) => {
  const editMode = useUiStore((s) => s.editMode);
  const encounters = useEditorEncounterStore((s) => s.encounters);
  if (!editMode) return null;
  const here = encounters.filter((e) => e.zoneId === areaId);
  if (here.length === 0) return null;
  return <>{here.map((enc) => enc.enemyTeam.map((slot, i) => <SlotVisual key={`${enc.id}:${i}`} enc={enc} slot={slot} index={i} />))}</>;
};

const Banner = ({ color }: { color: string }) => (
  <group position={[0, 1, 0]}>
    <mesh castShadow><boxGeometry args={[0.8, 1.2, 0.2]} /><meshStandardMaterial color={color} /></mesh>
    <Text position={[0, 0, 0.12]} fontSize={0.5} anchorX="center" anchorY="middle">⚔</Text>
  </group>
);

const SlotVisual = ({ enc, slot, index }: { enc: EditorEncounter; slot: EditorEnemySlot; index: number }) => {
  const combatant = getCombatant(slot.combatantId);
  const model = slot.modelAssetId ?? combatant?.modelAssetId;
  const color = slot.isBoss ? '#dc2626' : combatant?.color ?? '#ef4444';
  const name = combatant?.name ?? slot.combatantId;
  const move = (pos: [number, number, number]) => useEditorEncounterStore.getState().updateEncounter(enc.id, {
    enemyTeam: enc.enemyTeam.map((s, j) => (j === index ? { ...s, position: pos } : s)),
  });
  return (
    <DataBackedPlacement objKey={`enc:${enc.id}:slot:${index}`} position={slot.position ?? spread(enc, index)} color={color} onMove={move}>
      {model ? <SceneGlbModel assetId={model} fallback={<Banner color={color} />} /> : <Banner color={color} />}
      <Text position={[0, 2.3, 0]} fontSize={0.28} color="#fca5a5" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">{slot.isBoss ? '👑 ' : '⚔ '}{name} Lv{slot.level}</Text>
    </DataBackedPlacement>
  );
};
