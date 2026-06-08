import { useEffect, useMemo } from 'react';
import { PlaneGeometry } from 'three';
import { useEditorEnvironmentStore } from '../../stores/editorEnvironmentStore';
import { resolveAreaEnvironment } from '../environment/resolveAreaEnvironment';
import { useGroundTextures } from './useGroundTextures';

// Phase 98b — optional flat PBR ground: a large three.js plane with a meshStandardMaterial whose maps
// are referenced by library key or path/URL. Rendered just above ZoneFloor (which keeps the collider)
// when the area's Environment groundType is 'flatPbr'. A missing/typo URL fails soft — the tinted
// plane still shows. Indoor areas are skipped. (Phase 98c: texture loading moved to useGroundTextures.)

export const FlatPbrGround = ({ areaId, size = 1000 }: { areaId: string; size?: number }) => {
  // Subscribe so the ground re-resolves when overrides / default mode change.
  useEditorEnvironmentStore((s) => s.overrides);
  useEditorEnvironmentStore((s) => s.defaultMode);
  const env = resolveAreaEnvironment(areaId);
  const g = env.pbrGround;
  const { albedo, normal, rough, ao } = useGroundTextures(g);

  // Plane geometry with a uv1 set so aoMap works (three r152+ reads the uv1 attribute).
  const geom = useMemo(() => {
    const p = new PlaneGeometry(size, size, 1, 1);
    p.setAttribute('uv1', p.getAttribute('uv').clone());
    return p;
  }, [size]);
  useEffect(() => () => geom.dispose(), [geom]);

  if (env.isIndoor || env.groundType !== 'flatPbr') return null;

  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
      {/* key forces a material rebuild when the SET of maps changes (shader recompile). */}
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
    </mesh>
  );
};
