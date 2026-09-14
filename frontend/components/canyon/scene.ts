/**
 * The hero engine — river.ai's WebGL scene, lifted out of its IIFE into a
 * framework-free factory so the React wrapper stays thin.
 *
 * Structure follows the original: one main program plus two offscreen half-res
 * sky programs sharing the prelude, a baked noise LUT, an adaptive AA governor
 * driven by a GPU timer query, and a bail-out to a static still on hardware
 * that cannot hold ~20fps.
 *
 * The in-shader terminal text layer is bound to a 1×1 transparent texture. The
 * original skips its boot screen and goes live immediately, and its live branch
 * only writes to the DOM overlay — leaving the text canvas cleared every frame.
 * Sampling a permanently transparent texture is the same zero contribution,
 * without a screen-sized canvas upload per frame. The boot *fade* (u_boot easing
 * 1→0, the scene coming up out of near-black) is kept.
 */
import { FS, SKY_AUR_FS, SKY_CLOUD_FS, VS } from "./glsl";
import { buildNoiseTexture } from "./terrain";
import { TimeOfDay } from "./tod";

export type HeroPhase = {
  /** ms since the scene went live; drives the caller's typewriter. */
  elapsed: number;
  /** True once the intro reveal has finished. */
  revealed: boolean;
};

export type HeroOptions = {
  reduceMotion: boolean;
  /** Called each rendered frame so the caller can drive the hero text. */
  onPhase?: (phase: HeroPhase) => void;
  /** Called if the scene bails to a static still, with a JPEG data URL. */
  onFreeze?: (dataUrl: string | null) => void;
};

/* ------------------------------------------------------------- timings -- */

export const HERO_REVEAL_MS = 1100; // canyon + sky fade-in
export const HERO_TEXT_DELAY_MS = 120; // start typing shortly after the fade-in begins
export const HERO_TEXT_SLIDE_MIN_W = 768;
export const HERO_MOBILE_REVEAL_START_MS = 1000;
export const HERO_MOBILE_REVEAL_MS = 1800;
const INTRO_MS = 650; // super-fast per-cell write-in
const HERO_LIVE_STOP_MS = 90000; // stop after the full time-of-day cycle

/* -------------------------------------------------------------- shader -- */

const UNIFORM_DEFAULTS: Record<string, number> = {
  // Slider-controlled defaults, mirroring the original's shipped values.
  horizon: 0.36,
  viewHorizon: 0.57, // active river/march horizon
  scroll: 1.18,
  scrollPos: 0.0,
  glyph: 2.19,
  grain: 0.0,
  vig: 0.43,
  bgBright: 0.97,
  earth: 2.09,
  blur: 0.31,
  riverW: 1.31,
  flowSpd: 0.51,
  streak: 0.85,
  crest: 0.0,
  foam: 1.69,
  contOn: 0.0, // no legacy continents
  mtnOn: 0.0, // no legacy distant mountains
  topoOn: 1.0,
  relief: 1.0,
  canyonDepth: 0.5,
  canyonShadow: 1.0,
  canyonMaxSteps: 143.0,
  canyonStepScale: 1.0,
  refineSteps: 14.0,
  refineMode: 0.0, // bisection
  hoist: 1.0, // cache frame-constant canyon values once
  cityOn: 0.0,
  crtOn: 0.0,
  pixelText: 0.0,
  sun: 0.64,
  twilight: 1.0,
  twRadius: 0.18,
  twEllipse: 0.9,
  twEllipseX: 0.48,
  twSunZone: 0.1,
  atmo: 1.5,
  haze: 0.33,
  aurDot: 186.0,
  aurOriginY: -0.05,
  cloudOn: 1.0,
  aurOn: 1.0,
  cloudDot: 226.0,
  waterDot: 186.0,
  calm: 1.0,
  sunMaxY: 0.25,
  dotGain: 1.0,
  dots: 0.0,
  lcd: 0.0,
  lcdPx: 8.0,
  grad: 0.0,
  gradBri: 1.0,
  topoN: 5.0,
  topo: 1.0,
  mtn: 1.0,
  mtnH: 0.05,
  city: 0.0,
  noiseOn: 1.0,
  intro: 1.0,
  reveal: 1.0,
  steer: 0.0,
  mAmt: 0.0,
  boot: 1.0,
  aaFeather: 0.0,
  aaSigned: 0.0,
};

