import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useUiStore } from './stores/uiStore';
import { useTerrainHistoryStore } from './stores/terrainHistoryStore';
import { useSceneEditStore } from './stores/sceneEditStore';
import { usePbrPatchEditStore } from './stores/pbrPatchEditStore';
import { useEditorEnvironmentStore } from './stores/editorEnvironmentStore';
import { usePlayerStore } from './stores/playerStore';
import { Scene } from './game/core/Scene';
import { syncEditorQuests } from './game/editor/editorQuestToQuest';
import { QuestTrackerController } from './game/quest/questTracking';
import { InteractionHandler } from './game/interaction/InteractionHandler';
import { Dock } from './ui/Dock';
import { EditorHubPanel } from './ui/EditorHubPanel';
import { EditAssetPalette } from './ui/EditAssetPalette';
import { EditModeInspector } from './ui/EditModeInspector';
import { TerrainBrushHud } from './ui/TerrainBrushHud';
import { InteractionPrompt } from './ui/InteractionPrompt';
import { WorldClockHUD } from './ui/WorldClockHUD';
import { DialogueBox } from './ui/DialogueBox';
import { QuestTracker } from './ui/QuestTracker';
import { BattleOverlay } from './ui/BattleOverlay';
import { useBattleStore } from './stores/battleStore';
import { ActivityHud } from './ui/ActivityHud';
import { useActivityStore } from './stores/activityStore';
import { PlayToolbar } from './ui/play/PlayToolbar';

// Kit — top-level: the 3D <Canvas> with DOM overlays layered over it. F1 toggles Edit Mode; in Edit
// Mode the camera free-pans, gizmos appear, and the Editor Hub + floating terrain palette are usable.
export const App = () => {
  const editMode = useUiStore((s) => s.editMode);
  const editorHubOpen = useUiStore((s) => s.editorHubOpen);
  const inBattle = useBattleStore((s) => s.isActive);
  const inActivity = useActivityStore((s) => s.isActive);

  // Register any editor-authored quests (from localStorage) into the runtime quest store on startup.
  useEffect(() => {
    syncEditorQuests();
  }, []);

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
      <InteractionHandler />
      <QuestTrackerController />
      <Dock />
      <WorldClockHUD />
      {/* Overworld-only HUD (hidden while editing). */}
      {!editMode && !inBattle && !inActivity && <InteractionPrompt />}
      {!editMode && !inBattle && !inActivity && <QuestTracker />}
      {!editMode && !inBattle && !inActivity && <PlayToolbar />}
      <DialogueBox />
      <BattleOverlay />
      <ActivityHud />
      {/* Edit Mode: independent panels — Assets (left-centre), Inspector (top-left), terrain palette, and
          the centred draggable Hub — matching the original layout. */}
      {editMode && <EditAssetPalette />}
      {editMode && <EditModeInspector />}
      {editMode && <TerrainBrushHud />}
      {editMode && editorHubOpen && <EditorHubPanel />}
      {/* DPR capped lower (high-DPI screens were fill-bound); a PerformanceMonitor in Scene adapts it. */}
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 5, 10], fov: 50, near: 0.1, far: 1500 }}>
        <Scene />
      </Canvas>
    </div>
  );
};
