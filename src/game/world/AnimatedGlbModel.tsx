import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import type { Group } from 'three';
import { resolveModelAsset, useModelStudioStore } from '../../stores/modelStudioStore';

// Kit — like SceneGlbModel, but actually *plays* a named animation clip (drei useAnimations). Used by every
// entity layer that bears a model + animation (NPCs, quest/encounter markers, activity participants). The
// `animation` prop selects a clip by name; falls back to the first clip when missing/unknown. Robust: a
// missing/broken GLB renders the `fallback` node instead of crashing the scene.
interface AnimatedGlbModelProps {
  assetId: string;
  animation?: string;
  fallback?: React.ReactNode;
}

const AnimatedInner = ({ assetId, animation }: { assetId: string; animation?: string }) => {
  // Re-render when this asset's Model Studio tuning changes.
  useModelStudioStore((s) => s.overrides[assetId]);
  const asset = resolveModelAsset(assetId)!;
  const { scene, animations } = useGLTF(encodeURI(asset.path));
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const ref = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, ref);

  useEffect(() => {
    if (names.length === 0) return;
    const clip = animation && actions[animation] ? animation : names[0];
    const action = actions[clip];
    action?.reset().fadeIn(0.2).play();
    return () => { action?.fadeOut(0.2); };
  }, [actions, names, animation]);

  return (
    <group ref={ref} position={asset.position} rotation={asset.rotation} scale={asset.scale}>
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

export function AnimatedGlbModel({ assetId, animation, fallback = null }: AnimatedGlbModelProps) {
  if (!resolveModelAsset(assetId)) return <>{fallback}</>;
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <AnimatedInner assetId={assetId} animation={animation} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
