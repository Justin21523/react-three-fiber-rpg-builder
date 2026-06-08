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
  **Space** jump, **E** interact (gates / NPCs / items / doors).
- Edit Mode: click a placement to select; **W/E/R** = move / rotate / scale gizmo; **Shift+D** duplicate;
  **Del** delete; **Esc** deselect; **Ctrl+Z** undo, **Ctrl+Shift+Z / Ctrl+Y** redo (terrain).
- Terrain tools (after picking one in the 🌤 Environment panel) float at the top; hold **Shift** while
  dragging to move the camera instead of sculpting.

## Try the sample loop
Out of the box: walk to the **Village Guide** and press **E** to accept *A Helping Hand*; grab the
**Old Key** glowing in the field; walk to the **Storehouse Door** and press **E** to open it — the quest
auto-completes and grants the reward. Walk to the orange **gate** at the field edge to travel to the
Forest Edge area (and back).

## Systems included
- **Edit Mode core** — `sceneEditStore` + `EditablePlacement`/`EditableObject`/`SceneEditorGizmo` +
  `CollidableGlb` (GLB placements with trimesh/cuboid/hull/none collision), undo/redo, batch select.
- **Environment / Terrain editor** — per-area sky (drei `<Sky>` / gradient / solid), fog, locked
  time-of-day; ground types **default / flat-PBR / heightfield**; brush **sculpting** (8 tools),
  multi-material **splat** (auto by height/slope + painted, per-layer rotation/tiling), valley **water**,
  terrain **LOD**, placeable overlapping **PBR patches** (drape over terrain), texture/material auto-
  discovery. State lives in `editorEnvironmentStore` (override layer; exportable).
- **Weather / time** — `worldClockStore` real-time day/night + weather, `DynamicAmbience` (lighting +
  sky), biome themes, `WeatherParticles` (rain / night fireflies + stars) + `BiomeParticles` (per-biome
  drifting motes).
- **World / travel** — multi-area framework: `AreaRenderer` draws one area (ground + set-pieces + travel
  gates) data-driven from `data/areas.ts`; `ZoneGate` + `gateLayout` place edge gates and spawn you by
  the return gate; `worldStore` tracks discovery.
- **Quest / dialogue / interaction** — `Interactable` + `InteractionHandler` ([E] dispatcher),
  `dialogueStore` + `DialogueBox` (typewriter, emotion portraits, gated choices), `questStore` with a
  single swappable **`onQuestReward`** reward seam (`setQuestRewardHandler`), and generic
  inventory/flag/door/progression stores. A complete sample quest is wired up (see *Try the sample loop*).
- **Character / camera** — generic capsule `Player` (Rapier, camera-relative WASD) + orbit `FollowCamera`.

## Folder map
```
src/
  assets/{models,textures,materials}/   drop-in, auto-discovered
  data/        areas, modelLibrary (glob), environmentThemes, sceneEdit seeds;
               items/npcs/doors/quests/dialogues/areaEntities (sample content)
  game/
    core/Scene.tsx       the 3D scene composition
    edit/                edit-mode placements + gizmo + collidable GLB
    environment/         theme + resolveAreaEnvironment
    world/               grounds (ZoneFloor/Heightfield/FlatPbr/PbrPatch), terrain math, splat, ambience,
                         particles, AreaRenderer, ZoneGate, SampleEntities
    interaction/         Interactable + InteractionHandler ([E] dispatcher)
    dialogue/            dialogue tree registry; evaluateCondition / executeEffect engine
    player/ camera/      generic player + follow camera
    render/              graphics/quality presets
  stores/      zustand state (ui, player, world, worldClock, interaction, dialogue, quest, inventory,
               flag, door, progression, editorEnvironment, sceneEdit, terrain*, …)
  types/       environmentOverride, environment, dialogue, quest, item, …
  ui/          Dock, EditorHubPanel, EditAssetPalette, editor/ panels, TerrainBrushHud,
               WorldClockHUD, InteractionPrompt, QuestTracker, DialogueBox
  hooks/       useTypewriter
docs/MODULES.md   folder-by-folder module reference + extension guide
```

## Extension points (plug your own game on top)
- **Models/characters**: swap the capsule mesh in `game/player/Player.tsx`; place any GLB via Assets.
- **Areas + travel**: add a `KitArea` to `data/areas.ts` (with `connectedAreaIds`) — gates appear
  automatically.
- **Quests/dialogue/items**: extend the samples in `data/{quests,dialogues,npcs,items,doors,areaEntities}.ts`.
- **Custom rewards / loot / economy**: `setQuestRewardHandler((reward, quest) => …)` — the one reward seam.
- **Your combat / entities**: add your own stores + a sibling layer inside `AreaRenderer`; the
  world/edit/terrain layers don't depend on any of it.
- See **`docs/MODULES.md`** for a full folder-by-folder reference and the Reusable/Seam/Sample tags.

Built with React 19 · @react-three/fiber 9 · drei · @react-three/rapier · zustand · Tailwind v4.
