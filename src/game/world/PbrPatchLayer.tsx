import { useEffect, useMemo, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import { PlaneGeometry, type Group } from 'three';
import type { PbrPatch } from '../../types/environmentOverride';
import { useEditorEnvironmentStore } from '../../stores/editorEnvironmentStore';
import { usePbrPatchEditStore } from '../../stores/pbrPatchEditStore';
import { useUiStore } from '../../stores/uiStore';
import { resolveAreaEnvironment, type ResolvedEnvironment } from '../environment/resolveAreaEnvironment';
import { useGroundTextures } from './useGroundTextures';
import { sampleHeight, loadHeightmap, type SculptGrid } from './heightfieldTerrain';
import { resolveTextureUrl } from './textureLibrary';
import { decodeFloat32 } from './terrainCodec';

const SCULPT_RES = 129;
const PATCH_SEG = 24;

// Phase 98d/100 — overlapping placeable PBR patches/decals. Each patch is a textured quad (a group so
// its Y-rotation is clean). On heightfield terrain a patch drapes over the surface (Part 3): its plane
// is subdivided and each vertex displaced to the terrain height (noise + sculpt). In Edit Mode a patch
// is click-selectable + gizmo-editable (W/E/R move/rotate/scale). Visual only.
const Patch = ({ p, areaId, hf, terrain, sculpt, hmImg }: { p: PbrPatch; areaId: string; hf: boolean; terrain: ResolvedEnvironment['terrain']; sculpt: SculptGrid | null; hmImg: ImageData | null }) => {
  const pg = useMemo(
    () => ({ albedoUrl: p.albedoKey, normalUrl: p.normalKey, gltfMaterialUrl: p.gltfMaterialUrl, repeat: p.repeat, rotationDeg: 0, normalScale: 1, roughness: 1, metalness: 0, tint: '#ffffff' as string }),
    [p.albedoKey, p.normalKey, p.gltfMaterialUrl, p.repeat],
  );
  const { albedo, normal } = useGroundTextures(pg);
  const editMode = useUiStore((s) => s.editMode);
  const selected = usePbrPatchEditStore((s) => s.selectedId === p.id);
  const mode = usePbrPatchEditStore((s) => s.mode);
  const [grp, setGrp] = useState<Group | null>(null);

  const conform = hf && p.conform !== false;
  // Subdivided + draped plane on heightfield (vertices displaced to the terrain height), else flat.
  const geom = useMemo(() => {
    const sub = conform ? PATCH_SEG : 1;
    const g = new PlaneGeometry(p.sizeX, p.sizeZ, sub, sub);
    if (conform && sculpt) {
      const yaw = (p.rotationDeg * Math.PI) / 180;
      const c = Math.cos(yaw); const s = Math.sin(yaw);
      const py = p.y ?? 0.05;
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i); const v = pos.getY(i); // plane-local; group-local XZ after -90°X is (u, -v)
        const wx = p.x + u * c + -v * s;
        const wz = p.z - u * s + -v * c;
        const h = sampleHeight(wx, wz, terrain, hmImg, sculpt);
        pos.setZ(i, h + 0.06 - py); // plane Z → group-local Y after the mesh's -90°X rotation
      }
      pos.needsUpdate = true;
      g.computeVertexNormals();
    }
    g.setAttribute('uv1', g.getAttribute('uv').clone());
    return g;
  }, [conform, sculpt, hmImg, terrain, p.sizeX, p.sizeZ, p.rotationDeg, p.x, p.z, p.y]);
  useEffect(() => () => geom.dispose(), [geom]);

  // On gizmo release, bake the group's transform back into the patch (x/z + Y rotation + scale→size).
  const commit = () => {
    if (!grp) return;
    const st = useEditorEnvironmentStore.getState();
    const cur = st.overrides[areaId]?.pbrPatches ?? [];
    const sx = grp.scale.x; const sz = grp.scale.z;
    const next = cur.map((q) => (q.id === p.id
      ? { ...q, x: grp.position.x, z: grp.position.z, rotationDeg: (grp.rotation.y * 180) / Math.PI, sizeX: q.sizeX * sx, sizeZ: q.sizeZ * sz }
      : q));
    grp.scale.set(1, 1, 1);
    st.setOverride(areaId, { pbrPatches: next });
  };

  return (
    <>
      <group
        ref={setGrp}
        position={[p.x, p.y ?? 0.05, p.z]}
        rotation={[0, (p.rotationDeg * Math.PI) / 180, 0]}
        onClick={(e) => { if (editMode) { e.stopPropagation(); usePbrPatchEditStore.getState().select(p.id); } }}
      >
        <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <meshStandardMaterial
            key={`${!!albedo}-${!!normal}`}
            map={albedo ?? undefined}
            normalMap={normal ?? undefined}
            roughness={1}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
        {selected && editMode && (
          <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.5} />
          </mesh>
        )}
      </group>
      {selected && editMode && grp && (
        <TransformControls object={grp} mode={mode} showY={mode !== 'translate'} showX={mode !== 'rotate'} showZ={mode !== 'rotate'} onMouseUp={commit} />
      )}
    </>
  );
};

export const PbrPatchLayer = ({ areaId }: { areaId: string }) => {
  useEditorEnvironmentStore((s) => s.overrides);
  useEditorEnvironmentStore((s) => s.defaultMode);
  const env = resolveAreaEnvironment(areaId);
  const hf = env.groundType === 'heightfield';
  const t = env.terrain;
  // Stable terrain cfg + decoded sculpt grid (once per area), so patch drape geometry memoises.
  const terrain = useMemo(() => t, [t.size, t.segments, t.amplitude, t.frequency, t.octaves, t.seed, t.baseOffset, t.flattenRadius, t.heightmapAmplitude]); // eslint-disable-line react-hooks/exhaustive-deps
  const sculptData = t.sculpt?.data;
  const sculptRes = t.sculpt?.res ?? SCULPT_RES;
  const sculpt = useMemo<SculptGrid | null>(() => {
    if (!hf) return null;
    return { res: sculptRes, data: sculptData ? decodeFloat32(sculptData, sculptRes * sculptRes) : new Float32Array(sculptRes * sculptRes) };
  }, [hf, sculptData, sculptRes]);

  // Heightmap-driven relief (cached — already loaded by HeightfieldGround), so patches drape over it too.
  const [hmRaw, setHmRaw] = useState<ImageData | null>(null);
  useEffect(() => {
    const url = hf && t.heightmapUrl && t.heightmapAmplitude ? resolveTextureUrl(t.heightmapUrl) : undefined;
    if (!url) return;
    let cancelled = false;
    void loadHeightmap(url).then((d) => { if (!cancelled) setHmRaw(d); });
    return () => { cancelled = true; };
  }, [hf, t.heightmapUrl, t.heightmapAmplitude]);
  const hmImg = hf && t.heightmapUrl && t.heightmapAmplitude ? hmRaw : null;

  if (env.isIndoor || env.pbrPatches.length === 0) return null;
  return <>{env.pbrPatches.map((p) => <Patch key={p.id} p={p} areaId={areaId} hf={hf} terrain={terrain} sculpt={sculpt} hmImg={hmImg} />)}</>;
};