/**
 * Knobs that live ONLY in the aurora sky program — the curtain loop left the
 * main shader, so these are inactive there.
 */
const SKY_KNOBS: Record<string, number> = {
  aurPlaneSamples: 28.0,
  aurSampleFill: 1.0,
  aurTopGain: 0.5,
  aurRaySamples: 0.0, // 0 = cheaper filament-field path
  aurHeightScale: 2.75,
  aurOriginTaper: 0.5,
  aurFilamentDensity: 1.75,
  aurFilamentWidth: 2.0,
  aurFilamentHeight: 2.0,
  aurFilamentIntensity: 2.25,
  aurFilamentTrack: 2.0, // curve-lite
};

/** Frame uniforms mirrored main → sky on each update. */
const SKY_SYNC = [
  "res",
  "time",
  "tod",
  "viewHorizon",
  "noiseOn",
  "twilight",
  "twRadius",
  "twEllipse",
  "twEllipseX",
  "twSunZone",
  "aurSpeed",
  "aurOriginY",
] as const;

const AA_LADDER = [0, 4, 8, 9];

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

/* --------------------------------------------------------------- scene -- */

export function createRiverHero(canvas: HTMLCanvasElement, opts: HeroOptions) {
  const gl =
    (canvas.getContext("webgl", { antialias: false, alpha: false }) as WebGLRenderingContext | null) ||
    (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
  if (!gl) {
    console.warn("[river] WebGL unavailable — CSS placeholder fallback shown");
    return null;
  }
  // Screen-space derivatives (fwidth) for stable, constant-width contour lines.
  gl.getExtension("OES_standard_derivatives");

  function compile(type: number, src: string) {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
      console.error("[river] shader compile:", gl!.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("[river] program link:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  // Fullscreen geometry (two triangles)
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Null-tolerant uniform table. Uniforms the compiler dropped as unused
  // resolve to null and their setters become no-ops — exactly how the original
  // behaves once the ASCII pipeline is preprocessed out.
  const U = new Map<string, WebGLUniformLocation | null>();
  const loc = (name: string) => {
    if (!U.has(name)) U.set(name, gl!.getUniformLocation(prog, "u_" + name));
    return U.get(name)!;
  };
  const set1f = (name: string, v: number) => gl!.uniform1f(loc(name), v);
  const set2f = (name: string, a: number, b: number) => gl!.uniform2f(loc(name), a, b);
  const set1i = (name: string, v: number) => gl!.uniform1i(loc(name), v);
  const get = (name: string) => {
    const l = loc(name);
    return l ? (gl!.getUniform(prog, l) as number) : 0;
  };

  for (const [k, v] of Object.entries(UNIFORM_DEFAULTS)) set1f(k, v);
  set2f("mouse", -1.0e4, -1.0e4); // offscreen; pointer interaction is not wired
  gl.uniform3f(loc("contColor")!, 0.36, 0.5, 0.28);
  set1i("cloudTex", 4);
  set1i("aurTex", 5);

  /* ------------------------------------------------------- sky programs -- */

  function buildSkyProg(fsSrc: string, label: string) {
    const fsObj = compile(gl!.FRAGMENT_SHADER, fsSrc);
    if (!fsObj) return null;
    const p2 = gl!.createProgram()!;
    gl!.attachShader(p2, vs!);
    gl!.attachShader(p2, fsObj);
    gl!.bindAttribLocation(p2, aPos, "a_pos"); // share the quad attrib setup
    gl!.linkProgram(p2);
    if (!gl!.getProgramParameter(p2, gl!.LINK_STATUS)) {
      console.error("[river] sky program link (" + label + "):", gl!.getProgramInfoLog(p2));
      return null;
    }
    const u: Record<string, WebGLUniformLocation | null> = {};
    for (const n of SKY_SYNC) u[n] = gl!.getUniformLocation(p2, "u_" + n);
    for (const n in SKY_KNOBS) u[n] = gl!.getUniformLocation(p2, "u_" + n);
    gl!.useProgram(p2);
    gl!.uniform1i(gl!.getUniformLocation(p2, "u_noise"), 3); // shared noise LUT
    gl!.useProgram(prog);
    return { prog: p2, u };
  }

  const skyProgs = {
    cloud: buildSkyProg(SKY_CLOUD_FS, "cloud"),
    aur: buildSkyProg(SKY_AUR_FS, "aurora"),
  };
  const skyTargets = {
    cloud: { unit: 4, tex: gl.createTexture(), fbo: gl.createFramebuffer(), w: 0, h: 0, fresh: false },
    aur: { unit: 5, tex: gl.createTexture(), fbo: gl.createFramebuffer(), w: 0, h: 0, fresh: false },
  };
  for (const t of [skyTargets.cloud, skyTargets.aur]) {
    gl.activeTexture(gl.TEXTURE0 + t.unit);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  gl.activeTexture(gl.TEXTURE0);

  function sizeSkyTargets(cw: number, ch: number) {
    const w = Math.max(2, Math.round(cw / 2));
    const h = Math.max(2, Math.round(ch / 2));
    for (const t of [skyTargets.cloud, skyTargets.aur]) {
      if (t.w === w && t.h === h) continue;
      gl!.activeTexture(gl!.TEXTURE0 + t.unit);
      gl!.bindTexture(gl!.TEXTURE_2D, t.tex);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, w, h, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
      t.w = w;
      t.h = h;
      t.fresh = false; // zero-initialised → transparent until drawn
    }
    gl!.activeTexture(gl!.TEXTURE0);
  }

  let skyTick = 0;
  function updateSkyTextures() {
    // Match renderValley's u_reveal early-out: nothing samples the sky yet.
    if (!(get("reveal") > 0.001)) return;
    // JS copies of the shader's own time-of-day gates, with slightly LOOSER
    // thresholds, so a layer's texture is always fresh by the time the main
    // pass starts sampling it.
    const hr = get("tod") * 24;
    const cloudGate =
      get("cloudOn") > 0.5
        ? Math.min(1 - smoothstep(18.6, 20.4, hr), smoothstep(4.0, 5.2, hr))
        : 0;
    const aurGate =
      get("aurOn") > 0.5 ? Math.max(smoothstep(19.5, 22.5, hr), 1 - smoothstep(2.0, 4.0, hr)) : 0;
    const wantCloud = cloudGate > 0.005 && skyProgs.cloud;
    const wantAur = aurGate > 0.0005 && skyProgs.aur;
    if (!wantCloud && !wantAur) return;
    // ~30Hz: the layers drift slowly and the main pass's halftone dots quantise
    // them anyway — a one-frame lag cannot show.
    const due = (skyTick++ & 1) === 0;
    const list: ("cloud" | "aur")[] = [];
    if (wantCloud && (due || !skyTargets.cloud.fresh)) list.push("cloud");
    if (wantAur && (due || !skyTargets.aur.fresh)) list.push("aur");
    if (!list.length) return;
    const vals: Record<string, number | Float32Array> = {};
    for (const n of SKY_SYNC) {
      const l = loc(n);
      vals[n] = l ? (gl!.getUniform(prog, l) as number | Float32Array) : 0;
    }
    for (const name of list) {
      const p = skyProgs[name]!;
      const t = skyTargets[name];
      gl!.useProgram(p.prog);
      for (const n of SKY_SYNC) {
        const v = vals[n];
        if (v instanceof Float32Array && v.length === 2) gl!.uniform2f(p.u[n], v[0], v[1]);
        else gl!.uniform1f(p.u[n], v as number);
      }
      for (const n in SKY_KNOBS) gl!.uniform1f(p.u[n], SKY_KNOBS[n]);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, t.fbo);
      gl!.viewport(0, 0, t.w, t.h);
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
      t.fresh = true;
    }
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.useProgram(prog);
  }

  /* ----------------------------------------------------------- textures -- */

  // Terminal text layer: permanently transparent (see the file header).
  const txTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, txTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  set1i("txt", 1);

  const noiseTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, noiseTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  {
    const nm = buildNoiseTexture(256);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, nm.size, nm.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, nm.data);
  }
  set1i("noise", 3);
  gl.activeTexture(gl.TEXTURE0);

  /* ------------------------------------------------------------ sizing -- */

  const coarsePointer = window.matchMedia("(pointer: coarse)");
  // Mobile/touch: disable the two heaviest sky effects to keep the hero light
  // on weaker GPUs, and open AA one rung lower — the governor climbs back if
  // the device proves it has the headroom.
  const AA = { taps: coarsePointer.matches ? 4 : 8, renderScale: 1.0 };
  if (coarsePointer.matches) {
    set1f("cloudOn", 0);
    set1f("aurOn", 0);
  }
  set1f("aaN", AA.taps);

  const aaGovernor = true;
  let aaLevel = Math.max(0, AA_LADDER.indexOf(AA.taps));
  let liveScale = AA.renderScale;
  const frameCap = 40;
  const frameMin = 1000 / frameCap;
  let dpr = 1;

  function size() {
    const host = canvas.parentElement;
    let w = host?.clientWidth ?? canvas.clientWidth;
    let h = host?.clientHeight ?? canvas.clientHeight;
    if (!(w > 2)) w = window.innerWidth || 1280;
    if (!(h > 2)) h = window.innerHeight || 720;
    // Base dpr capped at 1.0 (the biggest perf win); render scale multiplies
    // it. CAP the result so the canvas never exceeds the GPU's max buffer —
    // otherwise the browser silently clamps ONE axis and the whole scene
    // stretches off-centre. Scaling both axes preserves the aspect ratio.
    dpr = Math.min(window.devicePixelRatio || 1, 1.0) * liveScale;
    let cw = Math.max(2, Math.round(w * dpr));
    let ch = Math.max(2, Math.round(h * dpr));
    const maxDim = Math.min(gl!.getParameter(gl!.MAX_RENDERBUFFER_SIZE) || 4096, 8192);
    const over = Math.max(cw, ch) / maxDim;
    if (over > 1) {
      cw = Math.round(cw / over);
      ch = Math.round(ch / over);
    }
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    gl!.viewport(0, 0, cw, ch);
    sizeSkyTargets(cw, ch);
    set2f("res", cw, ch);
    // Reassigning width/height clears the drawing buffer; repaint immediately
    // so a resize does not flash black.
    draw(opts.reduceMotion ? 8.0 : cam.clock);
  }

  const cam = { clock: 0, lastNow: null as number | null };
  const tod = new TimeOfDay();

  // Page scroll, 0..1 over the first viewport, eased toward the raw value each
  // frame. Reading scrollY in the listener and easing in the loop keeps the
  // scroll handler passive and cheap — the wheel never does layout work, and a
  // trackpad fling arrives as a glide rather than a jump.
  const scrollOf = () => Math.min(1, (window.scrollY || 0) / Math.max(1, window.innerHeight));
  // Seeded rather than started at zero, and eased seeded to match: a reload
  // part-way down the page should open at that point in the canyon, not fly
  // there from the mouth.
  const scrollDrive = { raw: scrollOf(), eased: scrollOf() };
  function readScroll() {
    scrollDrive.raw = scrollOf();
    // Past the cycle stop the loop is gone, so a scroll has to draw its own
    // frame. One rAF, coalesced — not a frame per scroll event.
    if (heroCycleStopped && !heroFrozen) scheduleIdleFrame();
  }
  // Registered below the reduced-motion return, not here: flying the camera is
  // motion, so a profile that asked for less of it keeps a still camera.

  function draw(t: number) {
    set1f("time", t);
    updateSkyTextures(); // refresh the half-res cloud/aurora layers (~30Hz)
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLES, 0, 6);
  }

  // #150a2e — the app's dark ground. Kept in lockstep with `.canyon-ground` in
  // globals.css, which paints the same colour underneath before the first frame
  // lands; if the two drift apart the handover shows as a flash.
  gl.clearColor(0.082, 0.039, 0.18, 1.0);
  size();

  let resizeRAF = 0;
  function onResize() {
    if (resizeRAF) cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(() => {
      resizeRAF = 0;
      liveScale = AA.renderScale;
      size();
    });
  }
  window.addEventListener("resize", onResize);

  /* -------------------------------------------------- reduced motion -- */

  if (opts.reduceMotion) {
    set1f("boot", 0);
    set1f("tod", tod.frac(0));
    set1f("aurHue", tod.hue);
    set1f("aurSpeed", tod.speed);
    draw(8.0); // static, fully revealed
    opts.onPhase?.({ elapsed: Number.MAX_SAFE_INTEGER, revealed: true });
    return {
      destroy() {
        window.removeEventListener("resize", onResize);
        gl.deleteProgram(prog);
      },
    };
  }

  window.addEventListener("scroll", readScroll, { passive: true });

  /* ------------------------------------------------------------- loop -- */

  function textSlides() {
    return !coarsePointer.matches && window.innerWidth >= HERO_TEXT_SLIDE_MIN_W;
  }

  const liveT0Ref = { v: 0, anchored: false };
  let bootCur = 1.0;
  let lastFrame = 0;
  let fpsEma = frameCap;
  let heroRevealDone = false;
  let heroVisible = true;
  let looping = false;
  let heroFrozen = false;
  let heroCycleStopped = false;
  let raf = 0;

  // Adaptive-AA governor: probe → settle → measure → keep or revert.
  let aaCeiling = AA_LADDER.length - 1;
  let aaPhase: "hold" | "verify" = "hold";
  let aaProbeBase = 0;
  let aaNextProbeAt = 0;
  let aaWindowEnd = 0;
  let aaMeasureFrom = 0;
  let aaFpsSum = 0;
  let aaFpsCount = 0;
  let lastCeilRelax = 0;
  let lastRaf = 0;
  let rafMsEma = 0;
  let aaShitboxStrikes = 0;

  function setAaLevel(n: number) {
    aaLevel = Math.min(AA_LADDER.length - 1, Math.max(0, n));
    AA.taps = AA_LADDER[aaLevel];
    set1f("aaN", AA.taps);
  }

  // GPU frame-time probe. rAF fps is clamped to the monitor refresh, so it
  // cannot show whether the shader has headroom; this measures the actual GPU
  // time spent on the draw. One query in flight, read back a frame later.
  const gpuExt = gl.getExtension("EXT_disjoint_timer_query");
  const gpuQuery = gpuExt ? gpuExt.createQueryEXT() : null;
  let gpuPending = false;
  let gpuMsEma = 0;

  function gpuTimedDraw(t: number) {
    if (gpuExt && gpuQuery && !gpuPending) {
      gpuExt.beginQueryEXT(gpuExt.TIME_ELAPSED_EXT, gpuQuery);
      draw(t);
      gpuExt.endQueryEXT(gpuExt.TIME_ELAPSED_EXT);
      gpuPending = true;
    } else {
      draw(t);
    }
    if (gpuExt && gpuPending) {
      if (gl!.getParameter(gpuExt.GPU_DISJOINT_EXT)) {
        gpuPending = false;
      } else if (gpuExt.getQueryObjectEXT(gpuQuery, gpuExt.QUERY_RESULT_AVAILABLE_EXT)) {
        const ms = gpuExt.getQueryObjectEXT(gpuQuery, gpuExt.QUERY_RESULT_EXT) / 1.0e6;
        gpuMsEma = gpuMsEma > 0 ? gpuMsEma + (ms - gpuMsEma) * 0.15 : ms;
        gpuPending = false;
      }
    }
  }

  /**
   * True-shitbox bail-out. If the device cannot hold ~20fps with AA already at
   * the floor, a live raymarch looks worse than a still and drains the battery.
   * Render one clean sunrise frame, snapshot it, stop, and drop the context.
   */
  function freezeStaticHero() {
    if (heroFrozen) return;
    heroFrozen = true;
    looping = false;
    let url: string | null = null;
    try {
      set1f("tod", 0.28); // ~06:45 — warm low sun, just risen
      set1f("aaN", 4); // crisp still
      draw(cam.clock || 8.0);
      // Same synchronous task as the draw → the drawing buffer has not been
      // cleared yet, so toDataURL captures it without preserveDrawingBuffer.
      url = canvas.toDataURL("image/jpeg", 0.9);
    } catch {
      url = null;
    }
    opts.onFreeze?.(url);
    if (url) {
      const lose = gl!.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    }
  }

  function loop(now: number) {
    if (heroFrozen || !heroVisible) {
      looping = false;
      return;
    }

    // Measure the display refresh from the raw rAF cadence, so the governor can
    // judge fps against the rate this cap can ACTUALLY reach — 40 on a 60Hz
    // panel renders at 30, and that 30 is healthy, not a stall.
    if (lastRaf > 0) {
      const d = now - lastRaf;
      if (d > 1 && d < 100) rafMsEma = rafMsEma > 0 ? rafMsEma + (d - rafMsEma) * 0.1 : d;
    }
    lastRaf = now;

    // The 4ms slack matters: without it a rAF tick landing a hair before the
    // target gets dropped, so 60Hz against a 16.7ms target beats down to 30fps.
    if (now - lastFrame < frameMin - 4) {
      raf = requestAnimationFrame(loop);
      return;
    }
    const frameDelta = lastFrame > 0 ? now - lastFrame : frameMin;
    lastFrame = now;

    // Anchor the intro clock to the first frame the loop actually renders, so
    // the reveal plays in full regardless of how long GPU detection took.
    if (!liveT0Ref.anchored) {
      liveT0Ref.v = now;
      liveT0Ref.anchored = true;
    }
    if (frameDelta > 0) {
      fpsEma += (1000 / frameDelta - fpsEma) * 0.12;
      // Gaps over 250ms are pauses (tab switch, GC), not render speed.
      if (now >= aaMeasureFrom && frameDelta < 250) {
        aaFpsSum += 1000 / frameDelta;
        aaFpsCount++;
      }
    }

    if (aaGovernor && heroRevealDone && now >= aaWindowEnd) {
      const usingGpu = gpuMsEma > 0;
      // No verdict on the first eligible frame or an empty window.
      if (aaWindowEnd > 0 && (usingGpu || aaFpsCount > 0)) {
        // Achievable rate under this cap: the throttle renders on the first rAF
        // tick ≥ (frameMin-4)ms after the last frame, so the real period is
        // ceil((frameMin-4)/tick) ticks. Mirroring that — instead of
        // round(refresh/cap) — matters at 60Hz+cap40: that ratio is exactly
        // 1.5, and rAF timing noise used to flip the rounding to 1, demanding
        // an impossible 60fps from a loop that renders 30.
        const tickMs = rafMsEma > 0 ? rafMsEma : 1000 / 60;
        const ticksPerFrame = Math.max(1, Math.ceil((frameMin - 4) / tickMs));
        const achievable = 1000 / (ticksPerFrame * tickMs);
        const meanFps = aaFpsCount > 0 ? aaFpsSum / aaFpsCount : achievable;
        const healthy = usingGpu ? gpuMsEma < frameMin * 0.55 : meanFps >= achievable * 0.9;
        const lagging = usingGpu ? gpuMsEma > frameMin * 0.78 : meanFps < achievable * 0.82;

        const cantHold20 = usingGpu ? gpuMsEma > 50 : meanFps < 20;
        const dire = usingGpu ? gpuMsEma > 80 : meanFps < 12;
        if (aaLevel === 0 && cantHold20) {
          aaShitboxStrikes++;
          if (aaShitboxStrikes >= (dire ? 1 : 3)) {
            freezeStaticHero();
            return;
          }
        } else {
          aaShitboxStrikes = 0;
        }

        if (aaPhase === "verify") {
          if (healthy) {
            aaNextProbeAt = now + 8000; // success; look higher later
          } else {
            setAaLevel(aaProbeBase); // revert
            aaCeiling = aaProbeBase; // and remember this is the limit
            aaNextProbeAt = now + 15000;
          }
          aaPhase = "hold";
        } else {
          // Occasionally relax a pinned ceiling (the device may have cooled).
          if (aaCeiling < AA_LADDER.length - 1 && now - lastCeilRelax > 30000) {
            aaCeiling++;
            lastCeilRelax = now;
          }
          if (lagging && aaLevel > 0) {
            setAaLevel(aaLevel - 1);
            aaNextProbeAt = now + 15000;
          } else if (healthy && aaLevel < aaCeiling && now >= aaNextProbeAt) {
            aaProbeBase = aaLevel;
            setAaLevel(aaLevel + 1); // probe one rung up, verify next window
            aaPhase = "verify";
          }
        }
      }
      aaFpsSum = 0;
      aaFpsCount = 0;
      aaMeasureFrom = now + 400;
      aaWindowEnd = now + 1500;
    }

    // Boot fade: the scene eases up out of near-black.
    bootCur += (0 - bootCur) * 0.05;
    set1f("boot", bootCur);

    const sinceLive = now - liveT0Ref.v;
    const p = Math.min(1, sinceLive / INTRO_MS);
    set1f("intro", 1 - (1 - p) * (1 - p));

    // Intro reveal — two paths. Wide/non-touch: the valley condenses in
    // immediately and the text types over it. Narrow/touch: the text types
    // first over the bare sky, then the valley reveals behind it (held back so
    // it has time to load).
    if (textSlides()) {
      const rp = Math.max(0, Math.min(1, sinceLive / HERO_REVEAL_MS));
      set1f("reveal", rp * rp * (3 - 2 * rp));
      if (rp >= 1) heroRevealDone = true;
    } else {
      const elapsed = sinceLive - HERO_MOBILE_REVEAL_START_MS;
      const rp = Math.max(0, Math.min(1, elapsed / HERO_MOBILE_REVEAL_MS));
      set1f("reveal", rp * rp * (3 - 2 * rp));
      // Mark the intro done only once the valley has FULLY revealed. The AA
      // governor and the bail-out key off this and must not judge fps during
      // the heavy reveal ramp, or a transient dip freezes a capable phone.
      if (rp >= 1) heroRevealDone = true;
    }

    set1f("tod", tod.frac(now));
    set1f("aurHue", tod.hue);
    set1f("aurSpeed", tod.speed);

    opts.onPhase?.({ elapsed: sinceLive, revealed: heroRevealDone });

    // Virtual render clock, decoupled from the wall-clock epoch so reloads
    // start from a stable animation phase.
    if (cam.lastNow == null) cam.lastNow = now;
    const cdt = Math.max(0, Math.min(0.1, (now - cam.lastNow) / 1000));
    cam.lastNow = now;
    cam.clock += cdt;

    easeScroll();
    set1f("scrollPos", scrollDrive.eased);

    gpuTimedDraw(cam.clock);
    if (sinceLive >= HERO_LIVE_STOP_MS) {
      // The time-of-day cycle is done, so the continuous loop retires and the
      // GPU goes quiet. The camera does not retire with it: from here scrolling
      // wakes a single frame at a time (see readScroll), so the hero still
      // answers the visitor without burning a rAF for the rest of the session.
      heroCycleStopped = true;
      looping = false;
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  /** Steps the eased scroll toward the raw value. True once it has settled. */
  function easeScroll() {
    const d = scrollDrive.raw - scrollDrive.eased;
    if (Math.abs(d) < 0.0005) {
      scrollDrive.eased = scrollDrive.raw;
      return true;
    }
    scrollDrive.eased += d * 0.12;
    return false;
  }

  // Post-cycle rendering: one coalesced frame per animation tick while the
  // camera is still catching up to the scroll, then silence again.
  let idleRaf = 0;
  function scheduleIdleFrame() {
    if (idleRaf || looping) return;
    idleRaf = requestAnimationFrame(() => {
      idleRaf = 0;
      if (heroFrozen || looping) return;
      const settled = easeScroll();
      set1f("scrollPos", scrollDrive.eased);
      draw(cam.clock); // clock and tod stay put — only the camera moves
      if (!settled) scheduleIdleFrame();
    });
  }

  function startLoop() {
    if (looping || heroFrozen || heroCycleStopped) return;
    looping = true;
    loop(performance.now());
  }

  // Only render while the hero is actually on screen.
  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (ents) => {
            heroVisible = ents[0].isIntersecting;
            if (heroVisible) startLoop();
          },
          { rootMargin: "200px 0px 200px 0px", threshold: 0 },
        )
      : null;
  if (io && canvas.parentElement) io.observe(canvas.parentElement);

  startLoop();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      if (resizeRAF) cancelAnimationFrame(resizeRAF);
      if (idleRaf) cancelAnimationFrame(idleRaf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", readScroll);
      io?.disconnect();
      looping = false;
      heroFrozen = true;
      gl.deleteProgram(prog);
    },
    get fps() {
      return fpsEma;
    },
    get gpuMs() {
      return gpuMsEma;
    },
  };
}
