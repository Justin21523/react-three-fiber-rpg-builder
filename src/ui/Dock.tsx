import { useUiStore } from '../stores/uiStore';

// Kit — minimal bottom dock. Toggle Edit Mode (also F1) and open the Editor Hub.
export const Dock = () => {
  const editMode = useUiStore((s) => s.editMode);
  const editorHubOpen = useUiStore((s) => s.editorHubOpen);
  const toggleEditMode = useUiStore((s) => s.toggleEditMode);
  const toggleEditorHub = useUiStore((s) => s.toggleEditorHub);
  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-950/85 px-3 py-2 text-slate-200 shadow-2xl ring-1 ring-white/5">
      <button
        onClick={() => toggleEditMode()}
        aria-label="Edit Mode"
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${editMode ? 'bg-cyan-600/40 text-cyan-100' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
      >🛠 Edit Mode (F1)</button>
      {editMode && (
        <button
          onClick={() => toggleEditorHub()}
          aria-label="Editor Hub"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${editorHubOpen ? 'bg-violet-600/40 text-violet-100' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >⚙ Editor Hub</button>
      )}
      {!editMode && <span className="px-1 text-[11px] text-slate-500">WASD move · Space jump</span>}
    </div>
  );
};
