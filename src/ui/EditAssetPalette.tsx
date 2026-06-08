import { useMemo, useState } from 'react';
import { MODEL_ASSET_LIST, MODEL_CATEGORIES } from '../data/modelLibrary';
import { useSceneEditStore } from '../stores/sceneEditStore';
import { usePlayerStore } from '../stores/playerStore';

const inp = 'rounded bg-slate-800 px-1.5 py-1 text-[11px] text-slate-100';

// Kit — the model asset palette: every .glb dropped in src/assets/models/ is auto-listed here. Pick a
// quantity + scale, click a model → it spawns at the camera focus as a fully editable placement
// (move/rotate/scale/delete/duplicate via the gizmo). This is the heart of the in-editor builder.
export const EditAssetPalette = () => {
  const addModel = useSceneEditStore((s) => s.addModel);
  const paletteScale = useSceneEditStore((s) => s.paletteScale);
  const setPaletteScale = useSceneEditStore((s) => s.setPaletteScale);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [count, setCount] = useState(1);

  const list = useMemo(
    () => MODEL_ASSET_LIST.filter((a) => (cat === 'all' || a.category === cat) && (!q.trim() || a.label.toLowerCase().includes(q.trim().toLowerCase()))),
    [q, cat],
  );

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`🔍 search ${MODEL_ASSET_LIST.length} models…`} className={`flex-1 ${inp}`} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={inp}>
          <option value="all">all</option>
          {MODEL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-[11px] text-slate-400">×<input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))} className={`w-12 ${inp}`} /></label>
        <label className="flex items-center gap-1 text-[11px] text-slate-400">Scale<input type="range" min={0.05} max={10} step={0.05} value={paletteScale} onChange={(e) => setPaletteScale(parseFloat(e.target.value))} className="w-28 accent-cyan-400" /><span className="w-8 text-right tabular-nums">{paletteScale.toFixed(2)}</span></label>
      </div>

      {MODEL_ASSET_LIST.length === 0 ? (
        <p className="rounded bg-slate-900/60 px-2 py-2 text-[11px] leading-relaxed text-slate-400">No models yet. Drop <code className="text-slate-300">.glb</code> / <code className="text-slate-300">.gltf</code> files into <code className="text-slate-300">src/assets/models/</code> (subfolders become categories) — they appear here automatically.</p>
      ) : (
        <div className="grid max-h-72 grid-cols-2 gap-1 overflow-auto rounded bg-slate-950/50 p-1">
          {list.map((a) => (
            <button key={a.id} onClick={() => addModel(areaId, a.id, count)} title={a.id} className="rounded border border-slate-700 bg-slate-800 px-2 py-2 text-left text-[11px] text-slate-200 hover:border-cyan-500 hover:bg-slate-700">
              <span className="block truncate font-semibold">{a.label}</span>
              <span className="block truncate text-[9px] text-slate-500">{a.category}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-[10px] leading-relaxed text-slate-600">Click a model to spawn {count}× at the camera focus. New copies auto-select — drag the gizmo (W/E/R), Shift+D duplicate, Del delete.</p>
    </div>
  );
};
