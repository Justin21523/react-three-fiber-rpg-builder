import { useMemo } from 'react';
import type { EditorObjective, EditorObjectiveType } from '../../types/editorQuest';
import { EDITOR_OBJECTIVE_TYPES } from '../../types/editorQuest';
import { useEditorQuestStore } from '../../stores/editorQuestStore';
import { SEED_DOORS } from '../../data/doors';
import { SEED_AREAS } from '../../data/areas';
import { editorSpawn } from '../../stores/sceneEditStore';
import { Field, inp, lbl, useNpcOptions, useItemOptions, useAreaOptions } from './editorShared';
import { IdSelect, type IdOption } from './idPickers';
import { ModelPicker } from './ModelPicker';
import { AnimationPicker } from './AnimationPicker';

// Which id source seeds the target picker for each objective type.
const TARGET_KIND: Record<EditorObjectiveType, 'npc' | 'item' | 'area' | 'door' | 'trigger' | 'none'> = {
  talkToNPC: 'npc', collectItem: 'item', visitArea: 'area', reachLocation: 'area',
  inspectObject: 'trigger', triggerEvent: 'trigger', useTravelGate: 'trigger',
  unlockDoor: 'door', custom: 'none',
};

// Kit — edit one quest objective: type, target (dropdown by type), count, optional, marker. (Trigger
// targets are free text until the Triggers tab exists.)
export const QuestObjectiveEditor = ({ questId, obj, index, count }: { questId: string; obj: EditorObjective; index: number; count: number }) => {
  const update = useEditorQuestStore((s) => s.updateObjective);
  const remove = useEditorQuestStore((s) => s.removeObjective);
  const move = useEditorQuestStore((s) => s.moveObjective);
  const npcOptions = useNpcOptions();
  const itemOptions = useItemOptions();
  const areaOptions = useAreaOptions();

  const set = (patch: Partial<EditorObjective>) => update(questId, obj.id, patch);
  const kind = TARGET_KIND[obj.type];
  const options: IdOption[] | null = useMemo(() => {
    switch (kind) {
      case 'npc': return npcOptions;
      case 'item': return itemOptions;
      case 'area': return areaOptions;
      case 'door': return SEED_DOORS.map((d) => ({ id: d.id, label: d.label }));
      default: return null; // trigger / none → free text for now
    }
  }, [kind, npcOptions, itemOptions, areaOptions]);

  return (
    <div className="space-y-1 rounded border border-slate-700/60 bg-slate-900/50 p-2">
      <div className="flex items-center gap-1 text-[10px] text-slate-400">
        <span className="font-mono text-slate-500">#{index + 1}</span>
        <button onClick={() => move(questId, obj.id, -1)} disabled={index === 0} className="rounded px-1 hover:bg-slate-800 disabled:opacity-30">▲</button>
        <button onClick={() => move(questId, obj.id, 1)} disabled={index === count - 1} className="rounded px-1 hover:bg-slate-800 disabled:opacity-30">▼</button>
        <label className="ml-auto flex items-center gap-1"><input type="checkbox" checked={!!obj.isOptional} onChange={(e) => set({ isOptional: e.target.checked })} className="accent-sky-500" />optional</label>
        <button onClick={() => remove(questId, obj.id)} className="rounded px-1 text-red-300 hover:bg-red-700/30">🗑</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="type">
          <select value={obj.type} onChange={(e) => set({ type: e.target.value as EditorObjectiveType })} className={inp}>
            {EDITOR_OBJECTIVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="count"><input type="number" min={1} value={obj.requiredCount ?? 1} onChange={(e) => set({ requiredCount: parseInt(e.target.value, 10) || 1 })} className={inp} /></Field>
        <Field label={`target (${kind})`}>
          {options ? (
            <IdSelect value={obj.targetId} onChange={(v) => set({ targetId: v })} options={options} placeholder={`(choose ${kind})`} />
          ) : (
            <input value={obj.targetId ?? ''} onChange={(e) => set({ targetId: e.target.value || undefined })} placeholder={kind === 'none' ? 'custom id (optional)' : 'trigger id'} className={inp} />
          )}
        </Field>
        <Field label="description (optional)"><input value={obj.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder="(auto)" className={inp} /></Field>
      </div>
      {/* marker position */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <div className="mb-0.5 flex items-center gap-1">
            <span className={lbl}>marker</span>
            <button onClick={() => set({ markerPosition: [editorSpawn.x, editorSpawn.y, editorSpawn.z] })} title="Set to camera focus" className="rounded px-1 text-[10px] text-slate-400 hover:bg-slate-800">📍 set</button>
            {obj.markerPosition && <button onClick={() => set({ markerPosition: undefined })} className="rounded px-1 text-[10px] text-red-300 hover:bg-red-700/30">clear</button>}
          </div>
          <div className="flex gap-1">
            {([0, 1, 2] as const).map((i) => (
              <input key={i} type="number" step={0.5} value={obj.markerPosition?.[i] ?? 0} onChange={(e) => { const p = [...(obj.markerPosition ?? [0, 0, 0])] as [number, number, number]; p[i] = parseFloat(e.target.value) || 0; set({ markerPosition: p }); }} className={inp} />
            ))}
          </div>
        </div>
        <Field label="markerArea">
          <select value={obj.relatedAreaId ?? ''} onChange={(e) => set({ relatedAreaId: e.target.value || undefined })} className={inp}>
            <option value="">(quest areas)</option>
            {SEED_AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      </div>
      {/* marker appearance */}
      <div className="grid grid-cols-3 gap-2">
        <Field label="marker model"><ModelPicker value={obj.markerModelAssetId} onChange={(v) => set({ markerModelAssetId: v })} noneLabel="(diamond marker)" /></Field>
        <Field label="marker animation"><AnimationPicker modelAssetId={obj.markerModelAssetId} value={obj.markerAnimation} onChange={(v) => set({ markerAnimation: v })} /></Field>
        <Field label="marker color"><input type="color" value={obj.markerColor ?? '#fbbf24'} onChange={(e) => set({ markerColor: e.target.value })} className="h-7 w-full rounded bg-slate-800" /></Field>
      </div>
    </div>
  );
};
