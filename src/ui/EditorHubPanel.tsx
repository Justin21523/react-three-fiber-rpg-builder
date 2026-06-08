import { useEffect, useRef, useState } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useWorldClockStore, formatClock } from '../stores/worldClockStore';
import { useAudioStore } from '../stores/audioStore';
import { EnvironmentEditorPanel } from './editor/EnvironmentEditorPanel';
import { NpcEditorTab } from './editor/NpcEditorTab';
import { QuestEditorTab } from './editor/QuestEditorTab';

// Assets is a SEPARATE panel (left-centre) — not a hub tab — to match the original layout.
type Tab = 'environment' | 'npc' | 'quest' | 'sim';
const TABS: { id: Tab; label: string }[] = [
  { id: 'environment', label: '🌤 Environment' },
  { id: 'npc', label: '🧑 NPC / Dialogue' },
  { id: 'quest', label: '📜 Quest / Item' },
  { id: 'sim', label: '🕓 World' },
];

const SimTab = () => {
  const time = useWorldClockStore((s) => s.timeMinutes);
  const phase = useWorldClockStore((s) => s.timeOfDay);
  const weather = useWorldClockStore((s) => s.weather);
  const particlesEnabled = useAudioStore((s) => s.particlesEnabled);
  const density = useAudioStore((s) => s.particleDensity);
  return (
    <div className="space-y-3 text-sm">
      <h3 className="text-xs font-bold uppercase tracking-wider text-violet-300">World — {formatClock(time)} · {phase} · {weather}</h3>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => useWorldClockStore.getState().advanceTime()} className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700">⏭ Skip to next phase</button>
        <button onClick={() => useWorldClockStore.getState().cycleWeather()} className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700">🌧 Cycle weather</button>
        <button onClick={() => useAudioStore.getState().toggleParticles()} className={`rounded border px-3 py-1.5 text-xs ${particlesEnabled ? 'border-cyan-500/60 bg-cyan-900/40 text-cyan-100' : 'border-slate-600 bg-slate-800 hover:bg-slate-700'}`}>✨ Particles {particlesEnabled ? 'on' : 'off'}</button>
      </div>
      {particlesEnabled && (
        <label className="flex items-center gap-2 text-[11px] text-slate-400">
          Density
          <select value={density} onChange={(e) => useAudioStore.getState().setParticleDensity(e.target.value as 'low' | 'medium' | 'high')} className="rounded bg-slate-800 px-1.5 py-1 text-[11px] text-slate-100">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
      )}
      <p className="text-[11px] leading-relaxed text-slate-500">Day/night runs in real time; rain + night fireflies + per-biome motes show when particles are on. Pin a stable sky per area in the Environment tab.</p>
    </div>
  );
};

// Kit — the tabbed Editor Hub (opens centred, free-move via the header, free-resize via the CSS handle).
// Translucent so it doesn't block the scene. Holds the Environment/terrain, NPC/Dialogue, Quest/Item and
// World editors. (The Assets palette is a separate left-centre panel.)
export const EditorHubPanel = () => {
  const close = useUiStore((s) => s.toggleEditorHub);
  const [tab, setTab] = useState<Tab>('environment');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
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
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      className={`pointer-events-auto absolute z-[80] flex h-[80vh] max-h-[96vh] min-h-[18rem] w-[48rem] min-w-[22rem] max-w-[98vw] resize overflow-hidden rounded-2xl border border-violet-700/50 bg-slate-950/75 text-slate-100 shadow-2xl backdrop-blur-md ${pos ? '' : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}`}
    >
      <div className="flex w-44 shrink-0 flex-col border-r border-slate-800/60 bg-slate-900/40 p-2">
        <div onPointerDown={onHeaderDown} className="mb-2 cursor-move select-none px-2 pt-1 text-sm font-bold text-violet-100" title="Drag to move">⚙ Editor Hub <span className="text-[9px] font-normal text-slate-500">⠿</span></div>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`mb-0.5 rounded-lg px-3 py-2 text-left text-xs font-semibold ${tab === t.id ? 'bg-violet-600/30 text-violet-100' : 'text-slate-300 hover:bg-slate-800'}`}>{t.label}</button>
        ))}
        <div className="mt-auto px-1 pt-2 text-[10px] leading-relaxed text-slate-600">Assets palette is at the left · Inspector top-left. Drop assets into src/assets/ or public/.</div>
      </div>
      <div className="relative min-w-0 flex-1 overflow-auto p-4 pr-10">
        <button onClick={close} aria-label="Close" className="absolute right-3 top-3 z-10 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
        {tab === 'environment' ? <EnvironmentEditorPanel /> : tab === 'npc' ? <NpcEditorTab /> : tab === 'quest' ? <QuestEditorTab /> : <SimTab />}
      </div>
    </div>
  );
};
