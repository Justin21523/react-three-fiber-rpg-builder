import { useState, type ReactNode } from 'react';
import { TransformControls } from '@react-three/drei';
import type { Group } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useWorldSelectStore } from '../../stores/worldSelectStore';

// Kit — a gizmo-movable world placement whose moves write BACK into the owning data store (not a
// sceneEditStore override). Renders the visual at `position` (the data value); clicking selects it
// (worldSelectStore); when selected, a drei translate TransformControls is attached and every change calls
// `onMove([x,y,z])` → the caller persists it (e.g. updateParticipant / updatePoint / updateEncounter /
// objective markerPosition). So numeric fields + gizmo + runtime stay in sync. Selection also shows a
// bright wireframe box. Used by ActivityArenaRenderer / EncounterMarkerRenderer / QuestMarkerRenderer.
interface DataBackedPlacementProps {
  objKey: string;
  position: [number, number, number];
  onMove: (pos: [number, number, number]) => void;
  color?: string;
  children: ReactNode;
}

export function DataBackedPlacement({ objKey, position, onMove, color = '#a855f7', children }: DataBackedPlacementProps) {
  const selectedKey = useWorldSelectStore((s) => s.selectedKey);
  const [obj, setObj] = useState<Group | null>(null);
  const selected = selectedKey === objKey;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    useWorldSelectStore.getState().select(objKey);
  };

  return (
    <>
      <group ref={setObj} position={position} onClick={handleClick}>
        {children}
        {/* Invisible grab box so even async GLBs are reliably clickable (invisible meshes still get
            pointer events but are skipped by the raycaster only when not rendered — opacity 0 keeps it). */}
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[1.2, 1.8, 1.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {selected && (
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[1.25, 1.85, 1.25]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.85} depthTest={false} />
          </mesh>
        )}
      </group>
      {selected && obj && (
        <TransformControls
          object={obj}
          mode="translate"
          onObjectChange={() => onMove([obj.position.x, obj.position.y, obj.position.z])}
        />
      )}
    </>
  );
}
