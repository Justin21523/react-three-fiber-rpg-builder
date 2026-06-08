import type { ReactNode } from 'react';
import type { EditorQuest } from '../../types/editorQuest';
import { describeObjective } from '../../game/editor/editorQuestToQuest';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex gap-2 text-[11px]"><span className="w-20 shrink-0 font-semibold uppercase tracking-wide text-slate-500">{label}</span><span className="flex-1 text-slate-300">{children}</span></div>
);

// Kit — read-only summary of a quest's flow: prereqs → giver → objectives → rewards → unlocks.
export const QuestFlowPreview = ({ eq }: { eq: EditorQuest }) => (
  <div className="space-y-1 rounded bg-slate-900/60 p-2">
    {eq.prerequisiteQuestIds.length > 0 && <Row label="Requires">{eq.prerequisiteQuestIds.join(', ')}</Row>}
    <Row label="Giver">{eq.startingNPCId || '(none — accept from board)'}</Row>
    <Row label="Objectives">
      <ol className="list-decimal space-y-0.5 pl-4">
        {eq.objectives.map((o) => (
          <li key={o.id}>{(o.description?.trim() || describeObjective(o))}{o.isOptional ? ' (optional)' : ''}</li>
        ))}
      </ol>
    </Row>
    <Row label="Rewards">{eq.rewards.map((r) => `${r.type}${r.amount ? ` ×${r.amount}` : ''}${r.targetId ? ` (${r.targetId})` : ''}`).join(', ') || '(none)'}</Row>
    {(eq.unlocksAreaIds.length > 0 || eq.unlocksQuestIds.length > 0 || eq.setsWorldFlags.length > 0) && (
      <Row label="Unlocks">{[...eq.unlocksAreaIds.map((a) => `area:${a}`), ...eq.unlocksQuestIds.map((q) => `quest:${q}`), ...eq.setsWorldFlags.map((f) => `flag:${f}`)].join(', ')}</Row>
    )}
  </div>
);
