import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { AnimationMixer, type AnimationClip } from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { resolveModelAsset, useModelStudioStore } from '../../stores/modelStudioStore';

// Kit — like SceneGlbModel (resolve asset, clone via SkeletonUtils, Suspense + error-boundary fallback)
// but also *plays* an animation clip. The static model is rendered UNCONDITIONALLY — animation is attached
// best-effort via a manual AnimationMixer inside a try/catch effect, so a model with odd/no clips still
// shows (it never falls back to the placeholder just because animation setup failed). Used by NPCs,
// quest/encounter markers, and activity participants.
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
  const mixerRef = useRef<AnimationMixer | null>(null);

  useEffect(() => {
    const clips = (animations ?? []) as AnimationClip[];
    if (clips.length === 0) return;
    try {
      const mixer = new AnimationMixer(cloned);
      const clip = (animation && clips.find((c) => c.name === animation)) || clips[0];
      if (clip) mixer.clipAction(clip).reset().play();
      mixerRef.current = mixer;
      return () => { mixer.stopAllAction(); mixerRef.current = null; };
    } catch {
      // Static model still renders — animation is best-effort only.
      return;
    }
  }, [cloned, animations, animation]);

  useFrame((_, dt) => mixerRef.current?.update(dt));

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
