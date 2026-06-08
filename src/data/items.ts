import type { Item } from '../types/item';
import { getEditorItem } from '../stores/editorQuestStore';

// Kit — sample item catalogue. Add your own; reference them by id from quests / dialogue / placements.
export const SEED_ITEMS: Item[] = [
  { id: 'item_old_key', name: 'Old Key', description: 'A rusty key that fits a weathered lock.', icon: '🗝' },
  { id: 'item_herb', name: 'Healing Herb', description: 'A fragrant herb. Restores a little vigor.', icon: '🌿', consumable: true },
];

export function getItem(id: string): Item | undefined {
  // Editor-authored items (📜 Quest / Item tab) win over seed items.
  return getEditorItem(id) ?? SEED_ITEMS.find((i) => i.id === id);
}
