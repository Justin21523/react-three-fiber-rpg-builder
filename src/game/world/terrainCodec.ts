// Phase 98d — base64 codecs for the per-area terrain grids (sculpt height deltas Float32, splat
// weights Uint8) stored in the editorEnvironment override / project export. Browser btoa/atob over a
// byte view; grids are small (≈40–90KB) so the char loop is fine.

export function encodeFloat32(arr: Float32Array): string {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function decodeFloat32(b64: string, length: number): Float32Array {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const out = new Float32Array(bytes.buffer);
    return out.length === length ? out : new Float32Array(length);
  } catch {
    return new Float32Array(length);
  }
}

export function encodeUint8(arr: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

export function decodeUint8(b64: string, length: number): Uint8Array {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(length);
    for (let i = 0; i < Math.min(length, bin.length); i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array(length);
  }
}
