import { RigidBody, CuboidCollider } from '@react-three/rapier';

// Kit — the base flat ground: an effectively-infinite collidable plane so the player can't fall off.
// Used when the area's ground type is the default (Heightfield/FlatPbr grounds replace the visual).
export const ZoneFloor = ({ color, size = 1000, collider = true }: { color: string; size?: number; collider?: boolean }) => (
  <RigidBody type="fixed" colliders={false}>
    {collider && <CuboidCollider args={[size / 2, 0.1, size / 2]} position={[0, -0.1, 0]} />}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size, 12, 12]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  </RigidBody>
);
