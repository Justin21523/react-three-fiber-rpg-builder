import type { EditorTriggerType } from '../../types/editorTrigger';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { usePlayerStore } from '../../stores/playerStore';

// Kit — places a new trigger of the chosen type at the camera focus in the current area, returning its
// id so the editor can select it (and the gizmo auto-grabs it via pendingSelectKey in addTrigger).
export const TriggerPlacementTool = ({ triggerType, onPlaced }: { triggerType: EditorTriggerType; onPlaced?: (id: string) => void }) => {
  const addTrigger = useEditorTriggerStore((s) => s.addTrigger);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  return (
    <button
      onClick={() => onPlaced?.(addTrigger(areaId, triggerType))}
      className="w-full rounded-md border border-emerald-700/50 bg-emerald-700/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-700/30"
    >
      ➕ Place trigger here
    </button>
  );
};
