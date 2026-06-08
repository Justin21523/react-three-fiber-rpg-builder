import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import type { BufferAttribute, Group, Points } from 'three';
import { useAudioStore } from '../../stores/audioStore';
import type { ParticleDensity } from '../../stores/audioStore';
import { useWorldClockStore } from '../../stores/worldClockStore';
import { usePlayerStore } from '../../stores/playerStore';

const RAIN_SPREAD = 45;
const RAIN_TOP = 35;
const RAIN_SPEED = 22;

// Particle counts per density tier.
const DENSITY: Record<ParticleDensity, { rain: number; firefly: number; star: number }> = {
  low: { rain: 500, firefly: 35, star: 120 },
  medium: { rain: 1200, firefly: 70, star: 250 },
  high: { rain: 2400, firefly: 140, star: 500 },
};

// Deterministic pseudo-random (pure) so particle layouts are stable across renders.
const rand = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Falling rain — recycled downward each frame.
const Rain = ({ count }: { count: number }) => {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand(i * 3) - 0.5) * 2 * RAIN_SPREAD;
      arr[i * 3 + 1] = rand(i * 3 + 1) * RAIN_TOP;
      arr[i * 3 + 2] = (rand(i * 3 + 2) - 0.5) * 2 * RAIN_SPREAD;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    const points = ref.current;
    if (!points) return;
    const attr = points.geometry.attributes.position as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] -= RAIN_SPEED * delta;
      if (arr[i] < 0) arr[i] += RAIN_TOP;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial color="#aac4e8" size={0.13} transparent opacity={0.45} depthWrite={false} />
    </points>
  );
};

// Slow-bobbing fireflies near the ground plus a static high starfield.
const NightFx = ({ fireflyCount, starCount }: { fireflyCount: number; starCount: number }) => {
  const fireflyRef = useRef<Points>(null);
  const { fireflies, bases, phases } = useMemo(() => {
    const arr = new Float32Array(fireflyCount * 3);
    const baseY = new Float32Array(fireflyCount);
    const ph = new Float32Array(fireflyCount);
    for (let i = 0; i < fireflyCount; i++) {
      arr[i * 3] = (rand(i * 7 + 1) - 0.5) * 50;
      const y = 0.5 + rand(i * 7 + 2) * 4.5;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = (rand(i * 7 + 3) - 0.5) * 50;
      baseY[i] = y;
      ph[i] = rand(i * 7 + 4) * Math.PI * 2;
    }
    return { fireflies: arr, bases: baseY, phases: ph };
  }, [fireflyCount]);

  const stars = useMemo(() => {
    const arr = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      arr[i * 3] = (rand(i * 5 + 101) - 0.5) * 160;
      arr[i * 3 + 1] = 45 + rand(i * 5 + 102) * 25;
      arr[i * 3 + 2] = (rand(i * 5 + 103) - 0.5) * 160;
    }
    return arr;
  }, [starCount]);

  useFrame((state) => {
    const points = fireflyRef.current;
    if (!points) return;
    const t = state.clock.elapsedTime;
    const attr = points.geometry.attributes.position as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < fireflyCount; i++) {
      arr[i * 3 + 1] = bases[i] + Math.sin(t * 0.6 + phases[i]) * 0.6;
    }
    attr.needsUpdate = true;
  });

  return (
    <>
      <points ref={fireflyRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[fireflies, 3]} count={fireflyCount} />
        </bufferGeometry>
        <pointsMaterial color="#c8f08a" size={0.28} transparent opacity={0.85} depthWrite={false} blending={AdditiveBlending} />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars, 3]} count={starCount} />
        </bufferGeometry>
        <pointsMaterial color="#dfe8ff" size={0.3} transparent opacity={0.7} depthWrite={false} />
      </points>
    </>
  );
};

// Keeps the particle field centred on the player so it surrounds them anywhere.
const FollowGroup = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const pos = usePlayerStore.getState().position;
    if (ref.current && pos) ref.current.position.set(pos.x, 0, pos.z);
  });
  return <group ref={ref}>{children}</group>;
};

// Optional weather/night ambience: rain when raining, fireflies + stars at night.
export const WeatherParticles = () => {
  const particlesEnabled = useAudioStore((s) => s.particlesEnabled);
  const density = useAudioStore((s) => s.particleDensity);
  const weather = useWorldClockStore((s) => s.weather);
  const timeOfDay = useWorldClockStore((s) => s.timeOfDay);

  if (!particlesEnabled) return null;
  const showRain = weather === 'rain';
  const showNight = timeOfDay === 'night';
  if (!showRain && !showNight) return null;

  const counts = DENSITY[density];

  return (
    <FollowGroup>
      {showRain && <Rain key={`rain-${density}`} count={counts.rain} />}
      {showNight && <NightFx key={`night-${density}`} fireflyCount={counts.firefly} starCount={counts.star} />}
    </FollowGroup>
  );
};
