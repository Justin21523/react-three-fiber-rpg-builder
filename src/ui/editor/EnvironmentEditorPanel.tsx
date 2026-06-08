import { useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useEditorEnvironmentStore } from '../../stores/editorEnvironmentStore';
import { resolveAreaEnvironment, type ResolvedEnvironment } from '../../game/environment/resolveAreaEnvironment';
import { DEFAULT_STABLE_OVERRIDE, type BackgroundMode, type GroundType, type LockTime, type PbrPatch } from '../../types/environmentOverride';
import { SEED_AREAS } from '../../data/areas';
import { TEXTURE_SETS } from '../../game/world/textureLibrary';
import { MATERIAL_SETS } from '../../game/world/gltfMaterial';
import { usePbrPatchEditStore } from '../../stores/pbrPatchEditStore';
import { editorSpawn } from '../../stores/sceneEditStore';
import { TerrainToolsBar } from './TerrainToolsBar';

// Phase 98a — Editor Hub "Environment" tab. Per-area sky / gradient / solid background, fog and a
// locked time-of-day, plus a global default mode. Everything writes to editorEnvironmentStore and is
// read live by EnvironmentBackdrop + DynamicAmbience, so changes show in the scene immediately.

const BG_MODES: { id: BackgroundMode; label: string }[] = [
  { id: 'sky', label: '☀ Sky dome' },
  { id: 'gradient', label: '▤ Gradient' },
  { id: 'solid', label: '■ Solid' },
  { id: 'dynamic', label: '🕓 Dynamic day/night' },
];
const LOCK_TIMES: LockTime[] = ['none', 'dawn', 'day', 'evening', 'night'];
const GROUND_TYPES: { id: GroundType; label: string }[] = [
  { id: 'default', label: '🧱 Default (GLB tiles + colour)' },
  { id: 'flatPbr', label: '🟫 Flat PBR plane' },
  { id: 'heightfield', label: '⛰ Heightfield (undulating)' },
];

const lbl = 'text-[10px] font-bold uppercase tracking-wider text-cyan-300';
const inp = 'rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-100';

const Slider = ({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) => (
  <label className="flex items-center gap-2 text-[11px] text-slate-300">
    <span className="w-28 shrink-0">{label}</span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1 accent-cyan-400" />
    <span className="w-12 shrink-0 text-right tabular-nums text-slate-400">{value.toFixed(step < 1 ? 2 : 0)}</span>
  </label>
);

const ColorRow = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="flex items-center gap-2 text-[11px] text-slate-300">
    <span className="w-28 shrink-0">{label}</span>
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-10 rounded bg-transparent" />
    <input value={value} onChange={(e) => onChange(e.target.value)} className={`w-24 ${inp}`} />
  </label>
);

const TextRow = ({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) => (
  <label className="flex items-center gap-2 text-[11px] text-slate-300">
    <span className="w-20 shrink-0">{label}</span>
    <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`flex-1 ${inp}`} />
  </label>
);

