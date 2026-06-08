/* eslint-disable react-hooks/immutability -- live terrain sculpting imperatively mutates the
   Three.js BufferGeometry / cursor mesh (standard R3F pattern); the data lives outside React state. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Detailed } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { DoubleSide, type Mesh } from 'three';
import { useEditorEnvironmentStore } from '../../stores/editorEnvironmentStore';
import { useUiStore } from '../../stores/uiStore';
import { useTerrainBrushStore } from '../../stores/terrainBrushStore';
import { useTerrainHistoryStore } from '../../stores/terrainHistoryStore';
import { resolveAreaEnvironment } from '../environment/resolveAreaEnvironment';
import { resolveTextureUrl } from './textureLibrary';
import { useGroundTextures } from './useGroundTextures';
import {
  applyBrush, applyRegionSculpt, buildTerrainGeometry, loadHeightmap, sampleHeight, sampleSculpt,
  type SculptGrid, type SculptTool,
} from './heightfieldTerrain';
import type { TerrainRegion } from '../../stores/terrainBrushStore';
import { decodeFloat32, encodeFloat32 } from './terrainCodec';
import { TerrainWater } from './TerrainWater';
import { useTerrainSplat } from './useTerrainSplat';

const SCULPT_RES = 129;
const SCULPT_TOOLSET: SculptTool[] = ['raise', 'lower', 'smooth', 'flatten', 'noise', 'sharpen', 'terrace', 'setLevel'];

// Phase 98c/98d — walkable undulating terrain. The displaced PlaneGeometry IS the collision surface
// (Rapier colliders="trimesh"). Phase 98d adds brush sculpting: in Edit Mode with a sculpt tool active,
// drag on the terrain to raise/lower/smooth/flatten/noise/sharpen/terrace/set-level; the mesh updates
// live and the trimesh collider rebuilds on release. Sculpt deltas persist (base64) in the override.
export const HeightfieldGround = ({ areaId }: { areaId: string }) => {
  useEditorEnvironmentStore((s) => s.overrides);
  useEditorEnvironmentStore((s) => s.defaultMode);
  const setOverride = useEditorEnvironmentStore((s) => s.setOverride);
  const editMode = useUiStore((s) => s.editMode);
  const tool = useTerrainBrushStore((s) => s.tool);
  const radius = useTerrainBrushStore((s) => s.radius);
  const strength = useTerrainBrushStore((s) => s.strength);
  const terraceStep = useTerrainBrushStore((s) => s.terraceStep);
  const targetLevel = useTerrainBrushStore((s) => s.targetLevel);
  const paintLayer = useTerrainBrushStore((s) => s.paintLayer);
  const regions = useTerrainBrushStore((s) => s.regions);
  const gl = useThree((s) => s.gl);

  const env = resolveAreaEnvironment(areaId);
  const { size, segments, amplitude, frequency, octaves, seed, baseOffset, flattenRadius, heightmapAmplitude, heightmapInvert, heightmapUrl } = env.terrain;
  const tex = useGroundTextures(env.pbrGround);

  // Optional heightmap (async).
  const [imageData, setImageData] = useState<ImageData | null>(null);
  useEffect(() => {
    const u = heightmapUrl ? resolveTextureUrl(heightmapUrl) : undefined;
    if (!u || !heightmapAmplitude) return;
    let cancelled = false;
    void loadHeightmap(u).then((d) => { if (!cancelled) setImageData(d); });
    return () => { cancelled = true; };
  }, [heightmapUrl, heightmapAmplitude]);
  const img = heightmapUrl && heightmapAmplitude ? imageData : null;

  const cfg = useMemo(
    () => ({ size, segments, amplitude, frequency, octaves, seed, baseOffset, flattenRadius, heightmapAmplitude, heightmapInvert, heightmapUrl }),
    [size, segments, amplitude, frequency, octaves, seed, baseOffset, flattenRadius, heightmapAmplitude, heightmapInvert, heightmapUrl],
  );

  // Live sculpt grid (height deltas); populated in an effect (never read during render).
  const sculptRef = useRef<SculptGrid | null>(null);
  const sculptData = env.terrain.sculpt?.data;
  const sculptResStored = env.terrain.sculpt?.res ?? SCULPT_RES;
  // Committed sculpt grid (from the override) — used to BUILD the geometry so the trimesh collider,
  // generated from that geometry at mount, matches the surface height exactly.
  const sculptGridMemo = useMemo<SculptGrid>(
    () => ({ res: sculptResStored, data: sculptData ? decodeFloat32(sculptData, sculptResStored * sculptResStored) : new Float32Array(sculptResStored * sculptResStored) }),
    [sculptData, sculptResStored],
  );

  // Geometry includes the committed sculpt (so collider == visual). Rebuilt on any param/sculpt change.
  const geom = useMemo(() => buildTerrainGeometry(cfg, img, sculptGridMemo), [cfg, img, sculptGridMemo]);
  useEffect(() => () => geom.dispose(), [geom]);

  // Cache the noise-only Y per vertex so a live sculpt drag only adds the cheap sculpt delta.
  const baseY = useMemo(() => {
    const pos = geom.attributes.position;
    const a = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) a[i] = sampleHeight(pos.getX(i), pos.getZ(i), cfg, img, null);
    return a;
  }, [geom, cfg, img]);

  const applyLive = useCallback(() => {
    const sc = sculptRef.current;
    if (!sc) return;
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, baseY[i] + sampleSculpt(pos.getX(i), pos.getZ(i), cfg, sc));
    pos.needsUpdate = true;
    geom.computeVertexNormals();
  }, [geom, baseY, cfg]);

  // Seed / re-seed the live sculpt grid from the override (mount, reset, load, our own commit).
  useEffect(() => {
    sculptRef.current = { res: sculptResStored, data: sculptData ? decodeFloat32(sculptData, sculptResStored * sculptResStored) : new Float32Array(sculptResStored * sculptResStored) };
    applyLive();
  }, [sculptData, sculptResStored, applyLive]);

  // LOD — separate high/low visual geometries (built from committed sculpt); the collider mesh stays
  // the medium-res `geom`. LOD pauses while sculpting so the single live mesh gives instant feedback.
  const lod = env.terrain.lod;
  const lodOn = !!lod?.enabled;
  const highGeom = useMemo(() => (lodOn ? buildTerrainGeometry(cfg, img, sculptGridMemo, lod?.highSegments ?? cfg.segments) : null), [lodOn, cfg, img, sculptGridMemo, lod?.highSegments]);
  const lowGeom = useMemo(() => (lodOn ? buildTerrainGeometry(cfg, img, sculptGridMemo, lod?.lowSegments ?? 24) : null), [lodOn, cfg, img, sculptGridMemo, lod?.lowSegments]);
  useEffect(() => () => { highGeom?.dispose(); lowGeom?.dispose(); }, [highGeom, lowGeom]);

  // Splat (multi-material) — supplies a blended material + paint function when enabled.
  const onCommitWeights = useCallback((wres: number, base64: string) => {
    useTerrainHistoryStore.getState().push(areaId); // snapshot pre-edit state for Ctrl+Z
    setOverride(areaId, { terrain: { ...env.terrain, splat: { ...env.terrain.splat, mode: 'paint', res: wres, weights: base64 } } });
  }, [areaId, env.terrain, setOverride]);
  const splat = useTerrainSplat(env, cfg, img, sculptRef, onCommitWeights);

  const [colliderV, setColliderV] = useState(0);
  // Debounce the trimesh collider rebuild: the visual mesh updates live with `geom`, but the RigidBody
  // only remounts ~250ms after the last param change, so dragging a slider doesn't rebuild every tick.
  const [colliderGeomId, setColliderGeomId] = useState(geom.uuid);
  useEffect(() => {
    const t = setTimeout(() => setColliderGeomId(geom.uuid), 250);
    return () => clearTimeout(t);
  }, [geom.uuid]);
  const draggingRef = useRef(false);
  const cursorRef = useRef<Mesh>(null);

  const noiseAt = useCallback((x: number, z: number) => sampleHeight(x, z, cfg, img, null), [cfg, img]);
  const sculptActive = editMode && (SCULPT_TOOLSET as string[]).includes(tool);
  const paintActive = editMode && tool === 'paint' && splat.enabled;
  const selectActive = editMode && tool === 'select';
  const toolActive = sculptActive || paintActive || selectActive;

  const dab = useCallback((x: number, z: number) => {
    if (tool === 'paint') { splat.paintAt(x, z, paintLayer, radius, strength); return; }
    applyBrush(sculptRef.current!, size, x, z, tool as SculptTool, radius, strength, noiseAt, { terraceStep, targetLevel });
    applyLive();
  }, [size, tool, radius, strength, noiseAt, applyLive, terraceStep, targetLevel, splat, paintLayer]);

  const commitSculpt = useCallback(() => {
    const sc = sculptRef.current!;
    useTerrainHistoryStore.getState().push(areaId); // snapshot pre-edit state for Ctrl+Z
    setOverride(areaId, { terrain: { ...env.terrain, sculpt: { res: sc.res, data: encodeFloat32(sc.data) } } });
    setColliderV((v) => v + 1);
  }, [areaId, env.terrain, setOverride]);

  // Region selection (marquee) — pending rect during drag, committed to the store on release.
  const [pendingRect, setPendingRect] = useState<TerrainRegion | null>(null);
  const rectStartRef = useRef<{ x: number; z: number } | null>(null);

  // Commit on pointer-up anywhere (drag may end off the mesh).
  useEffect(() => {
    if (!toolActive) return;
    const up = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (tool === 'select') {
        const s = rectStartRef.current;
        if (s && pendingRect && Math.abs(pendingRect.x1 - pendingRect.x0) > 0.5 && Math.abs(pendingRect.z1 - pendingRect.z0) > 0.5) {
          useTerrainBrushStore.getState().addRegion(pendingRect);
        }
        rectStartRef.current = null;
        setPendingRect(null);
      } else if (tool === 'paint') splat.commit();
      else commitSculpt();
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [toolActive, tool, splat, commitSculpt, pendingRect]);

  // Execute a region batch-apply request from the panel.
  const pendingNonce = useTerrainBrushStore((s) => s.pendingApply.nonce);
  useEffect(() => {
    if (env.isIndoor || env.groundType !== 'heightfield') return;
    const { regions, pendingApply } = useTerrainBrushStore.getState();
    if (pendingApply.nonce === 0 || regions.length === 0) return;
    // Defer so the commit's setState isn't run synchronously inside the effect body.
    queueMicrotask(() => {
      if (pendingApply.kind === 'fillLayer') {
        regions.forEach((r) => splat.fillRegion(r, pendingApply.layer));
        splat.commit();
      } else {
        regions.forEach((r) => applyRegionSculpt(sculptRef.current!, size, r, pendingApply.kind as 'raise' | 'lower' | 'flatten', strength, noiseAt));
        applyLive();
        commitSculpt();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNonce]);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!toolActive || e.shiftKey) return; // Shift → let the camera orbit/pan instead of editing
    e.stopPropagation();
    draggingRef.current = true;
    gl.domElement.style.cursor = 'crosshair';
    if (tool === 'select') { rectStartRef.current = { x: e.point.x, z: e.point.z }; setPendingRect({ x0: e.point.x, z0: e.point.z, x1: e.point.x, z1: e.point.z }); return; }
    dab(e.point.x, e.point.z);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (cursorRef.current) cursorRef.current.position.set(e.point.x, e.point.y + 0.06, e.point.z);
    if (!toolActive || !draggingRef.current || e.shiftKey) return;
    e.stopPropagation();
    if (tool === 'select') { const s = rectStartRef.current; if (s) setPendingRect({ x0: s.x, z0: s.z, x1: e.point.x, z1: e.point.z }); return; }
    dab(e.point.x, e.point.z);
  };

  // Track Shift so the camera can temporarily take over the drag (FollowCamera reads shiftHeld).
  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.key === 'Shift') useTerrainBrushStore.getState().setShiftHeld(true); };
    const ku = (e: KeyboardEvent) => { if (e.key === 'Shift') useTerrainBrushStore.getState().setShiftHeld(false); };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); useTerrainBrushStore.getState().setShiftHeld(false); };
  }, []);

  if (env.isIndoor || env.groundType !== 'heightfield') return null;

  const g = env.pbrGround;
  const { albedo, normal, rough, ao } = tex;
  const splatMat = splat.material;
  const showLod = lodOn && !toolActive && !!highGeom && !!lowGeom;
  // Material descriptor reused by the collider mesh + LOD meshes.
  const matChild = splatMat ? null : (
    <meshStandardMaterial
      key={`${!!albedo}-${!!normal}-${!!rough}-${!!ao}`}
      color={g.tint}
      map={albedo ?? undefined}
      normalMap={normal ?? undefined}
      roughnessMap={rough ?? undefined}
      aoMap={ao ?? undefined}
      roughness={g.roughness}
      metalness={g.metalness}
      normalScale={[g.normalScale, g.normalScale]}
    />
  );

  return (
    <>
      {/* Key on the geometry uuid (+ a manual bump) so the trimesh collider rebuilds whenever the
          surface changes (param edits, sculpt commit) — keeping collision aligned with the visual. */}
      <RigidBody key={`${colliderGeomId}_${colliderV}`} type="fixed" colliders="trimesh">
        {/* Collider + (when LOD is off / sculpting) the visible surface. */}
        <mesh geometry={geom} material={splatMat ?? undefined} visible={!showLod} receiveShadow castShadow onPointerDown={onDown} onPointerMove={onMove}>
          {matChild}
        </mesh>
      </RigidBody>

      {/* Visual LOD (near high-res, far low-res). Collider stays the medium mesh above. */}
      {showLod && (
        <Detailed distances={[0, lod?.far ?? 160]}>
          <mesh geometry={highGeom!} material={splatMat ?? undefined} receiveShadow castShadow onPointerDown={onDown} onPointerMove={onMove}>{matChild}</mesh>
          <mesh geometry={lowGeom!} material={splatMat ?? undefined} receiveShadow>{matChild}</mesh>
        </Detailed>
      )}

      {/* Deep flat safety net — catches a fall past the terrain patch edge. */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[size / 2, 0.5, size / 2]} position={[0, env.groundCatchY - 1, 0]} />
      </RigidBody>

      {/* Region selection boxes (committed = cyan, pending drag = amber). */}
      {editMode && [...regions, ...(pendingRect ? [pendingRect] : [])].map((r, i) => {
        const cx = (r.x0 + r.x1) / 2; const cz = (r.z0 + r.z1) / 2;
        const w = Math.max(0.1, Math.abs(r.x1 - r.x0)); const d = Math.max(0.1, Math.abs(r.z1 - r.z0));
        return (
          <mesh key={i} position={[cx, 0, cz]}>
            <boxGeometry args={[w, 40, d]} />
            <meshBasicMaterial color={i < regions.length ? '#22d3ee' : '#fbbf24'} wireframe transparent opacity={0.55} depthTest={false} />
          </mesh>
        );
      })}

      {/* Brush ring cursor (edit mode, sculpt/paint tool active). */}
      {(sculptActive || paintActive) && (
        <mesh ref={cursorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -999, 0]}>
          <ringGeometry args={[radius * 0.9, radius, 48]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} side={DoubleSide} depthTest={false} />
        </mesh>
      )}

      <TerrainWater size={size} water={env.terrain.water} />
    </>
  );
};
