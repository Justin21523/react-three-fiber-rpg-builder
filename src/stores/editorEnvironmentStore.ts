import { create } from 'zustand';
import type { EnvironmentOverride } from '../types/environmentOverride';

// Phase 98a — per-area Environment overrides (sky / fog / locked time). Persisted to its own
// localStorage key and read live every frame by EnvironmentBackdrop + DynamicAmbience, so editing an
// area's sky is immediately visible. Mirrors editorTriggerStore. `defaultMode` is the global switch:
// 'stableSky' applies a fixed daytime Sky to every unconfigured OUTDOOR area; 'dynamic' falls back to
// the original day/night cycle everywhere that isn't explicitly overridden.

const STORAGE_KEY = 'lost-yokai-editor-environment-v1';

export type EnvDefaultMode = 'stableSky' | 'dynamic';

interface PersistShape {
  overrides: Record<string, EnvironmentOverride>;
  defaultMode: EnvDefaultMode;
}

function loadState(): PersistShape {
  const empty: PersistShape = { overrides: {}, defaultMode: 'stableSky' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<PersistShape>;
      return {
        overrides: p.overrides && typeof p.overrides === 'object' ? p.overrides : {},
        defaultMode: p.defaultMode === 'dynamic' ? 'dynamic' : 'stableSky',
      };
    }
  } catch { /* ignore */ }
  return empty;
}

interface EditorEnvironmentState extends PersistShape {
  setOverride: (areaId: string, patch: Partial<EnvironmentOverride>) => void;
  resetArea: (areaId: string) => void;
  setDefaultMode: (mode: EnvDefaultMode) => void;
  importState: (data: unknown) => void;
  reset: () => void;
}

export const useEditorEnvironmentStore = create<EditorEnvironmentState>((set) => ({
  ...loadState(),

  setOverride: (areaId, patch) =>
    set((s) => ({ overrides: { ...s.overrides, [areaId]: { ...s.overrides[areaId], ...patch } } })),

  resetArea: (areaId) =>
    set((s) => {
      const next = { ...s.overrides };
      delete next[areaId];
      return { overrides: next };
    }),

  setDefaultMode: (mode) => set({ defaultMode: mode }),

  importState: (data) => {
    if (!data || typeof data !== 'object') return;
    const p = data as Partial<PersistShape>;
    set({
      overrides: p.overrides && typeof p.overrides === 'object' ? p.overrides : {},
      defaultMode: p.defaultMode === 'dynamic' ? 'dynamic' : 'stableSky',
    });
  },

  reset: () => set({ overrides: {}, defaultMode: 'stableSky' }),
}));

let lastSerialized = JSON.stringify(loadState());
useEditorEnvironmentStore.subscribe((s) => {
  const serialized = JSON.stringify({ overrides: s.overrides, defaultMode: s.defaultMode });
  if (serialized === lastSerialized) return;
  lastSerialized = serialized;
  try { localStorage.setItem(STORAGE_KEY, serialized); } catch { /* ignore */ }
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      const next = loadState();
      lastSerialized = e.newValue ?? '';
      useEditorEnvironmentStore.setState({ overrides: next.overrides, defaultMode: next.defaultMode });
    }
  });
}

// Plain accessor for non-React modules (resolveAreaEnvironment).
export function getEnvironmentOverride(areaId: string): EnvironmentOverride | undefined {
  return useEditorEnvironmentStore.getState().overrides[areaId];
}
export function getEnvDefaultMode(): EnvDefaultMode {
  return useEditorEnvironmentStore.getState().defaultMode;
}
