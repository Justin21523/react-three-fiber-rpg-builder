import { useState } from 'react';
import { exportDomainFile, importDomainFile } from '../../game/editor/editorContentRegistry';
import { downloadJson } from '../editor/downloadJson';
import { PanelCard, closePanel } from './playShared';

// Kit — play-mode 🗺 Map Export: download the world layout (scene placements + per-area environment) as
// JSON, or import one back. A focused subset of the full Content Files export (just the map domains).
const MAP_DOMAINS = [
  { id: 'sceneEdit', label: 'Scene placements' },
  { id: 'editorEnvironment', label: 'Environment / sky' },
];

export const MapExportPanel = () => {
  const [msg, setMsg] = useState<string | null>(null);
  const exportOne = (id: string, label: string) => { const f = exportDomainFile(id); if (f) { downloadJson(`r3f-rpg-${id}.json`, f); setMsg(`Exported ${label}.`); } };
  const importOne = async (id: string, file: File) => {
    try { const r = importDomainFile(JSON.parse(await file.text()), id); setMsg(r.ok ? `Imported ${id}.` : r.error ?? 'Import failed.'); }
    catch { setMsg('Invalid file.'); }
  };
  return (
    <PanelCard title="Map Export" icon="🗺" onClose={closePanel} width="22rem">
      <div className="space-y-2">
        {MAP_DOMAINS.map((d) => (
          <div key={d.id} className="flex items-center gap-2 rounded bg-slate-900/60 px-2 py-1.5 text-xs">
            <span className="flex-1 text-slate-200">{d.label}</span>
            <button onClick={() => exportOne(d.id, d.label)} className="rounded bg-violet-600/70 px-2 py-1 text-[11px] text-white hover:bg-violet-500">⬇</button>
            <label className="cursor-pointer rounded bg-slate-700 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-600">⬆
              <input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importOne(d.id, f); e.target.value = ''; }} />
            </label>
          </div>
        ))}
        {msg && <p className="text-[11px] text-cyan-300">{msg}</p>}
      </div>
    </PanelCard>
  );
};
