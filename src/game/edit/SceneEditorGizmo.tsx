import { useCallback, useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import { useSceneEditStore } from '../../stores/sceneEditStore';
import type { Vec3 } from './sceneEditMerge';

// Phase 89 / Phase 101 — the single transform gizmo for Edit Mode. Attaches to the primary
// selected EditableObject. When extras are shift-selected, the primary's drag delta is applied
// to every extra too (batch move / rotate / scale). drei auto-disables OrbitControls while
// dragging. W/E/R switch mode (see App.tsx).

interface Snap { pos: Vec3; rot: Vec3; scale: number }
const snap = (o: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number } }): Snap =>
  ({ pos: [o.position.x, o.position.y, o.position.z], rot: [o.rotation.x, o.rotation.y, o.rotation.z], scale: o.scale.x });

export function SceneEditorGizmo() {
  const selectedObject = useSceneEditStore((s) => s.selectedObject);
  const selectedKey = useSceneEditStore((s) => s.selectedKey);
  const mode = useSceneEditStore((s) => s.mode);
  const setOverride = useSceneEditStore((s) => s.setOverride);

  // Snapshot every selected object's transform at drag start so batch deltas are stable.
  const starts = useRef<{ primary: Snap; extras: { key: string; snap: Snap }[] } | null>(null);

  const onMouseDown = useCallback(() => {
    const s = useSceneEditStore.getState();
    s.pushHistory(true);
    if (s.selectedObject) {
      starts.current = {
        primary: snap(s.selectedObject),
        extras: s.extraSelected.map((e) => ({ key: e.key, snap: snap(e.object) })),
      };
    }
  }, []);

  const onObjectChange = useCallback(() => {
    const s = useSceneEditStore.getState();
    const o = s.selectedObject;
    const key = s.selectedKey;
    if (!o || !key) return;
    setOverride(key, {
      position: [o.position.x, o.position.y, o.position.z],
      rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
      scale: o.scale.x,
    });
    // Apply the primary's delta to each batch-selected extra.
    const st = starts.current;
    if (!st || st.extras.length === 0) return;
    const dp: Vec3 = [o.position.x - st.primary.pos[0], o.position.y - st.primary.pos[1], o.position.z - st.primary.pos[2]];
    const dr: Vec3 = [o.rotation.x - st.primary.rot[0], o.rotation.y - st.primary.rot[1], o.rotation.z - st.primary.rot[2]];
    const ratio = st.primary.scale !== 0 ? o.scale.x / st.primary.scale : 1;
    for (const ex of st.extras) {
      setOverride(ex.key, {
        position: [ex.snap.pos[0] + dp[0], ex.snap.pos[1] + dp[1], ex.snap.pos[2] + dp[2]],
        rotation: [ex.snap.rot[0] + dr[0], ex.snap.rot[1] + dr[1], ex.snap.rot[2] + dr[2]],
        scale: ex.snap.scale * ratio,
      });
    }
  }, [setOverride]);

  if (!selectedObject || !selectedKey) return null;

  return <TransformControls object={selectedObject} mode={mode} onMouseDown={onMouseDown} onObjectChange={onObjectChange} />;
}
