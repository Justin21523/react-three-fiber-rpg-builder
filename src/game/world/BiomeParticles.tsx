import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import type { BufferAttribute, Group, Points } from 'three';
import type { BiomeType } from '../../types/environment';
import { useAudioStore } from '../../stores/audioStore';
import type { ParticleDensity } from '../../stores/audioStore';
import { useWorldClockStore } from '../../stores/worldClockStore';
import { usePlayerStore } from '../../stores/playerStore';
import { resolveAreaTheme } from '../environment/areaBiome';

// Drifting per-biome ambient particles (leaves, petals, snow, embers, spirit wisps). Asset-free
// atmosphere that gives each area its own sense of life, layered on top of the weather/night particles.
const SPREAD = 26; // half-width of the field centred on the player
const TOP = 16; // vertical band height

interface BiomeFx {
  color: string;
  count: number;
  size: number;
  speed: number; // vertical units/sec
  sway: number; // horizontal oscillation amplitude
  opacity: number;
  rise?: boolean; // float up instead of fall
  additive?: boolean; // glowing (embers/wisps)
}

const BIOME_FX: Partial<Record<BiomeType, BiomeFx>> = {
  forest: { color: '#86b35a', count: 70, size: 0.18, speed: 1.1, sway: 0.8, opacity: 0.8 }, // leaves
  shrine: { color: '#f7b8cd', count: 70, size: 0.16, speed: 0.9, sway: 0.9, opacity: 0.85 }, // petals
  mountain: { color: '#ffffff', count: 110, size: 0.12, speed: 1.6, sway: 0.5, opacity: 0.75 }, // snow
  coast: { color: '#e6f2f7', count: 45, size: 0.1, speed: 0.5, sway: 0.4, opacity: 0.5, additive: true }, // sea sparkle
  ocean: { color: '#cfeaf5', count: 45, size: 0.1, speed: 0.5, sway: 0.4, opacity: 0.5, additive: true },
  underground: { color: '#a78bfa', count: 60, size: 0.09, speed: 0.5, sway: 0.4, opacity: 0.6, rise: true, additive: true }, // embers
  yokaiRealm: { color: '#c084fc', count: 80, size: 0.12, speed: 0.5, sway: 0.5, opacity: 0.7, rise: true, additive: true }, // wisps
  sky: { color: '#ffffff', count: 60, size: 0.16, speed: 0.4, sway: 0.6, opacity: 0.5 }, // motes
};

const DENSITY_FACTOR: Record<ParticleDensity, number> = { low: 0.6, medium: 1, high: 1.6 };

// Deterministic pseudo-random (pure) — matches WeatherParticles so layouts are stable across renders.
const rand = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const Drift = ({ fx, count }: { fx: BiomeFx; count: number }) => {
  const ref = useRef<Points>(null);
  const { positions, basesX, phases } = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const bx = new Float32Array(count);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (rand(i * 3) - 0.5) * 2 * SPREAD;
      arr[i * 3] = x;
      arr[i * 3 + 1] = rand(i * 3 + 1) * TOP;
      arr[i * 3 + 2] = (rand(i * 3 + 2) - 0.5) * 2 * SPREAD;
      bx[i] = x;
      ph[i] = rand(i * 3 + 7) * Math.PI * 2;
    }
    return { positions: arr, basesX: bx, phases: ph };
  }, [count]);

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;
    const t = state.clock.elapsedTime;
    const attr = points.geometry.attributes.position as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const yi = i * 3 + 1;
      if (fx.rise) {
        arr[yi] += fx.speed * delta;
        if (arr[yi] > TOP) arr[yi] -= TOP;
      } else {
        arr[yi] -= fx.speed * delta;
        if (arr[yi] < 0) arr[yi] += TOP;
      }
      arr[i * 3] = basesX[i] + Math.sin(t * 0.6 + phases[i]) * fx.sway;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial color={fx.color} size={fx.size} transparent opacity={fx.opacity} depthWrite={false} sizeAttenuation blending={fx.additive ? AdditiveBlending : undefined} />
    </points>
  );
};

export const BiomeParticles = () => {
  const particlesEnabled = useAudioStore((s) => s.particlesEnabled);
  const density = useAudioStore((s) => s.particleDensity);
  const weather = useWorldClockStore((s) => s.weather);
  const areaId = usePlayerStore((s) => s.currentAreaId);
  const groupRef = useRef<Group>(null);

  const fx = useMemo(() => BIOME_FX[resolveAreaTheme(areaId).biomeType], [areaId]);

  useFrame(() => {
    const pos = usePlayerStore.getState().position;
    if (groupRef.current && pos) groupRef.current.position.set(pos.x, 0, pos.z);
  });

  // Rain takes over the screen; let it own the particle layer when it's active.
  if (!particlesEnabled || !fx || weather === 'rain') return null;
  const count = Math.max(8, Math.round(fx.count * DENSITY_FACTOR[density]));

  return (
    <group ref={groupRef}>
      <Drift key={`${resolveAreaTheme(areaId).biomeType}-${density}`} fx={fx} count={count} />
    </group>
  );
};
