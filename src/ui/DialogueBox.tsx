import { useCallback, useEffect, useMemo } from 'react';
import { getDialogueTree } from '../game/dialogue/dialogueRegistry';
import { useTypewriter } from '../hooks/useTypewriter';
import { useDialogueStore } from '../stores/dialogueStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useQuestStore } from '../stores/questStore';
import { useDoorStore } from '../stores/doorStore';
import { useFlagStore } from '../stores/flagStore';
import { useProgressionStore } from '../stores/progressionStore';
import type { DialogueChoice, DialogueEmotion } from '../types/dialogue';

// Light portrait tint per speaker emotion.
const EMOTION_TINT: Record<DialogueEmotion, string> = {
  neutral: 'border-cyan-300/50 bg-cyan-950 text-cyan-100',
  happy: 'border-emerald-300/50 bg-emerald-950 text-emerald-100',
  sad: 'border-sky-300/50 bg-sky-950 text-sky-100',
  angry: 'border-red-400/50 bg-red-950 text-red-100',
  surprised: 'border-amber-300/50 bg-amber-950 text-amber-100',
  worried: 'border-violet-300/50 bg-violet-950 text-violet-100',
  thinking: 'border-slate-300/50 bg-slate-800 text-slate-100',
  excited: 'border-pink-300/50 bg-pink-950 text-pink-100',
};

export const DialogueBox = () => {
  const { isActive, currentTreeId, currentNodeId, tempTrees, selectChoice, advanceDialogue, endDialogue } =
    useDialogueStore();
  const hasItem = useInventoryStore((s) => s.hasItem);
  const quests = useQuestStore((s) => s.quests);
  const isDoorUnlocked = useDoorStore((s) => s.isUnlocked);
  const flags = useFlagStore((s) => s.flags);
  const playerLevel = useProgressionStore((s) => s.level);

  const tree = tempTrees.find((t) => t.id === currentTreeId) ?? getDialogueTree(currentTreeId);
  const node = currentNodeId ? tree?.nodes[currentNodeId] : undefined;
  const nodeIds = useMemo(() => (tree ? Object.keys(tree.nodes) : []), [tree]);
  const currentNodeIndex = currentNodeId ? nodeIds.indexOf(currentNodeId) : -1;
  const { displayedText, isComplete, skip } = useTypewriter(node?.text ?? '', 24);
  const choices = node?.choices;

  const availableChoices = useMemo(() => {
    if (!choices) return [];
    return choices.filter((choice) => {
      if (!choice.condition) return true;
      const cond = choice.condition;
      switch (cond.type) {
        case 'hasItem':
          return hasItem(cond.targetId);
        case 'questCompleted':
          return quests[cond.targetId]?.status === 'Completed';
        case 'questInProgress':
          return quests[cond.targetId]?.status === 'InProgress';
        case 'objectiveCompleted': {
          const q = quests[cond.questId];
          return q?.objectives.find((o) => o.id === cond.objectiveId)?.isCompleted ?? false;
        }
        case 'doorUnlocked':
          return isDoorUnlocked(cond.doorId);
        case 'worldFlagSet':
          return flags[cond.flag] === true;
        case 'playerLevel':
          return playerLevel >= cond.level;
        default:
          return false;
      }
    });
  }, [choices, hasItem, quests, isDoorUnlocked, flags, playerLevel]);

  const activeQuestCount = useMemo(
    () => Object.values(quests).filter((q) => q.status === 'InProgress').length,
    [quests],
  );

  const choose = useCallback((choice: DialogueChoice) => selectChoice(choice.id), [selectChoice]);

  const continueDialogue = useCallback(() => {
    if (!isActive || !node) return;
    if (!isComplete) { skip(); return; }
    if (availableChoices.length === 1) { choose(availableChoices[0]); return; }
    if (availableChoices.length > 1) return;
    if (node.choices && node.choices.length > 0) { endDialogue(); return; }
    if (node.nextNodeId) advanceDialogue();
    else endDialogue();
  }, [advanceDialogue, availableChoices, choose, endDialogue, isActive, isComplete, node, skip]);

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code !== 'Enter' && e.code !== 'Space' && e.code !== 'KeyE') return;
      e.preventDefault();
      continueDialogue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [continueDialogue, isActive]);

  if (!isActive || !currentTreeId || !currentNodeId || !node) return null;

  const hasMultipleChoices = isComplete && availableChoices.length > 1;
  const canContinue = !isComplete || availableChoices.length <= 1 || !node.choices;
  const progressLabel = currentNodeIndex >= 0 && nodeIds.length > 0 ? `${currentNodeIndex + 1}/${nodeIds.length}` : '1/1';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 to-transparent" />
      <section
        className="pointer-events-auto relative mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-cyan-400/50 bg-slate-950/95 text-white shadow-2xl shadow-cyan-950/40 backdrop-blur-md"
        onClick={canContinue ? continueDialogue : undefined}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-2 text-xs text-slate-300">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
            <span className="truncate font-semibold uppercase tracking-wide">Dialogue</span>
          </div>
          <div className="flex items-center gap-3 tabular-nums">
            <span>{progressLabel}</span>
            <span className="h-3 w-px bg-white/15" />
            <span>Active quests {activeQuestCount}</span>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[72px_1fr] sm:p-5">
          <div className="flex sm:block">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-md border text-2xl font-bold ${
                node.speaker === 'System' ? 'border-slate-500/60 bg-slate-800 text-slate-200' : EMOTION_TINT[node.emotion ?? 'neutral']
              }`}
            >
              {node.speaker.charAt(0)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-cyan-200 sm:text-xl">{node.speaker}</h3>
              <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">
                {!isComplete ? 'Typing' : hasMultipleChoices ? 'Choose' : 'Continue'}
              </span>
            </div>
            <p className="min-h-[5rem] whitespace-pre-wrap text-base leading-7 text-slate-100 sm:text-lg">
              {displayedText}
              {!isComplete && <span className="ml-1 animate-pulse text-cyan-300">|</span>}
            </p>

            {isComplete && availableChoices.length > 1 && (
              <div className="mt-4 grid gap-2 border-t border-white/10 pt-4" onClick={(e) => e.stopPropagation()}>
                {availableChoices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => choose(choice)}
                    className="w-full rounded-md border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-100 transition-colors hover:border-cyan-400 hover:bg-cyan-950/60 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  >
                    <span className="mr-2 text-cyan-300">›</span>
                    {choice.text}
                  </button>
                ))}
              </div>
            )}

            {isComplete && node.choices && node.choices.length > 0 && availableChoices.length === 0 && (
              <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
                No available response right now.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
          <span>{hasMultipleChoices ? 'Select a response' : 'Click, Enter, Space, or E to continue'}</span>
          {!hasMultipleChoices && (
            <button
              onClick={(e) => { e.stopPropagation(); continueDialogue(); }}
              className="rounded-md bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            >
              {isComplete ? 'Continue' : 'Skip'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
