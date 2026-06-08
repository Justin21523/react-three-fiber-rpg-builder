import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { SceneGlbModel } from './SceneGlbModel';
import { SCENE_SET_PIECES, spreadOutward } from '../../data/sceneSetPieces';
import { useUiStore } from '../../stores/uiStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useGraphicsSettingsStore } from '../../stores/graphicsSettingsStore';
import { useMergedTransform, useSceneEditStore, isKeyDeleted, addedForArea, useCollision, useCollisionShape, useIsHiddenByClear } from '../../stores/sceneEditStore';
import { objKey, type BaseTransform } from '../edit/sceneEditMerge';
import type { AddedPiece } from '../edit/sceneEditMerge';
import { EditableObject } from '../edit/EditableObject';
import { CollidableGlb } from '../edit/CollidableGlb';

// Phase 86 — renders the authored GLB set-pieces for the current area (visual only).
// Phase 89/90 — each placement reads its merged transform (authored ⊕ baked ⊕ live edit)
// so Edit Mode (F1) moves/rotates/scales it and it applies in normal play. Set-pieces can
// also be Delete-hidden and Ctrl+D-duplicated (extra "added" pieces rendered here).

const SetPiece = ({ objKey: key, assetId, base }: { objKey: string; assetId: string; base: BaseTransform }) => {
  const editMode = useUiStore((s) => s.editMode);
  const m = useMergedTransform(key, base);
  const collision = useCollision(key);
  const shapePref = useCollisionShape(key);
  const hidden = useIsHiddenByClear(key);

  if (hidden) return null;
  if (editMode) {
    return <EditableObject objKey={key} base={base} assetId={assetId}><SceneGlbModel assetId={assetId} /></EditableObject>;
  }
  // Normal play: collidable GLB (solid if collision is on for this piece).
  return <CollidableGlb assetId={assetId} position={m.position} rotation={m.rotation} scale={m.scale} shape={collision ? shapePref : 'none'} />;
};

const sameIds = (a: AddedPiece[], b: AddedPiece[]): boolean =>
  a.length === b.length && a.every((p, i) => p.id === b[i].id);

export function SceneSetPieceLayer({ areaId }: { areaId: string }) {
  const editMode = useUiStore((s) => s.editMode);
  const liveDeleted = useSceneEditStore((s) => s.deleted);
  const liveAdded = useSceneEditStore((s) => s.added);
  const maxSetPieces = useGraphicsSettingsStore((s) => s.preset().maxSetPieces);
  const seed = SCENE_SET_PIECES[areaId] ?? [];
  const allAdded = addedForArea(areaId, liveAdded);

  // In PLAY, render only the nearest `maxSetPieces` added pieces to the player. This bounds GPU
  // memory no matter how huge the baked/imported map is (the real fix for the OOM → context-lost →
  // "blocked" crash), while the closest scenery — what you actually see — always shows and updates
  // as you move. In EDIT mode everything renders so you can place/select freely.
  const [nearAdded, setNearAdded] = useState<AddedPiece[]>(() => allAdded.slice(0, maxSetPieces));
  const acc = useRef(0);
  useFrame((_, dt) => {
    if (editMode) return;
    acc.current += dt;
    if (acc.current < 0.25) return;
    acc.current = 0;
    const all = addedForArea(areaId, useSceneEditStore.getState().added);
    const p = usePlayerStore.getState().position;
    const px = p?.x ?? 0, pz = p?.z ?? 0;
    // Render pieces within the cull radius (kept beyond the fog so they fade in/out via fog rather
    // than popping), then keep at most maxSetPieces nearest as a GPU-memory safety cap.
    const radius = useGraphicsSettingsStore.getState().preset().characterCullDistance;
    const r2 = radius * radius;
    const inRange = all.filter((a) => (a.position[0] - px) ** 2 + (a.position[2] - pz) ** 2 <= r2);
    const next = inRange.length <= maxSetPieces
      ? inRange
      : [...inRange]
          .sort((a, b) => ((a.position[0] - px) ** 2 + (a.position[2] - pz) ** 2) - ((b.position[0] - px) ** 2 + (b.position[2] - pz) ** 2))
          .slice(0, maxSetPieces);
    setNearAdded((prev) => (sameIds(prev, next) ? prev : next));
  });

  const added = editMode ? allAdded : nearAdded;
  if (seed.length === 0 && added.length === 0) return null;

  return (
    <group>
      {seed.map((p, i) => {
        const key = objKey(areaId, 'setpiece', i);
        if (isKeyDeleted(key, liveDeleted)) return null;
        const base: BaseTransform = { position: spreadOutward(p.position), rotation: [0, p.rotationY ?? 0, 0], scale: p.scale ?? 1 };
        return <SetPiece key={key} objKey={key} assetId={p.assetId} base={base} />;
      })}
      {added.map((a) => {
        const key = objKey(areaId, 'setpiece', `added_${a.id}`);
        if (isKeyDeleted(key, liveDeleted)) return null;
        const base: BaseTransform = { position: a.position, rotation: a.rotation, scale: a.scale };
        return <SetPiece key={key} objKey={key} assetId={a.assetId} base={base} />;
      })}
    </group>
  );
}
