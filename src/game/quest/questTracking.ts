import { useEffect } from 'react';
import { useQuestStore } from '../../stores/questStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useFlagStore } from '../../stores/flagStore';
import { useDoorStore } from '../../stores/doorStore';
import { usePlayerStore } from '../../stores/playerStore';

// Kit — generic auto-tracker for quests (replaces the yokai-specific YokaiQuestCondition system). Scans
// InProgress quests' objective `track` hints against live store signals and flips isCompleted when met.
// Objective kinds it understands: collectItem (inventory qty), talkToNPC (npc_talked_<id> flag), visit/
// reach (visited_<area> flag), unlockDoor (door store), inspect/triggerEvent/useTravelGate (a flag the
// trigger sets). 'custom' objectives are completed manually (e.g. a dialogue completeObjective effect).
let running = false;

export function runQuestTracking(): void {
  if (running) return; // guard against re-entrancy from updateObjective → store change → re-run
  running = true;
  try {
    const qs = useQuestStore.getState();
    const inv = useInventoryStore.getState();
    const flags = useFlagStore.getState();
    const doors = useDoorStore.getState();
    for (const q of Object.values(qs.quests)) {
      if (q.status !== 'InProgress') continue;
      for (const o of q.objectives) {
        if (o.isCompleted || !o.track) continue;
        const { type, targetId, count } = o.track;
        let done = false;
        switch (type) {
          case 'collectItem': done = !!targetId && inv.getItemQuantity(targetId) >= (count ?? 1); break;
          case 'talkToNPC': done = !!targetId && flags.hasFlag(`npc_talked_${targetId}`); break;
          case 'visitArea':
          case 'reachLocation': done = !!targetId && flags.hasFlag(`visited_${targetId}`); break;
          case 'unlockDoor': done = !!targetId && doors.isUnlocked(targetId); break;
          case 'inspectObject':
          case 'triggerEvent':
          case 'useTravelGate': done = !!targetId && (flags.hasFlag(`trigger_fired_${targetId}`) || flags.hasFlag(targetId)); break;
          case 'defeatEnemy': done = !!targetId && flags.hasFlag(`defeated_${targetId}`); break;
          default: break;
        }
        if (done) qs.updateObjective(q.id, o.id, true);
      }
    }
  } finally {
    running = false;
  }
}

// Non-visual: subscribes to the live stores and re-evaluates tracking on any relevant change; also marks
// the current area visited (for visitArea / reachLocation objectives).
export const QuestTrackerController = () => {
  useEffect(() => {
    let lastArea = usePlayerStore.getState().currentAreaId;
    useFlagStore.getState().setFlag(`visited_${lastArea}`);
    runQuestTracking();
    const unsubs = [
      useInventoryStore.subscribe(runQuestTracking),
      useFlagStore.subscribe(runQuestTracking),
      useDoorStore.subscribe(runQuestTracking),
      useQuestStore.subscribe(runQuestTracking), // catches quest start (objectives may already be met)
      usePlayerStore.subscribe((s) => {
        if (s.currentAreaId !== lastArea) {
          lastArea = s.currentAreaId;
          useFlagStore.getState().setFlag(`visited_${lastArea}`);
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);
  return null;
};
