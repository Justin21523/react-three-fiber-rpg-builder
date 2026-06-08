// Kit — selection-first id pickers used across the editors (Quest / NPC / Trigger / …). Dropdowns +
// removable chips instead of hand-typed CSV id fields.
export interface IdOption { id: string; label: string }

const selCls = 'w-full rounded bg-slate-800 px-2 py-1 text-xs text-slate-100';

// Single id dropdown (optional). Empty value clears it.
export const IdSelect = ({ value, onChange, options, placeholder = '(choose)' }: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: IdOption[];
  placeholder?: string;
}) => (
  <select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className={selCls}>
    <option value="">{placeholder}</option>
    {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
  </select>
);

// Multi id picker: choose from a dropdown → removable chips. No typing required.
export const IdMultiPicker = ({ ids, onChange, options, addLabel = '+ add…' }: {
  ids: string[];
  onChange: (v: string[]) => void;
  options: IdOption[];
  addLabel?: string;
}) => (
  <div>
    <select value="" onChange={(e) => { const id = e.target.value; if (id && !ids.includes(id)) onChange([...ids, id]); }} className={selCls}>
      <option value="">{addLabel}</option>
      {options.filter((o) => !ids.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
    {ids.length > 0 && (
      <div className="mt-1 flex flex-wrap gap-1">
        {ids.map((id) => {
          const o = options.find((x) => x.id === id);
          return (
            <span key={id} className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200">
              {o?.label ?? id}
              <button onClick={() => onChange(ids.filter((x) => x !== id))} className="text-red-300 hover:text-red-200">✕</button>
            </span>
          );
        })}
      </div>
    )}
  </div>
);
