import { useTerrainBrushStore, SCULPT_TOOLS } from '../../stores/terrainBrushStore';

// Phase 98d — shared terrain tools control set (sculpt / paint / select + brush params + region batch
// apply). Rendered both at the top of the Environment panel and in the floating TerrainBrushHud, so the
// exact same tools are available wherever you are. Drives the ephemeral terrainBrushStore.
const TOOL_LABEL: Record<string, string> = {
  raise: '⬆ Raise', lower: '⬇ Lower', smooth: '〰 Smooth', flatten: '▭ Flatten',
  noise: '▦ Noise', sharpen: '▲ Sharpen', terrace: '▤ Terrace', setLevel: '⊿ Level',
};
const tbtn = (active: boolean) => `rounded px-1.5 py-1 text-[10px] ${active ? 'bg-cyan-600/40 text-cyan-100' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`;

export const TerrainToolsBar = ({ layerCount, onResetSculpt }: { layerCount: number; onResetSculpt?: () => void }) => {
  const tool = useTerrainBrushStore((s) => s.tool);
  const radius = useTerrainBrushStore((s) => s.radius);
  const strength = useTerrainBrushStore((s) => s.strength);
  const terraceStep = useTerrainBrushStore((s) => s.terraceStep);
  const targetLevel = useTerrainBrushStore((s) => s.targetLevel);
  const paintLayer = useTerrainBrushStore((s) => s.paintLayer);
  const regions = useTerrainBrushStore((s) => s.regions);
  const b = useTerrainBrushStore.getState();
  const showBrush = (SCULPT_TOOLS as string[]).includes(tool) || tool === 'paint';

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {SCULPT_TOOLS.map((tt) => (
          <button key={tt} onClick={() => b.setTool(tool === tt ? 'none' : tt)} className={tbtn(tool === tt)}>{TOOL_LABEL[tt] ?? tt}</button>
        ))}
        <button onClick={() => b.setTool(tool === 'paint' ? 'none' : 'paint')} className={tbtn(tool === 'paint')}>🖌 Paint</button>
        <button onClick={() => b.setTool(tool === 'select' ? 'none' : 'select')} className={tbtn(tool === 'select')}>▭ Select</button>
        {onResetSculpt && <button onClick={onResetSculpt} className="rounded px-1.5 py-1 text-[10px] text-red-300 hover:bg-red-700/30">Reset</button>}
        {tool !== 'none' && <button onClick={() => b.setTool('none')} className="ml-auto rounded-md border border-emerald-700/50 bg-emerald-700/25 px-2.5 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-700/35">✓ Done</button>}
      </div>

      {showBrush && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1 text-[11px] text-slate-400">Radius<input type="range" min={2} max={80} step={1} value={radius} onChange={(e) => b.setRadius(parseFloat(e.target.value))} className="w-28 accent-cyan-400" /><span className="w-6 text-right tabular-nums">{Math.round(radius)}</span></label>
          <label className="flex items-center gap-1 text-[11px] text-slate-400">Strength<input type="range" min={0.05} max={1} step={0.05} value={strength} onChange={(e) => b.setStrength(parseFloat(e.target.value))} className="w-24 accent-cyan-400" /></label>
          {tool === 'terrace' && <label className="flex items-center gap-1 text-[11px] text-slate-400">Step<input type="range" min={0.2} max={10} step={0.2} value={terraceStep} onChange={(e) => b.setTerraceStep(parseFloat(e.target.value))} className="w-20 accent-cyan-400" /></label>}
          {tool === 'setLevel' && <label className="flex items-center gap-1 text-[11px] text-slate-400">Y<input type="range" min={-20} max={20} step={0.5} value={targetLevel} onChange={(e) => b.setTargetLevel(parseFloat(e.target.value))} className="w-20 accent-cyan-400" /></label>}
          {tool === 'paint' && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">Layer
              {Array.from({ length: Math.max(1, layerCount) }).map((_, i) => (
                <button key={i} onClick={() => b.setPaintLayer(i)} className={tbtn(paintLayer === i)}>{i}</button>
              ))}
            </span>
          )}
          <span className="text-[10px] text-slate-500">left-drag the terrain</span>
        </div>
      )}

      {(tool === 'select' || regions.length > 0) && (
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-700/60 pt-1">
          <span className="mr-1 text-[10px] text-slate-400">Selection ({regions.length}):</span>
          <button onClick={() => b.requestApply('raise')} className={tbtn(false)}>Raise</button>
          <button onClick={() => b.requestApply('lower')} className={tbtn(false)}>Lower</button>
          <button onClick={() => b.requestApply('flatten')} className={tbtn(false)}>Flatten</button>
          {layerCount > 0 && <span className="ml-1 text-[10px] text-slate-400">Fill:</span>}
          {layerCount > 0 && Array.from({ length: layerCount }).map((_, i) => (
            <button key={i} onClick={() => b.requestApply('fillLayer', i)} className={tbtn(false)}>{i}</button>
          ))}
          <button onClick={() => b.clearRegions()} className="ml-auto rounded px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-700/30">Clear</button>
        </div>
      )}
    </div>
  );
};
