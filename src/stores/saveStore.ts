import { create } from 'zustand';
import { usePlayerStore } from './playerStore';
import { useProgressionStore } from './progressionStore';
import { useInventoryStore } from './inventoryStore';
import { useFlagStore } from './flagStore';
import { useQuestStore } from './questStore';
import type { Quest } from '../types/quest';

// Kit — multi-slot game saves (play-mode 💾 tool). Snapshots the live game stores (player position/area,
// progression, inventory, flags, quest statuses + objective completion) into named localStorage slots, and
// restores them. De-yokai'd: no party/codex/friendship. Extend SaveData + snapshot/restore to add systems.
export interface SaveData {
  version: 1;
  player: { currentAreaId: string; position: { x: number; y: number; z: number } | null; distanceTraveled: number };
  progression: { level: number; exp: number };
  inventory: { items: Record<string, number>; pickedUpItems: string[] };
  flags: Record<string, boolean>;
  quests: Record<string, { status: Quest['status']; objectives: Record<string, boolean> }>;
}
export interface SaveSlot { name: string; savedAt: string; data: SaveData }

interface SaveStoreState {
  slots: SaveSlot[];
  saveToSlot: (name: string) => void;
  loadSlot: (name: string) => boolean;
  deleteSlot: (name: string) => void;
}

const STORAGE_KEY = 'r3f-rpg-builder-saves-v1';

function persist(slots: SaveSlot[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots })); } catch { /* ignore */ }
}
function load(): SaveSlot[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p.slots)) return p.slots as SaveSlot[]; } } catch { /* ignore */ }
  return [];
}

export function snapshotGame(): SaveData {
  const p = usePlayerStore.getState();
  const prog = useProgressionStore.getState();
  const inv = useInventoryStore.getState();
  const flags = useFlagStore.getState().flags;
  const quests = useQuestStore.getState().quests;
  const questData: SaveData['quests'] = {};
  for (const [qid, q] of Object.entries(quests)) {
    questData[qid] = { status: q.status, objectives: Object.fromEntries(q.objectives.map((o) => [o.id, o.isCompleted])) };
  }
  return {
    version: 1,
    player: { currentAreaId: p.currentAreaId, position: p.position, distanceTraveled: p.distanceTraveled },
    progression: { level: prog.level, exp: prog.exp },
    inventory: { items: { ...inv.items }, pickedUpItems: [...inv.pickedUpItems] },
    flags: { ...flags },
    quests: questData,
  };
}

export function restoreGame(d: SaveData): void {
  useProgressionStore.setState({ level: d.progression.level, exp: d.progression.exp });
  useInventoryStore.getState().setInventory(d.inventory.items);
  useInventoryStore.getState().setPickedUpItems(d.inventory.pickedUpItems);
  useFlagStore.getState().setFlags(d.flags);
  const statuses: Partial<Record<string, Quest['status']>> = {};
  const objStates: Record<string, Record<string, boolean>> = {};
  for (const [qid, q] of Object.entries(d.quests)) { statuses[qid] = q.status; objStates[qid] = q.objectives; }
  useQuestStore.getState().setQuestStatuses(statuses);
  useQuestStore.getState().setObjectiveStates(objStates);
  // Restore location last: set area + request a spawn so the Player teleports there.
  usePlayerStore.getState().setCurrentAreaId(d.player.currentAreaId);
  if (d.player.position) usePlayerStore.getState().requestSpawn(d.player.position);
}

export const useSaveStore = create<SaveStoreState>((set, get) => ({
  slots: load(),
  saveToSlot: (name) => {
    const slot: SaveSlot = { name, savedAt: new Date().toISOString(), data: snapshotGame() };
    const slots = [...get().slots.filter((s) => s.name !== name), slot].sort((a, b) => a.name.localeCompare(b.name));
    set({ slots }); persist(slots);
  },
  loadSlot: (name) => {
    const slot = get().slots.find((s) => s.name === name);
    if (!slot) return false;
    restoreGame(slot.data);
    return true;
  },
  deleteSlot: (name) => { const slots = get().slots.filter((s) => s.name !== name); set({ slots }); persist(slots); },
}));
