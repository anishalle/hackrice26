/**
 * Duotone canyon — fragment shader source.
 *
 * Three stages, in this order:
 *
 *  1. RAYMARCH an SDF terrain. The canyon is a height field built from smooth-
 *     minimum'd blobs, which is what gives the walls their soft, rounded mass
 *     rather than the sharp ridges an fBm height field alone produces.
 *  2. SHADE it to a single luminance value. Colour is deliberately not decided
 *     here — the scene is resolved as light only.
 *  3. DUOTONE that luminance through the brand ramp, with the strength of the
 *     mapping scaling with luminance, and an ordered-dither dot matrix gated on
 *     the same value. Brighter areas take more filter and more dots; the
 *     shadows stay clean.
 */

export const VERT = /* glsl */ `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAG = /* glsl */ `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uScroll;

// Duotone ramp. Three stops so the midtone can carry brand hue rather than
// collapsing to a flat interpolation between black and white.
uniform vec3  uShadow;
uniform vec3  uMid;
uniform vec3  uLight;
uniform vec3  uSun;

uniform float uDotScale;   // px per dither cell
uniform float uDotAmount;  // 0 = no dots, 1 = full matrix
uniform float uFilter;     // global duotone strength
uniform float uSunY;       // sun height in the gap
uniform int   uSteps;      // march budget

const float PI = 3.14159265;

/* ---------------------------------------------------------------- noise -- */

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.5);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return s;
}

/* ------------------------------------------------------------------ sdf -- */

// Polynomial smooth minimum. This is the operator that turns discrete bumps
// into one continuous mass — the "blobs" that read as hills.
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

// Canyon wall height. p is (x, z) on the floor plane.
//
// The channel is flat and narrow; the walls rise outside it as one smooth
// mass. Blobs are smin'd into that mass rather than added on top, so the
// crest reads as rounded rock instead of noisy terrain.
float height(vec2 p) {
  float x = abs(p.x);

  // Channel half-width. Held roughly constant — perspective is what makes the
  // walls converge on the gap, so the geometry shouldn't also close in.
  float w = 7.1 - smoothstep(20.0, 110.0, p.y) * 1.6;

  // The wall. smoothstep gives the soft shoulder where the floor turns up
  // into the cliff, which is what reads as mass rather than as a box.
  float rise = smoothstep(w, w + 9.5, x);
  float h = rise * 13.5;

  // Blobs riding the crest — this is what makes the walls read as masses.
  float b = 1e9;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float side = mod(fi, 2.0) * 2.0 - 1.0;
    vec2  c = vec2(side * (11.0 + sin(fi * 2.3) * 4.0), fi * 26.0 + 12.0);
    float d = length((p - c) / vec2(9.0, 17.0));
    b = smin(b, d, 0.6);
  }
  h = smin(h, h + (1.0 - clamp(b, 0.0, 1.0)) * 6.5, 2.4);

  // Erosion, damped to nothing inside the channel so the water stays flat.
  float wall = smoothstep(w * 0.85, w + 4.0, x);
  h += fbm(p * 0.032) * 4.2 * wall;
  h += fbm(p * 0.13) * 0.8 * wall;

  return smax(h, 0.0, 0.35);
}

// Terrain SDF. Not a true distance field, so marching steps are scaled down.
float mapT(vec3 p) { return p.y - height(p.xz); }

vec3 normalT(vec3 p) {
  vec2 e = vec2(0.035, 0.0);
  return normalize(vec3(
    mapT(p - e.xyy) - mapT(p + e.xyy),
    2.0 * e.x,
    mapT(p - e.yyx) - mapT(p + e.yyx)));
}

/* ------------------------------------------------------------- dithering -- */

// Recursive Bayer construction. WebGL1 can't dynamically index a const array,
// so the matrix is built arithmetically — this is the standard formulation.
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

