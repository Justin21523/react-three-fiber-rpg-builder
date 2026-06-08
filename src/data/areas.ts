// Kit — minimal area registry. An area is a named place with an optional biome theme key. The world
// framework (Phase B) renders the current area; add more here or via the editor.
export interface KitArea {
  id: string;
  name: string;
  ambientTheme?: string; // a BIOME_THEMES key (campus/forest/city/…); inferred from id when omitted
  connectedAreaIds?: string[];
}

export const SEED_AREAS: KitArea[] = [
  { id: 'area_field', name: 'Open Field', ambientTheme: 'campus', connectedAreaIds: ['area_forest'] },
  { id: 'area_forest', name: 'Forest Edge', ambientTheme: 'forest', connectedAreaIds: ['area_field'] },
];
