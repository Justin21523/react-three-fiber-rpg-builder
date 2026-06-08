import type { EnvironmentTheme } from '../../types/environment';
import { SEED_AREAS } from '../../data/areas';
import { getEnvironmentTheme } from './environmentTheme';

// Kit — resolve an area's biome theme. An explicit `ambientTheme` on the area wins; otherwise the biome
// is inferred from the areaId by keyword (see environmentTheme.inferBiome). (No procedural-generation
// layer in the kit — that was yokai-game-specific.)
export function areaBiomeOverride(areaId: string): string | undefined {
  return SEED_AREAS.find((a) => a.id === areaId)?.ambientTheme;
}

export function resolveAreaTheme(areaId: string): EnvironmentTheme {
  return getEnvironmentTheme(areaId, areaBiomeOverride(areaId));
}
