import { type ReactNode } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useMergedTransform, useSceneEditStore, isKeyDeleted, useCollision, useCollisionShape, useIsHiddenByClear } from '../../stores/sceneEditStore';
import { EditableObject } from './EditableObject';
import { CollidableGroup } from './CollidableGlb';
import type { BaseTransform } from './sceneEditMerge';

// Phase 90 — wraps any visual (non-physics) scenery so it's selectable/movable in Edit
// Mode and hidden when Delete-d, while applying its merged transform in normal play.
// For background renderers (procedural scatter, regional set-pieces, landmarks, props).

interface EditableSceneryProps {
  objKey: string;
  base: BaseTransform;
  assetId?: string;
  children: ReactNode;
}

export function EditableScenery({ objKey, base, assetId, children }: EditableSceneryProps) {
  const editMode = useUiStore((s) => s.editMode);
  const liveDeleted = useSceneEditStore((s) => s.deleted);
  const m = useMergedTransform(objKey, base);
  const collision = useCollision(objKey);
  const shapePref = useCollisionShape(objKey);
  const hidden = useIsHiddenByClear(objKey);
  if (isKeyDeleted(objKey, liveDeleted) || hidden) return null;
  if (editMode) {
    return <EditableObject objKey={objKey} base={base} assetId={assetId}>{children}</EditableObject>;
  }
  return (
    <CollidableGroup shape={collision ? shapePref : 'none'} position={m.position} rotation={m.rotation} scale={m.scale}>
      {children}
    </CollidableGroup>
  );
}
