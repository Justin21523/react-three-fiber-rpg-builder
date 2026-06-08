import { usePlayerStore } from '../../stores/playerStore';
import { SEED_AREAS, getKitArea } from '../../data/areas';
import { PanelCard, closePanel } from './playShared';

// Kit — play-mode 🗺 Map: every area as a card with its connections; the current area is highlighted and
// connected areas have a Travel button (teleports the player + requests a spawn there).
export const MapPanel = () => {
  const current = usePlayerStore((s) => s.currentAreaId);
  const travel = (id: string) => {
    const sp = getKitArea(id)?.spawnPoint ?? { x: 0, y: 3, z: 0 };
    usePlayerStore.getState().travelToArea(id, sp);
    closePanel();
  };
  return (
    <PanelCard title="World Map" icon="🗺" onClose={closePanel} width="26rem">
      <div className="space-y-2">
        {SEED_AREAS.map((a) => {
          const here = a.id === current;
          const connected = (getKitArea(current)?.connectedAreaIds ?? []).includes(a.id);
          return (
            <div key={a.id} className={`rounded-lg border p-2 ${here ? 'border-cyan-500/60 bg-cyan-950/30' : 'border-slate-700/60 bg-slate-900/50'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">{here ? '📍 ' : ''}{a.name}</span>
                <span className="text-[10px] text-slate-500">{a.ambientTheme}</span>
                <div className="ml-auto">
                  {here ? <span className="rounded bg-cyan-600/40 px-2 py-0.5 text-[10px] text-cyan-100">You are here</span>
                    : connected ? <button onClick={() => travel(a.id)} className="rounded bg-emerald-600/70 px-2 py-0.5 text-[10px] text-white hover:bg-emerald-500">Travel →</button>
                      : <span className="text-[10px] text-slate-600">not connected</span>}
                </div>
              </div>
              <div className="mt-1 text-[10px] text-slate-400">↔ {(a.connectedAreaIds ?? []).map((c) => getKitArea(c)?.name ?? c).join(', ') || '—'}</div>
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
};
