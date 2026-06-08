# Modules & Architecture — R3F RPG Builder

A folder-by-folder reference for the kit. Every module is tagged so you know what to keep, what is a
swappable sample, and where to extend:

- **🟢 Reusable** — generic engine code; use as-is in any R3F game.
- **🔌 Seam** — a deliberate extension point (a hook / data table / `fallback` you replace).
- **🟡 Sample** — example content/wiring to delete or rewrite for a real game.

The kit was extracted from a larger 3D RPG by dependency-closure from yokai-free entry points; all
combat / codex / spawn / LLM / save-migration code was excluded. What remains is the world-building core
and a small playable loop on top of it.

---

## The big picture

```
                       ┌───────────────────────── App.tsx ─────────────────────────┐
                       │  DOM overlays (HUD/panels)            <Canvas> (R3F world)  │
                       │  Dock, WorldClockHUD, QuestTracker,   └── Scene             │
                       │  DialogueBox, InteractionPrompt,          ├ ambience        │
                       │  EditorHubPanel, TerrainBrushHud          ├ Physics         │
                       │  + InteractionHandler ([E] keys)          │   └ AreaRenderer │
                       └───────────────────────────────────────────┘   └ Player      │
                                         │  shared Zustand stores  │
                                         ▼                         ▼
   playerStore · worldStore · worldClockStore · interactionStore · dialogueStore · questStore ·
   inventoryStore · flagStore · doorStore · progressionStore · uiStore · audioStore ·
   editorEnvironmentStore · sceneEditStore · modelStudioStore · terrain*Store · graphicsSettingsStore
```

Both layers (3D + DOM) are siblings under `App.tsx` and communicate only through Zustand stores — the
same pattern as the source game. Pressing **F1** flips `uiStore.editMode`, which swaps lighting to a
flat editor look, suspends the player, and turns on gizmos.

---

## `src/assets/` — drop-in, auto-discovered 🔌

The centerpiece. Three folders are globbed at build time (`import.meta.glob`), so **dropping a file is
all you do** — no registry edits:

| Folder | Drop | Discovered by | Surfaces in |
|---|---|---|---|
| `models/` | `.glb` / `.gltf` (subfolders = categories) | `data/modelLibrary.ts` | Edit Mode → 🧊 Assets palette |
| `textures/` | PBR maps named `name_diff/_nor_gl/_arm/_rough/_disp` (Poly Haven style) | `game/world/textureLibrary.ts` | 🌤 Environment → ground / splat / patch pickers |
| `materials/` | a whole-material `.glb` (+ its `textures/` + `.bin`) | `game/world/gltfMaterial.ts` | 🌤 Environment → GLTF material picker |

Contract details live in each folder's `README`. HMR picks new files up without a restart.

---

## `src/data/` — seed data & registries

| File | Tag | Purpose |
|---|---|---|
| `modelLibrary.ts` | 🟢/🔌 | Globs `models/**` → `MODEL_ASSETS` + list + categories + `getModelAsset`. The model auto-discovery. |
| `environmentThemes.ts` | 🟢 | Per-biome sky/fog/ground/light presets (`BIOME_THEMES`). |
| `areas.ts` | 🟡 | `KitArea` registry: id, name, biome theme, `connectedAreaIds`, spawn. Two sample areas. |
| `sceneSetPieces.ts` | 🟡 | Baked GLB set-pieces per area (empty in the kit). |
| `sceneEditOverrides.ts` | 🟡 | Baked edit-mode layers (empty — the kit ships no pre-built map). |
| `items.ts` · `npcs.ts` · `doors.ts` · `quests.ts` · `dialogues.ts` | 🟡 | The sample talk→find→unlock quest content. |
| `areaEntities.ts` | 🟡/🔌 | Per-area NPC/item/door placements + pickup effects, read by `SampleEntities` + `InteractionHandler`. |

## `src/types/`

`environment.ts`, `environmentOverride.ts` (🟢 the environment/terrain model), `randomEvent.ts` (🟢
`TimeOfDay`/`WeatherCondition`), `dialogue.ts`, `quest.ts`, `item.ts` (🟢 generic RPG model — extend the
`DialogueCondition`/`DialogueEffect` unions to add kinds).

## `src/stores/` — Zustand state (one system each)

| Store | Tag | Owns |
|---|---|---|
| `playerStore` | 🟢 | Position (synced from Rapier), `currentAreaId`, `travelToArea`, spawn requests. |
| `worldStore` | 🟢 | Discovered areas. |
| `worldClockStore` | 🟢 | Real-time day/night minutes, time-of-day, weather. |
| `uiStore` | 🟢 | `editMode`, editor-hub open, active panel, hints. |
| `audioStore` | 🟢 | Particle on/off + density (FX flags; no audio engine yet). |
| `interactionStore` | 🟢 | The single "what's in range" target (id + type + label). |
| `dialogueStore` | 🟢 | Active dialogue traversal (temp + seed trees). |
| `questStore` | 🟢/🔌 | Quests + **`onQuestReward` reward seam** (`setQuestRewardHandler`). |
| `inventoryStore` · `flagStore` · `doorStore` · `progressionStore` | 🟢 | Items, world flags, unlocked doors, player level/exp. |
| `editorEnvironmentStore` | 🟢 | Per-area environment override (sky/fog/ground/terrain/patches); localStorage. |
| `sceneEditStore` | 🟢 | Edit-mode override/added/deleted placement layers + gizmo selection/undo. |
| `modelStudioStore` | 🟢 | Per-asset scale/pos/rot overrides merged onto `MODEL_ASSETS`. |
| `terrainBrushStore` · `terrainHistoryStore` · `pbrPatchEditStore` | 🟢 | Active terrain tool, sculpt undo/redo, patch-gizmo selection. |
| `graphicsSettingsStore` | 🟢 | Quality preset (shadows/LOD). |

