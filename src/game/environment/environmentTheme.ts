import type { BiomeType, EnvironmentTheme } from '../../types/environment';
import { BIOME_THEMES } from '../../data/environmentThemes';

export const DEFAULT_THEME: EnvironmentTheme = BIOME_THEMES.campus;

// Infer a biome from an areaId by keyword. Order matters: more specific keys
// (library, shrine) are tested before generic indoor/outdoor ones.
export function inferBiome(areaId: string): BiomeType {
  const id = areaId.toLowerCase();
  if (id.includes('library')) return 'library';
  if (id.includes('shrine')) return 'shrine';
  if (id.includes('yokai') || id.includes('realm')) return 'yokaiRealm';
  if (id.includes('underground') || id.includes('basement') || id.includes('cave')) {
    return 'underground';
  }
  if (id.includes('airport') || id.includes('runway') || id.includes('terminal')) return 'airport';
  if (id.includes('port') || id.includes('harbor') || id.includes('dock')) return 'port';
  if (id.includes('sky') || id.includes('cloud') || id.includes('aerial')) return 'sky';
  if (id.includes('offshore') || id.includes('ocean') || id.includes('sea')) return 'ocean';
  if (id.includes('beach') || id.includes('sand') || id.includes('coast') || id.includes('river')) {
    return 'coast';
  }
  if (id.includes('forest') || id.includes('grove') || id.includes('bamboo') || id.includes('wood')) {
    return 'forest';
  }
  if (id.includes('mountain') || id.includes('hill') || id.includes('slope')) return 'mountain';
  if (id.includes('shopping') || id.includes('shop') || id.includes('commercial')) return 'shoppingStreet';
  if (id.includes('residential') || id.includes('lane') || id.includes('alley')) return 'residential';
  if (id.includes('road') || id.includes('highway') || id.includes('city')) {
    return 'city';
  }
  if (
    id.includes('floor') ||
    id.includes('classroom') ||
    id.includes('club') ||
    id.includes('cafeteria') ||
    id.includes('rooftop') ||
    id.includes('interior') ||
    id.includes('indoor')
  ) {
    return 'indoor';
  }
  return 'campus';
}

// Resolve the theme for an area. An explicit override (AreaContentDef.areaThemeId)
// wins; otherwise the biome is inferred from the areaId.
export function getEnvironmentTheme(areaId: string, override?: string): EnvironmentTheme {
  if (override && override in BIOME_THEMES) {
    return BIOME_THEMES[override as BiomeType];
  }
  return BIOME_THEMES[inferBiome(areaId)];
}

const INDOOR_BIOMES: ReadonlySet<BiomeType> = new Set<BiomeType>([
  'indoor',
  'library',
  'underground',
  'yokaiRealm',
]);

// Indoor-ish biomes use fixed lighting (no day/night cycle) so large interiors
// never go pitch-black at night.
export function isIndoorBiome(biome: BiomeType): boolean {
  return INDOOR_BIOMES.has(biome);
}
