import { usePlayerStore } from '../../stores/playerStore';
import { getKitArea } from '../../data/areas';

// Kit — always-on 🧭 mini-map HUD (top-right). Shows the current area + a compass dot for the player and
// the directions of connected-area gates. A lightweight schematic (not a rendered top-down view).
export const MiniMapHUD = () => {
  // Subscribe only to the area (NOT position — that updates every frame and would re-render this HUD each
  // frame). Shows the current area + its exits, a lightweight schematic.
  const areaId = usePlayerStore((s) => s.currentAreaId);
  const area = getKitArea(areaId);
  const exits = area?.connectedAreaIds ?? [];
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[70] w-40 rounded-xl border border-slate-700/50 bg-slate-950/60 p-2 text-slate-200 shadow-xl backdrop-blur-md">
      <div className="mb-1 flex items-center gap-1 text-[11px] font-bold text-cyan-100">🧭 {area?.name ?? areaId}</div>
      <div className="relative h-24 rounded-lg bg-slate-900/70">
        {/* player dot */}
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow" />
        {/* exits as edge chips */}
        {exits.map((id, i) => (
          <div key={id} className="absolute rounded bg-slate-800/90 px-1 text-[9px] text-amber-200" style={{ left: '50%', top: i === 0 ? '4px' : 'auto', bottom: i === 1 ? '4px' : 'auto', transform: 'translateX(-50%)' }}>
            ⇨ {getKitArea(id)?.name ?? id}
          </div>
        ))}
      </div>
    </div>
  );
};
