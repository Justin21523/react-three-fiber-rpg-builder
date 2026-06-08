import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { TextureLoader, SRGBColorSpace, NoColorSpace, RepeatWrapping, type Texture } from 'three';
import type { ResolvedEnvironment } from '../environment/resolveAreaEnvironment';
import { resolveTextureUrl } from './textureLibrary';
import { loadGltfMaterial, resolveMaterialUrl, type GltfMaterialMaps } from './gltfMaterial';

// Phase 98c — shared PBR ground-texture loading (extracted from FlatPbrGround so the heightfield
// terrain uses identical handling). Loads albedo/normal/roughness/ao by library key or URL, sets the
// correct colour space, tiling and anisotropy. A missing/typo value resolves to null → tint fallback.

type PbrGround = ResolvedEnvironment['pbrGround'];

const loader = new TextureLoader();
const cache = new Map<string, Texture>(); // keyed by `${url}|${colourSpace}`

function loadTex(url: string, srgb: boolean): Texture {
  const key = `${url}|${srgb ? 's' : 'l'}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = loader.load(url);
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  cache.set(key, tex);
  return tex;
}

export interface GroundTextures {
  albedo: Texture | null;
  normal: Texture | null;
  rough: Texture | null;
  ao: Texture | null;
}

export function useGroundTextures(g: PbrGround): GroundTextures {
  const gl = useThree((s) => s.gl);

  // Optional whole-GLTF material as the base layer (async; image maps below override per slot).
  const [gltf, setGltf] = useState<GltfMaterialMaps | null>(null);
  useEffect(() => {
    const u = g.gltfMaterialUrl ? resolveMaterialUrl(g.gltfMaterialUrl) : undefined;
    if (!u) return;
    let cancelled = false;
    void loadGltfMaterial(u).then((m) => { if (!cancelled) setGltf(m); });
    return () => { cancelled = true; };
  }, [g.gltfMaterialUrl]);
  const gm = g.gltfMaterialUrl ? gltf : null;

  // Stored image values may be a library key or a literal URL — resolve both to a loadable URL.
  const albedoImg = useMemo(() => { const u = resolveTextureUrl(g.albedoUrl); return u ? loadTex(u, true) : null; }, [g.albedoUrl]);
  const normalImg = useMemo(() => { const u = resolveTextureUrl(g.normalUrl); return u ? loadTex(u, false) : null; }, [g.normalUrl]);
  const roughImg = useMemo(() => { const u = resolveTextureUrl(g.roughnessUrl); return u ? loadTex(u, false) : null; }, [g.roughnessUrl]);
  const aoImg = useMemo(() => { const u = resolveTextureUrl(g.aoUrl); return u ? loadTex(u, false) : null; }, [g.aoUrl]);

  // Image map wins per slot; otherwise fall back to the GLTF material's map.
  const albedo = albedoImg ?? gm?.map ?? null;
  const normal = normalImg ?? gm?.normalMap ?? null;
  const rough = roughImg ?? gm?.roughnessMap ?? null;
  const ao = aoImg ?? gm?.aoMap ?? null;

  useEffect(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    const rot = ((g.rotationDeg ?? 0) * Math.PI) / 180;
    [albedo, normal, rough, ao].forEach((t) => {
      if (!t) return;
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(g.repeat, g.repeat);
      t.center.set(0.5, 0.5);
      t.rotation = rot;
      t.anisotropy = maxAniso;
      t.needsUpdate = true;
    });
  }, [albedo, normal, rough, ao, g.repeat, g.rotationDeg, gl]);

  return { albedo, normal, rough, ao };
}
