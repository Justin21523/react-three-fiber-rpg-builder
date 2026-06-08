/* eslint-disable react-hooks/immutability -- imperatively configures the Three.js material / uniforms
   (standard onBeforeCompile pattern); the material is created once and tuned via effects. */
import { useEffect, useMemo } from 'react';
import {
  DataTexture, RGBAFormat, UnsignedByteType, LinearFilter, RepeatWrapping,
  MeshStandardMaterial, Vector4, Color, type Texture, type IUniform,
} from 'three';
import { sampleHeight, type SculptGrid } from './heightfieldTerrain';
import type { ResolvedEnvironment } from '../environment/resolveAreaEnvironment';

type TerrainCfg = ResolvedEnvironment['terrain'];

// Phase 98d — terrain splat blending: up to 4 surface layers blended by a per-texel weight texture
// (RGBA = layer 0..3 weight). The weights come either from auto height/slope rules (bakeAutoWeights)
// or from brush painting. A single MeshStandardMaterial is patched via onBeforeCompile to mix the
// layer albedos — opt-in, so default terrain is unaffected.

// Slope in 0..1 (0 = flat, 1 = vertical) from a finite-difference of the height field.
function slopeAt(x: number, z: number, cfg: TerrainCfg, img: ImageData | null, sc: SculptGrid | null, e: number): number {
  const hx = sampleHeight(x + e, z, cfg, img, sc) - sampleHeight(x - e, z, cfg, img, sc);
  const hz = sampleHeight(x, z + e, cfg, img, sc) - sampleHeight(x, z - e, cfg, img, sc);
  const nyInv = Math.hypot(hx / (2 * e), hz / (2 * e), 1);
  return 1 - 1 / nyInv;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
};

// Bake an RGBA weight grid from height + slope rules.
export function bakeAutoWeights(
  res: number, cfg: TerrainCfg, img: ImageData | null, sc: SculptGrid | null,
  opts: { bandLow: number; bandHigh: number; slopeRock: number; count: number },
): Uint8Array {
  const out = new Uint8Array(res * res * 4);
  const { bandLow, bandHigh, slopeRock, count } = opts;
  const span = Math.max(0.5, (bandHigh - bandLow) * 0.5);
  const e = cfg.size / res;
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const x = (i / (res - 1) - 0.5) * cfg.size;
      const z = (j / (res - 1) - 0.5) * cfg.size;
      const h = sampleHeight(x, z, cfg, img, sc);
      const rock = count > 3 ? smoothstep(slopeRock, slopeRock + 0.15, slopeAt(x, z, cfg, img, sc, e)) : 0;
      let w0 = 1 - smoothstep(bandLow, bandLow + span, h);
      let w2 = count > 2 ? smoothstep(bandHigh - span, bandHigh, h) : 0;
      let w1 = count > 1 ? Math.max(0, 1 - w0 - w2) : 0;
      const nonRock = w0 + w1 + w2 || 1;
      const scale = (1 - rock) / nonRock;
      w0 *= scale; w1 *= scale; w2 *= scale;
      const idx = (j * res + i) * 4;
      out[idx] = Math.round(w0 * 255);
      out[idx + 1] = Math.round(w1 * 255);
      out[idx + 2] = Math.round(w2 * 255);
      out[idx + 3] = Math.round(rock * 255);
    }
  }
  return out;
}

