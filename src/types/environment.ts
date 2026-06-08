// Phase 23 — Environment design tokens.
// A theme gives each area/biome a coherent greybox art direction: a palette for
// ground/walls/accents plus role colors (danger/interactable/portal) and a few
// lighting tokens (currently spec-only; see Phase 24 for lighting integration).

export type BiomeType =
  | 'campus'
  | 'city'
  | 'residential'
  | 'shoppingStreet'
  | 'indoor'
  | 'library'
  | 'shrine'
  | 'forest'
  | 'mountain'
  | 'coast'
  | 'ocean'
  | 'airport'
  | 'port'
  | 'sky'
  | 'underground'
  | 'yokaiRealm';

export type EnvironmentMood =
  | 'bright'
  | 'neutral'
  | 'cozy'
  | 'mysterious'
  | 'sacred'
  | 'lush'
  | 'rugged'
  | 'breezy'
  | 'vast'
  | 'industrial'
  | 'airy'
  | 'gloomy'
  | 'eerie';

export interface EnvironmentTheme {
  areaThemeId: string;        // stable id; equals the biome key for built-ins
  biomeType: BiomeType;
  mood: EnvironmentMood;
  groundColor: string;
  wallColor: string;
  accentColor: string;        // trims / signage highlights
  dangerColor: string;        // hostile encounter zones
  interactableColor: string;  // items / exploration points
  portalColor: string;        // travel gates / doors / entrances
  fogColor: string;           // spec token only (not wired into lighting this phase)
  ambientLightIntensity: number;     // spec token only
  directionalLightIntensity: number; // spec token only
}
