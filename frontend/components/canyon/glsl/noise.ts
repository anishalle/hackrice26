/**
 * Noise primitives and the volumetric cloud march, from river.ai's FS_COMMON.
 *
 * Both the 2D and 3D value-noise functions have a baked path (one filtered
 * fetch of the LUT) and a procedural path (hash chains), switched by
 * `u_noiseOn` so the two can be A/B'd. They are visually equivalent.
 *
 * `marchClouds` is front-to-back with an IQ single-tap shadow, at the preset
 * baked into the original: 40 steps, stepX 1.45, per-step dither so the layer
 * stipples rather than banding. It runs only in the offscreen cloud pass.
 *
 * Dropped as unreachable in the live path: `hue2rgb`, `bankUV`, `segMask`,
 * `riverCx`, `worley`/`cloudDensity` (superseded by `cldVol`), the whole
 * `terrain*` family, `townF`, `cityAt` and `field` — all of them called only
 * from the `#if 0` block in the original's `main()`.
 */
export const NOISE = /* glsl */ `
    float hash(vec2 p){
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }
    float sq(float x){ return x * x; }
    float vnoise(vec2 p){
      // Baked path: the LUT's R channel is a 256-periodic random grid; hardware
      // bilinear filtering reconstructs value noise in one fetch (vs 4 hashes +
      // a manual smoothstep blend). Visually equivalent to the procedural path.
      if (u_noiseOn > 0.5) return texture2D(u_noise, (p + 0.5) * 0.00390625).r; // /256
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i), b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p){
      float s = 0.0, a = 0.5;
      for (int i = 0; i < 2; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(11.3, 7.7); a *= 0.5; }
      return s;
    }

    // ── Volumetric clouds (3D raymarch, ported from the aurora sandbox) ──
    // 3D value noise + fbm (overloaded for vec3).
    float hash(vec3 p){
      p = fract(p * vec3(127.31, 311.7, 74.7));
      p += dot(p, p.yzx + 19.19);
      return fract((p.x + p.y) * p.z);
    }
    float vnoise(vec3 p){
      // Baked path (IQ trick): pack 3D value noise into a 2D LUT. The G channel
      // holds the same grid shifted by (37,17), so it equals the z+1 slice. One
      // bilinear fetch covers x/y; mix() over the z fraction covers z — turning
      // 8 hashes + 7 mixes into a single texture read + one lerp.
      if (u_noiseOn > 0.5){
        vec3 ip = floor(p), fp = fract(p);
        fp = fp * fp * (3.0 - 2.0 * fp);
        vec2 uv = (ip.xy + vec2(37.0, 17.0) * ip.z) + fp.xy;
        vec2 rg = texture2D(u_noise, (uv + 0.5) * 0.00390625).rg; // /256
        return mix(rg.r, rg.g, fp.z);
      }
      vec3 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i + vec3(0.,0.,0.)), b = hash(i + vec3(1.,0.,0.));
      float c = hash(i + vec3(0.,1.,0.)), d = hash(i + vec3(1.,1.,0.));
      float e = hash(i + vec3(0.,0.,1.)), g = hash(i + vec3(1.,0.,1.));
      float h = hash(i + vec3(0.,1.,1.)), k = hash(i + vec3(1.,1.,1.));
      return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y),
                 mix(mix(e,g,f.x), mix(h,k,f.x), f.y), f.z);
    }
    const mat3 cldRot = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
    float fbm(vec3 p){
      float s = 0.0, a = 0.5;
      s += a * vnoise(p); p = cldRot * p * 2.03; a *= 0.5;
      s += a * vnoise(p); p = cldRot * p * 2.01; a *= 0.5;
      s += a * vnoise(p); p = cldRot * p * 2.02; a *= 0.5;
      s += a * vnoise(p);
      return s;
    }
    // Cheap 2-octave fbm for the sun-shadow tap (halves that per-sample cost).
    float fbmSh(vec3 p){
      float s = vnoise(p) * 0.6;
      p = cldRot * p * 2.03;
      s += vnoise(p) * 0.3;
      return s;
    }
    // Density of the cloud slab. lod (1 near, 0 far) fades detail & softens the
    // coverage edge with distance so the layer recedes cleanly to the horizon.
    // Tuned constants baked from the sandbox: cover 0.45, scale 0.60.
    float cldVol(vec3 p, vec3 drift, float lod){
      float base = 0.65, top = 1.95;
      float env = smoothstep(base, base + 0.25, p.y) * smoothstep(top, top - 0.5, p.y);
      if (env < 0.001) return 0.0;
      vec3 q = p * 0.60 + drift;
      float n = fbm(q) - 0.14 * vnoise(q * 4.2) * lod;
      float w = mix(1.50, 0.31, lod);
      return smoothstep(0.45, 0.45 + w, n) * env;
    }
    // Front-to-back volumetric march, IQ single-tap shadow. Baked preset:
    // 40 steps, stepX 1.45, per-step dither (→ stippled, no banding lines).
    vec4 marchClouds(vec3 ro, vec3 rd, vec3 sunDir3, vec3 skyTint){
      vec3  drift = vec3(0.155 * 0.20, 0.0, 0.155) * u_time; // speed 0.155, angle 0.20
      vec3  sunC = vec3(1.00, 0.92, 0.78), amb = vec3(0.55, 0.65, 0.78);
      vec4  sum = vec4(0.0);
      float jit = hash(vec3(gl_FragCoord.xy, 7.0));
      float t = 0.4;
      for (int i = 0; i < 40; i++){
        if (sum.a > 0.99 || t > 60.0) break;
        float dt = clamp(0.04 * t, 0.08, 0.9) * 1.45;        // stepX 1.45
        vec3 p = ro + (t + (jit - 0.5) * dt) * rd;           // per-step dither → stipple, not lines
        if (p.y < 0.65){ if (rd.y <= 0.0) break; t += max(0.30, 0.08 * t) * 1.45; continue; }
        if (p.y > 1.95){ if (rd.y >= 0.0) break; t += max(0.30, 0.08 * t) * 1.45; continue; }
        float lod = 1.0 - smoothstep(4.0, 14.0, t);
        float d = cldVol(p, drift, lod);
        if (d > 0.01){
          float w  = (1.95 - p.y) / max(sunDir3.y, 0.20);
          float ls = fbmSh((p + sunDir3 * w) * 0.60 + drift);
          float lit = smoothstep(0.30, 0.60, ls);
          vec3  col = amb * 0.45 + sunC * lit;
          col = mix(col, skyTint, 1.0 - exp(-0.0011 * t * t));
          float a = clamp(d * 1.20, 0.0, 1.0);
          sum.rgb += col * a * (1.0 - sum.a);
          sum.a   += a       * (1.0 - sum.a);
        }
        t += dt;
      }
      return clamp(sum, 0.0, 1.0);
    }
`;
