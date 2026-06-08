import { useState } from 'react';
import { useBattleStore } from '../stores/battleStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { getItem } from '../data/items';
import type { CombatSkill } from '../types/combat';

const HpBar = ({ cur, max, color }: { cur: number; max: number; color: string }) => (
  <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
    <div className="h-full transition-all" style={{ width: `${Math.max(0, (cur / max) * 100)}%`, backgroundColor: color }} />
  </div>
);

// Kit — full-screen battle overlay (shown when a battle is active). Enemy targets up top, player + action
// menu at the bottom, a scrolling log. Generic turn-based combat (see battleStore).
export const BattleOverlay = () => {
  const isActive = useBattleStore((s) => s.isActive);
  const phase = useBattleStore((s) => s.phase);
  const participants = useBattleStore((s) => s.participants);
  const log = useBattleStore((s) => s.log);
  const items = useInventoryStore((s) => s.items);
  const [mode, setMode] = useState<'menu' | 'attack' | 'skill' | 'item'>('menu');
  const [pendingSkill, setPendingSkill] = useState<CombatSkill | null>(null);

  if (!isActive) return null;

  const player = participants.find((p) => p.side === 'player');
  const enemies = participants.filter((p) => p.side === 'enemy');
  const reset = () => { setMode('menu'); setPendingSkill(null); };
  const targeting = mode === 'attack' || (mode === 'skill' && !!pendingSkill && pendingSkill.kind === 'damage');

  const onEnemyClick = (battleId: string) => {
    if (mode === 'attack') { useBattleStore.getState().playerAttack(battleId); reset(); }
    else if (mode === 'skill' && pendingSkill) { useBattleStore.getState().playerSkill(pendingSkill.id, battleId); reset(); }
  };
  const pickSkill = (sk: CombatSkill) => {
    if (sk.kind === 'heal') { useBattleStore.getState().playerSkill(sk.id, ''); reset(); }
    else { setPendingSkill(sk); setMode('skill'); }
  };

  const consumables = Object.keys(items).filter((id) => getItem(id)?.consumable && items[id] > 0);
  const ended = phase === 'won' || phase === 'lost';

  return (
    <div className="pointer-events-auto fixed inset-0 z-[90] flex flex-col bg-slate-950/80 backdrop-blur-sm">
      {/* Enemies */}
      <div className="flex flex-wrap items-start justify-center gap-3 p-4">
        {enemies.map((e) => (
          <button
            key={e.battleId}
            disabled={!targeting || !e.isAlive}
            onClick={() => onEnemyClick(e.battleId)}
            className={`w-40 rounded-lg border p-2 text-left text-xs ${!e.isAlive ? 'border-slate-800 bg-slate-900/50 opacity-40' : targeting ? 'border-red-400 bg-red-950/40 hover:bg-red-900/50' : 'border-slate-700 bg-slate-900/70'}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: e.color ?? '#ef4444' }} />
              <span className="flex-1 truncate font-semibold text-slate-100">{e.name}</span>
              {e.isBoss && <span className="rounded bg-red-700/50 px-1 text-[9px] text-red-100">BOSS</span>}
              <span className="text-[10px] text-slate-400">Lv{e.level}</span>
            </div>
            <div className="mt-1"><HpBar cur={e.currentHp} max={e.maxHp} color="#ef4444" /></div>
            <div className="mt-0.5 text-right text-[10px] tabular-nums text-slate-400">{e.currentHp}/{e.maxHp}</div>
          </button>
        ))}
      </div>

      {/* Log */}
      <div className="mx-auto h-32 w-full max-w-2xl flex-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-[11px] text-slate-300">
        {log.map((l, i) => <div key={i} className={l.startsWith('—') ? 'my-0.5 text-center font-bold text-amber-300' : ''}>{l}</div>)}
      </div>

      {/* Player + actions */}
      <div className="mx-auto w-full max-w-2xl space-y-2 p-4">
        {player && (
          <div className="rounded-lg border border-cyan-700/50 bg-slate-900/80 p-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-cyan-200">{player.name}</span>
              <span className="text-[10px] text-slate-400">Lv{player.level}</span>
              <span className="ml-auto tabular-nums text-slate-300">{player.currentHp}/{player.maxHp} HP</span>
            </div>
            <div className="mt-1"><HpBar cur={player.currentHp} max={player.maxHp} color="#38bdf8" /></div>
          </div>
        )}

        {ended ? (
          <div className="flex items-center gap-3 rounded-lg border border-violet-600/50 bg-violet-950/40 p-3">
            <span className={`text-lg font-bold ${phase === 'won' ? 'text-emerald-300' : 'text-red-300'}`}>{phase === 'won' ? '🏆 Victory!' : '💀 Defeated'}</span>
            <button onClick={() => useBattleStore.getState().closeBattle()} className="ml-auto rounded-md bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Close</button>
          </div>
        ) : phase === 'playerTurn' ? (
          mode === 'menu' ? (
            <div className="flex flex-wrap gap-2">
              <ActBtn onClick={() => setMode('attack')}>⚔ Attack</ActBtn>
              <ActBtn onClick={() => setMode('skill')}>✨ Skill</ActBtn>
              <ActBtn onClick={() => useBattleStore.getState().playerDefend()}>🛡 Defend</ActBtn>
              <ActBtn onClick={() => setMode('item')} disabled={consumables.length === 0}>🎒 Item</ActBtn>
              <ActBtn onClick={() => useBattleStore.getState().playerFlee()} tone="amber">🏃 Flee</ActBtn>
            </div>
          ) : mode === 'skill' && !pendingSkill ? (
            <div className="flex flex-wrap gap-2">
              {player?.skills.map((sk) => {
                const cd = player.cooldowns[sk.id] ?? 0;
                return <ActBtn key={sk.id} disabled={cd > 0} onClick={() => pickSkill(sk)}>{sk.name} {sk.kind === 'heal' ? `+${sk.power}` : `⚔${sk.power}`}{cd > 0 ? ` (${cd})` : ''}</ActBtn>;
              })}
              <ActBtn onClick={reset} tone="slate">← Back</ActBtn>
            </div>
          ) : mode === 'item' ? (
            <div className="flex flex-wrap gap-2">
              {consumables.map((id) => <ActBtn key={id} onClick={() => { useBattleStore.getState().playerItem(id); reset(); }}>{getItem(id)?.icon ?? '◆'} {getItem(id)?.name ?? id} ×{items[id]}</ActBtn>)}
              <ActBtn onClick={reset} tone="slate">← Back</ActBtn>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2 text-xs text-red-100">
              <span>{mode === 'attack' ? 'Choose a target to attack.' : `Choose a target for ${pendingSkill?.name}.`}</span>
              <button onClick={reset} className="ml-auto rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700">Cancel</button>
            </div>
          )
        ) : (
          <p className="text-center text-xs text-slate-400">Enemy turn…</p>
        )}
      </div>
    </div>
  );
};

const ActBtn = ({ onClick, children, disabled, tone = 'cyan' }: { onClick: () => void; children: React.ReactNode; disabled?: boolean; tone?: 'cyan' | 'amber' | 'slate' }) => {
  const tones: Record<string, string> = {
    cyan: 'border-cyan-600/50 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-100',
    amber: 'border-amber-600/50 bg-amber-600/15 hover:bg-amber-600/25 text-amber-100',
    slate: 'border-slate-600 bg-slate-800/70 hover:bg-slate-700 text-slate-200',
  };
  return <button onClick={onClick} disabled={disabled} className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${tones[tone]}`}>{children}</button>;
};
