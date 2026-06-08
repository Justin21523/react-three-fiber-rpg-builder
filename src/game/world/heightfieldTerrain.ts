import { PlaneGeometry, MathUtils } from 'three';
import type { ResolvedEnvironment } from '../environment/resolveAreaEnvironment';

// FNV-1a string hash → seed for the value noise.
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Phase 98c — parametric heightfield terrain. Combines seeded fBm value-noise with an optional
// grayscale heightmap image, flattened near the origin so the player never spawns inside a hill.
// buildTerrainGeometry returns a displaced PlaneGeometry whose trimesh (Rapier colliders="trimesh")
// becomes the walkable surface — so the visual mesh and collision are guaranteed identical.

type TerrainCfg = ResolvedEnvironment['terrain'];

// Smooth hash-based value noise in [0,1].
function valueNoise(ix: number, iz: number, seed: number): number {
  const v = Math.sin(ix * 127.1 + iz * 311.7 + seed * 0.000123) * 43758.5453;
  return v - Math.floor(v);
}
function smoothValue(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const n00 = valueNoise(x0, z0, seed);
  const n10 = valueNoise(x0 + 1, z0, seed);
  const n01 = valueNoise(x0, z0 + 1, seed);
  const n11 = valueNoise(x0 + 1, z0 + 1, seed);
  return MathUtils.lerp(MathUtils.lerp(n00, n10, ux), MathUtils.lerp(n01, n11, ux), uz);
}

// Fractal Brownian motion in [-1,1].
export function seededFbm(x: number, z: number, cfg: TerrainCfg): number {
  const seed = hashString(String(cfg.seed));
  let freq = cfg.frequency;
  let amp = 1;
  let sum = 0;
  let norm = 0;
  const octaves = Math.max(1, Math.min(5, Math.round(cfg.octaves)));
  for (let i = 0; i < octaves; i++) {
    sum += smoothValue(x * freq, z * freq, seed + i * 17) * amp;
    norm += amp;
    freq *= 2;
    amp *= 0.5;
  }
  return (sum / norm) * 2 - 1;
}

// Sample the grayscale heightmap (ImageData) at normalised patch coords → luminance in [0,1].
function sampleHeightmap(x: number, z: number, cfg: TerrainCfg, img: ImageData): number {
  const half = cfg.size / 2;
  const u = MathUtils.clamp((x + half) / cfg.size, 0, 1);
  const v = MathUtils.clamp((z + half) / cfg.size, 0, 1);
  const px = Math.min(img.width - 1, Math.floor(u * img.width));
  const py = Math.min(img.height - 1, Math.floor(v * img.height));
  const idx = (py * img.width + px) * 4;
  const lum = (img.data[idx] * 0.299 + img.data[idx + 1] * 0.587 + img.data[idx + 2] * 0.114) / 255;
  return cfg.heightmapInvert ? 1 - lum : lum;
}

// Brush-sculpted height deltas, layered on top of the noise (Phase 98d).
export interface SculptGrid {
  res: number;
  data: Float32Array;
}

export function sampleSculpt(x: number, z: number, cfg: TerrainCfg, sc: SculptGrid): number {
  const half = cfg.size / 2;
  const u = MathUtils.clamp((x + half) / cfg.size, 0, 1);
  const v = MathUtils.clamp((z + half) / cfg.size, 0, 1);
  const fx = u * (sc.res - 1);
  const fz = v * (sc.res - 1);
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const x1 = Math.min(sc.res - 1, x0 + 1);
  const z1 = Math.min(sc.res - 1, z0 + 1);
  const tx = fx - x0;
  const tz = fz - z0;
  const g = (i: number, j: number) => sc.data[j * sc.res + i];
  return MathUtils.lerp(MathUtils.lerp(g(x0, z0), g(x1, z0), tx), MathUtils.lerp(g(x0, z1), g(x1, z1), tx), tz);
}

export function sampleHeight(x: number, z: number, cfg: TerrainCfg, img?: ImageData | null, sc?: SculptGrid | null): number {
  const noise = seededFbm(x, z, cfg) * cfg.amplitude;
  const hm = img && cfg.heightmapAmplitude ? (sampleHeightmap(x, z, cfg, img) - 0.5) * 2 * cfg.heightmapAmplitude : 0;
  // Flatten toward the origin so the spawn area stays level.
  const dist = Math.hypot(x, z);
  const flatten = cfg.flattenRadius > 0 ? MathUtils.smoothstep(dist, 0, cfg.flattenRadius) : 1;
  const sculpt = sc ? sampleSculpt(x, z, cfg, sc) : 0;
  return cfg.baseOffset + (noise + hm) * flatten + sculpt;
}

export function buildTerrainGeometry(cfg: TerrainCfg, img?: ImageData | null, sc?: SculptGrid | null, segments?: number): PlaneGeometry {
  const seg = segments ?? cfg.segments;
  const geo = new PlaneGeometry(cfg.size, cfg.size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, sampleHeight(pos.getX(i), pos.getZ(i), cfg, img, sc));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.setAttribute('uv1', geo.getAttribute('uv').clone()); // aoMap reads uv1
  return geo;
}

