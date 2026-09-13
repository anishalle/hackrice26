/**
 * `renderValley` — the whole visible scene, from river.ai's main fragment
 * shader. Sky gradient and time-of-day grade, sun disk and god-rays, the
 * halftoned cloud deck and aurora curtains (both fetched from the offscreen
 * half-res passes), the canyon raymarch with its supersampled silhouette, the
 * river's flowing halftone dot field, aerial haze and the intro depth reveal.
 */
export const RENDER_VALLEY = /* glsl */ `
    // Offscreen half-res sky layers, rendered by the sky programs into FBO
    // textures (cloud march on u_cloudTex, aurora curtains on u_aurTex).
    // Sampling them here replaces the per-pixel volumetric loops.
    uniform sampler2D u_cloudTex;
    uniform sampler2D u_aurTex;
    vec3 renderValley(vec2 uv){
      gCanyonMaxH = canyonMaxHCalc();   // PERF: cache per-frame constants once (read when u_hoist on)
      gLowCanyon  = lowCanyonCalc();
      gNearCap      = mix(0.8, 0.28, gLowCanyon);          // marchCap near-field cap
      gLocalCapBase = mix(0.20, 0.075, gLowCanyon);        // nearSurface local cap base
      gStepScale    = clamp(u_canyonStepScale, 1.0, 2.6);  // frame-constant step multiplier
      float asp = u_res.x / max(1.0, u_res.y);
      float fx  = tan(0.60);                           // field of view
      float sx  = (uv.x - 0.5) * 2.0 * fx * asp;
      float sy  = (u_viewHorizon - uv.y) * 2.0 * fx;   // uv is y-down
      float cpi = cos(0.0), spi = sin(0.0);            // centered active horizon
      vec3 dir  = normalize(vec3(sx, sy * cpi - spi, sy * spi + cpi));

      // Two things move the camera downriver: the constant drift (u_scroll) so
      // the scene is alive when nobody touches it, and the page scroll, which
      // adds 16 units over one viewport — the travel the pre-rebuild hero used.
      // Both go through the same mod, so scrolling can never break the terrain's
      // seamless wrap, and releasing the scroll leaves the drift carrying on
      // from wherever you stopped rather than snapping back.
      float camZ = mod(u_time * u_scroll * 2.2 + u_scrollPos * 16.0, 69.813170);
      float camX = vCenter(camZ);                      // follow the river
      vec3  ro   = vec3(camX, 2.2 + u_scrollPos * 1.1, camZ);
      // Yaw the view to track the valley ahead so the EXIT stays centred on
      // screen (the meander curves the walls instead of sliding the opening
      // off-frame).
      float zAhd = camZ + 20.0;
      float yaw  = atan(vCenter(zAhd) - camX, 20.0);
      float cyw  = cos(yaw), syw = sin(yaw);
      dir = vec3(cyw * dir.x + syw * dir.z, dir.y, cyw * dir.z - syw * dir.x);

      float gd   = length(vec2((uv.x - 0.5) * 1.9, (uv.y - 0.5) * 3.2));
      float glow = max(0.0, 0.45 - gd);                // vanishing-point bloom

      // ── Time of day ── drives sky colour, sun, glow, stars and aurora.
      float aDay     = (u_tod * 24.0 - 6.0) / 12.0;    // 0 dawn .. 1 dusk
      float elev     = sin(aDay * 3.14159265);         // sun elevation (-1..1)
      float sunUp    = smoothstep(-0.10, 0.12, elev);
      // golden hour, widened ~30min on each side (elev window stretched out by
      // ~0.13 at both the early and late edges).
      float twi      = smoothstep(-0.33, -0.08, elev) * (1.0 - smoothstep(-0.08, 0.23, elev));
      float nightAmt = smoothstep(0.06, -0.45, elev);  // 0 day .. 1 night

      // Twilight day-amount: full while the sun is up, then ramps to night. The
      // ramp is keyed to how far the sun DISK has set behind the horizon, not a
      // fixed elevation — setFrac is the fraction of the disk below the line,
      // derived from the orbit (radius × ellipse) vs the disk radius (0.052), so
      // it stays correct as those sliders change. Dimming begins at ~75% set and
      // darkens quickly to full night just past fully-set. Monotonic — no hump.
      // Hero only: bracket the day a few min tighter — end twilight slightly
      // earlier at dusk and begin it slightly later at dawn. Near the horizon the
      // sun's elevation moves ≈ π rad / 12 h, so 0.025 of elevation ≈ 6 min;
      // biasing elev down by that shifts BOTH edges of night outward symmetrically.
      float elevNight = elev - 0.025;
      float setFrac = 0.5 - elevNight * (u_twRadius * u_twEllipse) / 0.104;
      float twDay = 1.0 - smoothstep(0.75, 1.15, setFrac);
      // Daylight→sunset blend driven by the sun's HEIGHT above the horizon (not the
      // clock): sunHeight is the disk's rise above the line in uv (radius×ellipse×
      // elev). Within u_twSunZone of the horizon the sky is sunset-warm; above the
      // zone it blends back to daylight blue. The zone height is the SUN ZONE knob.
      float sunHeight = u_twRadius * u_twEllipse * elev;
      float sunsetAmt = 1.0 - smoothstep(0.0, u_twSunZone, sunHeight);
      twi = mix(twi, twDay * mix(0.35, 0.85, sunsetAmt), u_twilight);

      // The rock ramp, bottom of the wall to sunlit ridge. Retinted off
      // river.ai's blue so the canyon meets the app's violet page instead of
      // sitting on it: NAVY_LO is within a hair of --bg #150a2e, which is what
      // the bottom scrim fades to, so wall and page become one surface down
      // there. The shift eases off as the ramp climbs — STEEL is only half
      // moved and AQUA is left alone, because the peaks are where the sun
      // actually lands and warm light on violet rock reads as mud.
      vec3 NAVY_LO=vec3(0.055,0.028,0.130), NAVY=vec3(0.115,0.065,0.295);
      vec3 STEEL=vec3(0.20,0.185,0.47),  AQUA=vec3(0.60,0.76,0.86);
      // Twilight mutes the daytime-blue lift, but lets MORE blue back in near noon
      // (sun high → 0.34) than at the horizon (sunset → 0.14 dusk band), and falls
      // toward the dark night base once the sun has fully set (twDay).
      float skyUp = mix(sunUp, twDay * mix(0.40, 0.14, sunsetAmt), u_twilight);
      // Sky endpoints shift night→day; the horizon warms through golden hour.
      vec3 SKY_TOP = mix(vec3(0.026,0.046,0.115), vec3(0.060,0.160,0.420), smoothstep(0.0,0.55,skyUp));
      vec3 SKY_HOR = mix(vec3(0.060,0.112,0.245), vec3(0.330,0.560,0.820), smoothstep(0.0,0.55,skyUp));
      SKY_HOR = mix(SKY_HOR, vec3(0.85,0.45,0.24), twi * 0.6);
      // Twilight: warm the WHOLE gradient toward sunset — upper sky to a dusk rose
      // (warm-dominant, not blue) and the horizon to a deep burnt orange — so it
      // reads as a perpetual sunset rather than midday.
      SKY_TOP = mix(SKY_TOP, vec3(0.160,0.090,0.110), u_twilight * twi);
      SKY_HOR = mix(SKY_HOR, vec3(0.98,0.44,0.22), u_twilight * twi * 0.55);
      // The valley-mouth glow follows the sun: warm by day/golden, cool & dim at night.
      vec3 GLOW = mix(vec3(0.26,0.40,0.80), vec3(0.99,0.74,0.55), max(sunUp, twi));

      // Perf: during the opening (u_reveal ≈ 0) only the bare sky gradient is
      // visible — the canyon raymarch, cloud march, sun god-rays and aurora all
      // sit hidden behind it. Skip the whole scene and return just the gradient,
      // so the intro text phase is cheap. (Exactly the reveal=0 composite output.)
      if (u_reveal <= 0.001) {
        float sgInit = pow(clamp(uv.y / 0.6, 0.0, 1.0), 1.6);
        return mix(SKY_TOP, SKY_HOR, sgInit);
      }

      // Capped growing step: fine near the camera, and the cap keeps far steps
      // small enough that the wall silhouettes stay smooth (no stair-step kinks
      // in the ridge line). Sky rays bail early once above all walls & rising.
      float t = 0.4, stp = 0.30, prevT = 0.0, tHit = -1.0;
      float minGap = 1.0e9, minGapT = 0.0;
      for (int k = 0; k < 240; k++){
        if (float(k) >= u_canyonMaxSteps) break;
        vec3 p = ro + dir * t;
        float gapNow = 1.0e6;
        if (p.y > canyonMaxH() + 0.5 && dir.y >= 0.0) break; // above tallest wall, ascending → sky
        if (p.z > camZ + 0.05){
          float gap = p.y - vH(p.x, p.z);
          gapNow = gap;
          if (gap < minGap){ minGap = gap; minGapT = t; }   // track closest approach
          if (gap < 0.0){
            float a = prevT, b = t;
            // PERF: a hit whose whole bracket sits beyond the haze saturation
            // distance (>=96% faded toward skyHaze at 108, see below) doesn't
            // need a sub-step-accurate depth — skip the 14-iteration refine.
            if (a > 108.0) { tHit = b; break; }
            if (u_refineMode > 0.5){
              // secant: keep the bracket gap values and interpolate toward the
              // zero crossing — converges faster than bisection, ~1 vH per step.
              vec3 pa0 = ro + dir * a; float ga = pa0.y - vH(pa0.x, pa0.z);
              float gb = gap;                          // gap at b (=t), < 0
              for (int r = 0; r < 14; r++){
                if (float(r) >= u_refineSteps) break;
                float mt = a + (b - a) * ga / max(ga - gb, 1.0e-5);
                vec3 pm = ro + dir * mt; float gm = pm.y - vH(pm.x, pm.z);
                if (gm < 0.0){ b = mt; gb = gm; } else { a = mt; ga = gm; }
              }
            } else {
              for (int r = 0; r < 14; r++){
                if (float(r) >= u_refineSteps) break;
                float mt = 0.5 * (a + b);
                vec3 pm = ro + dir * mt;
                if (pm.y < vH(pm.x, pm.z)) b = mt; else a = mt;
              }
            }
            tHit = b; break;
          }
        }
        prevT = t; stp = min(stp * 1.045, nearSurfaceMarchCap(t, gapNow)); t += stp;  // capped march → smoother silhouette
      }

      // PERF: the canyon slopes hide the sky behind them, yet every wall pixel
      // used to build the full sky anyway — sun disk, cloud march, stars and the
      // 28-sample aurora — only for the final composite to throw it away (walls
      // fade toward skyHaze, which carries none of those extras by design). A
      // hit pixel can only show background if the AA pass below lowers its
      // coverage under 1.0, and that pass triggers on exactly this predicate
      // (plus the SDF blend's |minGap| < 1.22 window and the intro reveal) — so
      // anything outside it can skip building the sky extras entirely. Kept as
      // a cheap conservative test so the full coverage pass stays where it was.
      float covQ = (tHit >= 0.0) ? 1.0 : missCoverage(minGap, u_aaFeather);
      float surfQ = (tHit >= 0.0) ? tHit : minGapT;
      float revealFrontQ = mix(-16.0, 130.0, u_reveal);
      float revealQ = smoothstep(revealFrontQ + 16.0, revealFrontQ - 16.0, surfQ);
      bool skyVisible = covQ < 0.999 || revealQ < 0.999
                     || abs(minGap) < 1.25 || fwidth(covQ) > 0.0008;

      // ── Sky ── day/night gradient + sun glow + stars + aurora (from v1).
      float asp2 = u_res.x / max(1.0, u_res.y);
      float skyG = pow(clamp(uv.y / 0.6, 0.0, 1.0), 1.6);     // top → horizon
      vec3 sky = mix(SKY_TOP, SKY_HOR, skyG);
      // Intro: the bare blue gradient is the floor that's visible from the very
      // start; the sun, valley glow, clouds, stars and aurora (skybox extras) are
      // layered on below and only fade in over the back half of the reveal (they
      // live at the horizon/overhead, the far end of the front-to-back sweep).
      vec3 skyBare = sky;
      float skyReveal = smoothstep(0.5, 1.0, u_reveal);
      // Fold the valley-mouth glow in, then capture skyHaze = the bare
      // ATMOSPHERE (gradient + glow only). The far-wall haze fades toward THIS,
      // so the sun disk / stars / aurora never bleed onto the canyon walls.
      sky += GLOW * glow * 0.5;
      vec3 skyHaze = sky;
      // sun — rises low on the LEFT at dawn, arcs up over the canyon, and sets
      // just to the RIGHT of the valley opening at dusk. Keep the horizontal
      // arc alive beyond dusk so the disk fully crosses the horizon instead of
      // clamping at the old horizon point and falling straight down.
      float sunArcT = clamp(aDay, -0.18, 1.18);
      float sunPathShift = 0.052 / max(asp2, 0.001); // half an apparent sun diameter
      float sunX = mix(-0.30, 0.55, sunArcT) - sunPathShift;
      // sunY keeps DESCENDING as the sun drops below the horizon (elev<0) so it
      // visibly sinks past the valley opening and the floor occludes it, instead
      // of fading out while still aloft. Higher apex (0.0) → arcs more overhead,
      // as if it rose behind us. (Update the JS solver's range if you change 0.0.)
      float sunY = mix(0.47, 0.00, clamp(elev, -0.42, 1.0));
      // Twilight mode: the sun traces a small orbit centred on the horizon line
      // (horizontally at the pane centre), so it RISES FROM and SETS INTO the
      // horizon — on the line at dawn/dusk, up to u_twRadius above it at noon, and
      // below (occluded) at night. Day length is unchanged — it tracks the shorter
      // path, so the disk drifts more slowly. The X radius is divided by the
      // aspect so the orbit reads round at u_twEllipse = 1; lower values flatten Y.
      float twHorizonY = u_viewHorizon;                    // active march horizon line
      float twTheta = 3.14159265 * (1.0 - aDay);           // dawn→dusk = left→top→right
      float twX = 0.5 + (u_twRadius / max(asp2, 0.001) * u_twEllipseX) * cos(twTheta);
      float twY = twHorizonY - (u_twRadius * u_twEllipse) * sin(twTheta);
      sunX = mix(sunX, twX, u_twilight);
      sunY = mix(sunY, twY, u_twilight);
      vec3  sunCol = mix(vec3(1.0, 0.86, 0.56), vec3(1.0, 0.40, 0.22), twi);  // reddens toward sunset
      // Visibility follows the actual screen-space horizon instead of sun
      // elevation. The disk stays full-strength until it is geometrically
      // excluded below the valley mouth; the tiny terminal fade prevents a pop.
      float sunHorizonY = u_viewHorizon;
      float sunVis = 1.0 - smoothstep(sunHorizonY + 0.050, sunHorizonY + 0.068, sunY);
      // ── Sun: glowing BALL of light + animated god-rays (ported from sandbox) ──
      // (sunCol/sunVis stay unconditional — the volumetric shafts and skyHaze
      // below need them on wall pixels too; the disk itself is sky-only.)
      if (skyVisible) {
        float sd   = length((uv - vec2(sunX, sunY)) * vec2(asp2, 1.0));
        float rr     = sd / 0.052;                            // normalised radius
        float sCore  = exp(-rr * rr * 5.0);                   // hot bright centre
        float sBall  = smoothstep(0.62, 0.28, rr);            // soft-edged disk
        // angular ray field: irregular noise on a circle, two scales, drifting; the
        // rays' length & intensity vary over time via rayMod, plus a slow sweep
        float sAng   = atan(uv.y - sunY, (uv.x - sunX) * asp2) + u_time * 0.02;
        vec2  sAc    = vec2(cos(sAng), sin(sAng));
        float sRayB  = fbm(sAc * 4.0 + vec2(u_time * 0.22, 3.0));
        float sRayF  = fbm(sAc * 10.0 - vec2(u_time * 0.36, 9.0));
        float sRayM  = pow(clamp(sRayB * (0.5 + 0.6 * sRayF), 0.0, 1.0), 2.1);
        float sFall  = mix(2.6, 0.9, sRayM);                  // strong ray → long reach
        float sGlowR = exp(-rr * 1.7) * 0.35 + exp(-rr * sFall) * sRayM * 0.85;
        sky += sunVis * u_sun * 1.6 * (0.7 + 0.5 * twi) * sunCol
               * (sCore * 0.7 + sBall + sGlowR);
      }

      // Volumetric shafts: sun rays converge toward the canyon mouth and ride
      // the same haze as the far walls. Kept soft/noisy so resize resolution
      // changes cannot create hard bands across the scene.
      float mouthX = 0.5 - tan(yaw) / (2.0 * fx * asp);
      vec2 sunP = vec2(sunX * asp2, sunY);
      vec2 mouthP = vec2(mouthX * asp2, u_viewHorizon);
      vec2 rayAxis = normalize(mouthP - sunP + vec2(0.0001, 0.0001));
      vec2 rayRel = vec2(uv.x * asp2, uv.y) - sunP;
      float rayAlong = dot(rayRel, rayAxis);
      float rayCross = abs(rayRel.x * rayAxis.y - rayRel.y * rayAxis.x);
      float rayLow = sunVis * (1.0 - smoothstep(0.36, 0.90, elev)) * (0.38 + 0.62 * twi);
      float rayNoise = 0.55 + 0.45 * fbm(vec2(rayAlong * 2.4 + u_time * 0.035, rayCross * 24.0 + 4.0));
      float rayMask = smoothstep(0.00, 0.12, rayAlong)
                    * (1.0 - smoothstep(1.05, 1.85, rayAlong))
                    * smoothstep(0.135, 0.012, rayCross)
                    * smoothstep(0.74, 0.34, uv.y);
      vec3 rayCol = sunCol * (rayMask * rayNoise * rayLow * u_sun * 0.18);
      sky += rayCol;
      skyHaze += rayCol * 0.72;

      // ── Clouds: VOLUMETRIC 3D layer (ported from the aurora sandbox) ── a real
      // cloud deck overhead, pitched so it begins just above the valley mouth and
      // drifts up/over the canyon as you travel. Tuned preset baked in.
      // PERF: sky-only — wall pixels above the horizon used to pay the full
      // 40-step cloud march for a value the composite then discarded.
      if (skyVisible) {
        // Fade clouds out before the heavy aurora window, then skip the cloud
        // raymarch entirely while hidden so the aurora owns the night GPU budget.
        float cloudHr = u_tod * 24.0;
        float cloudDayGate = u_cloudOn * min(
          1.0 - smoothstep(18.6, 20.4, cloudHr),  // sunset fade-out
          smoothstep(4.0, 5.2, cloudHr)           // pre-sunrise fade-in after aurora
        );
        float ch = u_viewHorizon;                            // sky/valley-mouth horizon
        vec2  P    = uv * u_res;
        float cell = max(u_res.y / max(u_cloudDot, 1.0), 2.0);
        vec2  Cd   = floor(P / cell);
        vec2  dotCenter = (Cd + 0.5) * cell;
        vec2  dotUv = dotCenter / u_res;
        vec2  Cp   = (P - dotCenter) / cell;
        // Sample the cloud deck once at the dot cell centre. The shader still
        // executes per pixel, but every pixel inside a dot receives the same
        // cloud value, so volumetric texture noise cannot show through the dot.
        vec3 crd = normalize(vec3((dotUv.x - 0.5) * asp2, (ch - dotUv.y) * 1.70, 1.0));
        if (cloudDayGate > 0.015 && crd.y > 0.001) {          // sky only
          // PERF: the 40-step volumetric march now runs once, at half res, in
          // the offscreen sky pass — here we just fetch its premultiplied
          // result at the dot-cell centre. The sunset tint, visibility and
          // halftone below need full-res dot geometry and are cheap, so they
          // stay in this pass unchanged.
          vec4 cl = texture2D(u_cloudTex, vec2(dotUv.x, 1.0 - dotUv.y));
          // ── catch the sunset ── strong warm/gold tint + a brightness lift through
          // twilight, so the deck is at its most striking right at sunset.
          cl.rgb = mix(cl.rgb, cl.rgb * vec3(1.45, 0.92, 0.58), twi * 0.85);
          cl.rgb *= (1.0 + 0.35 * twi);
          // ── visibility ── more present at night (floor 0.35, was 0.12) and PEAKS
          // through golden hour so sunset clouds don't fade with the night effect.
          float vis  = clamp(0.35 + 0.65 * sunUp + 0.55 * twi, 0.0, 1.0) * cloudDayGate;
          float fade = smoothstep(0.0, 0.015, crd.y) * vis;  // tiny gap above the horizon
          cl.rgb *= fade; cl.a *= fade;
          // HALFTONE: cloud gets its own dot-density control in the same
          // dots-per-screen-height unit as AUR DOT.
          float cloudDotBase = clamp(cl.a, 0.0, 1.0);
          float jitR = (hash(Cd) - 0.5) * 0.065 * smoothstep(0.025, 0.155, cloudDotBase);
          float cloudDotLevel = clamp(cloudDotBase + jitR, 0.0, 1.0);
          float dotDensity = pow(smoothstep(0.025, 0.50, cloudDotLevel), 0.70);
          float rad = mix(0.000, 0.395, dotDensity);
          float dotDist = length(Cp);
          float aa = 0.160;
          float dotc = step(0.025, cloudDotBase) * smoothstep(rad + aa, rad - aa, dotDist);
          vec3  cloudCol = cl.rgb / max(cl.a, 1e-3);         // un-premultiply → lit colour
          sky = mix(sky, cloudCol, dotc);
        }
      }
      // Twilight: warm-grade the whole daytime sky (gradient + glow + cloud deck)
      // together so the deck and the open sky both sit firmly in sunset tones —
      // the gradient endpoints alone can't reach the cloud pixels. Night elements
      // (stars / aurora) are added afterwards and stay untouched.
      if (skyVisible) {
        sky = mix(sky, sky * vec3(1.55, 0.90, 0.58) + vec3(0.05, 0.018, 0.0),
                  u_twilight * twi * 0.75);
      }
      // ✦ Stars — small round points of varying size & brightness that rotate
      // around a celestial pole over the night (sky rotation), and twinkle.
      if (skyVisible && nightAmt > 0.001) {
        vec2 pole = vec2(0.64, -0.22);                      // celestial pole (off-screen, upper-right)
        float sang = mod(u_time * 0.015, 6.2831853);        // slow, steady sky rotation
        vec2 rel = (uv - pole) * vec2(asp2, 1.0);
        float ca = cos(sang), sa = sin(sang);
        vec2 srot = vec2(rel.x * ca - rel.y * sa, rel.x * sa + rel.y * ca);
        vec2 g  = srot * 92.0;
        vec2 gi = floor(g);
        vec2 gf = fract(g) - 0.5;
        float sh = hash(gi);
        float present = step(0.84, sh);                     // sparse
        vec2 off = (vec2(hash(gi + 1.7), hash(gi + 4.3)) - 0.5) * 0.7;  // random position in cell
        float sz  = 0.05 + 0.16 * hash(gi + 2.1);           // varying size
        float mag = 0.30 + 0.70 * hash(gi + 5.5);           // varying brightness
        float tw  = 0.55 + 0.45 * sin(u_time * 2.5 + sh * 50.0);        // twinkle
        float star = present * smoothstep(sz, sz * 0.25, length(gf - off)) * mag * tw;
        star *= smoothstep(0.62, 0.0, uv.y);                // above the horizon
        sky += star * nightAmt * vec3(0.92, 0.95, 1.0) * 1.3;
      }
      // ✦ Northern lights — two wave curtains that emit from the CENTRE of the
      // horizon (where the river runs to) and rise up, running off the top of
      // the screen. Aurora window keyed to time-of-day (not symmetric elevation)
      // so it can linger past midnight: fades in after sunset (~20:30→22:12),
      // then fades out early before sunrise (full to ~02:00, gone by ~04:00) so
      // clouds can return before dawn.
      float todHr = u_tod * 24.0;
      float aurZ  = max(smoothstep(19.5, 22.5, todHr), 1.0 - smoothstep(2.0, 4.0, todHr));
      if (skyVisible && aurZ > 0.001 && u_aurOn > 0.5) {
        // PERF: the 28-sample curtain accumulation (auroraField, in the shared
        // prelude) now runs once, at half res, in the offscreen sky pass — the
        // stored scalar already carries the aurZ window, tonemap and origin
        // taper. Only the origin lines survive here (the halftone overlay's
        // topLift needs oyLow), plus the per-night colour and dot composite,
        // which want full-res cell geometry.
        float at = u_time * u_aurSpeed;      // aurora's own clock (per-night speed, rolled at sunset)
        float oySwap   = 0.015 * sin(at * 0.110 + 0.6);
        float oyIndepR = 0.020 * sin(at * 0.130)       + 0.015 * sin(at * 0.071 + 2.1);
        float oyIndepL = 0.020 * sin(at * 0.097 + 1.2) + 0.015 * sin(at * 0.054 + 0.2);
        float originY = u_viewHorizon - clamp(u_aurOriginY, -0.25, 0.25);
        float oy  = originY + oyIndepR - oySwap;
        float oyL = originY + oyIndepL + oySwap;
        float oyLow = max(oy, oyL);
        float aur = texture2D(u_aurTex, vec2(uv.x, 1.0 - uv.y)).r;
        // ── per-night colour ── latched once at sunset in JS (u_aurHue), so it
        // can never change mid-aurora: green, or the traditional violet.
        vec3 aurCol = mix(vec3(0.26, 0.97, 0.55), vec3(0.58, 0.40, 0.98), u_aurHue);
        if (u_aurDot < 1.0) {
          sky += aur * aurCol * (0.55 + 0.6 * aur);
        } else {
          vec2 P = uv * u_res;
          float cell = max(u_res.y / u_aurDot, 2.0);
          vec2 C = floor(P / cell);
          vec2 Cp = (P - (C + 0.5) * cell) / cell;
          float jitR = (hash(C + 47.0) - 0.5) * 0.12;
          float topLift = smoothstep(0.055, 0.300, oyLow - uv.y);
          float dotGamma = mix(0.82, 0.56, topLift);
          float dotBoost = mix(0.90, 1.22, topLift);
          float aurDotLevel = clamp(pow(aur, dotGamma) * dotBoost, 0.0, 1.0);
          float rad = clamp(aurDotLevel + jitR, 0.0, 1.0) * 0.78;
          float dotc = smoothstep(rad, rad - 0.18, length(Cp));
          float aurD = aurDotLevel * dotc;
          float dotLight = mix(0.56 + 0.58 * aurD, 0.72 + 0.78 * aurD, topLift);
          sky += aurD * aurCol * dotLight;
        }
      }

      // Refine the closest approach to a CONTINUOUS sub-step value. The march
      // only samples minGap at discrete steps, so it quantizes — adjacent
      // pixels jump between sampled gaps, combing the grazing edge into teeth.
      // A parabolic fit through three fine samples around the coarse minimum
      // recovers the true minimum smoothly, so the feather below is tooth-free.
      if (tHit < 0.0 && minGap < 1.0e8) {
        float h  = 0.18;
        vec3  pa = ro + dir * (minGapT - h);
        vec3  pb = ro + dir *  minGapT;
        vec3  pc = ro + dir * (minGapT + h);
        float ga = pa.y - vH(pa.x, pa.z);
        float gb = pb.y - vH(pb.x, pb.z);
        float gc = pc.y - vH(pc.x, pc.z);
        float den = ga - 2.0 * gb + gc;                 // >0 ⇒ convex (a real minimum)
        if (den > 1.0e-4) {
          float d = ga - gc;
          minGap = max(gb - (d * d) / (8.0 * den), 0.0);
        }
      }

      // ── Anti-aliased silhouette ── instead of a hard hit/miss edge (which
      // aliases into a jagged ridge), the wall fades over a soft band based on
      // how closely the ray grazed the rim. Solid inside, smoothly feathered at
      // the edge → a clean ridge line regardless of GPU float behaviour.
      float edgeFeather = u_aaFeather;
      float covC = (tHit >= 0.0) ? 1.0 : missCoverage(minGap, edgeFeather);
      // ── Silhouette anti-aliasing (live-tunable from the panel) ──
      // Signed-distance mode (u_aaSigned) → single continuous field, comb-free.
      // Otherwise supersample the silhouette only, still at full-frame 1x.
      // The offset rays must apply the same yaw as the main ray; otherwise the
      // AA pass samples a different canyon direction and creates edge artifacts.
      float coverage = covC;
      // PERF: surfQ >= 108 -> the wall is mostly swallowed by haze (see the
      // smoothstep(30, 108, surfT) fade below), so a supersampled silhouette
      // is indistinguishable from the 1x analytic feather — skip the 4 extra
      // wall marches on those far-ridge pixels.
      if (u_aaN >= 3.5 && surfQ < 108.0
          && (fwidth(covC) > 0.0008 || (covC > 0.001 && covC < 0.999) || abs(minGap) < 0.85)) {
        vec2 px = 1.0 / u_res;
        // Offset rays graze the wall within a hair of the main ray's distance,
        // so window every supersample around it (see wallCoverage).
        float aaC = (tHit >= 0.0) ? tHit : minGapT;
        if (u_aaN >= 8.5) {   // 3×3 edge-only SSAA test with a wider footprint
          vec2 a = vec2(-0.62, -0.62), b = vec2(0.0, -0.62), c = vec2(0.62, -0.62);
          vec2 d = vec2(-0.62,  0.0),                           e = vec2(0.62,  0.0);
          vec2 f = vec2(-0.62,  0.62), g = vec2(0.0,  0.62), h = vec2(0.62,  0.62);
          float s = covC
                  + wallCoverage(ro, yawValleyRay(uv + a * px, asp, fx, yaw), camZ, edgeFeather, aaC)
                  + wallCoverage(ro, yawValleyRay(uv + b * px, asp, fx, yaw), camZ, edgeFeather, aaC)
                  + wallCoverage(ro, yawValleyRay(uv + c * px, asp, fx, yaw), camZ, edgeFeather, aaC)
                  + wallCoverage(ro, yawValleyRay(uv + d * px, asp, fx, yaw), camZ, edgeFeather, aaC)
                  + wallCoverage(ro, yawValleyRay(uv + e * px, asp, fx, yaw), camZ, edgeFeather, aaC)
                  + wallCoverage(ro, yawValleyRay(uv + f * px, asp, fx, yaw), camZ, edgeFeather, aaC)
                  + wallCoverage(ro, yawValleyRay(uv + g * px, asp, fx, yaw), camZ, edgeFeather, aaC)
                  + wallCoverage(ro, yawValleyRay(uv + h * px, asp, fx, yaw), camZ, edgeFeather, aaC);
          coverage = s / 9.0;
        } else {
          vec2 o0 = vec2( 0.375,  0.125), o1 = vec2(-0.125,  0.375),
               o2 = vec2(-0.375, -0.125), o3 = vec2( 0.125, -0.375);   // 4× RGSS
          float s = wallCoverage(ro, yawValleyRay(uv + o0 * px, asp, fx, yaw), camZ, edgeFeather, aaC)
                  + wallCoverage(ro, yawValleyRay(uv + o1 * px, asp, fx, yaw), camZ, edgeFeather, aaC)
                  + wallCoverage(ro, yawValleyRay(uv + o2 * px, asp, fx, yaw), camZ, edgeFeather, aaC)
                  + wallCoverage(ro, yawValleyRay(uv + o3 * px, asp, fx, yaw), camZ, edgeFeather, aaC);
          if (u_aaN >= 7.5) {   // 8× — second rotated grid, finer
          vec2 q0 = vec2( 0.25, -0.05), q1 = vec2( 0.05,  0.25),
               q2 = vec2(-0.25,  0.05), q3 = vec2(-0.05, -0.25);
            s += wallCoverage(ro, yawValleyRay(uv + q0 * px, asp, fx, yaw), camZ, edgeFeather, aaC)
               + wallCoverage(ro, yawValleyRay(uv + q1 * px, asp, fx, yaw), camZ, edgeFeather, aaC)
               + wallCoverage(ro, yawValleyRay(uv + q2 * px, asp, fx, yaw), camZ, edgeFeather, aaC)
               + wallCoverage(ro, yawValleyRay(uv + q3 * px, asp, fx, yaw), camZ, edgeFeather, aaC);
            coverage = s / 8.0;
          } else {
            coverage = s / 4.0;
          }
        }
      }
      if (u_aaSigned > 0.5) {
        // Cheap 1× SDF pass: use the ray's closest wall gap as a continuous
        // edge field. This targets the remaining stair-step after sample AA
        // without projecting or painting any extra wall geometry into the sky.
        float gapAA = clamp(fwidth(minGap) * 0.95, 0.035, 0.70);
        float sdfCoverage = 1.0 - smoothstep(-gapAA, gapAA, minGap);
        float sdfBlend = 1.0 - smoothstep(0.42, 1.22, abs(minGap));
        coverage = mix(coverage, sdfCoverage, sdfBlend);
      }
      // Background = bare blue until the skybox extras have revealed.
      vec3 bg = mix(skyBare, sky, skyReveal);
      if (coverage <= 0.001) return bg;
      float surfT = (tHit >= 0.0) ? tHit : minGapT;

      vec3 p = ro + dir * surfT;
      float e = 0.10;
      float hx = (vH(p.x + e, p.z) - vH(p.x - e, p.z)) / (2.0 * e);
      float hz = (vH(p.x, p.z + e) - vH(p.x, p.z - e)) / (2.0 * e);
      vec3 n = normalize(vec3(-hx, 1.0, -hz));
      float hMax = max(canyonMaxH(), 1.0);
      float heightT = clamp(p.y / hMax, 0.0, 1.0);
      // ── Sun-tracking canyon light ── direction follows the sun's arc, but
      // the canyon now also self-shadows at low angles. One wall warms while
      // the opposing wall/floor fall into cooler shade, then the contrast
      // collapses toward softer overhead light at noon.
      float aDayC = clamp(aDay, 0.0, 1.0);
      vec3 sunDirW = normalize(vec3(mix(-0.95, 0.72, aDayC),
                                    0.11 + 1.35 * max(elev, 0.0),
                                    mix(0.22, 0.92, aDayC)));
      // Below the horizon the sun azimuth flips (aDay's clamp jumps 1→0 exactly
      // at midnight), so blend to a FIXED night key light by ELEVATION — which
      // is continuous through midnight — masking the flip (weight 0 at night).
      vec3 nightDir = normalize(vec3(-0.40, 0.70, 0.30));
      float sunWeight = smoothstep(-0.05, 0.25, elev);
      vec3 lightDir = normalize(mix(nightDir, sunDirW, sunWeight));
      float directRaw = max(0.0, dot(n, lightDir));
      float lowSun = (1.0 - smoothstep(0.16, 0.85, elev)) * sunWeight;
      float wallness = smoothstep(0.12, 0.62, length(n.xz)) * smoothstep(0.06, 0.44, heightT);
      vec2 sunHoriz = normalize(sunDirW.xz + vec2(0.0001, 0.0));
      float sideLight = dot(normalize(n.xz + vec2(0.0001, 0.0)), sunHoriz);
      float sunFace = smoothstep(-0.25, 0.62, sideLight);
      float shadeFace = 1.0 - smoothstep(-0.62, 0.12, sideLight);
      float shadow = 0.0;
      // PERF: sunWeight is 0 all night (elev < -0.05) — the 6-tap shadow
      // march used to run anyway and multiply to zero.
      if (u_canyonShadow > 0.5 && sunWeight > 0.001) {
        shadow = canyonSunShadow(p + n * 0.045, sunDirW, lowSun) * sunWeight;
      }
      float lowWall = lowCanyon();
      float rimShadowFade = smoothstep(0.66, 0.98, heightT);
      float rimShadowDamp = 1.0 - rimShadowFade * lowWall * 0.88;
      shadow = clamp(max(shadow, shadeFace * wallness * lowSun * 0.78 * u_canyonShadow), 0.0, 1.0) * rimShadowDamp;
      float direct = max(directRaw, sunFace * wallness * lowSun * 0.58) * (1.0 - 0.82 * shadow);
      float dfloor = abs(p.x - vCenter(p.z));
      float skyOpen = smoothstep(0.31, 0.94, heightT) * (0.45 + 0.55 * max(n.y, 0.0));
      float floorAO = mix(0.50, 1.0, smoothstep(0.75, 4.6, dfloor))
                    * mix(0.62, 1.0, smoothstep(0.03, 0.41, heightT));
      float bounce = (1.0 - smoothstep(0.0, 4.0, dfloor)) * (0.35 + 0.65 * max(n.y, 0.0));
      float ambient = (0.15 + 0.13 * max(n.y, 0.0) + 0.13 * skyOpen + 0.06 * bounce * sunUp)
                    * mix(0.48, 1.0, sunUp);
      // The hard 1x silhouette is most visible where the bright rim highlight
      // reaches partly covered edge pixels. Keep the wall shape from coverage,
      // but reduce high-frequency rim/aqua light on those transitional pixels.
      float edgeSolid = smoothstep(0.46, 0.98, coverage);
      float edgeRimDamp = mix(0.36, 1.0, edgeSolid);
      float lowRidgeFade = smoothstep(0.58, 0.98, heightT) * lowWall;
      float rim = pow(clamp(1.0 - abs(dot(n, lightDir)), 0.0, 1.0), 2.6)
                * lowSun * smoothstep(0.38, 0.97, heightT) * (1.0 - shadow) * (0.45 + 0.55 * sunFace)
                * (1.0 - 0.68 * lowRidgeFade) * edgeRimDamp;
      float sideContrast = mix(1.0, mix(0.58, 1.42, sunFace), wallness * lowSun);
      float shade = clamp((ambient + 1.58 * direct + 0.52 * rim) * floorAO * sideContrast, 0.045, 2.20);
      float hh = heightT;
      vec3 col = mix(NAVY_LO, NAVY, smoothstep(0.015, 0.35, hh));
      col = mix(col, STEEL, smoothstep(0.35, 0.72, hh));
      col = mix(col, AQUA,  smoothstep(0.80, 1.0,  hh) * (1.0 - 0.56 * lowRidgeFade) * edgeRimDamp);
      col *= shade;
      // Shadow tint, multiplied into the rock. Green pulled under red so the
      // unlit faces fall violet rather than blue — this carries most of the
      // wall, since only the ridges catch direct sun.
      vec3 coolShade = mix(vec3(0.74, 0.58, 1.16), vec3(0.82, 0.68, 1.20), nightAmt * 0.5);
      vec3 warmSun = mix(vec3(1.20, 1.08, 0.78), vec3(1.86, 1.18, 0.54), max(twi, lowSun * 0.70));
      col *= mix(coolShade, vec3(1.0), clamp(0.28 + 0.82 * direct + 0.20 * skyOpen, 0.0, 1.0));
      col = mix(col, col * warmSun, clamp(direct * (0.38 + 0.36 * lowSun) + rim * 0.76, 0.0, 0.86));
      col += vec3(1.0, 0.62, 0.30) * rim * twi * 0.09;
      // River bed: the (now wider) low ground between the walls; dots cover it.
      float bed = smoothstep(1.4, 0.0, p.y) * smoothstep(3.4, 0.5, dfloor);
      col = mix(col, mix(NAVY, STEEL, 0.35), bed * 0.6);       // dim navy bed so pale dots read

      // ── River as a flowing halftone dot field (v1) ── a STATIC screen dot
      // grid; each dot's size follows a downstream-flowing water intensity
      // (channel × flow noise + foam). The grid is fixed and the intensity
      // flows through it — the v1 page's water look.
      if (bed > 0.02) {
        float across = (p.x - vCenter(p.z)) / 2.7;
        float along  = p.z - camZ;   // camera-relative depth → continuous across the camZ wrap (no jump)
        float chan   = exp(-across * across * 0.7);
        float fT     = u_time * u_flowSpd;
        float flow1  = fbm(vec2(across * 1.7, along * 0.42 + fT * 2.6));   // +fT → bright bands
        float flow2  = fbm(vec2(across * 3.6, along * 0.95 + fT * 4.2));   //        flow toward the
        float flow   = flow1 * 0.55 + flow2 * 0.45;                        //        camera (downstream)
        float strm   = smoothstep(0.20, 0.95, 0.35 + 0.80 * flow);
        float foam   = smoothstep(0.80, 0.96, flow) * (0.55 + 0.45 * sin(along * 5.0 + fT * 6.0));
        strm = max(strm, foam * u_foam);
        float I = (0.30 + 0.70 * clamp(strm, 0.0, 1.0)) * mix(0.45, 1.0, chan) * bed;
        vec2 P    = uv * u_res;
        float waterCell = max(u_res.y / max(u_waterDot, 1.0), 2.0);
        vec2 cell = floor(P / waterCell);
        vec2 cp   = (P - (cell + 0.5) * waterCell) / waterCell;
        float jit = (hash(cell) - 0.5) * 0.16;
        float radius = clamp(I + jit, 0.0, 1.0) * 0.50;
        float dotc = smoothstep(radius, radius - 0.16, length(cp));
        vec3 dotCol = mix(vec3(0.58, 0.76, 0.95), vec3(1.0, 0.99, 0.94), smoothstep(0.5, 1.0, I));
        // ── water reacts to the sun ── warms through golden hour, picks up a
        // sunset glint down the channel centre, and dims at night.
        vec3 sunWarm = vec3(1.0, 0.74, 0.45);
        dotCol = mix(dotCol, sunWarm, twi * 0.55);
        dotCol += sunWarm * (chan * twi * 0.6 * smoothstep(0.45, 1.0, flow));   // sunset glint
        float lit = mix(0.5, 1.0, sunUp);                                       // dimmer at night
        col = mix(col, dotCol, dotc * (0.7 + 0.3 * I) * lit);
      }

      // Aerial perspective: farther walls fade toward the hazy sky/glow, so an
      // overlapping near-wall edge reads as soft atmospheric depth rather than a
      // hard occlusion line (like the layered ridges in the reference).
      // Strong far-fade into the ACTUAL local sky (glow-inclusive): a distant
      // wall seen edge-on as a new bend emerges would otherwise pop as a bright
      // vertical sliver. Fading toward the exact background behind it makes it
      // appear seamlessly and resolve into a slope. Near walls stay crisp.
      float haze = smoothstep(30.0, 108.0, surfT) * 0.96;
      col = mix(col, skyHaze, haze);   // aurora-free target → curtains never bleed onto walls
      // Intro reveal: the canyon condenses out of the sky from the foreground back
      // to the horizon. u_reveal grows 0→1; a soft depth band sweeps a "reveal
      // front" from just in front of the camera (hidden) out past the far walls
      // (shown), so nearer geometry resolves first. Below the front → canyon, above
      // → still bare sky. (u_reveal = 1 leaves the scene fully shown.)
      float revealFront = mix(-16.0, 130.0, u_reveal);
      float revealA = smoothstep(revealFront + 16.0, revealFront - 16.0, surfT);
      return mix(bg, col, coverage * revealA);              // feathered silhouette + depth reveal
    }
`;
