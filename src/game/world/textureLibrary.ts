// Phase 98b-2 — auto-discovered ground texture library. Every image in src/assets/textures/ is picked
// up at build time (no manual registry, no script) and grouped into PBR "sets" by filename suffix, so
// the in-editor picker can show thumbnails and one click fills albedo+normal+roughness+ao. The area's
// Environment override stores the stable KEY (path under src/assets/textures/); resolveTextureUrl maps
// it to the Vite-hashed URL at load time, and still passes through literal URLs (public/ paths, remote).

const ROOT = '/src/assets/textures/';
const PUBLIC_ROOT = '/public/textures/';

const MODULES = import.meta.glob('/src/assets/textures/**/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

// public/textures/ images (served as-is): list keys only, derive the /textures/... URL by stripping /public.
const PUBLIC_PAIRS: [string, string][] = Object.keys(
  import.meta.glob('/public/textures/**/*.{jpg,jpeg,png,webp,avif}'),
).map((abs) => [abs, abs.replace(/^\/public/, '')]);

const stripRoot = (abs: string): string =>
  abs.startsWith(ROOT) ? abs.slice(ROOT.length) : abs.startsWith(PUBLIC_ROOT) ? abs.slice(PUBLIC_ROOT.length) : abs;

export type TextureRole = 'albedo' | 'normal' | 'roughness' | 'ao' | 'arm' | 'height' | 'metalness' | 'other';

const ROLE_SUFFIXES: [TextureRole, string[]][] = [
  ['albedo', ['albedo', 'diffuse', 'diff', 'basecolor', 'color', 'col', 'base']],
  ['normal', ['normal', 'nrm', 'nor', 'norm']],
  ['arm', ['arm', 'orm']],   // packed AO(R) / Roughness(G) / Metalness(B) — Poly Haven / ORM convention
  ['roughness', ['roughness', 'rough', 'rgh']],
  ['ao', ['ambientocclusion', 'occlusion', 'occ', 'ao']],
  ['height', ['displacement', 'height', 'disp']],
  ['metalness', ['metalness', 'metallic', 'metal', 'met']],
];
const RES_TOKENS = new Set(['1k', '2k', '4k', '8k', '512', '1024', '2048', '4096']);
const CHANNEL_TOKENS = new Set(['gl', 'dx', 'ogl', 'opengl', 'directx']); // normal-map convention tags
const IGNORE_TOKENS = new Set(['ior', 'spec', 'specular']);                // maps we don't consume

export interface TextureEntry {
  key: string;       // path under src/assets/textures/ (stable, persisted)
  fileName: string;
  url: string;       // Vite-hashed runtime URL
  role: TextureRole;
  setBase: string;   // grouping id (dir + base name without role/resolution tokens)
}

export interface TextureSet {
  id: string;
  label: string;
  albedoKey?: string;
  normalKey?: string;
  roughnessKey?: string;
  aoKey?: string;
  heightKey?: string;
  metalnessKey?: string;
  thumbUrl: string;
}

function detectRole(stem: string): { role: TextureRole; setTokens: string[] } {
  const tokens = stem.toLowerCase().split(/[_\-.\s]+/).filter(Boolean);
  let role: TextureRole = 'other';
  let roleIdx = -1;
  outer: for (let i = tokens.length - 1; i >= 0; i--) {
    for (const [r, suffixes] of ROLE_SUFFIXES) {
      if (suffixes.includes(tokens[i])) { role = r; roleIdx = i; break outer; }
    }
  }
  // setBase tokens = everything except the role token, channel tags (gl/dx) and resolution tags.
  const setTokens = tokens.filter((t, i) => i !== roleIdx && !RES_TOKENS.has(t) && !CHANNEL_TOKENS.has(t));
  return { role, setTokens };
}

export const TEXTURE_ENTRIES: TextureEntry[] = [...Object.entries(MODULES), ...PUBLIC_PAIRS]
  .map(([abs, url]) => {
    const key = stripRoot(abs);
    const slash = key.lastIndexOf('/');
    const dir = slash >= 0 ? key.slice(0, slash + 1) : '';
    const fileName = slash >= 0 ? key.slice(slash + 1) : key;
    const stem = fileName.replace(/\.[^.]+$/, '');
    const { role, setTokens } = detectRole(stem);
    const setBase = `${dir}${setTokens.join('_') || stem.toLowerCase()}`;
    return { key, fileName, url, role, setBase };
  })
  // Drop maps we don't consume (ior / specular) so they don't create junk sets.
  .filter((e) => !e.fileName.toLowerCase().split(/[_\-.\s]+/).some((t) => IGNORE_TOKENS.has(t)));

export const keyToUrl: Map<string, string> = new Map(TEXTURE_ENTRIES.map((e) => [e.key, e.url]));

// A packed ARM/ORM map fills roughness + ao + metalness (three.js samples G / R / B respectively).
const ROLE_FIELDS: Record<TextureRole, (keyof TextureSet)[]> = {
  albedo: ['albedoKey'],
  normal: ['normalKey'],
  roughness: ['roughnessKey'],
  ao: ['aoKey'],
  arm: ['roughnessKey', 'aoKey', 'metalnessKey'],
  height: ['heightKey'],
  metalness: ['metalnessKey'],
  other: ['albedoKey'], // a lone unknown image is treated as an albedo
};
const SOFT_ROLES = new Set<TextureRole>(['arm', 'other']); // only fill a slot if a dedicated map didn't

export const TEXTURE_SETS: TextureSet[] = (() => {
  const byBase = new Map<string, TextureSet>();
  for (const e of TEXTURE_ENTRIES) {
    let set = byBase.get(e.setBase);
    if (!set) {
      const label = (e.setBase.split('/').pop() || e.setBase).replace(/_/g, ' ').trim();
      set = { id: e.setBase, label, thumbUrl: e.url };
      byBase.set(e.setBase, set);
    }
    for (const f of ROLE_FIELDS[e.role]) {
      if (SOFT_ROLES.has(e.role)) { if (!set[f]) (set[f] as string) = e.key; }
      else (set[f] as string) = e.key;
    }
    if (e.role === 'albedo') set.thumbUrl = e.url;
  }
  return [...byBase.values()].sort((a, b) => a.label.localeCompare(b.label));
})();

// Resolve a stored value (library key OR literal URL) to a loadable URL, or undefined.
export function resolveTextureUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const mapped = keyToUrl.get(value);
  if (mapped) return mapped;
  if (value.startsWith('/') || value.startsWith('http') || value.includes('.')) return value;
  return undefined;
}
