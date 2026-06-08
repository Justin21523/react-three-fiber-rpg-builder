/* eslint-disable react-refresh/only-export-components -- shared editor form helpers (mixed exports) */
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { SEED_AREAS } from '../../data/areas';
import { SEED_ITEMS } from '../../data/items';
import { SEED_NPCS } from '../../data/npcs';
import { useQuestStore } from '../../stores/questStore';
import { useEditorQuestStore } from '../../stores/editorQuestStore';
import { useEditorNpcStore } from '../../stores/editorNpcStore';
import { listDialogueTreeIds } from '../../game/dialogue/dialogueRegistry';
import type { IdOption } from './idPickers';

// Kit — shared form bits for the editor sub-panels (keeps each editor small). Ported from the original
// triggerEditorShared, with kit dropdown sources (no generated-area / yokai layers).
export const inp = 'w-full rounded bg-slate-800 px-2 py-1 text-xs text-slate-100';
export const lbl = 'text-[10px] font-semibold uppercase tracking-wide text-slate-400';

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex flex-col gap-0.5"><span className={lbl}>{label}</span>{children}</label>
);

export const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center gap-1.5 text-xs text-slate-300">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-sky-500" /> {label}
  </label>
);

export const csv = (a?: string[]) => (a ?? []).join(', ');
export const parseCsv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

// --- live id / option sources (for IdSelect / IdMultiPicker dropdowns) ---------------------------------
export function useAreaIds(): string[] {
  return useMemo(() => SEED_AREAS.map((a) => a.id), []);
}
export function useAreaOptions(): IdOption[] {
  return useMemo(() => SEED_AREAS.map((a) => ({ id: a.id, label: a.name })), []);
}

export function useQuestIds(): string[] {
  const quests = useQuestStore((s) => s.quests);
  return useMemo(() => Object.keys(quests), [quests]);
}
export function useQuestOptions(): IdOption[] {
  const quests = useQuestStore((s) => s.quests);
  return useMemo(() => Object.values(quests).map((q) => ({ id: q.id, label: q.title || q.id })), [quests]);
}

export function useItemOptions(): IdOption[] {
  const editorItems = useEditorQuestStore((s) => s.items);
  return useMemo(() => {
    const seed = SEED_ITEMS.map((i) => ({ id: i.id, label: i.name }));
    const ed = editorItems.map((i) => ({ id: i.id, label: i.name }));
    const seen = new Set<string>();
    return [...ed, ...seed].filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
  }, [editorItems]);
}

export function useNpcOptions(): IdOption[] {
  const editorNpcs = useEditorNpcStore((s) => s.addedNpcs);
  return useMemo(() => {
    const seed = SEED_NPCS.map((n) => ({ id: n.id, label: n.name }));
    const ed = editorNpcs.map((n) => ({ id: n.id, label: n.displayName }));
    const seen = new Set<string>();
    return [...ed, ...seed].filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
  }, [editorNpcs]);
}

export function useDialogueOptions(): IdOption[] {
  const trees = useEditorNpcStore((s) => s.dialogueTrees); // re-list when editor trees change
  // eslint-disable-next-line react-hooks/exhaustive-deps -- listDialogueTreeIds reads the store via getState; re-run on `trees`
  return useMemo(() => listDialogueTreeIds().map((t) => ({ id: t.id, label: t.source === 'editor' ? `✎ ${t.id}` : t.id })), [trees]);
}
