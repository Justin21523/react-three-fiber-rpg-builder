import { useEffect } from 'react';
import { useTerrainBrushStore } from '../stores/terrainBrushStore';
import { usePlayerStore } from '../stores/playerStore';
import { useEditorEnvironmentStore } from '../stores/editorEnvironmentStore';
import { resolveAreaEnvironment } from '../game/environment/resolveAreaEnvironment';
import { TerrainToolsBar } from './editor/TerrainToolsBar';

// Phase 98d — floating terrain tools palette (top of screen), so you can sculpt/paint/select with the
// Editor Hub closed (which otherwise covers the view). Same controls as the panel's Terrain tools.
export const TerrainBrushHud = () => {
  const areaId = usePlayerStore((s) => s.currentAreaId);
  const tool = useTerrainBrushStore((s) => s.tool);
  useEditorEnvironmentStore((s) => s.overrides);
  useEditorEnvironmentStore((s) => s.defaultMode);
  const env = resolveAreaEnvironment(areaId);

  // Leaving Edit Mode unmounts this palette → release the tool so the camera orbits normally again.
  useEffect(() => () => useTerrainBrushStore.getState().setTool('none'), []);

  // Only show once a terrain tool is actually picked (from the 🌤 Environment panel) — not always.
  if (env.isIndoor || env.groundType !== 'heightfield' || tool === 'none') return null;

  return (
    <div className="pointer-events-auto absolute top-16 left-1/2 z-[60] w-[44rem] max-w-[94vw] -translate-x-1/2 rounded-xl border border-cyan-700/50 bg-slate-950/92 px-3 py-2 text-slate-200 shadow-2xl ring-1 ring-white/5">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">🏔 Terrain tools</div>
      <TerrainToolsBar layerCount={(env.terrain.splat?.layers ?? []).length} />
    </div>
  );
};
