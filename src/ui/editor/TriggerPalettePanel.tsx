import { useState } from 'react';
import type { EditorTriggerType } from '../../types/editorTrigger';
import { EDITOR_TRIGGER_TYPES, TRIGGER_COLOR, TRIGGER_TYPE_LABEL } from '../../types/editorTrigger';
import { TriggerPlacementTool } from '../../game/editor/TriggerPlacementTool';

// Kit — colour-coded palette of placeable trigger types. Pick a type, then place it (at the camera focus
// in the current area); the new trigger is auto-selected with the transform gizmo.
export const TriggerPalettePanel = ({ onPlaced }: { onPlaced?: (id: string) => void }) => {
  const [type, setType] = useState<EditorTriggerType>('travelGate');
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1">
        {EDITOR_TRIGGER_TYPES.map((tt) => (
          <button key={tt} onClick={() => setType(tt)} className={`flex items-center gap-1.5 rounded border px-1.5 py-1 text-left text-[11px] ${type === tt ? 'border-sky-400 bg-sky-600/20 text-sky-100' : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TRIGGER_COLOR[tt] }} />
            <span className="truncate">{TRIGGER_TYPE_LABEL[tt]}</span>
          </button>
        ))}
      </div>
      <TriggerPlacementTool triggerType={type} onPlaced={onPlaced} />
      <p className="text-[10px] leading-snug text-slate-500">Pick a type, then place it. New triggers use the current area + transform gizmo.</p>
    </div>
  );
};