## `src/game/` — the R3F world

- `core/Scene.tsx` 🟢 — composes ambience + `Physics` + `AreaRenderer` + `Player` + camera + gizmo.
- `camera/FollowCamera.tsx` 🟢 — orbit camera tracking the player.
- `player/Player.tsx` 🟢/🔌 — generic capsule (Rapier dynamic, camera-relative WASD + jump). Swap the
  mesh for your character; suspended in edit mode.
- `environment/` 🟢 — `environmentTheme` (biome inference + presets), `areaBiome` (resolve theme),
  `resolveAreaEnvironment` (merge the per-area override → `ResolvedEnvironment`).
- `world/` — the ground/terrain/atmosphere stack:
  - `AreaRenderer` 🟢/🔌 — renders one area (ground stack + set-pieces + `SampleEntities` + travel gates).
  - Grounds: `ZoneFloor` (flat) · `FlatPbrGround` · `HeightfieldGround` (+ `heightfieldTerrain` math,
    `terrainCodec`, `splatMaterial`/`useTerrainSplat`, `TerrainWater`) · `PbrPatchLayer`. 🟢
  - Textures/materials: `textureLibrary` · `gltfMaterial` · `useGroundTextures`. 🟢
  - GLB: `SceneGlbModel` (static, error-boundaried) · `SceneSetPieceLayer`. 🟢
  - Atmosphere: `DynamicAmbience` (drives the clock + lighting/fog/sky each frame) · `EnvironmentBackdrop`
    (Sky/gradient/solid) · `worldAmbience` (time-of-day interpolation) · `WeatherParticles` ·
    `BiomeParticles`. 🟢
  - Travel: `ZoneGate` + `gateLayout` (edge placement + arrival spawn). 🟢
  - `SampleEntities` 🟡 — renders the sample NPC/item/door placements.
- `edit/` 🟢 — Edit Mode core: `sceneEditMerge`, `EditablePlacement`/`EditableObject`/`EditableScenery`,
  `CollidableGlb` (trimesh/cuboid/hull/none collision), `SceneEditorGizmo` (drei TransformControls),
  `EditModeAmbience` (flat bright lighting).
- `interaction/` 🟢/🔌 — `Interactable` (sensor wrapper) + `InteractionHandler` (the `[E]` dispatcher:
  gate travel / NPC dialogue / item pickup / key-gated doors).
- `dialogue/dialogueRegistry.ts`, `evaluateCondition.ts`, `executeEffect.ts` 🟢 — resolve trees + the
  generic condition/effect engine (extend the switches when you add kinds).
- `render/renderSettings.ts` 🟢 — quality presets.

## `src/ui/` — DOM overlays

- `Dock` 🟢 — Edit Mode + Editor Hub toggles.
- `EditorHubPanel` 🟢/🔌 — draggable/resizable hub; tabs **🧊 Assets** (`EditAssetPalette`),
  **🌤 Environment** (`editor/EnvironmentEditorPanel` + `editor/TerrainToolsBar`), **🕓 World** (time /
  weather / particles). Add a tab for your own editor here.
- `TerrainBrushHud` 🟢 — floating terrain tool palette (edit mode).
- `WorldClockHUD` · `InteractionPrompt` · `QuestTracker` · `DialogueBox` 🟢 — overworld HUD.
- `hooks/useTypewriter.ts` 🟢 — dialogue text reveal.

## `src/App.tsx` 🟢 / `main.tsx` 🟢

`App` wires the Canvas + DOM overlays and owns global keys (F1 edit mode; W/E/R gizmo modes; Shift+D
duplicate; Del/Esc; Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y undo-redo; PBR-patch ops). `main.tsx` mounts `App`
**without** `StrictMode` (double-mount disposes the WebGL context under R3F).

---

## Extending the kit

- **Add an area** → push a `KitArea` to `data/areas.ts` (+ `connectedAreaIds`); gates appear automatically.
- **Place props** → drop a `.glb` in `assets/models/`, F1, 🧊 Assets, click to spawn, gizmo to arrange.
  Bake placements by editing `data/sceneEditOverrides.ts` (or export from the edit store).
- **Add a quest / NPC / item / door** → extend the `data/*.ts` samples + `areaEntities.ts`.
- **Custom rewards / loot / economy** → `setQuestRewardHandler((reward, quest) => …)` (the one reward seam).
- **Your character / combat** → replace the mesh in `player/Player.tsx`; add your own stores + a sibling
  layer in `AreaRenderer`. The world / terrain / edit layers don't depend on any of it.
- **New dialogue condition/effect kinds** → extend the unions in `types/dialogue.ts` + the
  `evaluateCondition` / `executeEffect` / `DialogueBox` switches.

## Out of scope (was game-specific)

Battle / codex / yokai spawns / recruitment / evolution; LLM content generation; multi-slot save +
migration; the standalone Model Studio window; the in-editor NPC/quest/trigger/encounter authoring tabs.
The `onQuestReward` seam + the `Player` mesh slot + a sibling `AreaRenderer` layer are where a consumer
plugs those back in.
