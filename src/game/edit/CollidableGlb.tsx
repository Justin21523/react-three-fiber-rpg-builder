import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { SkeletonUtils } from 'three-stdlib';
import { Box3, Vector3 } from 'three';
import { resolveModelAsset, useModelStudioStore } from '../../stores/modelStudioStore';
import type { CollisionShape, Vec3 } from './sceneEditMerge';

// Phase A/C — renders a scene GLB at the merged transform and, by collider `shape`, wraps
// it in a fixed Rapier body:
//   'none'    → no physics (visual only)
//   'cuboid'  → one bounding-box CuboidCollider (Box3 × total scale; robust for async GLB)
//   'hull'    → Rapier convex-hull auto colliders (tight-ish)
//   'trimesh' → Rapier per-mesh trimesh (exact: walk slopes, through gaps, no empty block)

interface CollidableGlbProps {
  assetId: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  shape: CollisionShape;
  fallback?: React.ReactNode;
}

const Inner = ({ assetId, position, rotation, scale, shape }: Omit<CollidableGlbProps, 'fallback'>) => {
  // Re-render when this asset's Model Studio tuning changes.
  useModelStudioStore((s) => s.overrides[assetId]);
  const asset = resolveModelAsset(assetId)!;
  const { scene } = useGLTF(encodeURI(asset.path));
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  const bbox = useMemo(() => {
    const b = new Box3().setFromObject(cloned);
    const size = new Vector3();
    const center = new Vector3();
    b.getSize(size);
    b.getCenter(center);
    return { size, center };
  }, [cloned]);

  const visual = (
    <group position={asset.position} rotation={asset.rotation} scale={asset.scale}>
      <primitive object={cloned} />
    </group>
  );

  if (shape === 'none') {
    return <group position={position} rotation={rotation} scale={scale}>{visual}</group>;
  }

  // Hull / trimesh: let Rapier auto-generate colliders from the (now-loaded) GLB meshes,
  // honouring the asset + placement scale via the child group transforms.
  if (shape === 'hull' || shape === 'trimesh') {
    return (
      <RigidBody type="fixed" colliders={shape === 'hull' ? 'hull' : 'trimesh'} position={position} rotation={rotation}>
        <group scale={scale}>{visual}</group>
      </RigidBody>
    );
  }

  // 'cuboid' — one explicit bounding-box collider (robust for async-loaded GLB).
  // Total visual scale = placement scale × the asset's own scale (applied inside `visual`).
  const t = scale * asset.scale;
  const half: [number, number, number] = [
    Math.max((bbox.size.x * t) / 2, 0.05),
    Math.max((bbox.size.y * t) / 2, 0.05),
    Math.max((bbox.size.z * t) / 2, 0.05),
  ];
  const colliderPos: [number, number, number] = [bbox.center.x * t, bbox.center.y * t, bbox.center.z * t];

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <group scale={scale}>{visual}</group>
      <CuboidCollider args={half} position={colliderPos} />
    </RigidBody>
  );
};

// Error boundary so a failed GLB load renders the fallback (or nothing) without crashing.
class Boundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <>{this.props.fallback}</> : this.props.children;
  }
}

export function CollidableGlb({ fallback = null, ...props }: CollidableGlbProps) {
  if (!resolveModelAsset(props.assetId)) return <>{fallback}</>;
  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Inner {...props} />
      </Suspense>
    </Boundary>
  );
}

// Generic collidable wrapper for inline-mesh scenery (decorations, scatter, regional).
// Uses Rapier auto colliders (by `shape`) from the synchronous child meshes; 'none' = visual.
export function CollidableGroup({ shape, position, rotation, scale, children }: {
  shape: CollisionShape; position: Vec3; rotation: Vec3; scale: number; children: React.ReactNode;
}) {
  if (shape === 'none') {
    return <group position={position} rotation={rotation} scale={scale}>{children}</group>;
  }
  const colliders = shape === 'hull' ? 'hull' : shape === 'trimesh' ? 'trimesh' : 'cuboid';
  return (
    <RigidBody type="fixed" colliders={colliders} position={position} rotation={rotation}>
      <group scale={scale}>{children}</group>
    </RigidBody>
  );
}
