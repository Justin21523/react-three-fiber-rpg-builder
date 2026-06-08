import { useState } from 'react';
import { useEditorNpcStore } from '../../stores/editorNpcStore';
import { usePlayerStore } from '../../stores/playerStore';
import { NPCPalettePanel } from './NPCPalettePanel';
import { NPCInspector } from './NPCInspector';

// Kit — the 🧑 NPC / Dialogue tab: archetype palette + NPC list (left) and a full inspector (right),
// matching the original layout. NPCs/dialogue merge into the runtime live.
export const NpcEditorTab = () => {
  const npcs = useEditorNpcStore((s) => s.addedNpcs);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  const [selId, setSelId] = useState<string | null>(null);
  const [scope, setScope] = useState<'area' | 'all'>('area');
  const sel = npcs.find((n) => n.id === selId) ?? null;
  const list = scope === 'area' ? npcs.filter((n) => n.areaId === areaId) : npcs;

  return (
    <div className="flex gap-3 text-xs">
      <div className="w-48 shrink-0 space-y-2">
        <NPCPalettePanel onCreated={setSelId} />
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="font-bold uppercase tracking-wider">NPCs</span>
          <button onClick={() => setScope(scope === 'area' ? 'all' : 'area')} className="rounded bg-slate-800 px-1.5 py-0.5 hover:bg-slate-700">{scope === 'area' ? `this area (${list.length})` : `all (${list.length})`}</button>
        </div>
        <div className="max-h-[55vh] space-y-0.5 overflow-y-auto">
          {list.map((n) => (
            <button key={n.id} onClick={() => setSelId(n.id)} className={`flex w-full items-center gap-1.5 truncate rounded px-2 py-1 text-left ${selId === n.id ? 'bg-violet-600/30 text-violet-100' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: n.color }} />
              <span className="truncate">{n.displayName}</span>
            </button>
          ))}
          {list.length === 0 && <p className="px-1 text-[10px] text-slate-500">No NPCs here yet — pick an archetype and “Create NPC here”.</p>}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {sel ? <NPCInspector npc={sel} /> : <p className="text-[11px] text-slate-500">Select or create an NPC to edit it.</p>}
      </div>
    </div>
  );
};
