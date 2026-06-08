# Ground / terrain GLTF materials

Drop material files here. They are auto-discovered and appear in the in-editor **GLTF material**
picker (F1 → 🌤 Environment → Surface). Picking one extracts its first material's PBR maps.

## IMPORTANT: include the textures!

A **multi-file `.gltf`** references its data + images by relative path, e.g.:

```
gravel_4k.gltf        ← references "textures/gravel_diff_4k.jpg", "gravel.bin", ...
gravel.bin
textures/
  gravel_diff_4k.jpg
  gravel_nor_gl_4k.jpg
  gravel_arm_4k.jpg
```

You must copy the **whole export** — the `.gltf`, the `.bin`, AND the `textures/` subfolder. If only
the `.gltf` + `.bin` are present (no image files), there are no PBR maps to load and the ground shows
only a flat colour. The loader rewrites those relative references to the bundled assets automatically
**as long as the image files are present in this folder.**

## Easier options

- **Use a self-contained `.glb`** (single file with geometry + textures embedded) — no sibling files
  to worry about.
- **Or skip GLTF entirely** and put the individual map images (`*_diff/_albedo`, `*_nor/_normal`,
  `*_rough`, `*_ao`) into `src/assets/textures/` — the image texture picker (98b) is simpler and works
  without any `.gltf`. (Note: Poly Haven's `_arm` map packs AO+Roughness+Metalness into R/G/B.)
