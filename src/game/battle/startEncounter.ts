import type { Combatant } from '../../types/combat';
import type { EditorEncounter } from '../../types/editorEncounter';
import { getCombatant } from '../../data/combatants';
import { useBattleStore } from '../../stores/battleStore';

// Kit — resolve an editor encounter's slots into combatant defs and launch the battle.
export function startEditorEncounter(enc: EditorEncounter | undefined): boolean {
  if (!enc || enc.enemyTeam.length === 0) return false;
  if (useBattleStore.getState().isActive) return false;
  const enemies = enc.enemyTeam.flatMap((slot) => {
    const c = getCombatant(slot.combatantId);
    return c ? [{ combatant: c as Combatant, level: slot.level, isBoss: slot.isBoss }] : [];
  });
  if (enemies.length === 0) return false;
  useBattleStore.getState().startBattle({ enemies, winCondition: enc.winCondition, encounter: enc });
  return true;
}
