import { useProgressionStore } from '../../stores/progressionStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { usePlayerStore } from '../../stores/playerStore';
import { PanelCard, closePanel } from './playShared';

// Kit — play-mode 📊 Stats: player level / exp (level curve = level×100) + distance travelled + item count.
const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-center justify-between rounded bg-slate-900/60 px-2 py-1 text-xs"><span className="text-slate-400">{k}</span><span className="font-mono text-slate-100">{v}</span></div>
);

export const StatsPanel = () => {
  const level = useProgressionStore((s) => s.level);
  const exp = useProgressionStore((s) => s.exp);
  const distance = usePlayerStore((s) => s.distanceTraveled);
  const itemCount = useInventoryStore((s) => Object.values(s.items).reduce((a, b) => a + b, 0));
  const needed = level * 100;
  const pct = Math.min(100, Math.round((exp / needed) * 100));
  return (
    <PanelCard title="Stats" icon="📊" onClose={closePanel} width="20rem">
      <div className="space-y-1">
        <Row k="Level" v={`${level}`} />
        <div className="rounded bg-slate-900/60 px-2 py-1 text-xs">
          <div className="mb-1 flex justify-between text-slate-400"><span>EXP</span><span className="font-mono text-slate-100">{exp} / {needed}</span></div>
          <div className="h-1.5 overflow-hidden rounded bg-slate-800"><div className="h-full bg-cyan-400" style={{ width: `${pct}%` }} /></div>
        </div>
        <Row k="Distance travelled" v={`${distance.toFixed(0)} m`} />
        <Row k="Items held" v={`${itemCount}`} />
      </div>
    </PanelCard>
  );
};
