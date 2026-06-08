import { Text } from '@react-three/drei';
import { useEditorNpcStore } from '../../stores/editorNpcStore';
import type { EditorNpc } from '../../types/editorNPC';
import { useUiStore } from '../../stores/uiStore';
import { useMergedTransform } from '../../stores/sceneEditStore';
import { objKey } from '../edit/sceneEditMerge';
import { Interactable } from '../interaction/Interactable';
import { EditableObject } from '../edit/EditableObject';
import { SceneGlbModel } from './SceneGlbModel';

// Kit — renders NPCs created in the 🧑 NPC tab for the current area. In Edit Mode each NPC is a fully
// selectable EditableObject (click → gizmo moves it, auto-selected on create); in play mode it's a
// talkable Interactable at the merged (base ⊕ gizmo) transform.
export const EditableNpcLayer = ({ areaId }: { areaId: string }) => {
  const npcs = useEditorNpcStore((s) => s.addedNpcs);
  const here = npcs.filter((n) => n.areaId === areaId);
  if (here.length === 0) return null;
  return <>{here.map((npc) => <EditorNpcEntity key={npc.id} npc={npc} />)}</>;
};

const EditorNpcEntity = ({ npc }: { npc: EditorNpc }) => {
  const editMode = useUiStore((s) => s.editMode);
  const key = objKey(npc.areaId, 'npc', npc.id);
  const base = { position: npc.position, rotation: npc.rotation ?? [0, 0, 0] as [number, number, number], scale: npc.scale ?? 1 };
  const m = useMergedTransform(key, base);

  const visual = (
    <>
      {npc.modelAssetId ? <SceneGlbModel assetId={npc.modelAssetId} fallback={<Capsule color={npc.color} />} /> : <Capsule color={npc.color} />}
      <Text position={[0, 2, 0]} fontSize={0.35} color="#e0f2fe" anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000">
        {npc.displayName}
      </Text>
    </>
  );

  if (editMode) {
    return <EditableObject objKey={key} base={base}>{visual}</EditableObject>;
  }
  return (
    <Interactable id={npc.id} type="npc" label={npc.interactionLabel || `Talk to ${npc.displayName}`} position={m.position} isSolid colliderArgs={[0.5, 1, 0.5]}>
      <group rotation={m.rotation} scale={m.scale}>{visual}</group>
    </Interactable>
  );
};

const Capsule = ({ color = '#38bdf8' }: { color?: string }) => (
  <mesh castShadow position={[0, 0.9, 0]}>
    <capsuleGeometry args={[0.4, 0.9, 4, 12]} />
    <meshStandardMaterial color={color} />
  </mesh>
);
