import { useState } from 'react';
import { useEditorQuestStore } from '../../stores/editorQuestStore';
import { QuestInspector } from './QuestInspector';

const inp = 'rounded bg-slate-800 px-1.5 py-1 text-xs text-slate-100 border border-slate-700';
const btn = 'rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700';

// Kit — the 📜 Quest / Item tab: quest list (left) + full inspector (right), plus an Items authoring
// section. Authored quests register into the runtime live; objectives auto-track via questTracking.
export const QuestEditorTab = () => {
  const quests = useEditorQuestStore((s) => s.quests);
  const items = useEditorQuestStore((s) => s.items);
  const [selId, setSelId] = useState<string | null>(null);
  const sel = quests.find((q) => q.id === selId) ?? null;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex gap-3">
        <div className="w-44 shrink-0 space-y-2">
          <button className={`w-full ${btn}`} onClick={() => setSelId(useEditorQuestStore.getState().newQuest())}>+ New Quest</button>
          <div className="max-h-[55vh] space-y-0.5 overflow-y-auto">
            {quests.map((q) => (
              <button key={q.id} onClick={() => setSelId(q.id)} className={`block w-full truncate rounded px-2 py-1 text-left ${selId === q.id ? 'bg-violet-600/30 text-violet-100' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}>
                {q.title} <span className="text-[9px] text-slate-500">· {q.objectives.length}obj</span>
              </button>
            ))}
            {quests.length === 0 && <p className="px-1 text-[10px] text-slate-500">No quests yet — “+ New Quest”.</p>}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {sel ? <QuestInspector eq={sel} /> : <p className="text-[11px] text-slate-500">Select or create a quest to edit it.</p>}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1 rounded border border-slate-700 bg-slate-900/50 p-2">
        <div className="flex items-center justify-between"><h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Items</h4>
          <button className={btn} onClick={() => useEditorQuestStore.getState().newItem()}>+ New Item</button>
        </div>
        {items.length === 0 && <p className="text-[10px] text-slate-400">No authored items. Seed items (Old Key, Healing Herb) are always available.</p>}
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-1">
            <input className={`w-12 ${inp}`} value={it.icon ?? ''} onChange={(e) => useEditorQuestStore.getState().upsertItem({ ...it, icon: e.target.value })} placeholder="◆" />
            <input className={`w-28 ${inp}`} value={it.name} onChange={(e) => useEditorQuestStore.getState().upsertItem({ ...it, name: e.target.value })} />
            <input className={`flex-1 ${inp}`} value={it.description} onChange={(e) => useEditorQuestStore.getState().upsertItem({ ...it, description: e.target.value })} placeholder="description" />
            <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={!!it.consumable} onChange={(e) => useEditorQuestStore.getState().upsertItem({ ...it, consumable: e.target.checked })} />use</label>
            <button className={`${btn} text-red-300`} onClick={() => useEditorQuestStore.getState().removeItem(it.id)}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
};
