import { create } from 'zustand';
import type { BattleParticipant, BattlePhase, BattleWinCondition, Combatant } from '../types/combat';
import type { EditorEncounter } from '../types/editorEncounter';
import { buildPlayerCombatant } from '../data/combatants';
import { useProgressionStore } from './progressionStore';
import { useInventoryStore } from './inventoryStore';
import { useFlagStore } from './flagStore';
import { getItem } from '../data/items';
import { applyEncounterRewards } from './editorEncounterStore';
import { runQuestTracking } from '../game/quest/questTracking';

// Kit — generic turn-based battle: 1 player combatant vs N enemies. Round-based (player acts, then all
// living enemies act). Damage = attack + skillPower − defense (min 1); defending halves incoming damage.
// On victory: grant the encounter's rewards + `defeated_<id>` flags (drive defeatEnemy quest objectives).

interface EnemyDef { combatant: Combatant; level: number; isBoss?: boolean }

interface BattleState {
  isActive: boolean;
  phase: BattlePhase;
  participants: BattleParticipant[];
  log: string[];
  round: number;
  winCondition: BattleWinCondition;
  encounter: EditorEncounter | null;
  startBattle: (opts: { enemies: EnemyDef[]; winCondition?: BattleWinCondition; encounter?: EditorEncounter | null }) => void;
  playerAttack: (targetId: string) => void;
  playerSkill: (skillId: string, targetId: string) => void;
  playerDefend: () => void;
  playerItem: (itemId: string) => void;
  playerFlee: () => void;
  closeBattle: () => void;
}

const scaleStat = (base: number, level: number) => Math.round(base * (1 + (level - 1) * 0.1));

function toParticipant(c: Combatant, side: 'player' | 'enemy', level: number, isBoss: boolean, idx: number): BattleParticipant {
  const hp = side === 'enemy' ? scaleStat(c.maxHp, level) : c.maxHp;
  return {
    battleId: `${side[0]}${idx}`,
    combatantId: c.id,
    side, name: c.name, level,
    maxHp: hp, currentHp: hp,
    attack: side === 'enemy' ? scaleStat(c.attack, level) : c.attack,
    defense: side === 'enemy' ? scaleStat(c.defense, level) : c.defense,
    speed: c.speed,
    skills: c.skills, cooldowns: {}, isDefending: false, isAlive: true,
    isBoss, bossPhaseIndex: isBoss ? 0 : undefined,
    modelAssetId: c.modelAssetId, color: c.color,
  };
}

