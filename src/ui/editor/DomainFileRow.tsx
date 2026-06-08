import type { ChangeEvent } from 'react';
import { type EditorContentDomain, exportDomainFile, importDomainFile } from '../../game/editor/editorContentRegistry';
import { downloadJson } from './downloadJson';

// Kit — one row of the per-domain content tool: Export (its own JSON), Import (file → that domain), Reset.
export const DomainFileRow = ({ domain, onMsg }: { domain: EditorContentDomain; onMsg: (m: string) => void }) => {
  const doExport = () => {
    const file = exportDomainFile(domain.id);
    if (!file) return;
    downloadJson(`r3f-rpg-${domain.id}.json`, file);
    onMsg(`⬇ Exported "${domain.label}" → r3f-rpg-${domain.id}.json (also copied).`);
  };
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((text) => {
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { onMsg('❌ Failed to parse JSON.'); return; }
      const r = importDomainFile(parsed, domain.id);
      onMsg(r.ok ? `✅ Imported "${domain.label}".` : `❌ ${r.error}`);
    }).catch(() => onMsg('❌ Failed to read file.'));
    e.target.value = '';
  };
  return (
    <div className="flex items-center gap-2 rounded bg-slate-900/50 px-2 py-1.5 text-xs">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-200">{domain.label}</div>
        <div className="truncate text-[10px] text-slate-500">{domain.summary()}</div>
      </div>
      <button onClick={doExport} title="Export this domain to its own file" className="rounded-md border border-violet-600/50 bg-violet-600/20 px-2 py-1 font-semibold text-violet-100 hover:bg-violet-600/35">⬇</button>
      <label title="Import this domain from a file" className="cursor-pointer rounded-md border border-emerald-700/50 bg-emerald-700/20 px-2 py-1 font-semibold text-emerald-100 hover:bg-emerald-700/30">
        ⬆<input type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
      </label>
      <button onClick={() => { if (window.confirm(`Reset "${domain.label}"?`)) { domain.clear(); onMsg(`Reset ${domain.label}.`); } }} className="rounded-md border border-slate-600 bg-slate-800/70 px-2 py-1 text-slate-200 hover:bg-slate-700">Reset</button>
    </div>
  );
};
