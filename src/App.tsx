import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useUiStore } from './stores/uiStore';
import { useTerrainHistoryStore } from './stores/terrainHistoryStore';
import { useSceneEditStore } from './stores/sceneEditStore';
import { usePbrPatchEditStore } from './stores/pbrPatchEditStore';
import { useEditorEnvironmentStore } from './stores/editorEnvironmentStore';
import { usePlayerStore } from './stores/playerStore';
import { Scene } from './game/core/Scene';
import { Dock } from './ui/Dock';
import { EditorHubPanel } from './ui/EditorHubPanel';
import { TerrainBrushHud } from './ui/TerrainBrushHud';

// Kit — top-level: the 3D <Canvas> with DOM overlays layered over it. F1 toggles Edit Mode; in Edit
// Mode the camera free-pans, gizmos appear, and the Editor Hub + floating terrain palette are usable.
export const App = () => {
  const editMode = useUiStore((s) => s.editMode);
  const editorHubOpen = useUiStore((s) => s.editorHubOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.code === 'F1' && !e.repeat) { e.preventDefault(); useUiStore.getState().toggleEditMode(); return; }
      if (!useUiStore.getState().editMode || typing) return;
      // Edit-mode shortcuts: gizmo modes + undo/redo (terrain → placements), patch ops handled in App.
      const patchSel = usePbrPatchEditStore.getState().selectedId;
      if (patchSel && !(e.code === 'KeyZ' && (e.ctrlKey || e.metaKey))) {
        const env = useEditorEnvironmentStore.getState();
        const pArea = usePlayerStore.getState().currentAreaId;
        const cur = env.overrides[pArea]?.pbrPatches ?? [];
        if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); env.setOverride(pArea, { pbrPatches: cur.filter((q) => q.id !== patchSel) }); usePbrPatchEditStore.getState().select(null); return; }
        if (e.code === 'KeyD' && e.shiftKey) { e.preventDefault(); const src = cur.find((q) => q.id === patchSel); if (src) { const id = `patch_${Date.now().toString(36)}`; env.setOverride(pArea, { pbrPatches: [...cur, { ...src, id, x: src.x + 10, z: src.z + 10 }] }); usePbrPatchEditStore.getState().select(id); } return; }
        if (e.code === 'KeyW') { usePbrPatchEditStore.getState().setMode('translate'); return; }
        if (e.code === 'KeyE') { usePbrPatchEditStore.getState().setMode('rotate'); return; }
        if (e.code === 'KeyR') { usePbrPatchEditStore.getState().setMode('scale'); return; }
        if (e.code === 'Escape') { usePbrPatchEditStore.getState().select(null); return; }
      }
      if (e.repeat) return;
      if ((e.code === 'KeyZ' && e.shiftKey && (e.ctrlKey || e.metaKey)) || (e.code === 'KeyY' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); useTerrainHistoryStore.getState().redo(); return; }
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!useTerrainHistoryStore.getState().undo()) useSceneEditStore.getState().undo(); return; }
      if (e.code === 'KeyD' && e.shiftKey) { e.preventDefault(); useSceneEditStore.getState().duplicateSelected(); return; }
      if (e.code === 'KeyW') useSceneEditStore.getState().setMode('translate');
      else if (e.code === 'KeyE') useSceneEditStore.getState().setMode('rotate');
      else if (e.code === 'KeyR') useSceneEditStore.getState().setMode('scale');
      else if (e.code === 'Delete' || e.code === 'Backspace') useSceneEditStore.getState().deleteSelected();
      else if (e.code === 'Escape') useSceneEditStore.getState().clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-900">
      <Dock />
      {editMode && <TerrainBrushHud />}
      {editMode && editorHubOpen && <EditorHubPanel />}
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 5, 10], fov: 50, near: 0.1, far: 1500 }}>
        <Scene />
      </Canvas>
    </div>
  );
};
