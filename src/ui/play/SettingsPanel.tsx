import { useGraphicsSettingsStore } from '../../stores/graphicsSettingsStore';
import { QUALITY_LEVELS } from '../../game/render/renderSettings';
import { PanelCard, closePanel } from './playShared';

// Kit — play-mode ⚙ Settings: graphics quality ceiling, auto-adapt toggle, on-screen perf HUD.
export const SettingsPanel = () => {
  const quality = useGraphicsSettingsStore((s) => s.quality);
  const auto = useGraphicsSettingsStore((s) => s.auto);
  const showPerfHud = useGraphicsSettingsStore((s) => s.showPerfHud);
  return (
    <PanelCard title="Settings" icon="⚙" onClose={closePanel} width="20rem">
      <div className="space-y-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-slate-400">Graphics quality</span>
          <select value={quality} onChange={(e) => useGraphicsSettingsStore.getState().setQuality(e.target.value as typeof quality)} className="rounded bg-slate-800 px-2 py-1 text-slate-100">
            {QUALITY_LEVELS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={auto} onChange={(e) => useGraphicsSettingsStore.getState().setAuto(e.target.checked)} className="accent-cyan-500" /> Auto-adapt quality when FPS drops</label>
        <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={showPerfHud} onChange={() => useGraphicsSettingsStore.getState().togglePerfHud()} className="accent-cyan-500" /> Show performance HUD</label>
      </div>
    </PanelCard>
  );
};
