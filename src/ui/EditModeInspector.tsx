import { useCallback, useState } from 'react';
import { useSceneEditStore, buildOverridesFile, countEditsForArea, type GizmoMode } from '../stores/sceneEditStore';
import { usePlayerStore } from '../stores/playerStore';
import { defaultCollisionForKind, defaultCollisionShapeForKind, type CollisionShape, type EditKind, type Vec3 } from '../game/edit/sceneEditMerge';

const COLLISION_KINDS = new Set(['setpiece', 'groundtile', 'decoration', 'scatter', 'regional', 'landmark', 'prop', 'building', 'structure']);

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

// Kit — DOM inspector for Edit Mode (F1): the panel-style numeric transform (two-way with the 3D gizmo),
// mode switch, collision toggle, dup/delete/reset, undo, and Save-to-file (bake placements into
// sceneEditOverrides.ts). Sits top-left; translucent so it never blocks the view.
const NumRow = ({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div className="flex items-center gap-2">
    <span className="w-14 shrink-0 text-[11px] text-slate-300">{label}</span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="h-1 flex-1 accent-violet-500" />
    <input type="number" step={step} value={Math.round(value * 1000) / 1000} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="w-16 shrink-0 rounded bg-slate-800/80 px-1.5 py-0.5 text-right text-[11px] text-slate-100" />
  </div>
);

export const EditModeInspector = () => {
  const selectedKey = useSceneEditStore((s) => s.selectedKey);
  const selectedObject = useSceneEditStore((s) => s.selectedObject);
  const override = useSceneEditStore((s) => (s.selectedKey ? s.overrides[s.selectedKey] : undefined));
  const mode = useSceneEditStore((s) => s.mode);
  const setMode = useSceneEditStore((s) => s.setMode);
  const setOverride = useSceneEditStore((s) => s.setOverride);
  const resetKey = useSceneEditStore((s) => s.resetKey);
  const resetAll = useSceneEditStore((s) => s.resetAll);
  const clearSelection = useSceneEditStore((s) => s.clearSelection);
  const duplicateSelected = useSceneEditStore((s) => s.duplicateSelected);
  const deleteSelected = useSceneEditStore((s) => s.deleteSelected);
  const extraCount = useSceneEditStore((s) => s.extraSelected.length);
  const pushHistory = useSceneEditStore((s) => s.pushHistory);
  const undo = useSceneEditStore((s) => s.undo);
  const canUndo = useSceneEditStore((s) => s.history.length > 0);
  const inspectorScale = useSceneEditStore((s) => s.inspectorScale);
  const setInspectorScale = useSceneEditStore((s) => s.setInspectorScale);
  const selectedAssetId = useSceneEditStore((s) => s.selectedAssetId);
  const extraHasAsset = useSceneEditStore((s) => s.extraSelected.some((e) => !!e.assetId));
  const areaId = usePlayerStore((s) => s.currentAreaId);
  const areaCount = useSceneEditStore((s) => countEditsForArea(areaId, s));
  const [collapsed, setCollapsed] = useState(false);

  const o = selectedObject;
  const position: Vec3 = override?.position ?? (o ? [o.position.x, o.position.y, o.position.z] : [0, 0, 0]);
  const rotation: Vec3 = override?.rotation ?? (o ? [o.rotation.x, o.rotation.y, o.rotation.z] : [0, 0, 0]);
  const scale: number = override?.scale ?? (o ? o.scale.x : 1);

  const patch = (next: { position?: Vec3; rotation?: Vec3; scale?: number }) => {
    if (!selectedKey) return;
    pushHistory();
    setOverride(selectedKey, { position, rotation, scale, ...next });
  };

  const saveToFile = useCallback(() => {
    const text = buildOverridesFile();
    try { void navigator.clipboard?.writeText(text); } catch { /* ignore */ }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sceneEditOverrides.ts'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const [, kind, idx] = selectedKey ? selectedKey.split('#') : ['', '', ''];
  const canDuplicate = !!selectedAssetId || extraHasAsset;
  const posRange = 60;

  return (
    <div
      style={{ transform: `scale(${inspectorScale})`, transformOrigin: 'top right' }}
      className="pointer-events-auto absolute right-3 top-3 z-[70] max-h-[92vh] w-96 overflow-y-auto rounded-xl border border-violet-700/50 bg-slate-950/90 p-3 text-[11px] text-slate-100 shadow-2xl backdrop-blur-sm"
    >
      <div className="mb-2 flex items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-violet-600 px-2 py-0.5 text-[11px] font-bold text-white">✎ EDIT</span>
          <span className="truncate text-[11px] text-slate-400">{areaId} · {areaCount}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setInspectorScale(inspectorScale - 0.1)} title="Smaller" className="rounded px-1 text-[11px] text-slate-400 hover:bg-slate-800">−</button>
          <span className="w-7 text-center text-[11px] text-slate-300">{Math.round(inspectorScale * 100)}%</span>
          <button onClick={() => setInspectorScale(inspectorScale + 0.1)} title="Bigger" className="rounded px-1 text-[11px] text-slate-400 hover:bg-slate-800">+</button>
          <button onClick={() => setCollapsed((c) => !c)} title="Collapse / expand" className="rounded px-1 text-[11px] text-slate-400 hover:bg-slate-800">{collapsed ? '▸' : '▾'}</button>
        </div>
      </div>

      {collapsed ? null : !selectedKey ? (
        <p className="py-5 text-center text-sm text-slate-400">
          Click any object to select it.<br />
          <span className="text-[11px] text-slate-300">drag: orbit · right-drag: pan · wheel: zoom</span>
        </p>
      ) : (
        <div className="space-y-3">
          <div className="rounded bg-slate-900/60 px-2 py-1.5 text-[11px]">
            <span className="font-semibold text-violet-200">{kind}</span>
            <span className="text-slate-300"> · {idx}</span>
            {extraCount > 0 && <span className="ml-2 rounded bg-cyan-600/30 px-1.5 py-0.5 text-[11px] font-semibold text-cyan-200">+{extraCount} more</span>}
          </div>

          {COLLISION_KINDS.has(kind) && (() => {
            const eff = override?.collision ?? defaultCollisionForKind(kind as EditKind);
            const shape = override?.collisionShape ?? defaultCollisionShapeForKind(kind as EditKind);
            return (
              <div className="space-y-1.5">
                <button onClick={() => { if (selectedKey) { pushHistory(); setOverride(selectedKey, { collision: !eff }); } }} className={`w-full rounded px-2 py-1 text-[11px] font-semibold ${eff ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>🧱 Collision: {eff ? 'ON' : 'OFF'}</button>
                {eff && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-14 shrink-0 text-[11px] text-slate-300">Shape</span>
                    <select value={shape} onChange={(e) => { if (selectedKey) { pushHistory(true); setOverride(selectedKey, { collisionShape: e.target.value as CollisionShape }); } }} className="flex-1 rounded bg-slate-800/80 px-1.5 py-0.5 text-[11px] text-slate-100">
                      <option value="trimesh">trimesh (exact)</option>
                      <option value="hull">hull (convex)</option>
                      <option value="cuboid">cuboid (box)</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex gap-1.5">
            {(['translate', 'rotate', 'scale'] as GizmoMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded px-2 py-1 text-[11px] font-semibold ${mode === m ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                {m === 'translate' ? 'Move (W)' : m === 'rotate' ? 'Rotate (E)' : 'Scale (R)'}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <NumRow label="Pos X" value={position[0]} min={-posRange} max={posRange} step={0.1} onChange={(v) => patch({ position: [v, position[1], position[2]] })} />
            <NumRow label="Pos Y" value={position[1]} min={-posRange} max={posRange} step={0.1} onChange={(v) => patch({ position: [position[0], v, position[2]] })} />
            <NumRow label="Pos Z" value={position[2]} min={-posRange} max={posRange} step={0.1} onChange={(v) => patch({ position: [position[0], position[1], v] })} />
            <NumRow label="Rot Y°" value={rotation[1] * RAD2DEG} min={-180} max={180} step={1} onChange={(v) => patch({ rotation: [rotation[0], v * DEG2RAD, rotation[2]] })} />
            <NumRow label="Scale" value={scale} min={0.05} max={10} step={0.05} onChange={(v) => patch({ scale: v })} />
          </div>

          <div className="flex gap-1.5">
            <button onClick={duplicateSelected} disabled={!canDuplicate} className="flex-1 rounded border border-emerald-700/50 bg-emerald-700/15 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-700/25 disabled:opacity-40">⧉ Dup</button>
            <button onClick={deleteSelected} className="flex-1 rounded border border-red-700/50 bg-red-700/15 px-2 py-1 text-[11px] text-red-200 hover:bg-red-700/25">🗑 Del{extraCount > 0 ? ` (${extraCount + 1})` : ''}</button>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => { if (selectedKey) resetKey(selectedKey); }} className="flex-1 rounded border border-slate-700 bg-slate-800/50 px-2 py-1 text-[11px] hover:bg-slate-800">Reset</button>
            <button onClick={clearSelection} className="flex-1 rounded border border-slate-700 bg-slate-800/50 px-2 py-1 text-[11px] hover:bg-slate-800">Deselect</button>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="mt-3 flex gap-1.5 border-t border-slate-800 pt-3">
          <button onClick={undo} disabled={!canUndo} className="rounded-md border border-slate-600 bg-slate-800/60 px-2 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700 disabled:opacity-40">↶ Undo</button>
          <button onClick={saveToFile} className="flex-1 rounded-md border border-cyan-700/50 bg-cyan-700/15 px-2 py-1.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-700/25">💾 Save to file</button>
          <button onClick={() => { if (window.confirm('Reset ALL in-game edits back to authored positions?')) { resetAll(); clearSelection(); } }} className="rounded-md border border-amber-700/50 bg-amber-700/15 px-2 py-1.5 text-[11px] text-amber-200 hover:bg-amber-700/25">Reset All</button>
        </div>
      )}
    </div>
  );
};
