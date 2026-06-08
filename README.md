# R3F RPG Builder

A reusable **React-Three-Fiber RPG world-builder kit** extracted from the systems of a larger 3D RPG
(the yokai-specific gameplay — battle/codex/dispatch/spawns — is intentionally excluded). The heart of
the kit is an in-app **Edit Mode** that acts as a game-builder assistant: drop your own models and
textures into `src/assets/`, and they are **auto-detected** and immediately usable to place props,
shape terrain, and dress the world.

## Quick start
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # tsc -b && vite build
```

## The key idea — drop assets, they auto-appear
No manual registries. At build time the kit globs these folders (`import.meta.glob`):

| Folder | What to drop | Where it shows |
|---|---|---|
| `src/assets/models/` | `.glb` / `.gltf` (subfolders = categories) | Edit Mode → 🧊 **Assets** palette (place with gizmos) |
| `src/assets/textures/` | PBR maps `name_diff/_nor_gl/_arm/…` (Poly Haven naming) | 🌤 **Environment** → ground / splat / patch pickers |
| `src/assets/materials/` | whole-material `.glb` (+ its `textures/` + `.bin`) | 🌤 Environment → **GLTF material** picker |

Add a file → restart not needed (HMR) → it appears in the editor. Nothing to wire by hand.

## Controls
- **F1** — toggle Edit Mode (free-pan camera + transform gizmos). Outside edit mode: **WASD** move,
  **Space** jump.
- Edit Mode: click a placement to select; **W/E/R** = move / rotate / scale gizmo; **Shift+D** duplicate;
  **Del** delete; **Esc** deselect; **Ctrl+Z** undo, **Ctrl+Shift+Z / Ctrl+Y** redo (terrain).
- Terrain tools (after picking one in the 🌤 Environment panel) float at the top; hold **Shift** while
  dragging to move the camera instead of sculpting.

## Systems included
- **Edit Mode core** — `sceneEditStore` + `EditablePlacement`/`EditableObject`/`SceneEditorGizmo` +
  `CollidableGlb` (GLB placements with trimesh/cuboid/hull/none collision), undo/redo, batch select.
- **Environment / Terrain editor** — per-area sky (drei `<Sky>` / gradient / solid), fog, locked
  time-of-day; ground types **default / flat-PBR / heightfield**; brush **sculpting** (8 tools),
  multi-material **splat** (auto by height/slope + painted, per-layer rotation/tiling), valley **water**,
  terrain **LOD**, placeable overlapping **PBR patches** (drape over terrain), texture/material auto-
  discovery. State lives in `editorEnvironmentStore` (override layer; exportable).
- **Weather / time** — `worldClockStore` real-time day/night + weather, `DynamicAmbience` (lighting +
  sky), biome themes.
- **Character / camera** — generic capsule `Player` (Rapier, camera-relative WASD) + orbit `FollowCamera`.

## Folder map
```
src/
  assets/{models,textures,materials}/   drop-in, auto-discovered
  data/        areas, modelLibrary (glob), environmentThemes, sceneEdit/sceneSetPiece seeds
  game/
    core/Scene.tsx       the 3D scene composition
    edit/                edit-mode placements + gizmo + collidable GLB
    environment/         theme + resolveAreaEnvironment
    world/               grounds (ZoneFloor/Heightfield/FlatPbr/PbrPatch), terrain math, splat, ambience
    player/ camera/      generic player + follow camera
    render/              graphics/quality presets
  stores/      zustand state (ui, player, worldClock, editorEnvironment, sceneEdit, terrain*, …)
  types/       environmentOverride, environment, …
  ui/          Dock, EditorHubPanel, EditAssetPalette, editor/ panels, TerrainBrushHud
```

## Extension points (plug your own game on top)
- **Models/characters**: swap the capsule mesh in `game/player/Player.tsx`; place any GLB via Assets.
- **Combat / interactions / quests**: not included (were yokai-specific). Add your own stores + an
  `AreaRenderer` that also renders your entities; the world/edit/terrain layers are independent of them.
- **Multiple areas + travel** and **quest/dialogue** are on the roadmap (see `docs/`).

Built with React 19 · @react-three/fiber 9 · drei · @react-three/rapier · zustand · Tailwind v4.
