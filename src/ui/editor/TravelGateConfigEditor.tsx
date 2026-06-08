import type { EditorTrigger, GateStyle, TravelGateConfig } from '../../types/editorTrigger';
import { gateConfig } from '../../types/editorTrigger';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { Field, Check, inp, lbl, useAreaOptions, useQuestOptions, useItemOptions } from './editorShared';
import { IdSelect } from './idPickers';

const GATE_STYLES: GateStyle[] = ['portal', 'door', 'stairs', 'arch', 'plain'];

// Kit — edits the nested travelGate config of a travel/zone gate.
export const TravelGateConfigEditor = ({ trigger }: { trigger: EditorTrigger }) => {
  const updateTrigger = useEditorTriggerStore((s) => s.updateTrigger);
  const areaOptions = useAreaOptions();
  const questOptions = useQuestOptions();
  const itemOptions = useItemOptions();
  const g = gateConfig(trigger);
  const set = (patch: Partial<TravelGateConfig>) => updateTrigger(trigger.id, { travelGate: { ...g, ...patch } });

  return (
    <div className="grid grid-cols-2 gap-2 rounded border border-blue-700/30 bg-blue-950/20 p-2">
      <Field label="targetAreaId"><IdSelect value={g.targetAreaId} onChange={(v) => set({ targetAreaId: v })} options={areaOptions} placeholder="(choose area)" /></Field>
      <Field label="label"><input value={g.label ?? ''} onChange={(e) => set({ label: e.target.value || undefined })} className={inp} /></Field>
      <Field label="gateStyle">
        <select value={g.gateStyle ?? 'portal'} onChange={(e) => set({ gateStyle: e.target.value as GateStyle })} className={inp}>
          {GATE_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Check label="showOnMap" checked={g.showOnMap !== false} onChange={(v) => set({ showOnMap: v })} />

      <Check label="isLocked" checked={!!g.isLocked} onChange={(v) => set({ isLocked: v })} />
      {g.isLocked && (<>
        <Field label="lockedMessage"><input value={g.lockedMessage ?? ''} onChange={(e) => set({ lockedMessage: e.target.value || undefined })} className={inp} /></Field>
        <Field label="unlockQuestId"><IdSelect value={g.unlockQuestId} onChange={(v) => set({ unlockQuestId: v })} options={questOptions} placeholder="(none)" /></Field>
        <Field label="unlockWorldFlag"><input value={g.unlockWorldFlag ?? ''} onChange={(e) => set({ unlockWorldFlag: e.target.value || undefined })} className={inp} /></Field>
      </>)}

      <Field label="costItemId (toll)"><IdSelect value={g.costItemId} onChange={(v) => set({ costItemId: v })} options={itemOptions} placeholder="(none)" /></Field>
      <Field label="costQuantity"><input type="number" min={1} value={g.costQuantity ?? 1} onChange={(e) => set({ costQuantity: parseInt(e.target.value, 10) || 1 })} className={inp} /></Field>
      <Field label="confirmPrompt"><input value={g.confirmPrompt ?? ''} onChange={(e) => set({ confirmPrompt: e.target.value || undefined })} className={`col-span-2 ${inp}`} /></Field>

      <div className="col-span-2">
        <div className={lbl}>targetPosition (optional — overrides area spawn)</div>
        <div className="flex gap-1">
          {([0, 1, 2] as const).map((i) => (
            <input key={i} type="number" step={0.5} value={g.targetPosition?.[i] ?? ''} placeholder={['x', 'y', 'z'][i]}
              onChange={(e) => { const cur = g.targetPosition ?? [0, 0, 0]; const next = [...cur] as [number, number, number]; next[i] = parseFloat(e.target.value) || 0; set({ targetPosition: e.target.value === '' && !g.targetPosition ? undefined : next }); }} className={inp} />
          ))}
        </div>
      </div>
    </div>
  );
};
