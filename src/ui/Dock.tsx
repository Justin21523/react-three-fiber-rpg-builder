import { useUiStore } from '../stores/uiStore';

// Kit — top-left launcher bar (matches the original layout): toggle Edit Mode, and (in edit mode) open
// the Editor Hub — which appears centred and is draggable from there. Translucent so it never blocks the
// view. The Inspector + Assets palette mount separately while editing.
export const Dock = () => {
  const editMode = useUiStore((s) => s.editMode);
  const editorHubOpen = useUiStore((s) => s.editorHubOpen);
  const toggleEditMode = useUiStore((s) => s.toggleEditMode);
  const toggleEditorHub = useUiStore((s) => s.toggleEditorHub);
  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-[75] flex items-center gap-1.5 rounded-xl border border-slate-700/50 bg-slate-950/55 px-2 py-1.5 text-slate-200 shadow-2xl backdrop-blur-md">
      <button
        onClick={() => toggleEditMode()}
        aria-label="Edit Mode"
        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${editMode ? 'bg-cyan-600/50 text-cyan-100' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'}`}
      >🛠 Edit (F1)</button>
      {editMode && (
        <button
          onClick={() => toggleEditorHub()}
          aria-label="Editor Hub"
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${editorHubOpen ? 'bg-violet-600/50 text-violet-100' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'}`}
        >⚙ Hub</button>
      )}
      {!editMode && <span className="px-1 text-[11px] text-slate-500">WASD · Space · E</span>}
    </div>
  );
};
