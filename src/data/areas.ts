// Kit — the area registry. An area is a named place with an optional biome theme key. The world
// framework (Phase B) renders the current area and draws travel gates to its `connectedAreaIds`.
// `spawnPoint` is where the player lands when first entering (or when no reciprocal gate is found).
export interface KitArea {
  id: string;
  name: string;
  ambientTheme?: string; // a BIOME_THEMES key (campus/forest/city/…); inferred from id when omitted
  connectedAreaIds?: string[];
  spawnPoint?: { x: number; y: number; z: number };
}

export const SEED_AREAS: KitArea[] = [
  {
    id: 'area_field',
    name: 'Open Field',
    ambientTheme: 'campus',
    connectedAreaIds: ['area_forest'],
    spawnPoint: { x: 0, y: 3, z: 0 },
  },
  {
    id: 'area_forest',
    name: 'Forest Edge',
    ambientTheme: 'forest',
    connectedAreaIds: ['area_field'],
    spawnPoint: { x: 0, y: 3, z: 0 },
  },
];

export function getKitArea(id: string): KitArea | undefined {
  return SEED_AREAS.find((a) => a.id === id);
}
