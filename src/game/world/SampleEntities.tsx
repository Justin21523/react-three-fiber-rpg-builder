import { Text } from '@react-three/drei';
import { getAreaEntities } from '../../data/areaEntities';
import { getNpcProfile } from '../../data/npcs';
import { getItem } from '../../data/items';
import { getDoorDef } from '../../data/doors';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useDoorStore } from '../../stores/doorStore';
import { Interactable } from '../interaction/Interactable';
import { SceneGlbModel } from './SceneGlbModel';

// Kit — renders an area's data-driven interactables (NPCs / world items / doors) from areaEntities.ts.
// Items disappear once picked up; doors recolour once unlocked. NPCs render their `modelAssetId` GLB
// (auto-discovered) when set, otherwise a colored capsule. This is a deliberately small, generic sample
// of the interaction system — replace AREA_ENTITIES (or add your own renderer) for a real game.
export const SampleEntities = ({ areaId }: { areaId: string }) => {
  const pickedUp = useInventoryStore((s) => s.pickedUpItems);
  const unlockedDoors = useDoorStore((s) => s.unlockedDoorIds);
  const entities = getAreaEntities(areaId);
  if (!entities) return null;

  return (
    <>
      {entities.npcs?.map((p) => {
        const npc = getNpcProfile(p.npcId);
        if (!npc) return null;
        return (
          <Interactable key={p.npcId} id={p.npcId} type="npc" label={`Talk to ${npc.name}`} position={p.position} isSolid colliderArgs={[0.5, 1, 0.5]}>
            {npc.modelAssetId ? (
              <SceneGlbModel assetId={npc.modelAssetId} fallback={<NpcCapsule color={npc.color} />} />
            ) : (
              <NpcCapsule color={npc.color} />
            )}
            <Text position={[0, 2, 0]} fontSize={0.35} color="#e0f2fe" anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000">
              {npc.name}
            </Text>
          </Interactable>
        );
      })}

      {entities.items?.map((p) => {
        if (pickedUp.includes(p.itemId)) return null;
        const item = getItem(p.itemId);
        if (!item) return null;
        return (
          <Interactable key={p.itemId} id={p.itemId} type="item" label={`Pick up ${item.name}`} position={p.position}>
            <mesh castShadow position={[0, 0.4, 0]}>
              <icosahedronGeometry args={[0.35, 0]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} />
            </mesh>
            <Text position={[0, 1.2, 0]} fontSize={0.28} color="#fde68a" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
              {item.icon ?? '◆'} {item.name}
            </Text>
          </Interactable>
        );
      })}

      {entities.doors?.map((p) => {
        const door = getDoorDef(p.doorId);
        if (!door) return null;
        const open = unlockedDoors.includes(p.doorId);
        return (
          <Interactable key={p.doorId} id={p.doorId} type="door" label={door.label} position={p.position} isSolid colliderArgs={[1.2, 1.5, 0.3]}>
            <mesh castShadow>
              <boxGeometry args={[2.4, 3, 0.4]} />
              <meshStandardMaterial color={open ? '#4ade80' : '#92400e'} emissive={open ? '#16a34a' : '#000'} emissiveIntensity={open ? 0.3 : 0} />
            </mesh>
            <Text position={[0, 2, 0]} fontSize={0.28} color={open ? '#bbf7d0' : '#fed7aa'} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
              {open ? '✓ Open' : `🔒 ${door.label}`}
            </Text>
          </Interactable>
        );
      })}
    </>
  );
};

const NpcCapsule = ({ color = '#38bdf8' }: { color?: string }) => (
  <mesh castShadow position={[0, 0.9, 0]}>
    <capsuleGeometry args={[0.4, 0.9, 4, 12]} />
    <meshStandardMaterial color={color} />
  </mesh>
);
