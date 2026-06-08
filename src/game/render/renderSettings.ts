// Phase 105 (perf) — single source of truth for render/quality tunables. Every quality-sensitive
// knob lives here as a preset so the Canvas, shadows, character culling, and world density can all
// read from one place and the Graphics panel / auto-adapter can switch presets coherently.
//
// Design intent: `high` ≈ the project's pre-optimization look (so picking High changes nothing
// visually except the DPR cap and a tighter — but still generous — far plane), while `medium`
// (the default) and `low` progressively trade fidelity for stability on GPU-limited machines.

export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityPreset {
  /** Upper bound for the renderer device-pixel-ratio (lower = far fewer pixels to shade). */
  maxDpr: number;
  /** MSAA on the default framebuffer. */
  antialias: boolean;
  /** Whether the renderer renders shadow maps at all. */
  shadows: boolean;
  /** Directional-light shadow map resolution (px, square). */
  shadowMapSize: number;
  /** Half-extent (world units) of the directional light's orthographic shadow frustum. */
  shadowRadius: number;
  /** Camera far plane. The old value (20000) made an enormous shadow/precision range. */
  cameraFar: number;
  /** Max number of characters that may clone a GLB + run an animation mixer at once. */
  maxAnimatedCharacters: number;
  /** Beyond this distance (world units) from the player a character is not rendered. */
  characterCullDistance: number;
  /** Multiplier (0..1) on procedural scatter (tree/grass/rock) spawn counts. */
  proceduralDensity: number;
  /** Chunk radius for the procedural outdoor layer (2 → 5×5 chunks, 1 → 3×3). */
  proceduralChunkRadius: number;
  /** Max editor/imported GLB set-pieces rendered at once (nearest-to-player). Bounds GPU memory. */
  maxSetPieces: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: {
    maxDpr: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    shadowRadius: 40,
    cameraFar: 500,
    // Cull distance is kept beyond the fog range so anything actually visible in play is rarely
    // distance-culled (keeps play in sync with edit). The budget is a HARD cap on how many animated
    // GLB characters render at once — the real defence against GPU out-of-memory.
    maxAnimatedCharacters: 12,
    characterCullDistance: 190,
    proceduralDensity: 0.4,
    proceduralChunkRadius: 1,
    maxSetPieces: 160,
  },
  medium: {
    maxDpr: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    shadowRadius: 60,
    cameraFar: 700,
    maxAnimatedCharacters: 20,
    characterCullDistance: 260,
    proceduralDensity: 0.7,
    proceduralChunkRadius: 2,
    maxSetPieces: 320,
  },
  high: {
    maxDpr: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    shadowRadius: 90,
    cameraFar: 1200,
    maxAnimatedCharacters: 36,
    characterCullDistance: 360,
    proceduralDensity: 1,
    proceduralChunkRadius: 2,
    maxSetPieces: 600,
  },
};

export const QUALITY_LEVELS: QualityLevel[] = ['low', 'medium', 'high'];
// Default to Low so the first load is the lightest on GPU memory (avoids the OOM → context-loss →
// "blocked" spiral on weaker / loaded GPUs). Bump to Medium/High from the Graphics panel.
export const DEFAULT_QUALITY: QualityLevel = 'low';
// Auto-adapt defaults OFF: under a heavy scene the per-frame quality flip-flop added store churn
// that could contribute to React update-depth overflows. Opt-in from the Graphics panel.
export const DEFAULT_AUTO_ADAPT = false;

export const getPreset = (q: QualityLevel): QualityPreset => QUALITY_PRESETS[q] ?? QUALITY_PRESETS.medium;
