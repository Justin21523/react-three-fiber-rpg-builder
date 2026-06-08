import { GLTFLoader } from 'three-stdlib';
import { DataTexture, LoadingManager, Mesh, MeshStandardMaterial, RGBAFormat, SRGBColorSpace, UnsignedByteType, type Texture } from 'three';

// Phase 98d — GLTF/GLB material library. Auto-discovers .glb/.gltf in src/assets/materials/ and offers
// them in the editor's GLTF-material picker; picking one extracts its first MeshStandardMaterial's PBR
// maps. Multi-file .gltf (with a sibling .bin + textures/*.jpg) is supported: ALL sibling files are
// globbed so Vite emits them, and a LoadingManager URL-modifier rewrites the .gltf's relative refs to
// the hashed asset URLs (matched by file BASENAME). Use self-contained .glb to avoid that entirely.

const ROOT = '/src/assets/materials/';

// The pickable material entry points (.glb / .gltf).
const ENTRY_MODULES = import.meta.glob('/src/assets/materials/**/*.{glb,gltf}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

// EVERY sibling file (incl. .bin + texture images) so Vite emits them and we can rewrite refs.
const ALL_MODULES = import.meta.glob('/src/assets/materials/**/*.{glb,gltf,bin,jpg,jpeg,png,webp,ktx2,basis}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

const basename = (p: string) => decodeURIComponent((p.split('?')[0].split('#')[0].split('/').pop()) ?? '');

// filename → hashed asset URL (used by the loader to resolve a .gltf's relative .bin / texture refs).
const fileByBasename = new Map<string, string>();
for (const [abs, url] of Object.entries(ALL_MODULES)) fileByBasename.set(basename(abs), url);

export interface MaterialSet {
  key: string;   // path under src/assets/materials/ (stable, persisted)
  label: string;
  url: string;   // Vite-hashed runtime URL of the .glb/.gltf
}

export const MATERIAL_SETS: MaterialSet[] = Object.entries(ENTRY_MODULES)
  .map(([abs, url]) => {
    const key = abs.startsWith(ROOT) ? abs.slice(ROOT.length) : abs;
    const label = (key.split('/').pop() || key).replace(/\.[^.]+$/, '').replace(/_4k|_2k|_1k/gi, '').replace(/[_-]/g, ' ').trim();
    return { key, label, url };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

const keyToUrl = new Map<string, string>(MATERIAL_SETS.map((m) => [m.key, m.url]));

// Map a stored value (library key OR literal URL) to a loadable URL, or undefined.
export function resolveMaterialUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const mapped = keyToUrl.get(value);
  if (mapped) return mapped;
  if (value.startsWith('/') || value.startsWith('http') || value.includes('.')) return value;
  return undefined;
}

export interface GltfMaterialMaps {
  map?: Texture | null;
  normalMap?: Texture | null;
  roughnessMap?: Texture | null;
  metalnessMap?: Texture | null;
  aoMap?: Texture | null;
}

// Rewrite a .gltf's relative buffer/texture requests to the Vite-emitted hashed URLs (by basename).
const manager = new LoadingManager();
manager.setURLModifier((u) => {
  const hit = fileByBasename.get(basename(u));
  return hit ?? u;
});
const loader = new GLTFLoader(manager);
const cache = new Map<string, GltfMaterialMaps | null>();

// Load a GLB/glTF and return its first MeshStandardMaterial's PBR maps (cached; soft-fail null).
export function loadGltfMaterial(url: string): Promise<GltfMaterialMaps | null> {
  const hit = cache.get(url);
  if (hit !== undefined) return Promise.resolve(hit);
  return loader
    .loadAsync(encodeURI(url))
    .then((gltf) => {
      const mats: MeshStandardMaterial[] = [];
      gltf.scene.traverse((o) => {
        const m = (o as Mesh).material;
        const arr = Array.isArray(m) ? m : [m];
        for (const x of arr) if (x instanceof MeshStandardMaterial) mats.push(x);
      });
      const found = mats[0] ?? null;
      // No albedo texture but a base colour → synthesise a 1×1 colour map so something visible loads.
      let map = found?.map ?? null;
      if (found && !map) {
        const c = found.color;
        const tex = new DataTexture(new Uint8Array([Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255), 255]), 1, 1, RGBAFormat, UnsignedByteType);
        tex.colorSpace = SRGBColorSpace;
        tex.needsUpdate = true;
        map = tex;
      }
      const maps: GltfMaterialMaps | null = found
        ? { map, normalMap: found.normalMap, roughnessMap: found.roughnessMap, metalnessMap: found.metalnessMap, aoMap: found.aoMap }
        : null;
      cache.set(url, maps);
      return maps;
    })
    .catch((e) => {
      console.warn('[gltfMaterial] failed to load', url, e);
      cache.set(url, null);
      return null;
    });
}
