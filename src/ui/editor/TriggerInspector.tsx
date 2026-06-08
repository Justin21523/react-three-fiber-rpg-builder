import { useState } from 'react';
import type { EditorTrigger, EditorTriggerType } from '../../types/editorTrigger';
import { EDITOR_TRIGGER_TYPES, TRIGGER_TYPE_LABEL, TRIGGER_COLOR, itemPickupConfig, dialogueConfig, restPointConfig, battleConfig } from '../../types/editorTrigger';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { useEditorEncounterStore } from '../../stores/editorEncounterStore';
import { useUiStore } from '../../stores/uiStore';
import { evaluateTrigger } from '../../game/editor/evaluateTrigger';
import { fireEditorTrigger } from '../../game/editor/fireEditorTrigger';
import { validateTriggerLive } from '../../game/editor/validateTrigger';
import { Field, Check, inp, lbl, csv, parseCsv, useItemOptions, useDialogueOptions } from './editorShared';
import { IdSelect } from './idPickers';
import { ModelPicker } from './ModelPicker';
import { AnimationPicker } from './AnimationPicker';
import { TravelGateConfigEditor } from './TravelGateConfigEditor';
import { ExplorationPointConfigEditor } from './ExplorationPointConfigEditor';
import { TriggerConditionEditor } from './TriggerConditionEditor';

