import { create } from 'zustand';
import type { TimeOfDay, WeatherCondition } from '../types/randomEvent';

export type Weather = WeatherCondition;

// How many in-game minutes elapse per real second. 3 ⇒ a full 1440-minute day
// takes ~8 real minutes. Tune freely; dev key [T] also skips to the next phase.
export const GAME_MINUTES_PER_REAL_SECOND = 3;
const MINUTES_PER_DAY = 1440;
const WEATHER_CHANGE_CHANCE_PER_HOUR = 0.2;
const WEATHER_VALUES: Weather[] = ['clear', 'rain', 'fog'];

// Phase boundaries (minute-of-day): dawn 05:00, day 08:00, evening 17:00, night 20:00.
const PHASE_START: Record<TimeOfDay, number> = { dawn: 300, day: 480, evening: 1020, night: 1200 };
// "Centre" minute of each phase — used when loading a legacy save that only had a phase.
const PHASE_CENTER: Record<TimeOfDay, number> = { dawn: 390, day: 720, evening: 1110, night: 0 };

export function phaseFromMinutes(m: number): TimeOfDay {
  const x = ((m % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  if (x >= PHASE_START.dawn && x < PHASE_START.day) return 'dawn';
  if (x >= PHASE_START.day && x < PHASE_START.evening) return 'day';
  if (x >= PHASE_START.evening && x < PHASE_START.night) return 'evening';
  return 'night';
}

export function formatClock(m: number): string {
  const x = ((m % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(x / 60);
  const min = Math.floor(x % 60);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function rollWeather(current: Weather): Weather {
  if (Math.random() > WEATHER_CHANGE_CHANCE_PER_HOUR) return current;
  const others = WEATHER_VALUES.filter((w) => w !== current);
  return others[Math.floor(Math.random() * others.length)];
}

interface WorldClockState {
  timeMinutes: number; // continuous minute-of-day (0–1440), source of truth
  timeOfDay: TimeOfDay; // derived phase, cached so subscribers only re-render on change
  weather: Weather;

  tickTime: (deltaSeconds: number) => void;
  advanceTime: () => void; // dev: skip to start of next phase
  cycleWeather: () => void;

  getSaveData: () => { timeMinutes: number; timeOfDay: TimeOfDay; weather: Weather };
  loadSaveData: (data: { timeMinutes?: number; timeOfDay?: TimeOfDay; weather?: Weather }) => void;
  reset: () => void;
}

// Shared world clock: a real-time day/night cycle. Owns continuous time-of-day
// and weather; drives lighting/sky (DynamicAmbience), spawn gating, and events.
export const useWorldClockStore = create<WorldClockState>((set, get) => ({
  timeMinutes: 480, // 08:00
  timeOfDay: 'day',
  weather: 'clear',

  tickTime: (deltaSeconds) => {
    const prev = get().timeMinutes;
    const advanced = prev + deltaSeconds * GAME_MINUTES_PER_REAL_SECOND;
    const wrapped = ((advanced % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

    const prevPhase = get().timeOfDay;
    const newPhase = phaseFromMinutes(wrapped);
    const crossedHour = Math.floor(advanced / 60) !== Math.floor(prev / 60);

    const patch: Partial<WorldClockState> = { timeMinutes: wrapped };
    if (crossedHour) {
      const next = rollWeather(get().weather);
      if (next !== get().weather) patch.weather = next;
    }
    if (newPhase !== prevPhase) patch.timeOfDay = newPhase;

    set(patch);
  },

  advanceTime: () => {
    const m = get().timeMinutes;
    const starts = [PHASE_START.dawn, PHASE_START.day, PHASE_START.evening, PHASE_START.night];
    const target = starts.find((s) => s > m) ?? PHASE_START.dawn; // wrap to next-day dawn
    set({ timeMinutes: target, timeOfDay: phaseFromMinutes(target) });
  },

  cycleWeather: () =>
    set((s) => ({
      weather:
        WEATHER_VALUES[(WEATHER_VALUES.indexOf(s.weather) + 1) % WEATHER_VALUES.length],
    })),

  getSaveData: () => {
    const { timeMinutes, timeOfDay, weather } = get();
    return { timeMinutes, timeOfDay, weather };
  },

  loadSaveData: (data) => {
    const minutes =
      typeof data.timeMinutes === 'number'
        ? data.timeMinutes
        : data.timeOfDay
          ? PHASE_CENTER[data.timeOfDay]
          : 480;
    set({
      timeMinutes: minutes,
      timeOfDay: phaseFromMinutes(minutes),
      weather: data.weather ?? 'clear',
    });
  },

  reset: () => set({ timeMinutes: 480, timeOfDay: 'day', weather: 'clear' }),
}));
