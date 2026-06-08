import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { resolveModelAsset, useModelStudioStore } from '../../stores/modelStudioStore';

// Phase 85 — generic static GLB renderer for scene objects (decor / props /
// buildings / landmarks / markers / ground). Resolves the asset through the Model
// Studio override store so live tuning + saved scale/position/rotation apply.
// Robust: a missing/broken GLB (or load error) falls back to the `fallback` node
// (the original primitive) instead of crashing the scene.

interface SceneGlbModelProps {
  assetId: string;
  fallback?: React.ReactNode;
}

const GlbInner = ({ assetId }: { assetId: string }) => {
  // Re-render when this asset's Model Studio tuning changes.
  useModelStudioStore((s) => s.overrides[assetId]);
  const asset = resolveModelAsset(assetId)!;
  const { scene } = useGLTF(encodeURI(asset.path));
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  return (
    <group position={asset.position} rotation={asset.rotation} scale={asset.scale}>
      <primitive object={cloned} />
    </group>
  );
};

// Error boundary so a failed GLB load renders the primitive fallback.
class ModelErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <>{this.props.fallback}</>;
    return this.props.children;
  }
}

export function SceneGlbModel({ assetId, fallback = null }: SceneGlbModelProps) {
  if (!resolveModelAsset(assetId)) return <>{fallback}</>;
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GlbInner assetId={assetId} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
