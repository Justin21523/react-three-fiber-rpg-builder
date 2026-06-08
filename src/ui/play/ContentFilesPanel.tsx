import { useRef, useState } from 'react';
import { exportEditorProject, importEditorProject } from '../../game/editor/editorContentRegistry';
import { downloadJson } from '../editor/downloadJson';
import { PanelCard, closePanel } from './playShared';

// Kit — play-mode 📦 Content files: export the whole authored project (scene edits / models / environment /
// triggers / NPCs / quests / encounters / mini-games) to one JSON, and import it back. Same registry the
// editor's Project tab uses — handy for sharing a build without opening Edit Mode.
export const ContentFilesPanel = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const { applied, skipped } = importEditorProject(data);
      setMsg(`Imported ${applied.length} domains${skipped.length ? ` · skipped ${skipped.length}` : ''}.`);
    } catch { setMsg('Invalid project file.'); }
  };
  return (
    <PanelCard title="Content Files" icon="📦" onClose={closePanel} width="22rem">
      <div className="space-y-2">
        <button onClick={() => { downloadJson('r3f-rpg-project.json', exportEditorProject()); setMsg('Exported project JSON.'); }} className="w-full rounded bg-violet-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500">⬇ Export project JSON</button>
        <button onClick={() => fileRef.current?.click()} className="w-full rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-600">⬆ Import project JSON</button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
        {msg && <p className="text-[11px] text-cyan-300">{msg}</p>}
      </div>
    </PanelCard>
  );
};
