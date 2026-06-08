import { getEditorNpc } from '../stores/editorNpcStore';

// Kit — sample NPC profiles. An NPC is a labelled, talkable entity bound to a dialogue tree. Give it a
// `modelAssetId` (an id from the auto-discovered model library) to render your own GLB instead of the
// default colored capsule.
export interface NpcProfile {
  id: string;
  name: string;
  dialogueTreeId?: string;
  modelAssetId?: string; // optional: a MODEL_ASSETS id (drop a .glb in src/assets/models/)
  color?: string;        // tint for the default capsule
}

export const SEED_NPCS: NpcProfile[] = [
  { id: 'npc_guide', name: 'Village Guide', dialogueTreeId: 'dlg_guide', color: '#38bdf8' },
];

export function getNpcProfile(id: string): NpcProfile | undefined {
  // Editor-authored NPCs (created in the 🧑 NPC tab) win over seed NPCs; map EditorNpc → NpcProfile.
  const ed = getEditorNpc(id);
  if (ed) return { id: ed.id, name: ed.displayName, dialogueTreeId: ed.dialogueTreeId ?? undefined, modelAssetId: ed.modelAssetId ?? undefined, color: ed.color };
  return SEED_NPCS.find((n) => n.id === id);
}
