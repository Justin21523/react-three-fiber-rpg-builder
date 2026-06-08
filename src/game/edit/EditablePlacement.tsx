import { type ReactNode } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useMergedTransform, useSceneEditStore, isKeyDeleted, useIsHiddenByClear } from '../../stores/sceneEditStore';
import { EditableObject } from './EditableObject';
import type { MergedTransform, Vec3 } from './sceneEditMerge';

// Phase 89 — generic editable placement. In Edit Mode it renders a selectable `proxy`
// (so physics/gameplay objects can be grabbed without disturbing Rapier); in normal
// play it renders the real object at the merged transform via the `render` prop. Uses
// a render prop so it doesn't import the world components (avoids import cycles).

interface EditablePlacementProps {
  objKey: string;
  basePosition: Vec3;
  baseRotation?: Vec3;
  baseScale?: number;
  proxy: ReactNode;
  // Phase A — real (physics-free) visual shown in edit mode so it looks identical to
  // play and drags live with the gizmo. Falls back to `proxy` when not provided.
  editVisual?: ReactNode;
  render: (m: MergedTransform) => ReactNode;
}

export function EditablePlacement({ objKey, basePosition, baseRotation, baseScale, proxy, editVisual, render }: EditablePlacementProps) {
  const editMode = useUiStore((s) => s.editMode);
  const liveDeleted = useSceneEditStore((s) => s.deleted);
  const base = { position: basePosition, rotation: baseRotation, scale: baseScale };
  const m = useMergedTransform(objKey, base);
  const hidden = useIsHiddenByClear(objKey);
  if (isKeyDeleted(objKey, liveDeleted) || hidden) return null; // hidden via Delete or area-clear
  if (editMode) {
    return <EditableObject objKey={objKey} base={base}>{editVisual ?? proxy}</EditableObject>;
  }
  return <>{render(m)}</>;
}

// A simple translucent grab-box shown in Edit Mode for objects with no/low visual.
export function ProxyBox({ size = [1.2, 1.2, 1.2], color = '#38bdf8' }: { size?: Vec3; color?: string }) {
  return (
    <mesh position={[0, size[1] / 2, 0]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}
