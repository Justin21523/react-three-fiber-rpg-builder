import type { ReactNode } from 'react';
import {
  Map as MapIcon, ScrollText, Backpack, Gauge, Settings, Save, Download, HelpCircle, HardDriveDownload, FileDown,
} from 'lucide-react';
import { useUiStore, type PanelId } from '../../stores/uiStore';
import { useSaveStore } from '../../stores/saveStore';
import { MiniMapHUD } from './MiniMapHUD';
import { MapPanel } from './MapPanel';
import { QuestsPanel } from './QuestsPanel';
import { InventoryPanel } from './InventoryPanel';
import { StatsPanel } from './StatsPanel';
import { SettingsPanel } from './SettingsPanel';
import { SaveSlotsPanel } from './SaveSlotsPanel';
import { ContentFilesPanel } from './ContentFilesPanel';
import { MapExportPanel } from './MapExportPanel';
import { HintsPanel } from './HintsPanel';

// Kit — faithful bottom icon Dock (mirrors the original lost-yokai Dock, de-yokai'd): grouped lucide-icon
// launchers for every play-mode panel, with tooltips + dividers, plus an always-on mini-map. CORE +
// Settings + Save/Saves/Hints, and a DEV group (Content Files / Map Export) shown only in dev builds.
const isDev = import.meta.env.DEV;
interface DockItem { id: PanelId; label: string; icon: ReactNode }

const CORE: DockItem[] = [
  { id: 'map', label: 'Map', icon: <MapIcon className="h-5 w-5" /> },
  { id: 'quests', label: 'Quests', icon: <ScrollText className="h-5 w-5" /> },
  { id: 'inventory', label: 'Items', icon: <Backpack className="h-5 w-5" /> },
  { id: 'stats', label: 'Stats', icon: <Gauge className="h-5 w-5" /> },
];
const SYSTEM: DockItem[] = [
  { id: 'graphics', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];
const DEV: DockItem[] = [
  { id: 'contentFiles', label: 'Content Files', icon: <HardDriveDownload className="h-5 w-5" /> },
  { id: 'mapExport', label: 'Map Export', icon: <FileDown className="h-5 w-5" /> },
];

const DockButton = ({ item, active, onClick }: { item: DockItem; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} title={item.label} aria-label={item.label}
    className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${active ? 'bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/60' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'}`}>
    {item.icon}
    <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-100 opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100">{item.label}</span>
  </button>
);
const IconAction = ({ label, icon, active, onClick }: { label: string; icon: ReactNode; active?: boolean; onClick: () => void }) => (
  <button onClick={onClick} title={label} aria-label={label}
    className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${active ? 'bg-amber-500/30 text-amber-200 ring-1 ring-amber-400/50' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'}`}>
    {icon}
    <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-100 opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100">{label}</span>
  </button>
);
const Divider = () => <span className="mx-1 h-7 w-px shrink-0 bg-white/10" />;

export const PlayToolbar = () => {
  const active = useUiStore((s) => s.activePanel);
  const togglePanel = useUiStore((s) => s.togglePanel);
  const hintsVisible = useUiStore((s) => s.hintsVisible);
  const toggleHints = useUiStore((s) => s.toggleHints);
  const renderGroup = (items: DockItem[]) => items.map((it) => <DockButton key={it.id} item={it} active={active === it.id} onClick={() => togglePanel(it.id)} />);

  return (
    <>
      <MiniMapHUD />

      {active === 'map' && <MapPanel />}
      {active === 'quests' && <QuestsPanel />}
      {active === 'inventory' && <InventoryPanel />}
      {active === 'stats' && <StatsPanel />}
      {active === 'graphics' && <SettingsPanel />}
      {active === 'saveSlots' && <SaveSlotsPanel />}
      {active === 'contentFiles' && <ContentFilesPanel />}
      {active === 'mapExport' && <MapExportPanel />}
      {hintsVisible && <HintsPanel />}

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-[76] -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-500/60 bg-slate-900/85 px-2 py-1.5 shadow-2xl backdrop-blur-md">
          {renderGroup(CORE)}
          <Divider />
          {renderGroup(SYSTEM)}
          <IconAction label="Quick Save" icon={<Save className="h-5 w-5" />} onClick={() => useSaveStore.getState().quickSave()} />
          <IconAction label="Saves" active={active === 'saveSlots'} icon={<Download className="h-5 w-5" />} onClick={() => togglePanel('saveSlots')} />
          <IconAction label="Hints" active={hintsVisible} icon={<HelpCircle className="h-5 w-5" />} onClick={toggleHints} />
          {isDev && (<><Divider />{renderGroup(DEV)}</>)}
        </div>
      </div>
    </>
  );
};
