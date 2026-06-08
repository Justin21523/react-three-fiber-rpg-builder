import { useState, type ReactNode, type ChangeEvent } from 'react';
import { EDITOR_CONTENT_DOMAINS, exportEditorProject, importEditorProject, clearEditorContent, exportDomainFile } from '../../game/editor/editorContentRegistry';
import { DomainFileRow } from './DomainFileRow';
import { downloadJson } from './downloadJson';

// Kit — 📦 Project / IO tab: one-click Export / Import of the WHOLE editor project (all content domains)
// as a single JSON, plus per-domain export/import + global reset. Round-trips through the live stores +
// localStorage (never writes source files).
const Btn = ({ onClick, children, tone = 'slate', disabled }: { onClick: () => void; children: ReactNode; tone?: 'slate' | 'violet' | 'emerald' | 'red'; disabled?: boolean }) => {
  const tones: Record<string, string> = {
    slate: 'border-slate-600 bg-slate-800/70 hover:bg-slate-700 text-slate-100',
    violet: 'border-violet-600/50 bg-violet-600/25 hover:bg-violet-600/35 text-violet-100',
    emerald: 'border-emerald-700/50 bg-emerald-700/20 hover:bg-emerald-700/30 text-emerald-100',
    red: 'border-red-700/50 bg-red-700/20 hover:bg-red-700/30 text-red-100',
  };
  return <button onClick={onClick} disabled={disabled} className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${tones[tone]}`}>{children}</button>;
};

const Head = ({ children }: { children: ReactNode }) => (
  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-300">{children}</h3>
);

export const ProjectTab = () => {
  const [msg, setMsg] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const doExport = () => {
    const file = exportEditorProject();
    downloadJson('r3f-rpg-editor-project.json', file);
    setMsg(`Exported ${Object.keys(file.domains).length} domain(s) (downloaded + copied to clipboard).`);
  };

  const applyImport = (text: string) => {
    if (!window.confirm('Importing will overwrite all current editor content (nothing else is affected). Continue?')) return;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { setMsg('❌ Failed to parse JSON.'); return; }
    const r = importEditorProject(parsed);
    refresh();
    setMsg(r.applied.length ? `✅ Imported: ${r.applied.join(', ')}${r.skipped.length ? ` · skipped: ${r.skipped.join(', ')}` : ''}` : `❌ No importable domains (${r.skipped.join(', ')})`);
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(applyImport).catch(() => setMsg('❌ Failed to read file.'));
    e.target.value = '';
  };

  return (
    <div className="space-y-5 text-sm">
      <section>
        <Head>Export — entire editor project</Head>
        <Btn tone="violet" onClick={doExport}>⬇ Export project JSON</Btn>
        <p className="mt-1 text-[11px] text-slate-500">Downloads r3f-rpg-editor-project.json (also copied to clipboard).</p>
      </section>

      <section>
        <Head>Import</Head>
        <label className="mb-2 inline-block cursor-pointer rounded-md border border-slate-600 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700">
          📂 Choose JSON file
          <input type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
        </label>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="…or paste project JSON directly" className="h-24 w-full rounded bg-slate-800 px-2 py-1.5 text-[11px] text-slate-100" />
        <div className="mt-1.5"><Btn tone="emerald" disabled={!paste.trim()} onClick={() => applyImport(paste)}>⬆ Import from pasted content</Btn></div>
      </section>

      <section>
        <Head>Domains — per-file export / import</Head>
        <div className="mb-1.5">
          <Btn tone="violet" onClick={() => { let n = 0; for (const d of EDITOR_CONTENT_DOMAINS) { const f = exportDomainFile(d.id); if (f) { downloadJson(`r3f-rpg-${d.id}.json`, f); n += 1; } } setMsg(`Exported ${n} domain files separately.`); }}>⬇ Export all (separate files)</Btn>
        </div>
        <div className="space-y-1">
          {EDITOR_CONTENT_DOMAINS.map((d) => <DomainFileRow key={d.id} domain={d} onMsg={(m) => { setMsg(m); refresh(); }} />)}
        </div>
        <div className="mt-2">
          <Btn tone="red" onClick={() => { if (window.confirm('Clear all editor content. Continue?')) { clearEditorContent(); refresh(); setMsg('Cleared all editor content.'); } }}>⚠ Clear all editor content</Btn>
        </div>
      </section>

      {msg && <p className="rounded bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-300">{msg}</p>}
    </div>
  );
};
