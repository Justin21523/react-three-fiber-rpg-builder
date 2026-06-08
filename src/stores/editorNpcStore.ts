import { create } from 'zustand';
import type { NpcProfile } from '../data/npcs';
import type { DialogueTree } from '../types/dialogue';

// Kit — in-editor NPC + dialogue authoring. NPCs created here are placed per-area and merged into the
// runtime via getNpcProfile / area rendering; dialogue trees authored here are merged into
// getDialogueTree. Persisted to localStorage so your edits survive reload. Generic (no yokai bindings).
export interface EditorNpc extends NpcProfile {
  areaId: string;
  position: [number, number, number];
}

interface EditorNpcState {
  addedNpcs: EditorNpc[];
  dialogueTrees: Record<string, DialogueTree>; // id → authored/overridden tree
  addNpc: (areaId: string, position?: [number, number, number]) => string;
  updateNpc: (id: string, patch: Partial<EditorNpc>) => void;
  removeNpc: (id: string) => void;
  setDialogueTree: (tree: DialogueTree) => void;
  removeDialogueTree: (id: string) => void;
  load: (data: { addedNpcs?: EditorNpc[]; dialogueTrees?: Record<string, DialogueTree> }) => void;
  reset: () => void;
}

const STORAGE_KEY = 'r3f-rpg-builder-editor-npc-v1';

function persist(s: Pick<EditorNpcState, 'addedNpcs' | 'dialogueTrees'>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ addedNpcs: s.addedNpcs, dialogueTrees: s.dialogueTrees }));
  } catch {
    /* ignore */
  }
}

function load(): { addedNpcs: EditorNpc[]; dialogueTrees: Record<string, DialogueTree> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { addedNpcs: [], dialogueTrees: {} };
    const p = JSON.parse(raw);
    return { addedNpcs: p.addedNpcs ?? [], dialogueTrees: p.dialogueTrees ?? {} };
  } catch {
    return { addedNpcs: [], dialogueTrees: {} };
  }
}

export const useEditorNpcStore = create<EditorNpcState>((set, get) => ({
  ...load(),

  addNpc: (areaId, position = [0, 1, 0]) => {
    const id = `npc_${Date.now().toString(36)}`;
    const treeId = `dlg_${id}`;
    const npc: EditorNpc = { id, name: 'New NPC', dialogueTreeId: treeId, color: '#38bdf8', areaId, position };
    const tree: DialogueTree = {
      id: treeId,
      rootNodeId: 'start',
      nodes: { start: { id: 'start', speaker: 'New NPC', text: 'Hello, traveller.', nextNodeId: null } },
    };
    const addedNpcs = [...get().addedNpcs, npc];
    const dialogueTrees = { ...get().dialogueTrees, [treeId]: tree };
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

  load: (data) => {
    const next = { addedNpcs: data.addedNpcs ?? [], dialogueTrees: data.dialogueTrees ?? {} };
    set(next);
    persist(next);
  },

  reset: () => {
    set({ addedNpcs: [], dialogueTrees: {} });
    persist({ addedNpcs: [], dialogueTrees: {} });
  },
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
