import { useEffect, useRef } from 'react';
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import { useUiStore } from '../../stores/uiStore';

// Kit — generic capsule player: camera-relative WASD + Space jump, Rapier dynamic body. Writes its
// position to playerStore each frame (the camera follows it). Movement is suspended in Edit Mode.
// Swap the visual mesh for your own character model; the physics body is what matters.
const SPEED = 6;
const JUMP = 5.5;

export const Player = () => {
  const body = useRef<RapierRigidBody>(null);
  const editMode = useUiStore((s) => s.editMode);
  const setPosition = usePlayerStore((s) => s.setPosition);
  const spawnRequest = usePlayerStore((s) => s.spawnRequest);
  const clearSpawnRequest = usePlayerStore((s) => s.clearSpawnRequest);
  const keys = useRef<Record<string, boolean>>({});
  const { camera } = useThree();
  const fwd = useRef(new Vector3());
  const dir = useRef(new Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Teleport on spawn request (area travel).
  useEffect(() => {
    if (spawnRequest && body.current) {
      body.current.setTranslation(spawnRequest, true);
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      clearSpawnRequest();
    }
  }, [spawnRequest, clearSpawnRequest]);

  useFrame(() => {
    const b = body.current;
    if (!b) return;
    const p = b.translation();
    setPosition({ x: p.x, y: p.y, z: p.z });
    if (editMode) { b.setLinvel({ x: 0, y: b.linvel().y, z: 0 }, true); return; }

    const k = keys.current;
    const tag = (document.activeElement?.tagName ?? '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    camera.getWorldDirection(fwd.current);
    fwd.current.y = 0;
    fwd.current.normalize();
    const rx = fwd.current.z, rz = -fwd.current.x; // right = perpendicular to forward (XZ)
    let mx = 0, mz = 0;
    if (k['KeyW']) mz += 1;
    if (k['KeyS']) mz -= 1;
    if (k['KeyD']) mx += 1;
    if (k['KeyA']) mx -= 1;
    dir.current.set(fwd.current.x * mz + rx * mx, 0, fwd.current.z * mz + rz * mx);
    if (dir.current.lengthSq() > 0) dir.current.normalize();
    const vel = b.linvel();
    b.setLinvel({ x: dir.current.x * SPEED, y: vel.y, z: dir.current.z * SPEED }, true);
    if (k['Space'] && Math.abs(vel.y) < 0.05) b.setLinvel({ x: vel.x, y: JUMP, z: vel.z }, true);
  });

  return (
    <RigidBody ref={body} type="dynamic" colliders={false} lockRotations canSleep={false} position={[0, 2, 0]}>
      <CapsuleCollider args={[0.5, 0.5]} />
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.5, 1, 6, 12]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.6} />
      </mesh>
    </RigidBody>
  );
};
