import { useMemo, useState } from 'react';
import { MODEL_ASSETS, MODEL_CATEGORIES } from '../../data/modelLibrary';
import { inp } from './editorShared';

// Kit — reusable searchable model picker (search box + category-grouped <select>) over the auto-
// discovered MODEL_ASSETS. Used everywhere an entity bears a 3D model (NPC, quest marker, trigger, …)
// so model selection is consistent and usable even with 100+ models.
export const ModelPicker = ({ value, onChange, allowNone = true, noneLabel = '(none)' }: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  allowNone?: boolean;
  noneLabel?: string;
}) => {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const f = q.trim().toLowerCase();
    const byCat: Record<string, string[]> = {};
    for (const [id, a] of Object.entries(MODEL_ASSETS)) {
      if (f && !a.label.toLowerCase().includes(f) && !id.toLowerCase().includes(f)) continue;
      (byCat[a.category] ??= []).push(id);
    }
    return MODEL_CATEGORIES.filter((c) => byCat[c]?.length).map((c) => ({ cat: c, ids: byCat[c].sort() }));
  }, [q]);

  const total = Object.keys(MODEL_ASSETS).length;
  return (
    <div className="flex flex-col gap-1">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={total ? `🔍 search ${total} models…` : 'no models — drop .glb into src/assets/models or public/models'} className={inp} />
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className={inp}>
        {allowNone && <option value="">{noneLabel}</option>}
        {groups.map((g) => (
          <optgroup key={g.cat} label={g.cat}>
            {g.ids.map((id) => <option key={id} value={id}>{MODEL_ASSETS[id]?.label ?? id}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  );
};
