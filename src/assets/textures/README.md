# Ground PBR textures

Drop PBR ground texture image files here. They are **auto-discovered** at build time
(`import.meta.glob` in `src/game/world/textureLibrary.ts`) and appear in the in-editor
texture picker (F1 → 🌤 Environment → Ground = Flat PBR). No registration needed.

Supported formats: `.jpg .jpeg .png .webp .avif`.

## Naming convention (so maps group into one set)

Name each map `<set>_<role>.<ext>`, e.g.:

```
grass_albedo.jpg
grass_normal.jpg
grass_roughness.jpg
grass_ao.jpg
```

These group into one "grass" set; clicking it in the picker applies all four maps at once.

Recognised role suffixes (case-insensitive):

| role | accepted suffixes |
|------|-------------------|
| albedo (base colour, sRGB) | `albedo` `diffuse` `diff` `color` `col` `basecolor` `base` |
| normal (linear) | `normal` `nor` `nrm` `norm` |
| roughness (linear) | `roughness` `rough` `rgh` |
| ao (linear) | `ao` `occ` `occlusion` `ambientocclusion` |
| height/displacement (reserved for Phase 98c) | `height` `disp` `displacement` |
| metalness (linear) | `metalness` `metal` `met` |

Resolution tokens like `1k` `2k` `4k` `8k` in the filename are ignored when grouping.
A file whose suffix isn't recognised still shows up as its own single-map set.

Subfolders are fine (e.g. `forest/grass_albedo.jpg`) — the relative path is the stable key
stored in the area's Environment override.

Good CC0 sources: Poly Haven (polyhaven.com), ambientCG (ambientcg.com), 3DTextures.me.