export const useBattleStore = create<BattleState>((set, get) => {
  const log = (line: string) => set((s) => ({ log: [...s.log, line].slice(-40) }));
  const players = () => get().participants.filter((p) => p.side === 'player');
  const enemies = () => get().participants.filter((p) => p.side === 'enemy');
  const update = (battleId: string, patch: Partial<BattleParticipant>) =>
    set((s) => ({ participants: s.participants.map((p) => (p.battleId === battleId ? { ...p, ...patch } : p)) }));

  const damage = (attacker: BattleParticipant, target: BattleParticipant, power: number) => {
    let dmg = Math.max(1, attacker.attack + power - target.defense);
    if (target.isDefending) dmg = Math.ceil(dmg / 2);
    const hp = Math.max(0, target.currentHp - dmg);
    update(target.battleId, { currentHp: hp, isAlive: hp > 0 });
    log(`${attacker.name} hits ${target.name} for ${dmg}.`);
    if (hp <= 0) log(`${target.name} is defeated!`);
    // Boss phase transition on the target (if it's a boss with phases).
    const enc = get().encounter;
    if (hp > 0 && target.isBoss && enc?.bossPhases?.length) {
      const frac = hp / target.maxHp;
      const idx = target.bossPhaseIndex ?? 0;
      const next = enc.bossPhases[idx];
      if (next && frac < next.hpThreshold) {
        update(target.battleId, {
          bossPhaseIndex: idx + 1,
          attack: Math.round(target.attack * (next.statMult?.attack ?? 1)),
          defense: Math.round(target.defense * (next.statMult?.defense ?? 1)),
        });
        log(`— ${next.phaseName} —`);
        if (next.dialogueLine) log(`${target.name}: ${next.dialogueLine}`);
      }
    }
  };

  const checkWin = (): boolean => {
    const wc = get().winCondition;
    if (enemies().every((e) => !e.isAlive)) { endBattle('won'); return true; }
    if (wc.type === 'surviveTurns' && get().round > wc.turns) { endBattle('won'); return true; }
    return false;
  };

  const endBattle = (result: 'won' | 'lost') => {
    const enc = get().encounter;
    const lines = result === 'won' ? enc?.battleDialogue?.victory : enc?.battleDialogue?.defeat;
    (lines ?? []).forEach((l) => log(l));
    if (result === 'won') {
      log('Victory!');
      if (enc) applyEncounterRewards(enc);
      // Flags for defeatEnemy quest objectives.
      if (enc) useFlagStore.getState().setFlag(`defeated_${enc.id}`);
      for (const e of enemies()) if (e.combatantId) useFlagStore.getState().setFlag(`defeated_${e.combatantId}`);
      runQuestTracking();
    } else {
      log('Defeated…');
    }
    set({ phase: result });
  };

  const tickCooldowns = () => set((s) => ({
    participants: s.participants.map((p) => ({ ...p, cooldowns: Object.fromEntries(Object.entries(p.cooldowns).map(([k, v]) => [k, Math.max(0, v - 1)])) })),
  }));

  const enemyTurn = () => {
    for (const e of [...enemies()].filter((x) => x.isAlive).sort((a, b) => b.speed - a.speed)) {
      const me = get().participants.find((p) => p.battleId === e.battleId)!;
      const target = players().find((p) => p.isAlive);
      if (!target) break;
      // Use a ready skill sometimes, else basic attack.
      const ready = me.skills.filter((sk) => sk.kind === 'damage' && !(me.cooldowns[sk.id] > 0));
      const sk = ready.length && Math.random() < 0.5 ? ready[0] : null;
      if (sk) { damage(me, get().participants.find((p) => p.battleId === target.battleId)!, sk.power); update(me.battleId, { cooldowns: { ...me.cooldowns, [sk.id]: sk.cooldown ?? 0 } }); }
      else damage(me, get().participants.find((p) => p.battleId === target.battleId)!, 0);
      if (!players().some((p) => p.isAlive)) { endBattle('lost'); return; }
    }
    // End of round.
    players().forEach((p) => update(p.battleId, { isDefending: false }));
    tickCooldowns();
    set((s) => ({ round: s.round + 1 }));
    if (checkWin()) return;
    if (!players().some((p) => p.isAlive)) { endBattle('lost'); return; }
    set({ phase: 'playerTurn' });
  };

  const afterPlayerAction = () => {
    if (checkWin()) return;
    set({ phase: 'enemyTurn' });
    // Resolve enemy turn (immediate; the overlay reads the log).
    enemyTurn();
  };

  return {
    isActive: false,
    phase: 'intro',
    participants: [],
    log: [],
    round: 1,
    winCondition: { type: 'defeatAll' },
    encounter: null,

    startBattle: ({ enemies: defs, winCondition, encounter }) => {
      const player = toParticipant(buildPlayerCombatant(useProgressionStore.getState().level), 'player', useProgressionStore.getState().level, false, 0);
      const enemyParts = defs.map((d, i) => toParticipant(d.combatant, 'enemy', d.level, !!d.isBoss, i));
      const startLines = encounter?.battleDialogue?.battleStart ?? [];
      set({
        isActive: true, phase: 'playerTurn', round: 1,
        participants: [player, ...enemyParts],
        log: [`A battle begins!`, ...startLines],
        winCondition: winCondition ?? encounter?.winCondition ?? { type: 'defeatAll' },
        encounter: encounter ?? null,
      });
    },

    playerAttack: (targetId) => {
      if (get().phase !== 'playerTurn') return;
      const p = players()[0]; const t = get().participants.find((x) => x.battleId === targetId);
      if (!p || !t || !t.isAlive) return;
      damage(p, t, 0);
      afterPlayerAction();
    },
    playerSkill: (skillId, targetId) => {
      if (get().phase !== 'playerTurn') return;
      const p = players()[0]; const sk = p?.skills.find((s) => s.id === skillId);
      if (!p || !sk || (p.cooldowns[skillId] ?? 0) > 0) return;
      if (sk.kind === 'heal') { const hp = Math.min(p.maxHp, p.currentHp + sk.power); update(p.battleId, { currentHp: hp }); log(`${p.name} recovers ${sk.power} HP.`); }
      else { const t = get().participants.find((x) => x.battleId === targetId); if (!t || !t.isAlive) return; damage(p, t, sk.power); }
      update(p.battleId, { cooldowns: { ...p.cooldowns, [skillId]: sk.cooldown ?? 0 } });
      afterPlayerAction();
    },
    playerDefend: () => {
      if (get().phase !== 'playerTurn') return;
      const p = players()[0]; if (!p) return;
      update(p.battleId, { isDefending: true });
      log(`${p.name} braces for impact.`);
      afterPlayerAction();
    },
    playerItem: (itemId) => {
      if (get().phase !== 'playerTurn') return;
      const p = players()[0]; if (!p) return;
      if (!useInventoryStore.getState().useItem(itemId)) return; // consumes; only consumable items
      const heal = Math.round(p.maxHp * 0.25);
      update(p.battleId, { currentHp: Math.min(p.maxHp, p.currentHp + heal) });
      log(`${p.name} uses ${getItem(itemId)?.name ?? itemId} (+${heal} HP).`);
      afterPlayerAction();
    },
    playerFlee: () => {
      if (get().phase !== 'playerTurn') return;
      log('You fled the battle.');
      set({ isActive: false, phase: 'intro' });
    },
    closeBattle: () => set({ isActive: false, phase: 'intro', participants: [], log: [], encounter: null }),
  };
});
