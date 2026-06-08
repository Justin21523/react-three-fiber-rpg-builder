import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Color, Mesh, type Group, type Material } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useMergedTransform, useSceneEditStore } from '../../stores/sceneEditStore';
import type { BaseTransform } from './sceneEditMerge';

// Phase 89 — wraps a placement's visual in a selectable group positioned at the merged
// transform. Used only while Edit Mode is on. Clicking selects it (pointer events bubble
// up from the child GLB meshes); the shared SceneEditorGizmo then drives this group.

interface EditableObjectProps {
  objKey: string;
  base: BaseTransform;
  assetId?: string;   // for set-pieces (enables Ctrl+D duplicate)
  children: ReactNode;
}

export function EditableObject({ objKey, base, assetId, children }: EditableObjectProps) {
  const m = useMergedTransform(objKey, base);
  const select = useSceneEditStore((s) => s.select);
  const toggleSelect = useSceneEditStore((s) => s.toggleSelect);
  const selectedKey = useSceneEditStore((s) => s.selectedKey);
  const isExtra = useSceneEditStore((s) => s.extraSelected.some((e) => e.key === objKey));
  const pendingSelectKey = useSceneEditStore((s) => s.pendingSelectKey);
  const isPendingExtra = useSceneEditStore((s) => s.pendingExtraKeys.includes(objKey));
  const groupRef = useRef<Group>(null);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!groupRef.current) return;
      // Shift- or Ctrl/Cmd-click adds/removes from the batch selection; plain click replaces it.
      const e2 = e.nativeEvent;
      if (e2.shiftKey || e2.ctrlKey || e2.metaKey) toggleSelect(objKey, groupRef.current, assetId ?? null);
      else select(objKey, groupRef.current, assetId ?? null);
    },
    [objKey, select, toggleSelect, assetId],
  );

  // Auto-select a just-created/duplicated piece once it mounts. Primary is set without
  // clearing extras (so a batch duplicate can restore the whole selection regardless of
  // mount order); batch-duplicate copies queued in pendingExtraKeys join the extra set.
  useEffect(() => {
    if (!groupRef.current) return;
    if (pendingSelectKey === objKey) {
      useSceneEditStore.setState({ selectedKey: objKey, selectedObject: groupRef.current, selectedAssetId: assetId ?? null });
      useSceneEditStore.getState().clearPendingSelect();
    } else if (isPendingExtra) {
      const obj = groupRef.current;
      useSceneEditStore.setState((s) => ({
        extraSelected: [...s.extraSelected.filter((e) => e.key !== objKey), { key: objKey, object: obj, assetId: assetId ?? null }],
        pendingExtraKeys: s.pendingExtraKeys.filter((k) => k !== objKey),
      }));
    }
  }, [pendingSelectKey, isPendingExtra, objKey, assetId]);

  const isPrimary = selectedKey === objKey;
  const selected = isPrimary || isExtra;

  // Phase 101 — tint the WHOLE selected object so the selection is unmistakable. Materials are
  // cloned per-mesh (so shared GLB materials aren't affected) and restored on deselect.
  useEffect(() => {
    const g = groupRef.current;
    if (!g || !selected) return;
    const tint = new Color(isPrimary ? '#a855f7' : '#06b6d4');
    const restore: Array<() => void> = [];
    g.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || mesh.userData.__editHelper) return;
      const orig = mesh.material;
      const list = Array.isArray(orig) ? orig : [orig];
      const cloned = list.map((m) => {
        const c = (m as Material).clone();
        const cm = c as unknown as { emissive?: Color; emissiveIntensity?: number; color?: Color };
        if (cm.emissive) { cm.emissive.copy(tint); cm.emissiveIntensity = 0.7; }
        if (cm.color) cm.color.lerp(tint, 0.5);
        return c;
      });
      mesh.material = (Array.isArray(orig) ? cloned : cloned[0]) as typeof orig;
      restore.push(() => { mesh.material = orig; cloned.forEach((c) => c.dispose()); });
    });
    return () => restore.forEach((fn) => fn());
  }, [selected, isPrimary]);

  return (
    <group
      ref={groupRef}
      position={m.position}
      rotation={m.rotation}
      scale={m.scale}
      onClick={handleClick}
    >
      {children}
      {/* Always-present invisible grab box so EVERY placement is reliably clickable —
          even async GLBs (placed yokai) that haven't streamed in or are tiny. Invisible
          meshes are skipped by the raycaster, so this stays visible with opacity 0. */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[1.2, 1.8, 1.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Selection marker: a bright wireframe box + a gizmo-style axis cross so EVERY
          selected object is clearly tagged (the real draggable gizmo sits on the primary
          and moves the whole batch). Primary = violet, batch-selected extras = cyan. */}
      {selected && (
        <group position={[0, 0.8, 0]}>
          <mesh userData={{ __editHelper: true }}>
            <boxGeometry args={[1.25, 1.85, 1.25]} />
            <meshBasicMaterial color={isPrimary ? '#a855f7' : '#06b6d4'} wireframe transparent opacity={0.85} depthTest={false} />
          </mesh>
          {/* gizmo-style axis cross (drawn on top so it reads as a marker on each object) */}
          <axesHelper args={[1.1]} renderOrder={999} onUpdate={(self) => { const m = self.material; if (Array.isArray(m)) m.forEach((mm) => (mm.depthTest = false)); else m.depthTest = false; }} />
          {!isPrimary && (
            <mesh userData={{ __editHelper: true }} position={[0, 1.25, 0]}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshBasicMaterial color="#06b6d4" depthTest={false} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}
