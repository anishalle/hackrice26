/**
 * Program assembly.
 *
 * `FS_COMMON` is the shared prelude — uniforms, noise, the cloud march, the
 * aurora curtain field and the canyon heightfield. The main scene shader AND
 * both offscreen sky passes are built from this one string, so their maths can
 * never drift apart.
 *
 * The offscreen passes render the two expensive volumetric layers into half-res
 * FBO textures that the main pass samples instead of recomputing per pixel: the
 * 40-step cloud march (→ u_cloudTex) and the 28-sample aurora curtains
 * (→ u_aurTex). Both fields are resolution-independent functions of scene uv
 * plus frame uniforms, and the main pass's halftone composites quantise them
 * into dot cells anyway, so half res with LINEAR upsampling is visually
 * transparent. The layers are temporally disjoint — clouds by day, aurora at
 * night — so only the layer whose time-of-day gate is open is drawn, at ~30Hz.
 *
 * Each layer gets its OWN program. Merging them behind a uniform branch makes
 * the register allocator size the cheap cloud pass for the huge aurora branch,
 * and the occupancy hit measurably slows the whole frame on Apple GPUs.
 */
import { UNIFORMS } from "./uniforms";
import { NOISE } from "./noise";
import { AURORA_HELPERS } from "./aurora-helpers";
import { AURORA_FIELD } from "./aurora-field";
import { CANYON } from "./canyon";
import { RENDER_VALLEY } from "./render-valley";

export const VS = /* glsl */ `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

/** Shared prelude — every helper up to (not including) renderValley. */
export const FS_COMMON = UNIFORMS + NOISE + AURORA_HELPERS + CANYON + AURORA_FIELD;

/**
 * Main scene shader. Minimal post: boot fade, the text layer, a gentle vignette
 * and grain.
 *
 * The original's `main()` returns here and guards the entire ASCII/glyph/dots/
 * LCD pipeline behind `#if 0`. That block is dropped rather than carried: it is
 * removed by the preprocessor before compilation, so its absence is guaranteed
 * to be pixel-identical. The uniforms it referenced stay declared in the
 * prelude and simply resolve to inactive locations, exactly as before.
 */
export const FS =
  FS_COMMON +
  RENDER_VALLEY +
  /* glsl */ `
    void main(){
      vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);       // y down

      vec3 col = renderValley(uv);
      col = mix(col, vec3(0.010, 0.017, 0.045), u_boot);
      float tAv = smoothstep(0.30, 0.62, texture2D(u_txt, uv).a);
      col = mix(col, vec3(0.84, 0.93, 0.87), tAv);
      col += tAv * vec3(0.18, 0.40, 0.34) * 0.5;
      vec2 qv = (uv - 0.5) * vec2(1.05, 1.18);
      float vigv = smoothstep(1.22, 0.10, dot(qv, qv) * 2.1);
      col *= mix(0.86, 1.0, vigv);
      col += (hash(uv * u_res + u_time) - 0.5) * u_grain;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
`;

/**
 * Cloud layer for one scene uv. The time-of-day subset here is copied
 * line-for-line from renderValley (sun arc / twilight orbit / sky-horizon tint)
 * so the offscreen march sees the exact same sun. Output is the raw
 * premultiplied march result; the sunset tint, visibility fade and halftone
 * stay in the main pass.
 */
export const SKY_CLOUD_FS =
  FS_COMMON +
  /* glsl */ `
    vec4 cloudLayer(vec2 uv){
      float asp2 = u_res.x / max(1.0, u_res.y);
      float aDay     = (u_tod * 24.0 - 6.0) / 12.0;
      float elev     = sin(aDay * 3.14159265);
      float sunUp    = smoothstep(-0.10, 0.12, elev);
      float twi      = smoothstep(-0.33, -0.08, elev) * (1.0 - smoothstep(-0.08, 0.23, elev));
      float elevNight = elev - 0.025;
      float setFrac = 0.5 - elevNight * (u_twRadius * u_twEllipse) / 0.104;
      float twDay = 1.0 - smoothstep(0.75, 1.15, setFrac);
      float sunHeight = u_twRadius * u_twEllipse * elev;
      float sunsetAmt = 1.0 - smoothstep(0.0, u_twSunZone, sunHeight);
      twi = mix(twi, twDay * mix(0.35, 0.85, sunsetAmt), u_twilight);
      float skyUp = mix(sunUp, twDay * mix(0.40, 0.14, sunsetAmt), u_twilight);
      vec3 SKY_HOR = mix(vec3(0.060,0.112,0.245), vec3(0.330,0.560,0.820), smoothstep(0.0,0.55,skyUp));
      SKY_HOR = mix(SKY_HOR, vec3(0.85,0.45,0.24), twi * 0.6);
      SKY_HOR = mix(SKY_HOR, vec3(0.98,0.44,0.22), u_twilight * twi * 0.55);
      float sunArcT = clamp(aDay, -0.18, 1.18);
      float sunPathShift = 0.052 / max(asp2, 0.001);
      float sunX = mix(-0.30, 0.55, sunArcT) - sunPathShift;
      float twTheta = 3.14159265 * (1.0 - aDay);
      float twX = 0.5 + (u_twRadius / max(asp2, 0.001) * u_twEllipseX) * cos(twTheta);
      sunX = mix(sunX, twX, u_twilight);
      vec3 crd = normalize(vec3((uv.x - 0.5) * asp2, (u_viewHorizon - uv.y) * 1.70, 1.0));
      if (crd.y <= 0.001) return vec4(0.0);   // below the horizon — main pass never samples here
      vec3 sunDir3 = normalize(vec3((sunX - 0.5) * 1.4, 0.35 + 0.7 * max(elev, 0.0), 0.55));
      return marchClouds(vec3(0.0), crd, sunDir3, SKY_HOR);
    }

    void main(){
      vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);   // scene uv, y-down (matches main pass)
      gl_FragColor = cloudLayer(uv);
    }
`;

export const SKY_AUR_FS =
  FS_COMMON +
  /* glsl */ `
    void main(){
      vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);   // scene uv, y-down (matches main pass)
      gl_FragColor = vec4(auroraField(uv), 0.0, 0.0, 1.0);
    }
`;
