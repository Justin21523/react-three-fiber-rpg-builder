import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { ReactNode } from 'react';
import { useInteractionStore } from '../../stores/interactionStore';
import type { InteractionTargetType } from '../../stores/interactionStore';

interface InteractableProps {
  id: string;
  type: InteractionTargetType;
  label: string;
  children: ReactNode;
  position?: [number, number, number];
  isSolid?: boolean;                       // also block the player from walking through
  colliderArgs?: [number, number, number]; // solid collider half-extents
}

// Kit — wraps any world object in a proximity sensor that registers it as the current interaction
// target on enter (and clears on exit). The InteractionHandler then acts on [E]. Optionally adds a solid
// collider so the object also physically blocks the player.
export const Interactable = ({
  id,
  type,
  label,
  children,
  position = [0, 0, 0],
  isSolid = false,
  colliderArgs = [0.5, 1, 0.5],
}: InteractableProps) => {
  const setTarget = useInteractionStore((s) => s.setTarget);
  const clearTarget = useInteractionStore((s) => s.clearTarget);

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      {isSolid && <CuboidCollider args={colliderArgs} />}
      <CuboidCollider
        args={[1.5, 1.5, 1.5]}
        sensor
        onIntersectionEnter={() => setTarget(id, type, label)}
        onIntersectionExit={() => clearTarget(id)}
      />
      {children}
    </RigidBody>
  );
};