export function makeWeightTexture(data: Uint8Array, res: number): DataTexture {
  const tex = new DataTexture(data, res, res, RGBAFormat, UnsignedByteType);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

interface SplatParams {
  layers: (Texture | null)[];  // up to 4 albedo textures
  normals: (Texture | null)[]; // up to 4 normal maps (optional per layer)
  repeats: number[];           // tiling per layer
  rotations: number[];         // UV rotation per layer (radians)
  weights: DataTexture;
  count: number;
  tint: string;
  roughness: number;
  metalness: number;
}

// A MeshStandardMaterial that blends up to 4 tiled layer albedos by the weight texture.
export function useSplatMaterial(p: SplatParams): MeshStandardMaterial {
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial();
    // A 1×1 white map enables the UV plumbing (vMapUv) that our injection samples.
    const white = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat, UnsignedByteType);
    white.needsUpdate = true;
    m.map = white;
    // A flat (0,0,1) normal map enables the tangent-space normal path (gives us `tbn` + `normalScale`);
    // it's also the default for layers without their own normal map.
    const flatN = new DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, RGBAFormat, UnsignedByteType);
    flatN.needsUpdate = true;
    m.normalMap = flatN;
    m.userData.flatN = flatN;
    m.userData.white = white;
    const u: Record<string, IUniform> = {
      uW: { value: null }, uL0: { value: null }, uL1: { value: null }, uL2: { value: null }, uL3: { value: null },
      uN0: { value: flatN }, uN1: { value: flatN }, uN2: { value: flatN }, uN3: { value: flatN },
      uRep: { value: new Vector4(8, 8, 8, 8) }, uRot: { value: new Vector4(0, 0, 0, 0) }, uCount: { value: 1 },
    };
    m.userData.u = u;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uW;uniform sampler2D uL0;uniform sampler2D uL1;uniform sampler2D uL2;uniform sampler2D uL3;uniform sampler2D uN0;uniform sampler2D uN1;uniform sampler2D uN2;uniform sampler2D uN3;uniform vec4 uRep;uniform vec4 uRot;uniform int uCount;\nvec2 splatUv(vec2 uv,float a,float r){float c=cos(a),s=sin(a);vec2 p=uv-0.5;p=vec2(p.x*c-p.y*s,p.x*s+p.y*c)+0.5;return p*r;}\nvec3 rotN(vec3 n,float a){float c=cos(a),s=sin(a);return vec3(n.x*c-n.y*s,n.x*s+n.y*c,n.z);}')
        .replace('#include <map_fragment>', [
          'vec4 sw = texture2D(uW, vMapUv);',
          'float wsum = sw.r + (uCount>1?sw.g:0.0) + (uCount>2?sw.b:0.0) + (uCount>3?sw.a:0.0);',
          'vec3 sc = texture2D(uL0, splatUv(vMapUv,uRot.x,uRep.x)).rgb*sw.r;',
          'if(uCount>1){ sc+=texture2D(uL1, splatUv(vMapUv,uRot.y,uRep.y)).rgb*sw.g; }',
          'if(uCount>2){ sc+=texture2D(uL2, splatUv(vMapUv,uRot.z,uRep.z)).rgb*sw.b; }',
          'if(uCount>3){ sc+=texture2D(uL3, splatUv(vMapUv,uRot.w,uRep.w)).rgb*sw.a; }',
          'if(wsum>0.001){ diffuseColor.rgb *= sc/wsum; }',
        ].join('\n'))
        // Blend per-layer normal maps (rotated so the bump direction follows the UV rotation).
        .replace('#include <normal_fragment_maps>', [
          'vec3 mapN = rotN(texture2D(uN0, splatUv(vNormalMapUv,uRot.x,uRep.x)).xyz*2.0-1.0, uRot.x)*sw.r;',
          'if(uCount>1){ mapN += rotN(texture2D(uN1, splatUv(vNormalMapUv,uRot.y,uRep.y)).xyz*2.0-1.0, uRot.y)*sw.g; }',
          'if(uCount>2){ mapN += rotN(texture2D(uN2, splatUv(vNormalMapUv,uRot.z,uRep.z)).xyz*2.0-1.0, uRot.z)*sw.b; }',
          'if(uCount>3){ mapN += rotN(texture2D(uN3, splatUv(vNormalMapUv,uRot.w,uRep.w)).xyz*2.0-1.0, uRot.w)*sw.a; }',
          'mapN = (wsum>0.001) ? mapN/wsum : vec3(0.0,0.0,1.0);',
          'mapN.xy *= normalScale;',
          'normal = normalize( tbn * mapN );',
        ].join('\n'));
    };
    return m;
  }, []);

  useEffect(() => {
    const u = mat.userData.u as Record<string, IUniform>;
    const setTex = (t: Texture | null) => {
      if (t) { t.wrapS = RepeatWrapping; t.wrapT = RepeatWrapping; t.needsUpdate = true; }
      return t;
    };
    const flatN = mat.userData.flatN as Texture;
    const white = mat.userData.white as Texture;
    u.uW.value = p.weights;
    u.uL0.value = setTex(p.layers[0] ?? null) ?? white;
    u.uL1.value = setTex(p.layers[1] ?? null) ?? white;
    u.uL2.value = setTex(p.layers[2] ?? null) ?? white;
    u.uL3.value = setTex(p.layers[3] ?? null) ?? white;
    u.uN0.value = setTex(p.normals[0] ?? null) ?? flatN;
    u.uN1.value = setTex(p.normals[1] ?? null) ?? flatN;
    u.uN2.value = setTex(p.normals[2] ?? null) ?? flatN;
    u.uN3.value = setTex(p.normals[3] ?? null) ?? flatN;
    u.uRep.value = new Vector4(p.repeats[0] ?? 8, p.repeats[1] ?? 8, p.repeats[2] ?? 8, p.repeats[3] ?? 8);
    u.uRot.value = new Vector4(p.rotations[0] ?? 0, p.rotations[1] ?? 0, p.rotations[2] ?? 0, p.rotations[3] ?? 0);
    u.uCount.value = p.count;
    mat.color = new Color(p.tint);
    mat.roughness = p.roughness;
    mat.metalness = p.metalness;
    mat.needsUpdate = true;
  }, [mat, p.weights, p.layers, p.normals, p.repeats, p.rotations, p.count, p.tint, p.roughness, p.metalness]);

  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}
