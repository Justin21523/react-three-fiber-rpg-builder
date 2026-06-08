import { useInventoryStore } from '../../stores/inventoryStore';
import { getItem } from '../../data/items';
import { PanelCard, closePanel } from './playShared';

// Kit — play-mode 🎒 Inventory: lists held items (id → quantity) with icon/name from the item registry.
export const InventoryPanel = () => {
  const items = useInventoryStore((s) => s.items);
  const entries = Object.entries(items).filter(([, q]) => q > 0);
  return (
    <PanelCard title="Inventory" icon="🎒" onClose={closePanel}>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-500">Empty. Pick up items in the world (▢E) or via quest rewards.</p>
      ) : (
        <ul className="space-y-1">
          {entries.map(([id, qty]) => {
            const it = getItem(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded bg-slate-900/60 px-2 py-1 text-xs">
                <span className="text-base">{it?.icon ?? '📦'}</span>
                <span className="flex-1 text-slate-200">{it?.name ?? id}</span>
                <span className="font-mono text-slate-400">×{qty}</span>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
};