// Kit — inspector for one trigger: common fields + type-specific config + conditions + on-fire grants +
// transform + validation + Test.
export const TriggerInspector = ({ trigger }: { trigger: EditorTrigger }) => {
  const updateTrigger = useEditorTriggerStore((s) => s.updateTrigger);
  const removeTrigger = useEditorTriggerStore((s) => s.removeTrigger);
  const moveToFocus = useEditorTriggerStore((s) => s.moveToFocus);
  const closeHub = useUiStore((s) => s.toggleEditorHub);
  const itemOptions = useItemOptions();
  const dialogueOptions = useDialogueOptions();
  const encounters = useEditorEncounterStore((s) => s.encounters);
  const [msg, setMsg] = useState<string | null>(null);

  const t = trigger;
  const set = (patch: Partial<EditorTrigger>) => updateTrigger(t.id, patch);
  const ev = evaluateTrigger(t);
  const valid = validateTriggerLive(t);
  const isGate = t.triggerType === 'travelGate' || t.triggerType === 'zoneGate';
  const isCombat = t.triggerType === 'battleTrigger' || t.triggerType === 'bossGate';

  const runTest = () => {
    const r = fireEditorTrigger(t, { test: true });
    if (isGate && r.ok) closeHub();
    else setMsg(`${r.ok ? '✅' : '❌'} ${r.message}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 truncate text-sm font-bold text-sky-100">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color ?? TRIGGER_COLOR[t.triggerType] }} />
          {t.displayName || t.triggerType}
        </h3>
        <button onClick={() => removeTrigger(t.id)} className="rounded border border-red-700/50 bg-red-700/15 px-2 py-1 text-xs text-red-200 hover:bg-red-700/25">🗑 Remove</button>
      </div>

      {!valid.ok && <div className="rounded border border-red-700/50 bg-red-900/30 px-2 py-1 text-[11px] text-red-200">⚠ {valid.errors.join(' · ')}</div>}

      <div className="grid grid-cols-2 gap-2">
        <Field label="triggerType">
          <select value={t.triggerType} onChange={(e) => set({ triggerType: e.target.value as EditorTriggerType })} className={inp}>
            {EDITOR_TRIGGER_TYPES.map((tt) => <option key={tt} value={tt}>{TRIGGER_TYPE_LABEL[tt]}</option>)}
          </select>
        </Field>
        <Field label="displayName"><input value={t.displayName ?? ''} onChange={(e) => set({ displayName: e.target.value })} className={inp} /></Field>
        <Field label="code (unique)"><input value={t.code ?? ''} onChange={(e) => set({ code: e.target.value })} className={inp} /></Field>
        <Field label="zoneId"><input value={t.zoneId} disabled className={`${inp} opacity-60`} /></Field>
        <Field label="interactionLabel"><input value={t.interactionLabel} onChange={(e) => set({ interactionLabel: e.target.value })} className={inp} /></Field>
        <Field label="color"><input type="color" value={t.color ?? '#38bdf8'} onChange={(e) => set({ color: e.target.value })} className="h-7 w-full rounded bg-slate-800" /></Field>
        <Field label="display model (optional)"><ModelPicker value={t.displayModelAssetId} onChange={(v) => set({ displayModelAssetId: v })} noneLabel="(box / marker only)" /></Field>
        <Field label="model animation"><AnimationPicker modelAssetId={t.displayModelAssetId} value={t.displayModelAnimation} onChange={(v) => set({ displayModelAnimation: v })} /></Field>
        <Field label="description"><input value={t.description ?? ''} onChange={(e) => set({ description: e.target.value })} className={`col-span-2 ${inp}`} /></Field>
        <Check label="isEnabled" checked={t.isEnabled !== false} onChange={(v) => set({ isEnabled: v })} />
        <Check label="isVisibleInPlayMode" checked={t.isVisibleInPlayMode !== false} onChange={(v) => set({ isVisibleInPlayMode: v })} />
      </div>

      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Config · {t.triggerType}</div>
      {isGate && <TravelGateConfigEditor trigger={t} />}
      {t.triggerType === 'explorationPoint' && <ExplorationPointConfigEditor trigger={t} />}
      {t.triggerType === 'itemPickup' && (
        <div className="grid grid-cols-2 gap-2 rounded border border-pink-700/30 bg-pink-950/20 p-2">
          <Field label="itemId"><IdSelect value={itemPickupConfig(t).itemId} onChange={(v) => set({ itemPickup: { ...itemPickupConfig(t), itemId: v } })} options={itemOptions} placeholder="(choose item)" /></Field>
          <Field label="quantity"><input type="number" min={1} value={itemPickupConfig(t).quantity ?? 1} onChange={(e) => set({ itemPickup: { ...itemPickupConfig(t), quantity: parseInt(e.target.value, 10) || 1 } })} className={inp} /></Field>
          <Field label="pickupMessage"><input value={itemPickupConfig(t).pickupMessage ?? ''} onChange={(e) => set({ itemPickup: { ...itemPickupConfig(t), pickupMessage: e.target.value || undefined } })} className={`col-span-2 ${inp}`} /></Field>
        </div>
      )}
      {t.triggerType === 'dialogueTrigger' && (
        <div className="grid grid-cols-2 gap-2 rounded border border-sky-700/30 bg-sky-950/20 p-2">
          <Field label="dialogueId (tree)"><IdSelect value={dialogueConfig(t).dialogueId} onChange={(v) => set({ dialogue: { ...dialogueConfig(t), dialogueId: v } })} options={dialogueOptions} placeholder="(choose tree)" /></Field>
          <Field label="startNodeId"><input value={dialogueConfig(t).startNodeId ?? ''} onChange={(e) => set({ dialogue: { ...dialogueConfig(t), startNodeId: e.target.value || undefined } })} className={inp} /></Field>
          <Check label="onceOnly" checked={!!dialogueConfig(t).onceOnly} onChange={(v) => set({ dialogue: { ...dialogueConfig(t), onceOnly: v } })} />
        </div>
      )}
      {t.triggerType === 'restPoint' && (
        <div className="grid grid-cols-2 gap-2 rounded border border-green-700/30 bg-green-950/20 p-2">
          <Field label="message"><input value={restPointConfig(t).message ?? ''} onChange={(e) => set({ restPoint: { ...restPointConfig(t), message: e.target.value } })} className={`col-span-2 ${inp}`} /></Field>
        </div>
      )}
      {isCombat && (
        <div className="grid grid-cols-2 gap-2 rounded border border-red-700/30 bg-red-950/20 p-2">
          <Field label="encounterId (the battle)"><IdSelect value={battleConfig(t).encounterId} onChange={(v) => set({ battle: { ...battleConfig(t), encounterId: v } })} options={encounters.map((e) => ({ id: e.id, label: e.displayName }))} placeholder="(choose encounter)" /></Field>
          <p className="col-span-2 text-[10px] leading-snug text-slate-500">Or link the trigger from the ⚔ Encounters tab. Battle triggers fire on contact (walk into them).</p>
        </div>
      )}

      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">On-fire grants (any type)</div>
      <div className="grid grid-cols-2 gap-2 rounded border border-slate-700/50 bg-slate-900/40 p-2">
        <Field label="grantItemIds (,)"><input value={csv(t.grantItemIds)} onChange={(e) => set({ grantItemIds: parseCsv(e.target.value) })} className={inp} /></Field>
        <Field label="grantExp"><input type="number" min={0} value={t.grantExp ?? 0} onChange={(e) => set({ grantExp: parseInt(e.target.value, 10) || 0 })} className={inp} /></Field>
        <Field label="setWorldFlags (,)"><input value={csv(t.setWorldFlags)} onChange={(e) => set({ setWorldFlags: parseCsv(e.target.value) })} className={inp} /></Field>
        <Field label="playDialogueId"><IdSelect value={t.playDialogueId} onChange={(v) => set({ playDialogueId: v })} options={dialogueOptions} placeholder="(none)" /></Field>
      </div>

      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Conditions</div>
      <TriggerConditionEditor trigger={t} />

      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="mb-0.5 flex items-center gap-1"><span className={lbl}>position</span><button onClick={() => moveToFocus(t.id)} title="Move to camera focus" className="rounded px-1 text-[10px] text-slate-400 hover:bg-slate-800">📍</button></div>
          <div className="flex gap-1">{([0, 1, 2] as const).map((i) => (
            <input key={i} type="number" step={0.5} value={t.position[i]} onChange={(e) => { const p = [...t.position] as [number, number, number]; p[i] = parseFloat(e.target.value) || 0; set({ position: p }); }} className={inp} />
          ))}</div>
        </div>
        <div>
          <div className={`mb-0.5 ${lbl}`}>size</div>
          <div className="flex gap-1">{([0, 1, 2] as const).map((i) => (
            <input key={i} type="number" step={0.5} min={0.5} value={t.size[i]} onChange={(e) => { const s = [...t.size] as [number, number, number]; s[i] = parseFloat(e.target.value) || 0.5; set({ size: s }); }} className={inp} />
          ))}</div>
        </div>
        <Field label="scale"><input type="number" step={0.1} min={0.1} value={t.scale ?? 1} onChange={(e) => set({ scale: parseFloat(e.target.value) || 0.1 })} className={inp} /></Field>
      </div>

      <div className="flex items-center gap-2 rounded bg-slate-900/60 px-2 py-1.5 text-[11px]">
        <span className={ev.active ? 'text-emerald-300' : 'text-amber-300'}>{ev.active ? '✓ Can fire' : `✗ ${ev.reasons.join(', ')}`}</span>
        <button onClick={runTest} className="ml-auto rounded border border-violet-600/50 bg-violet-600/25 px-2 py-1 font-semibold text-violet-100 hover:bg-violet-600/35">▶ Test</button>
      </div>
      {msg && <p className="rounded bg-slate-900/60 px-2 py-1 text-[11px] text-slate-300">{msg}</p>}
    </div>
  );
};
