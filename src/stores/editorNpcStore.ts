import { create } from 'zustand';
import type { DialogueTree } from '../types/dialogue';
import type { EditorNpc } from '../types/editorNPC';
import { createDefaultEditorNpc } from '../types/editorNPC';

// Kit — in-editor NPC + dialogue authoring. NPCs created here are placed per-area and merged into the
// runtime via getNpcProfile / EditableNpcLayer; dialogue trees authored here merge into getDialogueTree.
// Persisted to localStorage with a tolerant loader (old simple {name,...} shape still loads).

interface EditorNpcState {
  addedNpcs: EditorNpc[];
  dialogueTrees: Record<string, DialogueTree>;
  addNpc: (areaId: string, position?: [number, number, number]) => string;
  updateNpc: (id: string, patch: Partial<EditorNpc>) => void;
  removeNpc: (id: string) => void;
  createDialogueTree: (speakerName: string) => string;
  setDialogueTree: (tree: DialogueTree) => void;
  removeDialogueTree: (id: string) => void;
  importState: (data: { addedNpcs?: EditorNpc[]; dialogueTrees?: Record<string, DialogueTree> }) => void;
  reset: () => void;
}

const STORAGE_KEY = 'r3f-rpg-builder-editor-npc-v1';

function persist(s: Pick<EditorNpcState, 'addedNpcs' | 'dialogueTrees'>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ addedNpcs: s.addedNpcs, dialogueTrees: s.dialogueTrees })); } catch { /* ignore */ }
}

// Tolerant migration: accept both the new EditorNpc shape and the early kit shape ({ name, ... }).
function migrateNpc(raw: Record<string, unknown>): EditorNpc {
  const base = createDefaultEditorNpc(
    (raw.id as string) ?? `npc_${Date.now().toString(36)}`,
    (raw.areaId as string) ?? 'area_field',
    (raw.position as [number, number, number]) ?? [0, 1, 0],
  );
  return {
    ...base,
    ...raw,
    displayName: (raw.displayName as string) ?? (raw.name as string) ?? base.displayName,
    relatedQuestIds: (raw.relatedQuestIds as string[]) ?? [],
    tags: (raw.tags as string[]) ?? [],
    color: (raw.color as string) ?? base.color,
    modelAssetId: (raw.modelAssetId as string | null) ?? null,
    dialogueTreeId: (raw.dialogueTreeId as string | null) ?? null,
    interactionLabel: (raw.interactionLabel as string) ?? base.interactionLabel,
  } as EditorNpc;
}

function load(): { addedNpcs: EditorNpc[]; dialogueTrees: Record<string, DialogueTree> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { addedNpcs: [], dialogueTrees: {} };
    const p = JSON.parse(raw);
    const addedNpcs = Array.isArray(p.addedNpcs) ? p.addedNpcs.map(migrateNpc) : [];
    return { addedNpcs, dialogueTrees: p.dialogueTrees ?? {} };
  } catch {
    return { addedNpcs: [], dialogueTrees: {} };
  }
}

const defaultTree = (id: string, speaker: string): DialogueTree => ({
  id, rootNodeId: 'start',
  nodes: { start: { id: 'start', speaker, text: 'Hello, traveller.', nextNodeId: null } },
});

export const useEditorNpcStore = create<EditorNpcState>((set, get) => ({
  ...load(),

  addNpc: (areaId, position = [0, 1, 0]) => {
    const id = `npc_${Date.now().toString(36)}`;
    const treeId = `dlg_${id}`;
    const npc = { ...createDefaultEditorNpc(id, areaId, position), dialogueTreeId: treeId };
    const addedNpcs = [...get().addedNpcs, npc];
    const dialogueTrees = { ...get().dialogueTrees, [treeId]: defaultTree(treeId, npc.displayName) };
    set({ addedNpcs, dialogueTrees });
    persist({ addedNpcs, dialogueTrees });
    return id;
  },

  updateNpc: (id, patch) => {
    const addedNpcs = get().addedNpcs.map((n) => (n.id === id ? { ...n, ...patch } : n));
    set({ addedNpcs });
    persist({ addedNpcs, dialogueTrees: get().dialogueTrees });
  },

  removeNpc: (id) => {
    const addedNpcs = get().addedNpcs.filter((n) => n.id !== id);
    set({ addedNpcs });
    persist({ addedNpcs, dialogueTrees: get().dialogueTrees });
  },

  createDialogueTree: (speakerName) => {
    const id = `dlg_${Date.now().toString(36)}`;
    const dialogueTrees = { ...get().dialogueTrees, [id]: defaultTree(id, speakerName || 'NPC') };
    set({ dialogueTrees });
    persist({ addedNpcs: get().addedNpcs, dialogueTrees });
    return id;
  },

  setDialogueTree: (tree) => {
    const dialogueTrees = { ...get().dialogueTrees, [tree.id]: tree };
    set({ dialogueTrees });
    persist({ addedNpcs: get().addedNpcs, dialogueTrees });
  },

  removeDialogueTree: (id) => {
    const dialogueTrees = { ...get().dialogueTrees };
    delete dialogueTrees[id];
    set({ dialogueTrees });
    persist({ addedNpcs: get().addedNpcs, dialogueTrees });
  },

  importState: (data) => {
    const next = { addedNpcs: (data.addedNpcs ?? []).map((n) => migrateNpc(n as unknown as Record<string, unknown>)), dialogueTrees: data.dialogueTrees ?? {} };
    set(next);
    persist(next);
  },

  reset: () => { set({ addedNpcs: [], dialogueTrees: {} }); persist({ addedNpcs: [], dialogueTrees: {} }); },
}));

// Non-hook accessors for data modules (avoid store→store import cycles).
export function getEditorNpc(id: string): EditorNpc | undefined {
  return useEditorNpcStore.getState().addedNpcs.find((n) => n.id === id);
}
export function getEditorDialogueTree(id: string): DialogueTree | undefined {
  return useEditorNpcStore.getState().dialogueTrees[id];
}
export function getEditorNpcsForArea(areaId: string): EditorNpc[] {
  return useEditorNpcStore.getState().addedNpcs.filter((n) => n.areaId === areaId);
}
