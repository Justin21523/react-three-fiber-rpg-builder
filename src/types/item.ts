// Kit — minimal item model. Items are referenced by id from inventory, quests, and dialogue effects.
export interface Item {
  id: string;
  name: string;
  description: string;
  icon?: string;       // emoji or short glyph for the HUD
  consumable?: boolean;
}
