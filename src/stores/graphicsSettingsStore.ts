import { create } from 'zustand';
import { DEFAULT_AUTO_ADAPT, DEFAULT_QUALITY, QUALITY_LEVELS, getPreset, type QualityLevel, type QualityPreset } from '../game/render/renderSettings';

// Phase 105 (perf) — persisted graphics-quality settings, separate from the game save (its own
// localStorage key, like audioStore). Drives the Canvas, shadows, character culling and world
// density via the active preset. `auto` lets a drei PerformanceMonitor nudge the effective level
// down under load (without overwriting the user's chosen ceiling) and back up when idle.

interface PersistedGraphics {
  quality: QualityLevel;   // user-selected ceiling
  auto: boolean;           // allow runtime auto-adapt below the ceiling
  showPerfHud: boolean;    // on-screen FPS / draw-call meter
}

interface GraphicsState extends PersistedGraphics {
  autoLevel: QualityLevel | null; // session-only override chosen by the auto-adapter (≤ quality)
  setQuality: (q: QualityLevel) => void;
  setAuto: (on: boolean) => void;
  togglePerfHud: () => void;
  setAutoLevel: (q: QualityLevel | null) => void;
  /** The level actually in effect = min(user ceiling, auto override). */
  effectiveQuality: () => QualityLevel;
  /** The preset actually in effect. */
  preset: () => QualityPreset;
}

const STORAGE_KEY = 'lost-yokai-graphics-v1';

const DEFAULTS: PersistedGraphics = {
  quality: DEFAULT_QUALITY,
  auto: DEFAULT_AUTO_ADAPT,
  showPerfHud: false,
};

const rank = (q: QualityLevel): number => QUALITY_LEVELS.indexOf(q);
const lower = (a: QualityLevel, b: QualityLevel): QualityLevel => (rank(a) <= rank(b) ? a : b);

function load(): PersistedGraphics {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<PersistedGraphics>;
    return {
      quality: QUALITY_LEVELS.includes(p.quality as QualityLevel) ? (p.quality as QualityLevel) : DEFAULTS.quality,
      auto: typeof p.auto === 'boolean' ? p.auto : DEFAULTS.auto,
      showPerfHud: typeof p.showPerfHud === 'boolean' ? p.showPerfHud : DEFAULTS.showPerfHud,
    };
  } catch {
    return DEFAULTS;
  }
}

function persist(state: GraphicsState): void {
  const data: PersistedGraphics = { quality: state.quality, auto: state.auto, showPerfHud: state.showPerfHud };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export const useGraphicsSettingsStore = create<GraphicsState>((set, get) => ({
  ...load(),
  autoLevel: null,

  setQuality: (q) => set({ quality: q, autoLevel: null }),
  setAuto: (on) => set({ auto: on, autoLevel: on ? get().autoLevel : null }),
  togglePerfHud: () => set((s) => ({ showPerfHud: !s.showPerfHud })),
  setAutoLevel: (q) => set({ autoLevel: q }),

  effectiveQuality: () => {
    const s = get();
    return s.auto && s.autoLevel ? lower(s.quality, s.autoLevel) : s.quality;
  },
  preset: () => getPreset(get().effectiveQuality()),
}));

// Persist whenever any setting changes (cheap; settings change infrequently).
useGraphicsSettingsStore.subscribe(persist);
