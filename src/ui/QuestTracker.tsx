import { useMemo } from 'react';
import { useQuestStore } from '../stores/questStore';

// Kit — top-right panel listing in-progress quests and their objectives (✓ when done).
export const QuestTracker = () => {
  const quests = useQuestStore((s) => s.quests);
  const activeQuests = useMemo(() => Object.values(quests).filter((q) => q.status === 'InProgress'), [quests]);

  if (activeQuests.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-4 top-24 w-72 rounded-lg border border-yellow-500/70 bg-slate-900/85 p-4 text-white shadow-2xl backdrop-blur-md">
      <h2 className="mb-3 flex items-center gap-2 border-b border-yellow-600/50 pb-1 text-lg font-bold text-yellow-300">
        <span>📜</span> Active Quests
      </h2>
      <div className="space-y-4">
        {activeQuests.map((quest) => (
          <div key={quest.id}>
            <h3 className="mb-1 text-sm font-bold text-yellow-100">{quest.title}</h3>
            <p className="mb-2 text-xs italic text-slate-300">{quest.description}</p>
            <ul className="space-y-1.5">
              {quest.objectives.map((obj) => (
                <li key={obj.id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 ${obj.isCompleted ? 'text-green-400' : 'text-slate-400'}`}>{obj.isCompleted ? '✓' : '○'}</span>
                  <span className={`leading-tight ${obj.isCompleted ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{obj.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
