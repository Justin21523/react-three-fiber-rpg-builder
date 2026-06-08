import { useState } from 'react';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { usePlayerStore } from '../../stores/playerStore';
import type { EditorTriggerDisplayMode } from '../../types/editorTrigger';
import { TRIGGER_COLOR } from '../../types/editorTrigger';
import { TriggerPalettePanel } from './TriggerPalettePanel';
import { TriggerInspector } from './TriggerInspector';

const MODES: EditorTriggerDisplayMode[] = ['box', 'marker', 'debug'];

// Kit — the ⚡ Triggers tab: type palette + trigger list (left) + inspector (right). A display-mode
// switch toggles how triggers render in the viewport (box / marker / debug with ✓/✗ reasons).
export const TriggerEditorTab = () => {
  const triggers = useEditorTriggerStore((s) => s.triggers);
  const selId = useEditorTriggerStore((s) => s.selectedTriggerId);
  const selectTrigger = useEditorTriggerStore((s) => s.selectTrigger);
  const displayMode = useEditorTriggerStore((s) => s.displayMode);
  const setDisplayMode = useEditorTriggerStore((s) => s.setDisplayMode);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  const [scope, setScope] = useState<'area' | 'all'>('area');
  const sel = triggers.find((t) => t.id === selId) ?? null;
  const list = scope === 'area' ? triggers.filter((t) => t.zoneId === areaId) : triggers;

  return (
    <div className="flex gap-3 text-xs">
      <div className="w-48 shrink-0 space-y-2">
        <TriggerPalettePanel onPlaced={selectTrigger} />
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400">Show:</span>
          {MODES.map((m) => (
            <button key={m} onClick={() => setDisplayMode(m)} className={`rounded px-1.5 py-0.5 text-[10px] ${displayMode === m ? 'bg-sky-600/40 text-sky-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{m}</button>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="font-bold uppercase tracking-wider">Triggers</span>
          <button onClick={() => setScope(scope === 'area' ? 'all' : 'area')} className="rounded bg-slate-800 px-1.5 py-0.5 hover:bg-slate-700">{scope === 'area' ? `this area (${list.length})` : `all (${list.length})`}</button>
        </div>
        <div className="max-h-[50vh] space-y-0.5 overflow-y-auto">
          {list.map((t) => (
            <button key={t.id} onClick={() => selectTrigger(t.id)} className={`flex w-full items-center gap-1.5 truncate rounded px-2 py-1 text-left ${selId === t.id ? 'bg-sky-600/30 text-sky-100' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color ?? TRIGGER_COLOR[t.triggerType] }} />
              <span className="truncate">{t.displayName || t.triggerType}</span>
            </button>
          ))}
          {list.length === 0 && <p className="px-1 text-[10px] text-slate-500">No triggers here — pick a type and place one.</p>}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        {sel ? <TriggerInspector trigger={sel} /> : <p className="text-[11px] text-slate-500">Select or place a trigger to edit it.</p>}
      </div>
    </div>
  );
};
