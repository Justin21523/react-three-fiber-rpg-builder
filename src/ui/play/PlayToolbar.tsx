import { useUiStore } from '../../stores/uiStore';
import type { PanelId } from '../../stores/uiStore';
import { MiniMapHUD } from './MiniMapHUD';
import { MapPanel } from './MapPanel';
import { InventoryPanel } from './InventoryPanel';
import { SaveSlotsPanel } from './SaveSlotsPanel';
import { ContentFilesPanel } from './ContentFilesPanel';
import { HintsPanel } from './HintsPanel';

// Kit — play-mode tool toolbar (bottom-centre): small-icon launchers for Map / Inventory / Save-Load /
// Content files / Hints, plus an always-on mini-map. De-yokai'd (no party/codex). Each button toggles its
// panel (one modal panel at a time via uiStore.activePanel; Hints uses its own flag).
const TOOLS: { id: PanelId; icon: string; label: string }[] = [
  { id: 'map', icon: '🗺', label: 'Map' },
  { id: 'inventory', icon: '🎒', label: 'Inventory' },
  { id: 'saveSlots', icon: '💾', label: 'Save / Load' },
  { id: 'contentFiles', icon: '📦', label: 'Content' },
];

export const PlayToolbar = () => {
  const active = useUiStore((s) => s.activePanel);
  const toggle = useUiStore((s) => s.togglePanel);
  const hintsVisible = useUiStore((s) => s.hintsVisible);
  const toggleHints = useUiStore((s) => s.toggleHints);

  return (
    <>
      <MiniMapHUD />

      {active === 'map' && <MapPanel />}
      {active === 'inventory' && <InventoryPanel />}
      {active === 'saveSlots' && <SaveSlotsPanel />}
      {active === 'contentFiles' && <ContentFilesPanel />}
      {hintsVisible && <HintsPanel />}

      <div className="pointer-events-auto absolute bottom-3 left-1/2 z-[76] flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-slate-700/50 bg-slate-950/60 px-2 py-1.5 shadow-2xl backdrop-blur-md">
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => toggle(t.id)} title={t.label} aria-label={t.label}
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${active === t.id ? 'bg-cyan-600/50 ring-1 ring-cyan-300/50' : 'bg-slate-800/70 hover:bg-slate-700'}`}>
            {t.icon}
          </button>
        ))}
        <div className="mx-0.5 h-6 w-px bg-slate-700/60" />
        <button onClick={toggleHints} title="Hints" aria-label="Hints"
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${hintsVisible ? 'bg-amber-500/40 ring-1 ring-amber-300/50' : 'bg-slate-800/70 hover:bg-slate-700'}`}>
          💡
        </button>
      </div>
    </>
  );
};
