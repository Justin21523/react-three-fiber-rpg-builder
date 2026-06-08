import { useState } from 'react';
import type { NpcType } from '../../types/editorNPC';
import { NPC_TYPES, NPC_TYPE_COLOR, NPC_TYPE_LABEL } from '../../types/editorNPC';
import { useEditorNpcStore } from '../../stores/editorNpcStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useSceneEditStore, editorSpawn } from '../../stores/sceneEditStore';
import { objKey } from '../../game/edit/sceneEditMerge';
import { MODEL_ASSET_LIST } from '../../data/modelLibrary';

// A sensible humanoid default so new NPCs render as a real 3D character when character models exist.
const DEFAULT_NPC_MODEL =
  MODEL_ASSET_LIST.find((a) => a.category === 'yokais' || a.category === 'characters')?.id ?? null;

// Kit — colour-coded palette of NPC archetypes. Pick a type, then "Create NPC here" places one at the
// current area's spawn and stamps the chosen type + colour.
export const NPCPalettePanel = ({ onCreated }: { onCreated?: (id: string) => void }) => {
  const [type, setType] = useState<NpcType>('student');
  const addNpc = useEditorNpcStore((s) => s.addNpc);
  const updateNpc = useEditorNpcStore((s) => s.updateNpc);
  const areaId = usePlayerStore((s) => s.currentAreaId);

  const create = () => {
    // Place at the camera focus so it appears where you're looking.
    const id = addNpc(areaId, [editorSpawn.x, editorSpawn.y, editorSpawn.z]);
    updateNpc(id, { npcType: type, color: NPC_TYPE_COLOR[type], modelAssetId: DEFAULT_NPC_MODEL });
    // Auto-select it for the 3D gizmo (EditableObject picks this up when it mounts).
    useSceneEditStore.setState({ pendingSelectKey: objKey(areaId, 'npc', id) });
    onCreated?.(id);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1">
        {NPC_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex items-center gap-1.5 rounded border px-1.5 py-1 text-left text-[11px] ${type === t ? 'border-amber-400 bg-amber-600/20 text-amber-100' : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: NPC_TYPE_COLOR[t] }} />
            <span className="truncate">{NPC_TYPE_LABEL[t]}</span>
          </button>
        ))}
      </div>
      <button onClick={create} className="w-full rounded-md border border-emerald-700/50 bg-emerald-700/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-700/30">
        ➕ Create NPC here
      </button>
    </div>
  );
};
