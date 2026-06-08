import { useMemo, useState } from 'react';
import { MODEL_ASSET_LIST, MODEL_CATEGORIES } from '../data/modelLibrary';
import { useSceneEditStore } from '../stores/sceneEditStore';
import { usePlayerStore } from '../stores/playerStore';

// Kit — standalone Edit Mode asset palette (left-centre, accordion-by-category — matches the original).
// Every model auto-discovered from src/assets/models or public/models is grouped by category; click a
// category bar to expand its models, click a model → spawn `qty` copies at the camera focus as editable
// placements. Independent of the Editor Hub.
export const EditAssetPalette = () => {
  const addModel = useSceneEditStore((s) => s.addModel);
  const paletteScale = useSceneEditStore((s) => s.paletteScale);
  const setPaletteScale = useSceneEditStore((s) => s.setPaletteScale);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  const [filter, setFilter] = useState('');
  const [qty, setQty] = useState(1);
  const [openCat, setOpenCat] = useState<string | null>(MODEL_CATEGORIES[0] ?? null);
  const [collapsed, setCollapsed] = useState(false);

  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const g: Record<string, typeof MODEL_ASSET_LIST> = {};
    for (const a of MODEL_ASSET_LIST) {
      if (f && !a.label.toLowerCase().includes(f) && !a.id.toLowerCase().includes(f)) continue;
      (g[a.category] ??= []).push(a);
    }
    return g;
  }, [filter]);

  return (
    <div
      style={{ transform: `translateY(-50%) scale(${paletteScale})`, transformOrigin: 'left center' }}
      className="pointer-events-auto absolute left-3 top-1/2 z-[70] flex max-h-[86vh] w-72 flex-col rounded-xl border border-violet-700/50 bg-slate-950/90 p-3 text-slate-100 shadow-2xl backdrop-blur-sm"
    >
      <div className="mb-2 flex items-center justify-between gap-1">
        <span className="text-sm font-bold text-violet-100">➕ Add Model <span className="text-[11px] font-normal text-slate-400">{MODEL_ASSET_LIST.length}</span></span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setPaletteScale(paletteScale - 0.1)} title="Smaller" className="rounded px-1.5 text-sm text-slate-400 hover:bg-slate-800">−</button>
          <span className="w-8 text-center text-xs text-slate-500">{Math.round(paletteScale * 100)}%</span>
          <button onClick={() => setPaletteScale(paletteScale + 0.1)} title="Bigger" className="rounded px-1.5 text-sm text-slate-400 hover:bg-slate-800">+</button>
          <button onClick={() => setCollapsed((c) => !c)} title="Collapse / expand" className="rounded px-1.5 text-sm text-slate-400 hover:bg-slate-800">{collapsed ? '▸' : '▾'}</button>
        </div>
      </div>

      {!collapsed && (
        <>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="search models…" className="mb-2 w-full rounded bg-slate-800 px-2 py-1.5 text-sm text-slate-100" />
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="text-slate-400">Qty</span>
            <input type="number" min={1} max={50} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))} className="w-16 rounded bg-slate-800 px-1.5 py-1 text-right text-slate-100" />
            <span className="text-xs text-slate-500">click → +{qty}</span>
          </div>

          {MODEL_ASSET_LIST.length === 0 ? (
            <p className="rounded bg-slate-900/60 px-2 py-2 text-xs leading-relaxed text-slate-400">No models yet. Drop <code className="text-slate-300">.glb</code> / <code className="text-slate-300">.gltf</code> into <code className="text-slate-300">src/assets/models/</code> or <code className="text-slate-300">public/models/</code> — they appear here automatically.</p>
          ) : (
            <div className="studio-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {MODEL_CATEGORIES.map((cat) => {
                const items = grouped[cat];
                if (!items || items.length === 0) return null;
                const open = openCat === cat || !!filter;
                return (
                  <div key={cat}>
                    <button onClick={() => setOpenCat(open && !filter ? null : cat)} className="flex w-full items-center justify-between rounded bg-slate-900/70 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-300 hover:bg-slate-900">
                      <span>{cat}</span><span className="text-slate-500">{items.length}</span>
                    </button>
                    {open && (
                      <div className="mt-0.5 space-y-0.5 pl-1">
                        {items.map((a) => (
                          <button key={a.id} onClick={() => addModel(areaId, a.id, qty)} title={`Add ${qty}× ${a.id}`} className="block w-full truncate rounded px-2 py-1 text-left text-sm text-slate-300 hover:bg-violet-500/20 hover:text-violet-100">
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
