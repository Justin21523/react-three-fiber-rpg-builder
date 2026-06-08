import { useState } from 'react';
import { useEditorQuestStore } from '../../stores/editorQuestStore';
import { useEditorNpcStore } from '../../stores/editorNpcStore';
import type { Quest, QuestObjective } from '../../types/quest';

const inp = 'rounded bg-slate-800 px-1.5 py-1 text-xs text-slate-100 border border-slate-700';
const btn = 'rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700';

// Kit — Quest + Item authoring. Quests register into the runtime questStore live (objectives, item/exp/
// flag reward, optional giver NPC). Items merge into getItem. Persisted to localStorage.
export const QuestEditorTab = () => {
  const quests = useEditorQuestStore((s) => s.quests);
  const items = useEditorQuestStore((s) => s.items);
  const npcs = useEditorNpcStore((s) => s.addedNpcs);
  const [selQ, setSelQ] = useState<string | null>(null);
  const sel = quests.find((q) => q.id === selQ) ?? null;
  const save = (q: Quest) => useEditorQuestStore.getState().upsertQuest(q);

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-violet-300">Quest / Item</h3>
        <button className={btn} onClick={() => setSelQ(useEditorQuestStore.getState().newQuest())}>+ New Quest</button>
      </div>

      {quests.length === 0 ? (
        <p className="rounded bg-slate-900/60 px-2 py-2 text-xs text-slate-400">No quests yet. “+ New Quest” registers it into the runtime immediately — it shows in the Quest tracker once a giver/dialogue starts it (or use a dialogue choice with the startQuest effect).</p>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {quests.map((q) => (
            <button key={q.id} onClick={() => setSelQ(q.id)} className={`truncate rounded border px-2 py-1 text-left ${selQ === q.id ? 'border-violet-500 bg-violet-900/30 text-violet-100' : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>{q.title}</button>
          ))}
        </div>
      )}

      {sel && (
        <div className="space-y-2 rounded border border-slate-700 bg-slate-900/50 p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">id: {sel.id}</span>
            <button className={`${btn} text-red-300`} onClick={() => { useEditorQuestStore.getState().removeQuest(sel.id); setSelQ(null); }}>Delete</button>
          </div>
          <label className="flex items-center gap-2">Title<input className={`flex-1 ${inp}`} value={sel.title} onChange={(e) => save({ ...sel, title: e.target.value })} /></label>
          <textarea className={`w-full ${inp}`} rows={2} value={sel.description} onChange={(e) => save({ ...sel, description: e.target.value })} placeholder="Description" />
          <label className="flex items-center gap-2">Giver NPC
            <select className={`flex-1 ${inp}`} value={sel.giverNpcId ?? ''} onChange={(e) => save({ ...sel, giverNpcId: e.target.value || undefined })}>
              <option value="">(none)</option>
              {npcs.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </label>

          {/* Objectives */}
          <div className="space-y-1 rounded border border-slate-700/70 bg-slate-950/40 p-2">
            <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase text-cyan-300">Objectives</span>
              <button className={btn} onClick={() => save({ ...sel, objectives: [...sel.objectives, { id: `obj_${sel.objectives.length + 1}`, description: 'Objective', isCompleted: false }] })}>+ Objective</button>
            </div>
            {sel.objectives.map((o, oi) => (
              <div key={o.id} className="flex items-center gap-1">
                <input className={`w-20 ${inp}`} value={o.id} onChange={(e) => editObj(sel, oi, { id: e.target.value }, save)} />
                <input className={`flex-1 ${inp}`} value={o.description} onChange={(e) => editObj(sel, oi, { description: e.target.value }, save)} />
                <button className={`${btn} text-red-300`} onClick={() => save({ ...sel, objectives: sel.objectives.filter((_, i) => i !== oi) })}>✕</button>
              </div>
            ))}
          </div>

          {/* Reward */}
          <div className="space-y-1 rounded border border-slate-700/70 bg-slate-950/40 p-2">
            <span className="text-xs font-bold uppercase text-amber-300">Reward</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">EXP<input type="number" className={`w-16 ${inp}`} value={sel.reward?.exp ?? 0} onChange={(e) => save({ ...sel, reward: { ...sel.reward, exp: parseInt(e.target.value, 10) || 0 } })} /></label>
              <label className="flex flex-1 items-center gap-1">Flags<input className={`flex-1 ${inp}`} value={(sel.reward?.flags ?? []).join(',')} onChange={(e) => save({ ...sel, reward: { ...sel.reward, flags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} placeholder="flag_a,flag_b" /></label>
            </div>
            <div className="flex items-center justify-between"><span className="text-xs text-slate-300">Item rewards</span>
              <button className={btn} onClick={() => save({ ...sel, reward: { ...sel.reward, items: [...(sel.reward?.items ?? []), { itemId: '', quantity: 1 }] } })}>+ Item</button>
            </div>
            {(sel.reward?.items ?? []).map((it, ii) => (
              <div key={ii} className="flex items-center gap-1">
                <select className={`flex-1 ${inp}`} value={it.itemId} onChange={(e) => editRewardItem(sel, ii, { itemId: e.target.value }, save)}>
                  <option value="">(pick item)</option>
                  {items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  <option value="item_old_key">Old Key (seed)</option>
                  <option value="item_herb">Healing Herb (seed)</option>
                </select>
                <input type="number" className={`w-14 ${inp}`} value={it.quantity ?? 1} onChange={(e) => editRewardItem(sel, ii, { quantity: parseInt(e.target.value, 10) || 1 }, save)} />
                <button className={`${btn} text-red-300`} onClick={() => save({ ...sel, reward: { ...sel.reward, items: (sel.reward?.items ?? []).filter((_, i) => i !== ii) } })}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-1 rounded border border-slate-700 bg-slate-900/50 p-2">
        <div className="flex items-center justify-between"><h4 className="text-xs font-bold uppercase text-emerald-300">Items</h4>
          <button className={btn} onClick={() => useEditorQuestStore.getState().newItem()}>+ New Item</button>
        </div>
        {items.length === 0 && <p className="text-xs text-slate-300">No authored items. Seed items (Old Key, Healing Herb) are always available.</p>}
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-1">
            <input className={`w-12 ${inp}`} value={it.icon ?? ''} onChange={(e) => useEditorQuestStore.getState().upsertItem({ ...it, icon: e.target.value })} placeholder="◆" />
            <input className={`w-28 ${inp}`} value={it.name} onChange={(e) => useEditorQuestStore.getState().upsertItem({ ...it, name: e.target.value })} />
            <input className={`flex-1 ${inp}`} value={it.description} onChange={(e) => useEditorQuestStore.getState().upsertItem({ ...it, description: e.target.value })} placeholder="description" />
            <label className="flex items-center gap-1 text-xs text-slate-400"><input type="checkbox" checked={!!it.consumable} onChange={(e) => useEditorQuestStore.getState().upsertItem({ ...it, consumable: e.target.checked })} />use</label>
            <button className={`${btn} text-red-300`} onClick={() => useEditorQuestStore.getState().removeItem(it.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
};

function editObj(q: Quest, idx: number, patch: Partial<QuestObjective>, save: (q: Quest) => void) {
  const objectives = q.objectives.map((o, i) => (i === idx ? { ...o, ...patch } : o));
  save({ ...q, objectives });
}
function editRewardItem(q: Quest, idx: number, patch: Partial<{ itemId: string; quantity: number }>, save: (q: Quest) => void) {
  const items = (q.reward?.items ?? []).map((it, i) => (i === idx ? { ...it, ...patch } : it));
  save({ ...q, reward: { ...q.reward, items } });
}
