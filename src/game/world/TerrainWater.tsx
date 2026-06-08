import type { TerrainWaterConfig } from '../../types/environmentOverride';

// Phase 98d — automatic valley water: a translucent plane across the terrain patch at a chosen Y, so
// any terrain below that level reads as submerged. Visual only (no collider), like WaterAreaRenderer.
export const TerrainWater = ({ size, water }: { size: number; water?: TerrainWaterConfig }) => {
  if (!water?.enabled) return null;
  const level = water.level ?? 0;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, level, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        color={water.color ?? '#2d6a8f'}
        transparent
        opacity={water.opacity ?? 0.6}
        roughness={0.2}
        metalness={0.15}
        depthWrite={false}
      />
    </mesh>
  );
};
