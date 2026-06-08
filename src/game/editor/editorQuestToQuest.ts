import type { Quest, QuestObjective, QuestReward } from '../../types/quest';
import type { EditorQuest, EditorObjective } from '../../types/editorQuest';
import { useEditorQuestStore } from '../../stores/editorQuestStore';
import { useQuestStore } from '../../stores/questStore';

// Kit — convert an Editor-authored quest into the runtime Quest shape so the existing tracker / UI /
// reward / NPC-giver / turn-in machinery applies. Objectives carry a generic `track` hint the kit's
// questTracking watches; rewards collapse to QuestReward{items,exp,flags}. Editor quests use
// `source: 'runtime'` (registered live; the save system keeps them).

// Map an editor objective to a generic auto-track hint.
export function objectiveToTrack(o: EditorObjective): { type: string; targetId?: string; count?: number } {
  const count = Math.max(1, o.requiredCount ?? 1);
  const t = o.targetId;
  switch (o.type) {
    case 'talkToNPC': return { type: 'talkToNPC', targetId: t };
    case 'collectItem': return { type: 'collectItem', targetId: t, count };
    case 'visitArea': return { type: 'visitArea', targetId: t ?? o.relatedAreaId };
    case 'reachLocation': return { type: 'reachLocation', targetId: t ?? o.relatedAreaId };
    case 'inspectObject': return { type: 'inspectObject', targetId: t ?? o.relatedTriggerId };
    case 'triggerEvent': return { type: 'triggerEvent', targetId: t ?? o.relatedTriggerId };
    case 'useTravelGate': return { type: 'useTravelGate', targetId: t ?? o.relatedTriggerId };
    case 'unlockDoor': return { type: 'unlockDoor', targetId: t };
    case 'defeatEnemy': return { type: 'defeatEnemy', targetId: t };
    default: return { type: 'custom', targetId: t };
  }
}

// Human-readable auto label for an objective (when no description override is given).
export function describeObjective(o: EditorObjective): string {
  const t = o.targetId ?? o.relatedAreaId ?? o.relatedTriggerId ?? '';
  const n = o.requiredCount ?? 1;
  switch (o.type) {
    case 'talkToNPC': return `Talk to ${t || 'an NPC'}`;
    case 'collectItem': return `Collect ${n} × ${t || 'item'}`;
    case 'visitArea': return `Visit ${t || 'an area'}`;
    case 'reachLocation': return `Reach ${t || 'the location'}`;
    case 'inspectObject': return `Inspect ${t || 'the object'}`;
    case 'triggerEvent': return `Trigger ${t || 'the event'}`;
    case 'useTravelGate': return `Use the gate ${t || ''}`.trim();
    case 'unlockDoor': return `Open ${t || 'the door'}`;
    case 'defeatEnemy': return `Defeat ${t || 'the enemy'}`;
    default: return o.description?.trim() || 'Objective';
  }
}

function buildReward(eq: EditorQuest): QuestReward {
  const items: { itemId: string; quantity?: number }[] = [];
  const flags: string[] = [];
  let exp = 0;
  for (const r of eq.rewards) {
    const amount = r.amount ?? 1;
    switch (r.type) {
      case 'exp': exp += amount; break;
      case 'item': if (r.targetId) items.push({ itemId: r.targetId, quantity: amount }); break;
      case 'worldFlag': if (r.targetId) flags.push(r.targetId); break;
      case 'unlockArea': if (r.targetId) flags.push(`area_unlocked_${r.targetId}`); break;
      case 'unlockQuest': if (r.targetId) flags.push(`quest_unlocked_${r.targetId}`); break;
      case 'currency': flags.push(`currency_granted_${amount}`); break;
    }
  }
  for (const a of eq.unlocksAreaIds) flags.push(`area_unlocked_${a}`);
  for (const q of eq.unlocksQuestIds) flags.push(`quest_unlocked_${q}`);
  for (const f of eq.setsWorldFlags) flags.push(f);
  return { items: items.length ? items : undefined, exp: exp || undefined, flags: flags.length ? flags : undefined };
}

export function editorQuestToQuest(eq: EditorQuest): Quest {
  const objectives: QuestObjective[] = eq.objectives.map((o) => ({
    id: o.id,
    description: (o.description?.trim() || describeObjective(o)) + (o.isOptional ? ' (optional)' : ''),
    isCompleted: false,
    track: objectiveToTrack(o),
  }));
  return {
    id: eq.id,
    title: eq.title,
    description: eq.description,
    objectives,
    status: 'NotStarted',
    reward: buildReward(eq),
    source: 'runtime',
    requiredPlayerLevel: eq.recommendedLevel,
    giverNpcId: eq.startingNPCId,
  };
}

// Register every enabled editor quest into questStore, preserving any existing runtime progress
// (status + per-objective completion) so re-syncing after an edit doesn't reset a quest.
export function syncEditorQuests(): number {
  const qs = useQuestStore.getState();
  const editorQuests = useEditorQuestStore.getState().quests.filter((q) => q.isEnabled !== false);
  for (const eq of editorQuests) {
    const fresh = editorQuestToQuest(eq);
    const existing = qs.getQuestById(eq.id);
    if (existing) {
      fresh.status = existing.status;
      fresh.objectives = fresh.objectives.map((o) => ({
        ...o,
        isCompleted: existing.objectives.find((e) => e.id === o.id)?.isCompleted ?? false,
      }));
    }
    qs.registerRuntimeQuest(fresh);
  }
  return editorQuests.length;
}

// Resolve a quest by id: runtime store first, else a live-converted (not-yet-synced) editor quest.
export function getQuest(id: string): Quest | undefined {
  const runtime = useQuestStore.getState().getQuestById(id);
  if (runtime) return runtime;
  const eq = useEditorQuestStore.getState().quests.find((q) => q.id === id || q.code === id);
  return eq ? editorQuestToQuest(eq) : undefined;
}
