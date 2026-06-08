import { useEffect, useRef, useState } from 'react';
import { useUiStore } from '../stores/uiStore';
import { EnvironmentEditorPanel } from './editor/EnvironmentEditorPanel';
import { NpcEditorTab } from './editor/NpcEditorTab';
import { QuestEditorTab } from './editor/QuestEditorTab';
import { TriggerEditorTab } from './editor/TriggerEditorTab';
import { ProjectTab } from './editor/ProjectTab';
import { DebugTab } from './editor/DebugTab';
import { EncounterEditorTab } from './editor/EncounterEditorTab';

// Assets is a SEPARATE panel (left-centre) — not a hub tab — to match the original layout.
type Tab = 'debug' | 'trigger' | 'encounter' | 'project' | 'npc' | 'quest' | 'environment';
const TABS: { id: Tab; label: string }[] = [
  { id: 'debug', label: '🧪 Debug' },
  { id: 'trigger', label: '⚡ Triggers' },
  { id: 'encounter', label: '⚔ Encounters' },
  { id: 'project', label: '📦 Project' },
  { id: 'npc', label: '🧑 NPC / Dialogue' },
  { id: 'quest', label: '📜 Quest / Item' },
  { id: 'environment', label: '🌤 Environment' },
];

// Kit — the tabbed Editor Hub (opens centred, free-move via the header, free-resize via the CSS handle).
// Translucent so it doesn't block the scene. (The Assets palette is a separate left-centre panel.)
export const EditorHubPanel = () => {
  const close = useUiStore((s) => s.toggleEditorHub);
  const [tab, setTab] = useState<Tab>('debug');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1); // hub zoom (60%–200%)
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => { const d = dragRef.current; if (d) setPos({ x: e.clientX - d.ox, y: e.clientY - d.oy }); };
    const up = () => { dragRef.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, []);
  const onHeaderDown = (e: React.PointerEvent) => {
    const el = (e.currentTarget as HTMLElement).closest('[data-hub]') as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = { ox: e.clientX - r.left, oy: e.clientY - r.top };
    if (!pos) setPos({ x: r.left, y: r.top });
  };

  return (
    <div
      data-hub
      style={{
        left: pos ? pos.x : '50%',
        top: pos ? pos.y : '50%',
        transform: pos ? `scale(${scale})` : `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: pos ? 'top left' : 'center',
      }}
      className="pointer-events-auto absolute z-[80] flex h-[80vh] max-h-[96vh] min-h-[18rem] w-[48rem] min-w-[22rem] max-w-[98vw] resize overflow-hidden rounded-2xl border border-violet-700/50 bg-slate-950/75 text-slate-100 shadow-2xl backdrop-blur-md"
    >
      <div className="flex w-44 shrink-0 flex-col border-r border-slate-800/60 bg-slate-900/40 p-2">
        <div className="mb-2 flex items-center justify-between gap-1">
          <span onPointerDown={onHeaderDown} className="cursor-move select-none px-1 pt-1 text-sm font-bold text-violet-100" title="Drag to move">⚙ Hub <span className="text-[9px] font-normal text-slate-500">⠿</span></span>
          <div className="flex items-center gap-0.5 text-slate-400">
            <button onClick={() => setScale((s) => Math.max(0.6, Math.round((s - 0.1) * 100) / 100))} title="Smaller" className="rounded px-1 text-sm hover:bg-slate-800">−</button>
            <span className="w-8 text-center text-[10px] text-slate-500">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.min(2, Math.round((s + 0.1) * 100) / 100))} title="Bigger" className="rounded px-1 text-sm hover:bg-slate-800">+</button>
          </div>
        </div>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`mb-0.5 rounded-lg px-3 py-2 text-left text-xs font-semibold ${tab === t.id ? 'bg-violet-600/30 text-violet-100' : 'text-slate-300 hover:bg-slate-800'}`}>{t.label}</button>
        ))}
        <div className="mt-auto px-1 pt-2 text-[10px] leading-relaxed text-slate-600">Assets palette is at the left · Inspector top-left. Drop assets into src/assets/ or public/.</div>
      </div>
      <div className="relative min-w-0 flex-1 overflow-auto p-4 pr-10">
        <button onClick={close} aria-label="Close" className="absolute right-3 top-3 z-10 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
        {tab === 'debug' ? <DebugTab /> : tab === 'trigger' ? <TriggerEditorTab /> : tab === 'encounter' ? <EncounterEditorTab /> : tab === 'project' ? <ProjectTab /> : tab === 'npc' ? <NpcEditorTab /> : tab === 'quest' ? <QuestEditorTab /> : <EnvironmentEditorPanel />}
      </div>
    </div>
  );
};
