import type { ActivityDefinition } from '../types/activity';
import { getEditorActivity } from '../stores/editorActivityStore';

// Kit — sample mini-games (one per type). Author your own in the 🎮 Mini-games tab.
export const SEED_ACTIVITIES: ActivityDefinition[] = [
  { id: 'act_reaction', name: 'Quick Reflex', type: 'reaction', description: 'Click the instant it turns green.', durationSec: 5, targetScore: 1, reward: { exp: 20 } },
  { id: 'act_clicker', name: 'Bug Squash', type: 'clicker', description: 'Click as many targets as you can!', durationSec: 10, targetScore: 8, reward: { items: [{ itemId: 'item_herb', quantity: 1 }], exp: 30 } },
  { id: 'act_memory', name: 'Echo', type: 'memory', description: 'Repeat the growing colour sequence.', durationSec: 30, targetScore: 4, reward: { exp: 40, flags: ['memory_master'] } },
];

export function getActivity(id: string | undefined): ActivityDefinition | undefined {
  if (!id) return undefined;
  return getEditorActivity(id) ?? SEED_ACTIVITIES.find((a) => a.id === id);
}
