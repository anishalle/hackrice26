/**
 * Opening of the shared prelude: the derivatives extension, precision, varying
 * and the full uniform block.
 *
 * The declarations are kept verbatim from river.ai's FS_COMMON even where the
 * live render path no longer reads them — an unused uniform is dropped by the
 * compiler, and `getUniformLocation` then returns null, which the null-tolerant
 * setters in the component treat as a no-op. That is exactly how the original
 * behaves, and it keeps this block a faithful reference.
 *
 * `#extension` must be the first non-comment token in the shader, so this
 * string has to lead every program built from the prelude.
 */
export const UNIFORMS = /* glsl */ `#extension GL_OES_standard_derivatives : enable
    precision highp float;
    varying vec2 v_uv;
    uniform vec2  u_res;
    uniform float u_time;
    uniform sampler2D u_atlas;
    uniform sampler2D u_terrain;
    uniform float u_glyphs;
    uniform float u_cell;
    uniform float u_bloom;
    uniform float u_bRad;
    uniform vec2  u_mouse;   // cursor, device px (y down); offscreen when idle
    uniform float u_mAmt;    // 0..1 interaction influence (eased)
    uniform float u_intro;   // 0..1 intro write-in progress (eased)
    uniform float u_steer;   // lateral flight steering (eased, arrow keys)
    uniform float u_tod;     // time of day, 0..1 == 00:00..24:00
    uniform float u_aurHue;  // aurora colour latched at sunset: 0=green, 1=violet
    uniform float u_aurSpeed; // aurora drift speed, rolled fresh each sunset
    uniform float u_aurDot;   // screen-space aurora dots (0 = smooth)
    uniform float u_aurPlaneSamples; // PERF: max aurora plane samples
    uniform float u_aurSampleFill;   // fills each sample's vertical cell toward the next sample
    uniform float u_aurTopGain;      // brightness scale for the upper aurora plane
    uniform float u_aurRaySamples;   // PERF: max vertical ray samples
    uniform float u_aurHeightScale;  // vertical envelope scale from the fixed origin
    uniform float u_aurOriginY;      // positive raises the emitting origin on screen
    uniform float u_aurOriginTaper;  // higher = stronger fade near emitting origin
    uniform float u_aurFilamentDensity;
    uniform float u_aurFilamentWidth;
    uniform float u_aurFilamentHeight;
    uniform float u_aurFilamentIntensity;
    uniform float u_aurFilamentTrack;
    uniform float u_cloudOn;
    uniform float u_aurOn;   // 1 = aurora enabled, 0 = skip it (e.g. disabled on mobile)
    uniform float u_cloudDot; // screen-space cloud dots per viewport height
    uniform float u_waterDot; // screen-space water dots per viewport height
    uniform float u_aaN;     // silhouette supersample taps: 0 off, 4, 8, or 9 (3x3)
    uniform float u_aaFeather; // silhouette edge feather width (world units)
    uniform float u_aaSigned;  // 1 = signed-distance coverage mode (overrides SSAA)
    uniform sampler2D u_txt; // in-shader terminal text layer
    uniform sampler2D u_noise; // baked value-noise LUT (256x256, R = grid, G = z+1 fold)
    uniform float u_noiseOn;    // 1 = sample the baked LUT, 0 = procedural hash noise (A/B)
    uniform float u_boot;    // 1 = terminal boot screen, 0 = live
    uniform float u_reveal;  // 0..1 intro reveal: canyon condenses in foreground→horizon (1 = full)
    uniform float u_horizon; // base horizon Y (0.1..0.7)
    uniform float u_viewHorizon; // active canyon/river vanishing point Y
    uniform float u_scroll;  // worldZ scroll speed (river flow)
    uniform float u_scrollPos; // 0..1 page scroll, eased — flies the camera downriver
    uniform float u_glyph;   // glyph intensity boost
    uniform float u_grain;   // pixel grain amplitude
    uniform float u_vig;     // vignette corner darken (0..0.5)
    uniform float u_bgBright;// base background brightness multiplier
    uniform float u_earth;   // earth/ground brightness multiplier (vs sky)
    uniform float u_blur;    // glyph-layer softening (0 = crisp)
    uniform float u_riverW;  // river base width (world units)
    uniform float u_flowSpd; // river flow speed multiplier
    uniform float u_streak;  // streamline intensity
    uniform float u_crest;   // specular crest brightness
    uniform float u_foam;    // foam flicker intensity
    uniform float u_contOn;  // 1 = render continents, 0 = hidden
    uniform vec3  u_contColor; // continent glyph colour (RGB)
    uniform float u_crtOn;   // 1 = CRT scanlines on, 0 = off
    uniform float u_pixelText; // 1 = chunky pixel text, 0 = sharp
    uniform float u_sun;     // sun disk + glow brightness (0 = none)
    uniform float u_atmo;    // planet-limb / horizon glow intensity
    uniform float u_haze;    // earth atmospheric haze (ground→sky near horizon)
    uniform float u_calm;    // river/field brightness floor at the bottom (1 = no fade)
    uniform float u_sunMaxY; // sun apex Y at noon (smaller = higher in the sky)
    uniform float u_twilight; // 1 = twilight mode: sun orbits a small circle on the horizon
    uniform float u_twRadius; // twilight sun-orbit radius (uv units)
    uniform float u_twEllipse; // twilight orbit Y-axis scale (1 = round, <1 = flatter)
    uniform float u_twEllipseX; // twilight orbit X-axis scale (1 = round baseline)
    uniform float u_twSunZone;  // twilight: sun height (uv) below which sky is sunset-warm
    uniform float u_dotGain; // dot-mode brightness boost (1 = neutral / ASCII)
    uniform float u_dots;    // 1 = dot render mode (separated, capped, no burn)
    uniform float u_lcd;     // 1 = Game Boy DMG LCD treatment
    uniform float u_lcdPx;   // LCD pixel-grid size (device px)
    uniform float u_grad;    // 1 = vivid spectral gradient recolour
    uniform float u_hueA;    // gradient start hue (turns; may wrap)
    uniform float u_hueB;    // gradient end hue (turns; may wrap)
    uniform float u_gradBri; // gradient colour brightness
    uniform float u_mtn;     // distant-mountain intensity/fade (0 = none)
    uniform float u_mtnH;    // distant-mountain height above the horizon (uv units)
    uniform float u_mtnOn;   // 1 = render distant mountains, 0 = hidden
    uniform float u_topo;    // topographic contour strength (0 = none)
    uniform float u_topoN;   // topographic contour density (bands)
    uniform float u_topoOn;  // 1 = render topographic contours, 0 = hidden
    uniform float u_relief;  // 3D relief displacement amount (0 = flat contours)
    uniform float u_canyonDepth; // canyon wall/depth scale (1 = default)
    uniform float u_canyonShadow; // 1 = full canyon self-shadowing, 0 = simpler lighting
    uniform float u_canyonMaxSteps; // PERF: max canyon march iterations
    uniform float u_canyonStepScale; // PERF: larger steps = faster, rougher canyon
    uniform float u_refineSteps; // PERF: canyon hit-refine iterations (4..14)
    uniform float u_refineMode;  // PERF: 0 = bisection, 1 = secant (cheaper)
    uniform float u_hoist;       // PERF: 1 = read per-frame canyon constants cached once
    uniform float u_city;    // city street/light strength (0 = none)
    uniform float u_cityOn;  // 1 = render cities, 0 = hidden
`;
