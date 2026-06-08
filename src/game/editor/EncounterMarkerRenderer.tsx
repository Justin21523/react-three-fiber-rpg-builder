import { Text } from '@react-three/drei';
import { useEditorEncounterStore } from '../../stores/editorEncounterStore';
import { useUiStore } from '../../stores/uiStore';
import { getCombatant } from '../../data/combatants';
import type { EditorEncounter } from '../../types/editorEncounter';
import { DataBackedPlacement } from '../edit/DataBackedPlacement';
import { AnimatedGlbModel } from '../world/AnimatedGlbModel';

// Kit — authoring visuals for editor encounters in the current area: the lead combatant's model (or a ⚔
// banner) at the encounter position, as a DataBackedPlacement (click / 📍 then drag → writes back to
// encounter.position). The actual battle still fires via a battleTrigger / bossGate. Edit Mode only.
export const EncounterMarkerRenderer = ({ areaId }: { areaId: string }) => {
  const editMode = useUiStore((s) => s.editMode);
  const encounters = useEditorEncounterStore((s) => s.encounters);
  if (!editMode) return null;
  const here = encounters.filter((e) => e.zoneId === areaId);
  if (here.length === 0) return null;
  return <>{here.map((enc) => <EncounterVisual key={enc.id} enc={enc} />)}</>;
};

const Banner = ({ color }: { color: string }) => (
  <group position={[0, 1, 0]}>
    <mesh castShadow><boxGeometry args={[0.8, 1.2, 0.2]} /><meshStandardMaterial color={color} /></mesh>
    <Text position={[0, 0, 0.12]} fontSize={0.5} anchorX="center" anchorY="middle">⚔</Text>
  </group>
);

const EncounterVisual = ({ enc }: { enc: EditorEncounter }) => {
  const lead = getCombatant(enc.enemyTeam[0]?.combatantId);
  const model = lead?.modelAssetId;
  const color = lead?.color ?? '#ef4444';
  return (
    <DataBackedPlacement objKey={`enc:${enc.id}`} position={enc.position ?? [0, 0, 4]} color={color}
      onMove={(pos) => useEditorEncounterStore.getState().updateEncounter(enc.id, { position: pos })}>
      {model ? <AnimatedGlbModel assetId={model} fallback={<Banner color={color} />} /> : <Banner color={color} />}
      <Text position={[0, 2.3, 0]} fontSize={0.3} color="#fca5a5" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">⚔ {enc.displayName}</Text>
    </DataBackedPlacement>
  );
};
