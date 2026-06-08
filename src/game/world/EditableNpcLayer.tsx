import { Text } from '@react-three/drei';
import { useEditorNpcStore } from '../../stores/editorNpcStore';
import { Interactable } from '../interaction/Interactable';
import { SceneGlbModel } from './SceneGlbModel';

// Kit — renders NPCs created in the 🧑 NPC editor tab for the current area (alongside the seed NPCs in
// SampleEntities). Each is a talkable Interactable; talking resolves the merged dialogue tree. Uses the
// NPC's modelAssetId GLB when set, else a colored capsule.
export const EditableNpcLayer = ({ areaId }: { areaId: string }) => {
  const npcs = useEditorNpcStore((s) => s.addedNpcs);
  const here = npcs.filter((n) => n.areaId === areaId);
  if (here.length === 0) return null;

  return (
    <>
      {here.map((npc) => (
        <Interactable key={npc.id} id={npc.id} type="npc" label={`Talk to ${npc.name}`} position={npc.position} isSolid colliderArgs={[0.5, 1, 0.5]}>
          {npc.modelAssetId ? (
            <SceneGlbModel assetId={npc.modelAssetId} fallback={<Capsule color={npc.color} />} />
          ) : (
            <Capsule color={npc.color} />
          )}
          <Text position={[0, 2, 0]} fontSize={0.35} color="#e0f2fe" anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000">
            {npc.name}
          </Text>
        </Interactable>
      ))}
    </>
  );
};

const Capsule = ({ color = '#38bdf8' }: { color?: string }) => (
  <mesh castShadow position={[0, 0.9, 0]}>
    <capsuleGeometry args={[0.4, 0.9, 4, 12]} />
    <meshStandardMaterial color={color} />
  </mesh>
);
