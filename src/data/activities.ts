import type { EditorActivity } from '../types/activity';
import { createDefaultActivity } from '../types/activity';
import { getEditorActivity } from '../stores/editorActivityStore';

// Kit — sample mini-games. Each is a full EditorActivity (mode + arena + participants + objectives +
// rewards + per-mode config) built from createDefaultActivity, then lightly customised. Author your own
// in the 🎮 Mini-games tab. getActivity(id) resolves editor-authored ones first, then these seeds.
const sampleRace = (): EditorActivity => {
  const ea = createDefaultActivity('area_field', 'race');
  ea.def.id = 'act_race_demo';
  ea.def.title = 'Courtyard Dash';
  ea.def.description = 'Reach the finish line before time runs out.';
  ea.code = 'act_race_demo';
  return ea;
};

const sampleRush = (): EditorActivity => {
  const ea = createDefaultActivity('area_field', 'enemyRush');
  ea.def.id = 'act_rush_demo';
  ea.def.title = 'Spirit Swarm';
  ea.def.description = 'Defeat as many foes as you can before the timer ends.';
  ea.code = 'act_rush_demo';
  if (ea.rushConfig) ea.rushConfig.combatantIds = ['cb_slime'];
  return ea;
};

export const SEED_ACTIVITIES: EditorActivity[] = [sampleRace(), sampleRush()];

export function getActivity(id: string | undefined): EditorActivity | undefined {
  if (!id) return undefined;
  return getEditorActivity(id) ?? SEED_ACTIVITIES.find((a) => a.def.id === id);
}