// Apply a sculpt op uniformly over a world-space rectangle (region selection batch apply).
export function applyRegionSculpt(
  sc: SculptGrid, size: number,
  rect: { x0: number; z0: number; x1: number; z1: number },
  op: 'raise' | 'lower' | 'flatten', strength: number,
  noiseAt: (x: number, z: number) => number,
): void {
  const { res, data } = sc;
  const xmin = Math.min(rect.x0, rect.x1); const xmax = Math.max(rect.x0, rect.x1);
  const zmin = Math.min(rect.z0, rect.z1); const zmax = Math.max(rect.z0, rect.z1);
  const toG = (w: number) => Math.round((w / size + 0.5) * (res - 1));
  const i0 = Math.max(0, toG(xmin)); const i1 = Math.min(res - 1, toG(xmax));
  const j0 = Math.max(0, toG(zmin)); const j1 = Math.min(res - 1, toG(zmax));
  const STEP = 3 * strength;
  let target = 0;
  if (op === 'flatten') {
    const cx = (xmin + xmax) / 2; const cz = (zmin + zmax) / 2;
    target = noiseAt(cx, cz) + data[MathUtils.clamp(toG(cz), 0, res - 1) * res + MathUtils.clamp(toG(cx), 0, res - 1)];
  }
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const idx = j * res + i;
      if (op === 'raise') data[idx] += STEP;
      else if (op === 'lower') data[idx] -= STEP;
      else {
        const wx = (i / (res - 1) - 0.5) * size; const wz = (j / (res - 1) - 0.5) * size;
        data[idx] = target - noiseAt(wx, wz);
      }
    }
  }
}

export type SculptTool = 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise' | 'sharpen' | 'terrace' | 'setLevel';

export interface BrushOpts {
  terraceStep?: number; // 'terrace' quantisation step (world units), default 1
  targetLevel?: number; // 'setLevel' target absolute Y, default 0
}

// Apply one brush dab to the sculpt delta grid (in place). `noiseAt(x,z)` is the height WITHOUT sculpt
// (used by flatten/setLevel to target the real surface height).
export function applyBrush(
  sc: SculptGrid,
  size: number,
  cx: number,
  cz: number,
  tool: SculptTool,
  radius: number,
  strength: number,
  noiseAt: (x: number, z: number) => number,
  opts?: BrushOpts,
): void {
  const { res, data } = sc;
  const STEP = 0.6;
  const terraceStep = Math.max(0.05, opts?.terraceStep ?? 1);
  const targetLevel = opts?.targetLevel ?? 0;
  const toGrid = (w: number) => (w / size + 0.5) * (res - 1);
  const cellW = size / (res - 1);
  const gi = toGrid(cx);
  const gj = toGrid(cz);
  const gr = radius / cellW + 1;
  const i0 = Math.max(0, Math.floor(gi - gr));
  const i1 = Math.min(res - 1, Math.ceil(gi + gr));
  const j0 = Math.max(0, Math.floor(gj - gr));
  const j1 = Math.min(res - 1, Math.ceil(gj + gr));

  let flattenTarget = 0;
  if (tool === 'flatten') {
    const ci = MathUtils.clamp(Math.round(gi), 0, res - 1);
    const cj = MathUtils.clamp(Math.round(gj), 0, res - 1);
    flattenTarget = noiseAt(cx, cz) + data[cj * res + ci];
  }

  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const wx = (i / (res - 1) - 0.5) * size;
      const wz = (j / (res - 1) - 0.5) * size;
      const d = Math.hypot(wx - cx, wz - cz);
      if (d > radius) continue;
      const f = (1 - d / radius) ** 2;
      const w = Math.min(1, f * strength);
      const idx = j * res + i;
      const neighbourAvg = () => {
        const il = Math.max(0, i - 1);
        const ir = Math.min(res - 1, i + 1);
        const jt = Math.max(0, j - 1);
        const jb = Math.min(res - 1, j + 1);
        return (data[j * res + il] + data[j * res + ir] + data[jt * res + i] + data[jb * res + i]) / 4;
      };
      switch (tool) {
        case 'raise': data[idx] += STEP * w; break;
        case 'lower': data[idx] -= STEP * w; break;
        case 'smooth': data[idx] = MathUtils.lerp(data[idx], neighbourAvg(), w); break;
        case 'sharpen': data[idx] += (data[idx] - neighbourAvg()) * w; break;
        case 'noise': data[idx] += (Math.random() - 0.5) * 2 * STEP * w; break;
        case 'flatten': data[idx] = MathUtils.lerp(data[idx], flattenTarget - noiseAt(wx, wz), w); break;
        case 'setLevel': data[idx] = MathUtils.lerp(data[idx], targetLevel - noiseAt(wx, wz), w); break;
        case 'terrace': {
          const full = noiseAt(wx, wz) + data[idx];
          const stepped = Math.round(full / terraceStep) * terraceStep;
          data[idx] = MathUtils.lerp(data[idx], stepped - noiseAt(wx, wz), w);
          break;
        }
      }
    }
  }
}

// Load a grayscale heightmap into ImageData (cached). Same-origin (library / public) works; a remote
// image that taints the canvas fails soft → null (terrain falls back to noise only).
const hmCache = new Map<string, ImageData | null>();
export function loadHeightmap(url: string): Promise<ImageData | null> {
  const cached = hmCache.get(url);
  if (cached !== undefined) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const cap = 512; // cap sampling resolution
        const scale = Math.min(1, cap / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) { hmCache.set(url, null); resolve(null); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        hmCache.set(url, data);
        resolve(data);
      } catch { hmCache.set(url, null); resolve(null); }
    };
    img.onerror = () => { hmCache.set(url, null); resolve(null); };
    img.src = url;
  });
}
