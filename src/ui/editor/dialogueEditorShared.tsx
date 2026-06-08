import type { DialogueEffect, DialogueCondition } from '../../types/dialogue';
import type { MechField } from '../../types/editorDialogue';
import { DIALOGUE_EFFECT_TYPES, DIALOGUE_CONDITION_TYPES, EFFECT_FIELDS, COND_FIELDS, buildMech } from '../../types/editorDialogue';
import { useQuestOptions, useItemOptions } from './editorShared';
export { DIALOGUE_EMOTIONS } from '../../types/editorDialogue';

const EFFECT_FIELD_MAP: Record<string, MechField[]> = EFFECT_FIELDS;
const COND_FIELD_MAP: Record<string, MechField[]> = COND_FIELDS;

// Kit — shared bits for the dialogue node/choice editors: a type+fields editor for a single effect/
// condition, a list editor for node-level actions/conditions, and a node-id target dropdown.
export const dinp = 'rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-100';

type Mech = Record<string, unknown> & { type: string };

// One effect or condition: pick a type, then fill its fields (numbers are coerced).
export const MechEditor = ({ kind, value, onChange, allowNone = true }: {
  kind: 'effect' | 'condition';
  value: Mech | undefined;
  onChange: (v: Mech | undefined) => void;
  allowNone?: boolean;
}) => {
  const types = kind === 'effect' ? DIALOGUE_EFFECT_TYPES : DIALOGUE_CONDITION_TYPES;
  const fieldsMap = kind === 'effect' ? EFFECT_FIELD_MAP : COND_FIELD_MAP;
  const type = value?.type ?? '';
  const fields = type ? fieldsMap[type] ?? [] : [];
  // Object-reference fields become dropdowns of existing objects (free text only for the rest).
  const questOptions = useQuestOptions();
  const itemOptions = useItemOptions();

  const setField = (key: string, raw: string) => {
    const next = { ...(value ?? { type }) } as Record<string, string>;
    next[key] = raw;
    onChange(buildMech(type, fields, next));
  };

  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
      <select
        value={type}
        onChange={(e) => {
          const t = e.target.value;
          if (!t) return onChange(undefined);
          onChange(buildMech(t, fieldsMap[t] ?? [], {}));
        }}
        className={dinp}
      >
        {allowNone && <option value="">(none)</option>}
        {types.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {fields.map((f) => {
        const cur = String((value?.[f.key] as string | number | undefined) ?? '');
        const opts = f.label === 'questId' ? questOptions : f.label === 'itemId' ? itemOptions : null;
        if (opts) {
          return (
            <select key={f.key} value={cur} onChange={(e) => setField(f.key, e.target.value)} className={`w-32 ${dinp}`}>
              <option value="">{f.label}…</option>
              {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          );
        }
        return (
          <input
            key={f.key}
            type={f.kind === 'number' ? 'number' : 'text'}
            value={cur}
            placeholder={f.label + (f.optional ? '?' : '')}
            onChange={(e) => setField(f.key, e.target.value)}
            className={`w-24 ${dinp}`}
          />
        );
      })}
    </div>
  );
};

// A list of effects (node actions) or conditions (node gates) with add/remove.
export const MechListEditor = ({ label, kind, items, onChange }: {
  label: string;
  kind: 'effect' | 'condition';
  items: (DialogueEffect | DialogueCondition)[] | undefined;
  onChange: (items: (DialogueEffect | DialogueCondition)[] | undefined) => void;
}) => {
  const list = items ?? [];
  const set = (next: Mech[]) => onChange(next.length ? (next as unknown as (DialogueEffect | DialogueCondition)[]) : undefined);
  const addDefault = () => {
    const types = kind === 'effect' ? DIALOGUE_EFFECT_TYPES : DIALOGUE_CONDITION_TYPES;
    const fieldsMap = kind === 'effect' ? EFFECT_FIELD_MAP : COND_FIELD_MAP;
    const t = types[0];
    set([...(list as unknown as Mech[]), buildMech(t, fieldsMap[t] ?? [], {})]);
  };
  return (
    <div className="space-y-0.5 pl-6">
      <div className="flex items-center gap-1 text-[10px] text-slate-500">
        <span className="w-12 shrink-0">{label}</span>
        <button onClick={addDefault} className="rounded px-1 text-emerald-300 hover:bg-emerald-700/20">+ add</button>
      </div>
      {(list as unknown as Mech[]).map((m, i) => (
        <div key={i} className="flex items-center gap-1">
          <MechEditor
            kind={kind}
            allowNone={false}
            value={m.type ? m : undefined}
            onChange={(v) => { const next = [...(list as unknown as Mech[])]; if (v) next[i] = v; else next.splice(i, 1); set(next); }}
          />
          <button onClick={() => { const next = [...(list as unknown as Mech[])]; next.splice(i, 1); set(next); }} className="rounded px-1 text-[10px] text-red-300 hover:bg-red-700/30">✕</button>
        </div>
      ))}
    </div>
  );
};

// A node-id picker (used for nextNodeId / fallbackNodeId), with an (end) sentinel.
export const NodeTarget = ({ nodeIds, value, onChange, endLabel = '(end)' }: {
  nodeIds: string[];
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  endLabel?: string;
}) => (
  <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={dinp}>
    <option value="">{endLabel}</option>
    {nodeIds.map((nid) => <option key={nid} value={nid}>{nid}</option>)}
  </select>
);
