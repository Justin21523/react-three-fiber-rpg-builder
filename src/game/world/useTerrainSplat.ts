/* eslint-disable react-hooks/immutability, react-hooks/refs -- imperative weight-texture mutation for
   live painting + reads the sculpt ref when auto-baking weights (data lives outside React state). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TextureLoader, SRGBColorSpace, NoColorSpace, type Texture, type MeshStandardMaterial } from 'three';
import type { ResolvedEnvironment } from '../environment/resolveAreaEnvironment';
import { resolveTextureUrl } from './textureLibrary';
import { loadGltfMaterial, resolveMaterialUrl } from './gltfMaterial';
import { bakeAutoWeights, makeWeightTexture, useSplatMaterial } from './splatMaterial';
import { decodeUint8, encodeUint8 } from './terrainCodec';
import type { SculptGrid } from './heightfieldTerrain';

const texLoader = new TextureLoader();
const texCache = new Map<string, Texture>();
function loadMap(url: string, srgb: boolean): Texture {
  const key = `${url}|${srgb ? 's' : 'l'}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const t = texLoader.load(url);
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  texCache.set(key, t);
  return t;
}

interface SplatHook {
  enabled: boolean;
  material: MeshStandardMaterial | null;
  paintAt: (x: number, z: number, layer: number, radius: number, strength: number) => void;
  fillRegion: (rect: { x0: number; z0: number; x1: number; z1: number }, layer: number) => void;
  commit: () => void;
}

type TerrainCfg = ResolvedEnvironment['terrain'];

// Phase 98d — terrain splat: load up to 4 layer albedos (image or GLTF), build the weight texture
// (auto height/slope bake OR painted), and return a blended MeshStandardMaterial + a paint function.
export function useTerrainSplat(
  env: ResolvedEnvironment,
  cfg: TerrainCfg,
  img: ImageData | null,
  sculptRef: React.MutableRefObject<SculptGrid | null>,
  onCommitWeights: (res: number, base64: string) => void,
): SplatHook {
  const splat = env.terrain.splat;
  const enabled = !!splat?.enabled;
  const layers = useMemo(() => splat?.layers ?? [], [splat?.layers]);
  const res = splat?.res ?? 128;
  const count = Math.max(1, Math.min(4, layers.length || 1));
  const mode = splat?.mode ?? 'auto';
  const bandLow = splat?.bandLow ?? -1;
  const bandHigh = splat?.bandHigh ?? 6;
  const slopeRock = splat?.slopeRock ?? 0.45;

  // Load each layer's albedo + normal (image key/url, or a GLTF material's maps).
  const layersKey = JSON.stringify(layers.map((l) => [l.albedoKey, l.normalKey, l.gltfMaterialUrl]));
  const [layerTex, setLayerTex] = useState<(Texture | null)[]>([null, null, null, null]);
  const [normalTex, setNormalTex] = useState<(Texture | null)[]>([null, null, null, null]);
  useEffect(() => {
    let cancelled = false;
    const alb: (Texture | null)[] = [null, null, null, null];
    const nrm: (Texture | null)[] = [null, null, null, null];
    const jobs: Promise<void>[] = [];
    layers.slice(0, 4).forEach((l, i) => {
      const imgUrl = resolveTextureUrl(l.albedoKey);
      const nUrl = resolveTextureUrl(l.normalKey);
      if (nUrl) nrm[i] = loadMap(nUrl, false);
      if (imgUrl) { alb[i] = loadMap(imgUrl, true); return; }
      const gUrl = l.gltfMaterialUrl ? resolveMaterialUrl(l.gltfMaterialUrl) : undefined;
      if (gUrl) jobs.push(loadGltfMaterial(gUrl).then((m) => { alb[i] = m?.map ?? null; if (!nrm[i]) nrm[i] = m?.normalMap ?? null; }));
    });
    void Promise.all(jobs).then(() => { if (!cancelled) { setLayerTex([...alb]); setNormalTex([...nrm]); } });
    return () => { cancelled = true; };
  }, [layersKey, layers]);

  // Weight grid (RGBA) — painted base64 if present, else auto-baked.
  const weights = useMemo(() => {
    const data = mode === 'paint' && splat?.weights
      ? decodeUint8(splat.weights, res * res * 4)
      : bakeAutoWeights(res, cfg, img, sculptRef.current, { bandLow, bandHigh, slopeRock, count });
    return { data, tex: makeWeightTexture(data, res), res };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, mode, splat?.weights, cfg, img, bandLow, bandHigh, slopeRock, count]);
  useEffect(() => () => weights.tex.dispose(), [weights]);

  const repeats = useMemo(() => layers.slice(0, 4).map((l) => l.repeat ?? 8), [layers]);
  const rotations = useMemo(() => layers.slice(0, 4).map((l) => ((l.rotationDeg ?? 0) * Math.PI) / 180), [layers]);
  const material = useSplatMaterial({
    layers: layerTex, normals: normalTex, repeats, rotations, weights: weights.tex, count,
    tint: env.pbrGround.tint, roughness: env.pbrGround.roughness, metalness: env.pbrGround.metalness,
  });

  const paintAt = useCallback((x: number, z: number, layer: number, radius: number, strength: number) => {
    const { data, tex } = weights;
    const half = cfg.size / 2;
    const toG = (w: number) => ((w + half) / cfg.size) * (res - 1);
    const gi = toG(x); const gj = toG(z);
    const gr = (radius / cfg.size) * (res - 1) + 1;
    const i0 = Math.max(0, Math.floor(gi - gr)); const i1 = Math.min(res - 1, Math.ceil(gi + gr));
    const j0 = Math.max(0, Math.floor(gj - gr)); const j1 = Math.min(res - 1, Math.ceil(gj + gr));
    const L = Math.max(0, Math.min(3, layer));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = (i - gi) / (res - 1) * cfg.size; const dz = (j - gj) / (res - 1) * cfg.size;
      const d = Math.hypot(dx, dz); if (d > radius) continue;
      const w = Math.min(1, (1 - d / radius) ** 2 * strength);
      const idx = (j * res + i) * 4;
      for (let c = 0; c < 4; c++) {
        const target = c === L ? 255 : 0;
        data[idx + c] = Math.round(data[idx + c] + (target - data[idx + c]) * w);
      }
    }
    tex.needsUpdate = true;
  }, [weights, cfg.size, res]);

  const fillRegion = useCallback((rect: { x0: number; z0: number; x1: number; z1: number }, layer: number) => {
    const { data, tex } = weights;
    const half = cfg.size / 2;
    const toG = (w: number) => Math.round(((w + half) / cfg.size) * (res - 1));
    const i0 = Math.max(0, toG(Math.min(rect.x0, rect.x1))); const i1 = Math.min(res - 1, toG(Math.max(rect.x0, rect.x1)));
    const j0 = Math.max(0, toG(Math.min(rect.z0, rect.z1))); const j1 = Math.min(res - 1, toG(Math.max(rect.z0, rect.z1)));
    const L = Math.max(0, Math.min(3, layer));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const idx = (j * res + i) * 4;
      for (let c = 0; c < 4; c++) data[idx + c] = c === L ? 255 : 0;
    }
    tex.needsUpdate = true;
  }, [weights, cfg.size, res]);

  const commit = useCallback(() => {
    onCommitWeights(res, encodeUint8(weights.data));
  }, [onCommitWeights, res, weights]);

  return { enabled, material: enabled ? material : null, paintAt, fillRegion, commit };
}