// Reusable, searchable thumbnail grid of texture sets. `onPick` receives the chosen set; `activeKey`
// highlights the current one. A search box lets you switch between the ~100 textures at any time.
const TextureSetGrid = ({ activeKey, onPick }: { activeKey?: string; onPick: (s: typeof TEXTURE_SETS[number]) => void }) => {
  const [q, setQ] = useState('');
  if (TEXTURE_SETS.length === 0) {
    return <p className="rounded bg-slate-900/60 px-2 py-1.5 text-[10px] leading-relaxed text-slate-500">Drop PBR maps into <code className="text-slate-400">src/assets/textures/</code> (e.g. <code className="text-slate-400">grass_diff_4k.jpg</code>, <code className="text-slate-400">grass_nor_gl_4k.jpg</code>) — they appear here automatically.</p>;
  }
  const filtered = q.trim() ? TEXTURE_SETS.filter((s) => s.label.toLowerCase().includes(q.trim().toLowerCase())) : TEXTURE_SETS;
  return (
    <div className="space-y-1">
      {/* Explicit dropdown — switch texture set at any time. */}
      <select value={activeKey ?? ''} onChange={(e) => { const s = TEXTURE_SETS.find((x) => (x.albedoKey ?? x.id) === e.target.value); if (s) onPick(s); }} className={`w-full ${inp}`}>
        <option value="">— choose texture ({TEXTURE_SETS.length}) —</option>
        {TEXTURE_SETS.map((s) => <option key={s.id} value={s.albedoKey ?? s.id}>{s.label}</option>)}
      </select>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`🔍 search ${TEXTURE_SETS.length} textures…`} className={`w-full ${inp}`} />
      <div className="grid max-h-52 grid-cols-3 gap-1 overflow-auto rounded bg-slate-950/50 p-1">
        {filtered.map((s) => {
          const active = !!activeKey && (activeKey === s.albedoKey || activeKey === s.heightKey);
          return (
            <button key={s.id} onClick={() => onPick(s)} title={s.label} className={`group relative overflow-hidden rounded border ${active ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-slate-700 hover:border-slate-400'}`}>
              <img src={s.thumbUrl} loading="lazy" alt={s.label} className="h-16 w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 text-[9px] text-slate-100">{s.label}</span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="col-span-3 px-2 py-1 text-[10px] text-slate-500">No texture matches “{q}”.</p>}
      </div>
    </div>
  );
};

// Shared PBR-surface controls (texture-set picker + tiling/normal/roughness/tint + advanced URLs),
// used by both the flat-PBR ground and the heightfield terrain surface.
const PbrSurfaceControls = ({ pg, setPg }: { pg: ResolvedEnvironment['pbrGround']; setPg: (p: Partial<ResolvedEnvironment['pbrGround']>) => void }) => {
  const applySet = (s: typeof TEXTURE_SETS[number]) => setPg({ albedoUrl: s.albedoKey, normalUrl: s.normalKey, roughnessUrl: s.roughnessKey, aoUrl: s.aoKey });
  const clearMaps = () => setPg({ albedoUrl: undefined, normalUrl: undefined, roughnessUrl: undefined, aoUrl: undefined });
  return (
    <div className="mt-1 space-y-1">
      {/* GLTF material picker (extracts a whole authored material's PBR maps). */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">GLTF material · {MATERIAL_SETS.length}</span>
        {pg.gltfMaterialUrl && <button onClick={() => setPg({ gltfMaterialUrl: undefined })} className="rounded px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-700/30">Clear material</button>}
      </div>
      {MATERIAL_SETS.length === 0 ? (
        <p className="rounded bg-slate-900/60 px-2 py-1 text-[10px] leading-relaxed text-slate-500">Drop <code className="text-slate-400">.glb</code> materials into <code className="text-slate-400">src/assets/materials/</code> — they appear here automatically.</p>
      ) : (
        <div className="flex max-h-28 flex-wrap gap-1 overflow-auto rounded bg-slate-950/40 p-1">
          {MATERIAL_SETS.map((m) => (
            <button key={m.key} onClick={() => setPg({ gltfMaterialUrl: m.key })} title={m.key} className={`rounded border px-2 py-1 text-[10px] ${pg.gltfMaterialUrl === m.key ? 'border-cyan-400 bg-cyan-600/30 text-cyan-100' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'}`}>🧊 {m.label}</button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-slate-400">Image texture · {TEXTURE_SETS.length}</span>
        <button onClick={clearMaps} className="rounded px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-700/30">Clear maps</button>
      </div>
      <TextureSetGrid activeKey={pg.albedoUrl} onPick={applySet} />
      <Slider label="Tiling" value={pg.repeat} min={1} max={64} step={1} onChange={(v) => setPg({ repeat: v })} />
      <Slider label="Rotation°" value={pg.rotationDeg ?? 0} min={0} max={360} step={5} onChange={(v) => setPg({ rotationDeg: v })} />
      <Slider label="Normal scale" value={pg.normalScale} min={0} max={3} step={0.05} onChange={(v) => setPg({ normalScale: v })} />
      <Slider label="Roughness" value={pg.roughness} min={0} max={1} step={0.05} onChange={(v) => setPg({ roughness: v })} />
      <Slider label="Metalness" value={pg.metalness} min={0} max={1} step={0.05} onChange={(v) => setPg({ metalness: v })} />
      <ColorRow label="Tint" value={pg.tint} onChange={(v) => setPg({ tint: v })} />
      <details className="rounded bg-slate-900/40 px-2 py-1">
        <summary className="cursor-pointer text-[10px] text-slate-400">Advanced — manual URLs / remote</summary>
        <div className="mt-1 space-y-1">
          <TextRow label="Albedo" value={pg.albedoUrl ?? ''} placeholder="key or /url" onChange={(v) => setPg({ albedoUrl: v || undefined })} />
          <TextRow label="Normal" value={pg.normalUrl ?? ''} placeholder="key or /url" onChange={(v) => setPg({ normalUrl: v || undefined })} />
          <TextRow label="Roughness" value={pg.roughnessUrl ?? ''} placeholder="key or /url" onChange={(v) => setPg({ roughnessUrl: v || undefined })} />
          <TextRow label="AO" value={pg.aoUrl ?? ''} placeholder="key or /url" onChange={(v) => setPg({ aoUrl: v || undefined })} />
          <p className="text-[10px] leading-relaxed text-slate-600">Accepts a library key, a <code className="text-slate-400">public/</code> path, or a remote URL. A bad/empty value just shows the tint colour.</p>
        </div>
      </details>
    </div>
  );
};

// Placeable PBR patches/decals — overlapping textured blocks (size / position / rotation / scale).
const PbrPatchControls = ({ patches, setPatches }: { patches: PbrPatch[]; setPatches: (p: PbrPatch[]) => void }) => {
  const [count, setCount] = useState(1);
  const [newMat, setNewMat] = useState<string>(''); // albedoKey of the texture for newly-added patches
  const selectedId = usePbrPatchEditStore((s) => s.selectedId);
  const matFor = (albedoKey: string) => TEXTURE_SETS.find((s) => (s.albedoKey ?? s.id) === albedoKey);
  // New patches spawn at the camera focus (editorSpawn) so they're easy to find, fanned out slightly.
  const newPatch = (i: number, base?: PbrPatch): PbrPatch => {
    const set = !base && newMat ? matFor(newMat) : undefined;
    return {
      id: `patch_${Date.now().toString(36)}${i}`,
      albedoKey: base?.albedoKey ?? set?.albedoKey, normalKey: base?.normalKey ?? set?.normalKey, gltfMaterialUrl: base?.gltfMaterialUrl,
      x: (base?.x ?? editorSpawn.x) + i * 12, z: (base?.z ?? editorSpawn.z) + (base ? 12 : 0), sizeX: base?.sizeX ?? 20, sizeZ: base?.sizeZ ?? 20,
      rotationDeg: base?.rotationDeg ?? 0, repeat: base?.repeat ?? 4,
    };
  };
  const addN = () => {
    const added: PbrPatch[] = [];
    for (let i = 0; i < Math.max(1, count); i++) added.push(newPatch(i));
    setPatches([...patches, ...added]);
    usePbrPatchEditStore.getState().select(added[0].id); // auto-select → gizmo appears on the new patch
  };
  const dup = (i: number) => { const c = newPatch(1, patches[i]); setPatches([...patches, c]); usePbrPatchEditStore.getState().select(c.id); };
  const setP = (i: number, p: Partial<PbrPatch>) => setPatches(patches.map((q, j) => (j === i ? { ...q, ...p } : q)));
  return (
    <div className="rounded-lg border border-amber-700/40 bg-slate-900/60 p-2">
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <span className={lbl}>🧩 PBR patches · {patches.length}</span>
        <label className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">×<input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))} className={`w-12 ${inp}`} /></label>
        <button onClick={addN} className="rounded-md border border-emerald-700/50 bg-emerald-700/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-700/30">+ Add</button>
      </div>
      {/* Pick which texture newly-added patches use (so each add can be a different type). */}
      <select value={newMat} onChange={(e) => setNewMat(e.target.value)} className={`mb-1 w-full ${inp}`}>
        <option value="">New patch texture: (none — set per patch)</option>
        {TEXTURE_SETS.map((s) => <option key={s.id} value={s.albedoKey ?? s.id}>{s.label}</option>)}
      </select>
      <p className="mb-1 text-[10px] text-slate-500">Blocks spawn at the camera focus + auto-select. In 3D: click a block to select, gizmo to move (W) / rotate (E) / scale (R), Shift+D duplicate, Del delete.</p>
      {patches.map((p, i) => (
        <div key={p.id} className={`mt-1 space-y-1 rounded p-1 ${selectedId === p.id ? 'bg-cyan-900/30 ring-1 ring-cyan-500/50' : 'bg-slate-950/40'}`}>
          <div className="flex items-center gap-1">
            <button onClick={() => usePbrPatchEditStore.getState().select(p.id)} className="flex-1 text-left text-[10px] text-slate-300 hover:text-cyan-200">Patch {i}{p.albedoKey ? ` · ${p.albedoKey.split('/').pop()}` : ''}{selectedId === p.id ? ' ◀ selected' : ''}</button>
            <button onClick={() => dup(i)} className="rounded px-1 text-[10px] text-emerald-300 hover:bg-emerald-700/30" title="Duplicate">⧉</button>
            <button onClick={() => { setPatches(patches.filter((_, j) => j !== i)); if (selectedId === p.id) usePbrPatchEditStore.getState().select(null); }} className="rounded px-1 text-[10px] text-red-300 hover:bg-red-700/30">✕</button>
          </div>
          <TextureSetGrid activeKey={p.albedoKey} onPick={(set) => setP(i, { albedoKey: set.albedoKey, normalKey: set.normalKey, gltfMaterialUrl: undefined })} />
          <div className="grid grid-cols-2 gap-x-2">
            <Slider label="Pos X" value={p.x} min={-250} max={250} step={1} onChange={(v) => setP(i, { x: v })} />
            <Slider label="Pos Z" value={p.z} min={-250} max={250} step={1} onChange={(v) => setP(i, { z: v })} />
            <Slider label="Size X" value={p.sizeX} min={1} max={300} step={1} onChange={(v) => setP(i, { sizeX: v })} />
            <Slider label="Size Z" value={p.sizeZ} min={1} max={300} step={1} onChange={(v) => setP(i, { sizeZ: v })} />
            <Slider label="Rotation°" value={p.rotationDeg} min={0} max={360} step={5} onChange={(v) => setP(i, { rotationDeg: v })} />
            <Slider label="Tiling" value={p.repeat} min={1} max={48} step={1} onChange={(v) => setP(i, { repeat: v })} />
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input type="checkbox" checked={p.conform !== false} onChange={(e) => setP(i, { conform: e.target.checked })} className="accent-cyan-400" />
            <span>Conform to terrain (drape over heightfield)</span>
          </label>
        </div>
      ))}
    </div>
  );
};

// Terrain splat (multi-material) controls — up to 4 layers (image or GLTF) blended auto / painted.
const SplatControls = ({ t, setTerrain }: { t: ResolvedEnvironment['terrain']; setTerrain: (p: Partial<ResolvedEnvironment['terrain']>) => void }) => {
  const s = t.splat ?? {};
  const layers = s.layers ?? [];
  const mode = s.mode ?? 'auto';
  const setSplat = (p: Partial<NonNullable<typeof t.splat>>) => setTerrain({ splat: { ...s, ...p } });
  const setLayer = (i: number, p: Partial<(typeof layers)[number]>) => { const next = layers.map((l, j) => (j === i ? { ...l, ...p } : l)); setSplat({ layers: next }); };
  return (
    <div className="space-y-1 border-t border-slate-700/60 pt-1">
      <label className="flex items-center gap-2 text-[11px] text-slate-300">
        <input type="checkbox" checked={!!s.enabled} onChange={(e) => setSplat({ enabled: e.target.checked })} className="accent-cyan-400" />
        <span className={lbl}>Splat (multi-material)</span>
      </label>
      {s.enabled && (
        <>
          <div className="flex gap-1">
            {(['auto', 'paint'] as const).map((m) => (
              <button key={m} onClick={() => setSplat({ mode: m })} className={`rounded px-2 py-0.5 text-[10px] ${mode === m ? 'bg-cyan-600/40 text-cyan-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{m === 'auto' ? 'Auto (height/slope)' : 'Paint'}</button>
            ))}
            {layers.length < 4 && <button onClick={() => setSplat({ layers: [...layers, { repeat: 8 }] })} className="ml-auto rounded border border-emerald-700/50 bg-emerald-700/20 px-2 py-0.5 text-[10px] text-emerald-100">+ Layer</button>}
          </div>
          {layers.map((l, i) => (
            <div key={i} className="space-y-1 rounded bg-slate-950/40 p-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Layer {i} {l.albedoKey ? `· ${l.albedoKey.split('/').pop()}` : l.gltfMaterialUrl ? `· ${l.gltfMaterialUrl.split('/').pop()}` : ''}</span>
                <button onClick={() => setSplat({ layers: layers.filter((_, j) => j !== i) })} className="rounded px-1 text-[10px] text-red-300 hover:bg-red-700/30">✕</button>
              </div>
              <TextureSetGrid activeKey={l.albedoKey} onPick={(set) => setLayer(i, { albedoKey: set.albedoKey, normalKey: set.normalKey, gltfMaterialUrl: undefined })} />
              {MATERIAL_SETS.length > 0 && (
                <div className="flex max-h-20 flex-wrap gap-1 overflow-auto rounded bg-slate-950/40 p-1">
                  {MATERIAL_SETS.map((m) => (
                    <button key={m.key} onClick={() => setLayer(i, { gltfMaterialUrl: m.key, albedoKey: undefined })} className={`rounded border px-1.5 py-0.5 text-[9px] ${l.gltfMaterialUrl === m.key ? 'border-cyan-400 bg-cyan-600/30 text-cyan-100' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>🧊 {m.label}</button>
                  ))}
                </div>
              )}
              <Slider label="Tiling / scale" value={l.repeat ?? 8} min={1} max={64} step={1} onChange={(v) => setLayer(i, { repeat: v })} />
              <Slider label="Rotation°" value={l.rotationDeg ?? 0} min={0} max={360} step={5} onChange={(v) => setLayer(i, { rotationDeg: v })} />
            </div>
          ))}
          {mode === 'auto' && (
            <>
              <Slider label="Low band Y" value={s.bandLow ?? -1} min={-20} max={20} step={0.5} onChange={(v) => setSplat({ bandLow: v })} />
              <Slider label="High band Y" value={s.bandHigh ?? 6} min={-20} max={30} step={0.5} onChange={(v) => setSplat({ bandHigh: v })} />
              <Slider label="Rock slope" value={s.slopeRock ?? 0.45} min={0} max={1} step={0.05} onChange={(v) => setSplat({ slopeRock: v })} />
            </>
          )}
          {mode === 'paint' && (
            <div className="space-y-1">
              <button onClick={() => setSplat({ weights: undefined, mode: 'auto' })} className="rounded px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-700/30">Clear paint → re-bake auto</button>
              <p className="text-[10px] text-slate-600">Use the floating Terrain palette (🖌 Paint) to paint layers onto the terrain.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Heightfield terrain controls — noise shape + optional grayscale heightmap.
const TerrainControls = ({ t, setTerrain }: { t: ResolvedEnvironment['terrain']; setTerrain: (p: Partial<ResolvedEnvironment['terrain']>) => void }) => (
  <div className="mt-1 space-y-1 rounded bg-slate-900/40 p-2">
    <span className={lbl}>Terrain shape</span>
    <Slider label="Patch size" value={t.size} min={50} max={1000} step={10} onChange={(v) => setTerrain({ size: v })} />
    <Slider label="Resolution" value={t.segments} min={16} max={200} step={1} onChange={(v) => setTerrain({ segments: Math.round(v) })} />
    <Slider label="Amplitude" value={t.amplitude} min={0} max={30} step={0.5} onChange={(v) => setTerrain({ amplitude: v })} />
    <Slider label="Frequency" value={t.frequency} min={0.005} max={0.3} step={0.005} onChange={(v) => setTerrain({ frequency: v })} />
    <Slider label="Octaves" value={t.octaves} min={1} max={5} step={1} onChange={(v) => setTerrain({ octaves: Math.round(v) })} />
    <Slider label="Seed" value={t.seed} min={1} max={9999} step={1} onChange={(v) => setTerrain({ seed: Math.round(v) })} />
    <Slider label="Base offset" value={t.baseOffset} min={-20} max={20} step={0.5} onChange={(v) => setTerrain({ baseOffset: v })} />
    <Slider label="Flatten radius" value={t.flattenRadius} min={0} max={60} step={1} onChange={(v) => setTerrain({ flattenRadius: v })} />
    <div className="flex items-center justify-between pt-1">
      <span className="text-[10px] text-slate-400">Heightmap (grayscale)</span>
      <button onClick={() => setTerrain({ heightmapUrl: undefined, heightmapAmplitude: 0 })} className="rounded px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-700/30">Clear</button>
    </div>
    <TextureSetGrid activeKey={t.heightmapUrl} onPick={(s) => setTerrain({ heightmapUrl: s.heightKey ?? s.albedoKey, heightmapAmplitude: t.heightmapAmplitude || 4 })} />
    <Slider label="Heightmap amp" value={t.heightmapAmplitude} min={0} max={30} step={0.5} onChange={(v) => setTerrain({ heightmapAmplitude: v })} />
    <label className="flex items-center gap-2 text-[11px] text-slate-300">
      <input type="checkbox" checked={t.heightmapInvert} onChange={(e) => setTerrain({ heightmapInvert: e.target.checked })} className="accent-cyan-400" />
      <span>Invert heightmap</span>
    </label>
    <p className="text-[10px] leading-relaxed text-slate-600">The terrain is the walkable surface (you climb slopes and stand in valleys). Spawn area stays flat via "Flatten radius". A grayscale heightmap (bright = high) drives extra relief when its amplitude &gt; 0.</p>

    {/* Sculpt / Paint / Select tools live in the floating Terrain palette (bottom of screen). */}
    <div className="flex items-center justify-between border-t border-slate-700/60 pt-1">
      <span className="text-[10px] text-slate-500">🖌 Sculpt / paint / select tools → floating Terrain palette</span>
      <button onClick={() => setTerrain({ sculpt: undefined })} className="rounded px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-700/30">Reset sculpt</button>
    </div>

    {/* Splat multi-material */}
    <SplatControls t={t} setTerrain={setTerrain} />

    {/* LOD */}
    {(() => {
      const l = t.lod ?? {};
      const setLod = (p: Partial<NonNullable<typeof t.lod>>) => setTerrain({ lod: { ...l, ...p } });
      return (
        <div className="space-y-1 border-t border-slate-700/60 pt-1">
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input type="checkbox" checked={!!l.enabled} onChange={(e) => setLod({ enabled: e.target.checked })} className="accent-cyan-400" />
            <span className={lbl}>Terrain LOD</span>
          </label>
          {l.enabled && (
            <>
              <Slider label="Far distance" value={l.far ?? 160} min={40} max={600} step={10} onChange={(v) => setLod({ far: v })} />
              <Slider label="Near res" value={l.highSegments ?? t.segments} min={16} max={200} step={1} onChange={(v) => setLod({ highSegments: Math.round(v) })} />
              <Slider label="Far res" value={l.lowSegments ?? 24} min={4} max={96} step={1} onChange={(v) => setLod({ lowSegments: Math.round(v) })} />
              <p className="text-[10px] text-slate-600">Distant terrain uses fewer segments; collision is unaffected. LOD pauses while sculpting.</p>
            </>
          )}
        </div>
      );
    })()}

    {/* Valley water */}
    {(() => {
      const w = t.water ?? {};
      const setWater = (p: Partial<NonNullable<typeof t.water>>) => setTerrain({ water: { ...w, ...p } });
      return (
        <div className="space-y-1 border-t border-slate-700/60 pt-1">
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input type="checkbox" checked={!!w.enabled} onChange={(e) => setWater({ enabled: e.target.checked })} className="accent-cyan-400" />
            <span className={lbl}>Valley water</span>
          </label>
          {w.enabled && (
            <>
              <Slider label="Water level" value={w.level ?? 0} min={-20} max={20} step={0.5} onChange={(v) => setWater({ level: v })} />
              <Slider label="Opacity" value={w.opacity ?? 0.6} min={0.1} max={1} step={0.05} onChange={(v) => setWater({ opacity: v })} />
              <ColorRow label="Water colour" value={w.color ?? '#2d6a8f'} onChange={(v) => setWater({ color: v })} />
            </>
          )}
        </div>
      );
    })()}
  </div>
);

export const EnvironmentEditorPanel = () => {
  const currentAreaId = usePlayerStore((s) => s.currentAreaId);
  const overrides = useEditorEnvironmentStore((s) => s.overrides);
  const defaultMode = useEditorEnvironmentStore((s) => s.defaultMode);
  const setOverride = useEditorEnvironmentStore((s) => s.setOverride);
  const resetArea = useEditorEnvironmentStore((s) => s.resetArea);
  const setDefaultMode = useEditorEnvironmentStore((s) => s.setDefaultMode);

  const areas = SEED_AREAS.map((a) => ({ id: a.id, name: a.name }));

  const [areaId, setAreaId] = useState<string>(currentAreaId);
  const env = resolveAreaEnvironment(areaId);
  const patch = (p: Parameters<typeof setOverride>[1]) => setOverride(areaId, p);

  return (
    <div className="space-y-3 text-xs">
      {/* Global default */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 p-2">
        <span className={lbl}>Global default</span>
        <div className="flex gap-1">
          {(['stableSky', 'dynamic'] as const).map((m) => (
            <button key={m} onClick={() => setDefaultMode(m)} className={`rounded px-2 py-1 text-[11px] ${defaultMode === m ? 'bg-cyan-600/40 text-cyan-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {m === 'stableSky' ? 'Stable Sky (recommended)' : 'Dynamic day/night'}
            </button>
          ))}
        </div>
      </div>

      {/* Area picker */}
      <div className="flex items-center gap-2">
        <span className={lbl}>Area</span>
        <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className={`flex-1 ${inp}`}>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.name}{a.id === currentAreaId ? ' ◀ here' : ''}</option>)}
        </select>
        {overrides[areaId] ? <span className="rounded bg-emerald-700/30 px-1.5 py-0.5 text-[10px] text-emerald-200">overridden</span> : <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">default</span>}
      </div>
      {env.isIndoor && <p className="rounded bg-amber-900/30 px-2 py-1 text-[11px] text-amber-200">This is an indoor area — it keeps its own interior look (no sky). Settings below have limited effect.</p>}

      {/* Terrain tools — ALWAYS at the top of the panel so they're reachable any time. */}
      {!env.isIndoor && (
        <div className="rounded-lg border border-cyan-700/40 bg-slate-900/60 p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className={lbl}>🏔 Terrain tools</span>
            <div className="flex gap-1">
              {env.groundType !== 'heightfield' && (
                <button onClick={() => patch({ groundType: 'heightfield' })} className="rounded-md border border-cyan-700/50 bg-cyan-700/25 px-2 py-0.5 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-700/35">Enable heightfield</button>
              )}
              <button
                onClick={() => patch({ groundType: 'heightfield', terrain: { ...env.terrain, amplitude: 0, flattenRadius: 0, heightmapAmplitude: 0, splat: { ...env.terrain.splat, enabled: true, layers: env.terrain.splat?.layers?.length ? env.terrain.splat.layers : [{ repeat: 8 }] } } })}
                title="Flat walkable ground with per-region splat materials"
                className="rounded-md border border-amber-700/50 bg-amber-700/25 px-2 py-0.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-700/35"
              >Flat ground + regions</button>
            </div>
          </div>
          <TerrainToolsBar layerCount={(env.terrain.splat?.layers ?? []).length} onResetSculpt={() => patch({ terrain: { ...env.terrain, sculpt: undefined } })} />
          {env.groundType !== 'heightfield' && (
            <p className="mt-1 text-[10px] leading-relaxed text-amber-300/80">Ground is not Heightfield yet — click <b>Enable heightfield</b> above, then sculpt.</p>
          )}
        </div>
      )}

      {/* Placeable PBR patches — near the top so they're easy to reach. */}
      {!env.isIndoor && <PbrPatchControls patches={env.pbrPatches} setPatches={(p) => patch({ pbrPatches: p })} />}

      {/* Background mode */}
      <div>
        <span className={lbl}>Background</span>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {BG_MODES.map((m) => (
            <button key={m.id} onClick={() => patch({ backgroundMode: m.id })} className={`rounded px-2 py-1 text-[11px] ${env.backgroundMode === m.id ? 'bg-cyan-600/40 text-cyan-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{m.label}</button>
          ))}
        </div>
      </div>

      {/* Sky controls */}
      {env.backgroundMode === 'sky' && (
        <div className="space-y-1 rounded-lg border border-slate-700 bg-slate-900/40 p-2">
          <span className={lbl}>Sky</span>
          <Slider label="Sun elevation°" value={env.sunElevationDeg} min={-5} max={90} step={1} onChange={(v) => patch({ sunElevationDeg: v })} />
          <Slider label="Sun azimuth°" value={env.sunAzimuthDeg} min={0} max={360} step={1} onChange={(v) => patch({ sunAzimuthDeg: v })} />
          <Slider label="Turbidity" value={env.turbidity} min={0} max={20} step={0.5} onChange={(v) => patch({ turbidity: v })} />
          <Slider label="Rayleigh" value={env.rayleigh} min={0} max={4} step={0.1} onChange={(v) => patch({ rayleigh: v })} />
        </div>
      )}

      {/* Gradient controls */}
      {env.backgroundMode === 'gradient' && (
        <div className="space-y-1 rounded-lg border border-slate-700 bg-slate-900/40 p-2">
          <span className={lbl}>Gradient</span>
          <ColorRow label="Top" value={env.gradientTop} onChange={(v) => patch({ gradientTop: v })} />
          <ColorRow label="Bottom" value={env.gradientBottom} onChange={(v) => patch({ gradientBottom: v })} />
        </div>
      )}

      {/* Solid control */}
      {env.backgroundMode === 'solid' && (
        <div className="space-y-1 rounded-lg border border-slate-700 bg-slate-900/40 p-2">
          <span className={lbl}>Solid colour</span>
          <ColorRow label="Background" value={env.solidColor} onChange={(v) => patch({ solidColor: v })} />
        </div>
      )}

      {/* Locked time-of-day */}
      <div className="flex items-center gap-2">
        <span className={lbl}>Lock time</span>
        <select value={env.lockTimeOfDay} onChange={(e) => patch({ lockTimeOfDay: e.target.value as LockTime })} className={inp}>
          {LOCK_TIMES.map((t) => <option key={t} value={t}>{t === 'none' ? 'follow clock' : t}</option>)}
        </select>
        <span className="text-[10px] text-slate-500">pin lighting so it never darkens</span>
      </div>

      {/* Fog */}
      <div className="space-y-1 rounded-lg border border-slate-700 bg-slate-900/40 p-2">
        <label className="flex items-center gap-2 text-[11px] text-slate-300">
          <input type="checkbox" checked={env.fogEnabled} onChange={(e) => patch({ fogEnabled: e.target.checked })} className="accent-cyan-400" />
          <span className={lbl}>Fog enabled</span>
        </label>
        {env.fogEnabled && (
          <>
            <ColorRow label="Fog colour" value={env.fogColor ?? env.gradientBottom} onChange={(v) => patch({ fogColor: v })} />
            <Slider label="Fog near" value={env.fogNear ?? 60} min={0} max={400} step={1} onChange={(v) => patch({ fogNear: v })} />
            <Slider label="Fog far" value={env.fogFar ?? 185} min={10} max={800} step={1} onChange={(v) => patch({ fogFar: v })} />
          </>
        )}
      </div>

      {/* Lighting + ground */}
      <div className="space-y-1 rounded-lg border border-slate-700 bg-slate-900/40 p-2">
        <span className={lbl}>Lighting & ground</span>
        <Slider label="Ambient ×" value={env.ambientIntensity ?? 1} min={0} max={2} step={0.05} onChange={(v) => patch({ ambientIntensity: v })} />
        <Slider label="Directional ×" value={env.directionalIntensity ?? 1} min={0} max={2} step={0.05} onChange={(v) => patch({ directionalIntensity: v })} />
        <ColorRow label="Ground catch" value={env.groundCatchColor} onChange={(v) => patch({ groundCatchColor: v })} />
      </div>

      {/* Ground surface (Phase 98b) */}
      <div className="space-y-1 rounded-lg border border-slate-700 bg-slate-900/40 p-2">
        <span className={lbl}>Ground surface</span>
        <div className="grid grid-cols-2 gap-1">
          {GROUND_TYPES.map((t) => (
            <button key={t.id} onClick={() => patch({ groundType: t.id })} className={`rounded px-2 py-1 text-[11px] ${env.groundType === t.id ? 'bg-cyan-600/40 text-cyan-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{t.label}</button>
          ))}
        </div>
        {env.groundType === 'flatPbr' && (
          <PbrSurfaceControls pg={env.pbrGround} setPg={(p) => patch({ pbrGround: { ...env.pbrGround, ...p } })} />
        )}
        {env.groundType === 'heightfield' && (
          <>
            <TerrainControls t={env.terrain} setTerrain={(p) => patch({ terrain: { ...env.terrain, ...p } })} />
            <PbrSurfaceControls pg={env.pbrGround} setPg={(p) => patch({ pbrGround: { ...env.pbrGround, ...p } })} />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={() => patch({ ...DEFAULT_STABLE_OVERRIDE })} className="flex-1 rounded-md border border-cyan-700/50 bg-cyan-700/20 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-700/30">☀ Apply stable preset</button>
        <button onClick={() => resetArea(areaId)} className="flex-1 rounded-md border border-red-700/50 bg-red-700/20 px-3 py-1.5 text-[11px] font-semibold text-red-100 hover:bg-red-700/30">↺ Reset this area</button>
      </div>
      <p className="text-[10px] leading-relaxed text-slate-600">Changes apply live to the current scene (and preview in Edit Mode). Stored per area + saved with project export / data folder. Indoor areas keep their interior look. Use "Global default → Dynamic" to revert all un-overridden areas to the original day/night cycle.</p>
    </div>
  );
};
