// Kit — auto-discovered GLB/glTF model library. Drop a .glb / .gltf into EITHER:
//   • src/assets/models/  — bundled & hashed by Vite (import.meta.glob with ?url), or
//   • public/models/      — served as-is at /models/... (good for large / many files)
// (subfolders become categories). Both are picked up at build time — no manual registry. The id is the
// path under models/ without extension; it's what the editor stores when you place a model.
export type Vec3 = [number, number, number];

export interface ModelAsset {
  id: string;
  label: string;
  path: string;                  // runtime URL
  scale: number;
  position: Vec3;
  rotation: Vec3;                // radians
  clips: Record<string, number>; // animation name → clip index (empty by default)
  category: string;
}

const SRC_ROOT = '/src/assets/models/';
const PUBLIC_ROOT = '/public/models/';

// Bundled assets: eager ?url import gives the hashed runtime URL.
const SRC_MODULES = import.meta.glob('/src/assets/models/**/*.{glb,gltf}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

// public/ assets can't be imported from JS (Vite forbids it), so we only LIST the keys (non-eager, the
// loaders are never called) and derive the served URL by stripping the leading /public.
const PUBLIC_KEYS = Object.keys(import.meta.glob('/public/models/**/*.{glb,gltf}'));

function makeAsset(key: string, url: string): [string, ModelAsset] {
  const id = key.replace(/\.[^.]+$/, '');
  const label = (key.split('/').pop() || key).replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  const category = key.includes('/') ? key.split('/')[0] : 'models';
  return [id, { id, label, path: url, scale: 1, position: [0, 0, 0], rotation: [0, 0, 0], clips: {}, category }];
}

export const MODEL_ASSETS: Record<string, ModelAsset> = Object.fromEntries([
  ...Object.entries(SRC_MODULES).map(([abs, url]) =>
    makeAsset(abs.startsWith(SRC_ROOT) ? abs.slice(SRC_ROOT.length) : abs, url),
  ),
  ...PUBLIC_KEYS.map((abs) =>
    makeAsset(abs.startsWith(PUBLIC_ROOT) ? abs.slice(PUBLIC_ROOT.length) : abs, abs.replace(/^\/public/, '')),
  ),
]);

export const MODEL_ASSET_LIST: ModelAsset[] = Object.values(MODEL_ASSETS).sort((a, b) => a.label.localeCompare(b.label));
export const MODEL_CATEGORIES: string[] = [...new Set(MODEL_ASSET_LIST.map((a) => a.category))].sort();
export function getModelAsset(id: string | undefined): ModelAsset | undefined {
  return id ? MODEL_ASSETS[id] : undefined;
}
