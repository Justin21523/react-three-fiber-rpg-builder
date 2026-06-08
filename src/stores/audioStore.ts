import { create } from 'zustand';

// Kit — minimal ambience settings store. The full game had real audio playback; the kit keeps only the
// two flags the particle/weather layers read (so WeatherParticles / BiomeParticles / WorldClockHUD work
// unchanged). `particlesEnabled` + `particleDensity` are persisted; `audioEnabled` is a session flag.
export type ParticleDensity = 'low' | 'medium' | 'high';

interface PersistedSettings {
  particlesEnabled: boolean;
  particleDensity: ParticleDensity;
}

interface AudioState extends PersistedSettings {
  audioEnabled: boolean; // session-only placeholder (kit has no audio engine yet)
  toggleAudio: () => void;
  toggleParticles: () => void;
  setParticleDensity: (density: ParticleDensity) => void;
}

const STORAGE_KEY = 'r3f-rpg-builder-settings-v1';
const DENSITIES: ParticleDensity[] = ['low', 'medium', 'high'];
const DEFAULTS: PersistedSettings = { particlesEnabled: true, particleDensity: 'medium' };

function load(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<PersistedSettings>;
    return {
      particlesEnabled: typeof p.particlesEnabled === 'boolean' ? p.particlesEnabled : DEFAULTS.particlesEnabled,
      particleDensity: DENSITIES.includes(p.particleDensity as ParticleDensity)
        ? (p.particleDensity as ParticleDensity)
        : DEFAULTS.particleDensity,
    };
  } catch {
    return DEFAULTS;
  }
}

function persist(s: PersistedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export const useAudioStore = create<AudioState>((set, get) => ({
  ...load(),
  audioEnabled: false,
  toggleAudio: () => set({ audioEnabled: !get().audioEnabled }),
  toggleParticles: () => {
    const particlesEnabled = !get().particlesEnabled;
    set({ particlesEnabled });
    persist({ particlesEnabled, particleDensity: get().particleDensity });
  },
  setParticleDensity: (particleDensity) => {
    set({ particleDensity });
    persist({ particlesEnabled: get().particlesEnabled, particleDensity });
  },
}));
