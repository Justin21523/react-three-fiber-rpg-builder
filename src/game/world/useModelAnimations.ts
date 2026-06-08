/* eslint-disable react-hooks/set-state-in-effect -- setState fires only from async GLTFLoader callbacks */
import { useEffect, useState } from 'react';
import { GLTFLoader } from 'three-stdlib';
import { getModelAsset } from '../../data/modelLibrary';

// Kit — read the real animation clip names from a model's GLB (so editors can pick the actual animations
// instead of a guessed list). Loads the GLB once per asset via GLTFLoader and caches the names.
const cache = new Map<string, string[]>();
const loader = new GLTFLoader();

export function useModelAnimations(assetId: string | undefined): string[] {
  const [names, setNames] = useState<string[]>(() => (assetId ? cache.get(assetId) ?? [] : []));

  useEffect(() => {
    if (!assetId) { setNames([]); return; }
    const cached = cache.get(assetId);
    if (cached) { setNames(cached); return; }
    const asset = getModelAsset(assetId);
    if (!asset) { setNames([]); return; }
    let cancelled = false;
    loader.load(
      encodeURI(asset.path),
      (gltf) => {
        const n = gltf.animations.map((a) => a.name).filter(Boolean);
        cache.set(assetId, n);
        if (!cancelled) setNames(n);
      },
      undefined,
      () => { if (!cancelled) setNames([]); },
    );
    return () => { cancelled = true; };
  }, [assetId]);

  return names;
}
