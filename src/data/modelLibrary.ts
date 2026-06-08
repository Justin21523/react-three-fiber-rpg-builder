// Kit — auto-discovered GLB/glTF model library. Drop any .glb / .gltf into src/assets/models/ (subfolders
// become categories) and it is picked up at build time via import.meta.glob — no manual registry. The id
// is the path under models/ without extension; it's what the editor stores when you place a model.
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

const ROOT = '/src/assets/models/';
const MODULES = import.meta.glob('/src/assets/models/**/*.{glb,gltf}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

export const MODEL_ASSETS: Record<string, ModelAsset> = Object.fromEntries(
  Object.entries(MODULES).map(([abs, url]) => {
    const key = abs.startsWith(ROOT) ? abs.slice(ROOT.length) : abs;
    const id = key.replace(/\.[^.]+$/, '');
    const label = (key.split('/').pop() || key).replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    const category = key.includes('/') ? key.split('/')[0] : 'models';
    return [id, { id, label, path: url, scale: 1, position: [0, 0, 0], rotation: [0, 0, 0], clips: {}, category } as ModelAsset];
  }),
);

export const MODEL_ASSET_LIST: ModelAsset[] = Object.values(MODEL_ASSETS).sort((a, b) => a.label.localeCompare(b.label));
export const MODEL_CATEGORIES: string[] = [...new Set(MODEL_ASSET_LIST.map((a) => a.category))].sort();
export function getModelAsset(id: string | undefined): ModelAsset | undefined {
  return id ? MODEL_ASSETS[id] : undefined;
}
