import { useState } from 'react';
import { useSaveStore } from '../../stores/saveStore';
import { PanelCard, closePanel } from './playShared';

// Kit — play-mode 💾 Save / Load: named slots persisted to localStorage. Save (new / overwrite), load,
// delete. Snapshots player/progression/inventory/flags/quests via saveStore.
export const SaveSlotsPanel = () => {
  const slots = useSaveStore((s) => s.slots);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const save = () => { const n = name.trim() || `Save ${slots.length + 1}`; useSaveStore.getState().saveToSlot(n); setName(''); setMsg(`Saved "${n}".`); };
  return (
    <PanelCard title="Save / Load" icon="💾" onClose={closePanel} width="24rem">
      <div className="mb-2 flex gap-1">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="slot name…" className="flex-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100" />
        <button onClick={save} className="rounded bg-emerald-600/80 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500">💾 Save</button>
      </div>
      {msg && <p className="mb-2 text-[11px] text-emerald-300">{msg}</p>}
      {slots.length === 0 ? (
        <p className="text-xs text-slate-500">No saves yet.</p>
      ) : (
        <ul className="space-y-1">
          {slots.map((s) => (
            <li key={s.name} className="flex items-center gap-2 rounded bg-slate-900/60 px-2 py-1 text-xs">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-200">{s.name}</div>
                <div className="text-[10px] text-slate-500">Lv {s.data.progression.level} · {s.data.player.currentAreaId} · {new Date(s.savedAt).toLocaleString()}</div>
              </div>
              <button onClick={() => { useSaveStore.getState().loadSlot(s.name); setMsg(`Loaded "${s.name}".`); }} className="rounded bg-cyan-600/70 px-2 py-1 text-[11px] text-white hover:bg-cyan-500">Load</button>
              <button onClick={() => useSaveStore.getState().saveToSlot(s.name)} title="Overwrite" className="rounded bg-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-600">⟳</button>
              <button onClick={() => useSaveStore.getState().deleteSlot(s.name)} className="rounded bg-red-700/50 px-2 py-1 text-[11px] text-red-100 hover:bg-red-700/70">🗑</button>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
};
