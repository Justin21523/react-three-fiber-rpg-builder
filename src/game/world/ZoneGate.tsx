import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Text } from '@react-three/drei';
import { useInteractionStore } from '../../stores/interactionStore';

interface ZoneGateProps {
  targetAreaId: string;
  label: string;
  position: [number, number, number];
  isLocked?: boolean;
}

// Kit — a generic travel gate: a glowing portal panel with a label and a sensor that registers the gate
// as the current interaction target. Pressing [E] near it travels (see InteractionHandler). To use your
// own gate model, drop a .glb into src/assets/models/ and swap the <mesh> below for a <SceneGlbModel>.
export const ZoneGate = ({ targetAreaId, label, position, isLocked = false }: ZoneGateProps) => {
  const setTarget = useInteractionStore((s) => s.setTarget);
  const clearTarget = useInteractionStore((s) => s.clearTarget);

  const color = isLocked ? '#6b7280' : '#f97316';
  const emissive = isLocked ? '#374151' : '#f97316';
  const prompt = isLocked ? `🔒 ${label}` : `➜ ${label}`;

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider
        args={[2, 2, 0.5]}
        sensor
        onIntersectionEnter={() => setTarget(targetAreaId, 'gate', prompt)}
        onIntersectionExit={() => clearTarget(targetAreaId)}
      />
      <mesh castShadow>
        <boxGeometry args={[4, 4, 0.3]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isLocked ? 0.1 : 0.3}
          transparent
          opacity={0.7}
        />
      </mesh>
      <Text position={[0, 2.8, 0]} fontSize={0.35} color={isLocked ? '#9ca3af' : '#fed7aa'} anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000000">
        {label}
      </Text>
      <Text position={[0, -2.6, 0]} fontSize={0.24} color={isLocked ? '#6b7280' : '#fdba74'} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
        {isLocked ? 'Locked' : '[E] Enter'}
      </Text>
    </RigidBody>
  );
};
