// Kit — connected-map gate placement. Each travel gate is pushed to the area edge along a stable
// compass direction hashed from the destination id, so a given neighbour is always reached by walking
// toward the same edge (like a real map). On arrival the player is dropped just inside the reciprocal
// gate (the one leading back), which `arrivalSpawn` computes. No interior/door special-casing here —
// that was yokai-game-specific; the kit treats every gate as an outdoor edge gate.
export const GATE_RADIUS = 38;

function angleFor(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 4294967296) * Math.PI * 2;
}

export interface EdgeGate {
  angle: number;
  position: [number, number, number];
}

export function edgeGate(targetAreaId: string, y = 2): EdgeGate {
  const angle = angleFor(targetAreaId);
  return { angle, position: [Math.cos(angle) * GATE_RADIUS, y, Math.sin(angle) * GATE_RADIUS] };
}

// Where to drop the player when they arrive in `arrivalAreaId` having come from `fromAreaId`: just
// inside the gate that points back to where they came from, facing the area centre.
export function arrivalSpawn(_arrivalAreaId: string, fromAreaId: string): { x: number; y: number; z: number } {
  // In the arrival area, the gate back to `fromAreaId` sits along angleFor(fromAreaId).
  const a = angleFor(fromAreaId);
  const inward = GATE_RADIUS - 6;
  return { x: Math.cos(a) * inward, y: 3, z: Math.sin(a) * inward };
}