/* ----------------------------------------------------------------- main -- */

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * uRes) / uRes.y;

  // Camera sits low in the channel, looking downstream toward the gap.
  // Scroll pushes it forward and slightly down, so the walls open past you.
  vec3 ro = vec3(0.0, 3.45 + uScroll * 1.1, -6.0 + uScroll * 16.0);
  vec3 rd = normalize(vec3(uv.x * 0.92 - 0.17, uv.y * 0.92 + 0.045, 1.0));

  float lum;
  float t = 0.0;
  float tPrev = 0.0;
  bool hit = false;
  float tMax = 220.0;

  for (int i = 0; i < 256; i++) {
    if (i >= uSteps) break;
    vec3 p = ro + rd * t;
    float d = mapT(p);
    if (d < 0.0022 * max(t, 1.0)) { hit = true; break; }
    tPrev = t;
    t += max(0.035, d * 0.38);
    if (t > tMax) break;
  }

  // Bisect the last interval. The height field is not a true distance field,
  // so the march overshoots at grazing angles and leaves vertical streaks
  // without this.
  if (hit) {
    float lo = tPrev, hi = t;
    for (int k = 0; k < 5; k++) {
      float mid = 0.5 * (lo + hi);
      if (mapT(ro + rd * mid) > 0.0) lo = mid; else hi = mid;
    }
    t = hi;
  }

  // Sun sits in the gap between the walls, slightly above the horizon.
  vec3 sunDir = normalize(vec3(-0.155, uSunY, 1.0));
  float sunDot = max(dot(rd, sunDir), 0.0);

  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normalT(p);

    // Contre-jour. The sun is at the far end of the valley, so the wall faces
    // turned toward the camera are backlit — they read as dark masses, and
    // the composition is carried by their silhouette against the gap.
    float key = max(dot(n, sunDir), 0.0);
    float sky = 0.5 + 0.5 * n.y;
    float ao  = clamp(1.0 - height(p.xz) * 0.030, 0.32, 1.0);

    lum = key * 0.26 + sky * 0.11;
    lum *= ao;

    // The crest edge catching light is the one bright line on the mass, and
    // it is what makes the silhouette legible rather than flat.
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
    lum += rim * 0.20 * (0.4 + 0.6 * smoothstep(0.0, 0.6, sunDot));

    // The channel floor: flat, wet, and carrying the strongest dot field.
    float water = 1.0 - smoothstep(2.6, 6.2, abs(p.x));
    if (water > 0.0) {
      float ripple =
        sin(p.z * 0.55 - uTime * 0.35) * 0.5 +
        fbm(vec2(p.x * 0.7, p.z * 0.3 - uTime * 0.14)) * 0.9;
      // A long specular smear down the channel, toward the sun.
      float smear = pow(max(0.0, 1.0 - abs(p.x) * 0.20), 2.4);
      float spec = smear * (0.30 + 0.26 * ripple) * smoothstep(2.0, 200.0, p.z);
      lum = mix(lum, 0.34 + spec, water * 0.92);
    }

    // Aerial perspective: distance washes the mass toward the sky value, so
    // the far walls sit behind the near ones instead of stacking flat.
    float haze = smoothstep(18.0, 175.0, t);
    lum = mix(lum, 0.52, haze * 0.72);
  } else {
    // Sky: a vertical gradient with the sun disc and its bloom.
    float h = clamp(uv.y * 1.15 + 0.40, 0.0, 1.0);
    lum = mix(0.86, 0.16, h);

    float disc  = smoothstep(0.99955, 0.99988, sunDot);
    float bloom = pow(sunDot, 340.0) * 0.5 + pow(sunDot, 34.0) * 0.26;
    lum += disc * 1.4 + bloom;

    // Thin banded cloud, kept subtle so it reads as atmosphere not texture.
    float cl = fbm(vec2(uv.x * 2.4 + uTime * 0.012, uv.y * 6.0));
    lum += smoothstep(0.55, 0.95, cl) * 0.08 * (1.0 - h);
  }

  lum = clamp(lum, 0.0, 1.6);

  /* --- duotone, applied proportionally to luminance ---------------------- */

  float l = clamp(lum, 0.0, 1.0);
  vec3 ramp = l < 0.5
    ? mix(uShadow, uMid, smoothstep(0.0, 0.5, l))
    : mix(uMid, uLight, smoothstep(0.5, 1.0, l));

  // Warm the very top of the range so the sun reads warm against the cool ramp.
  ramp = mix(ramp, uSun, smoothstep(0.88, 1.35, lum));

  // The filter's strength rises with luminance: shadows keep the base tone,
  // highlights take the ramp fully. This is the whole look.
  float amount = uFilter * smoothstep(0.02, 0.85, l);
  vec3 col = mix(uShadow, ramp, amount);

  /* --- ordered dither, gated on the same luminance ----------------------- */

  float cell = max(uDotScale, 1.0);
  float thr  = bayer8(floor(frag / cell));
  float q    = step(thr, l);
  vec3  dotc = mix(uShadow, ramp, q);

  float dotGate = uDotAmount * smoothstep(0.34, 0.88, l);
  col = mix(col, dotc, dotGate);

  // Vignette, so the corners fall into the ground colour cleanly.
  float vig = 1.0 - 0.38 * pow(length(uv * vec2(0.85, 1.05)), 2.1);
  col *= clamp(vig, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
