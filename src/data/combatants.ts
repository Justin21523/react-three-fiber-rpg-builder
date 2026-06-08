import type { Combatant } from '../types/combat';
import { getEditorCombatant } from '../stores/editorEncounterStore';

// Kit — sample combatants for the generic battle system. Author your own in the ⚔ Encounters tab.
export const SEED_COMBATANTS: Combatant[] = [
  { id: 'cb_slime', name: 'Slime', maxHp: 28, attack: 8, defense: 3, speed: 6, color: '#4ade80', skills: [{ id: 'sk_bash', name: 'Bash', power: 4, kind: 'damage' }] },
  { id: 'cb_brigand', name: 'Brigand', maxHp: 44, attack: 12, defense: 5, speed: 10, color: '#f97316', skills: [{ id: 'sk_slash', name: 'Slash', power: 8, kind: 'damage', cooldown: 2 }] },
  { id: 'cb_golem', name: 'Stone Golem', maxHp: 90, attack: 16, defense: 12, speed: 3, color: '#94a3b8', skills: [{ id: 'sk_smash', name: 'Smash', power: 14, kind: 'damage', cooldown: 3 }] },
];

export function getCombatant(id: string | undefined): Combatant | undefined {
  if (!id) return undefined;
  return getEditorCombatant(id) ?? SEED_COMBATANTS.find((c) => c.id === id);
}

// The player's combatant, scaled from the current player level (no party/roster in the kit).
export function buildPlayerCombatant(level: number): Combatant {
  const lv = Math.max(1, level);
  return {
    id: 'player',
    name: 'You',
    maxHp: 40 + lv * 8,
    attack: 10 + lv * 2,
    defense: 5 + lv,
    speed: 8 + lv,
    color: '#38bdf8',
    skills: [
      { id: 'sk_strike', name: 'Power Strike', power: 6, kind: 'damage', cooldown: 1 },
      { id: 'sk_mend', name: 'Mend', power: 18, kind: 'heal', cooldown: 3 },
    ],
  };
}
