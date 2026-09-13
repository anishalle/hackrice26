/**
 * Aurora curtain geometry, from river.ai's FS_COMMON.
 *
 * The two curtains share one curve: `auroraPathX(tb2, …, 1.0)` evaluates
 * `auroraCurveX` at `tb2 + originDelta`, and the plane loop's tb1/tb2 differ by
 * exactly that — so the split `auroraCurveDxLite`/`auroraGapDx` helpers let the
 * loop evaluate the curve and its derivative once per sample and add only the
 * cheap gap term for the right curtain. Bit-identical to calling the combined
 * `auroraPathX`/`auroraPathDxLite` twice.
 */
export const AURORA_HELPERS = /* glsl */ `
    float auroraAntiLinearFold(float tb, float at){
      float t = clamp(tb, 0.0, 1.0);
      float keepNodes = smoothstep(0.010, 0.150, t) * (1.0 - smoothstep(0.78, 1.0, t));
      float p = t * 14.0 + at * 0.10;
      return keepNodes * (0.018 * sin(p + 0.8) + 0.010 * sin(p * 0.67 + 2.4));
    }

    float auroraCurveX(float tb, float at, float sweep){
      float wb = 0.16 * tb;
      float p = tb * 6.0 + at * 0.16;
      // Low-freq terms (sin(p), the 0.57 harmonic) average to a sideways LEAN over
      // the curtain's height, pulling it off-centre; the 1.9 harmonic cycles ~fully
      // so it's near-zero-mean and supplies the tight multiple nodes. Cut the lean
      // terms, boost the node term → stays centred but keeps (more) bends.
      float m = 0.65 * sin(p) + 0.22 * sin(p * 0.57 + 1.1) + 0.30 * sin(p * 1.9 + 2.3)
              + 0.35 * (fbm(vec2(tb * 2.6 + at * 0.05, 3.0)) - 0.5);  // halved low-freq wander → less drift
      return 0.5 + sweep - 0.06 + wb * m + auroraAntiLinearFold(tb, at);
    }

    float auroraGapX(float tb, float at){
      return 0.05 + 0.07 * tb
           + 0.11 * tb * (0.5 + 0.5 * sin(tb * 2.1 + at * 0.10))
           + 0.07 * tb * fbm(vec2(tb * 1.8 + at * 0.04, 12.0));
    }

    float auroraPathX(float tb, float at, float sweep, float originDelta, float rightSide){
      return auroraCurveX(tb + originDelta * rightSide, at, sweep)
           + auroraGapX(tb, at) * rightSide;
    }

    float auroraPathDxLite(float tb, float at, float originDelta, float rightSide){
      float t = clamp(tb + originDelta * rightSide, 0.0, 1.0);
      float p = t * 6.0 + at * 0.16;
      float m = 0.65 * sin(p) + 0.22 * sin(p * 0.57 + 1.1) + 0.30 * sin(p * 1.9 + 2.3);
      float dm = 0.65 * 6.0 * cos(p)
               + 0.22 * 0.57 * 6.0 * cos(p * 0.57 + 1.1)
               + 0.30 * 1.9 * 6.0 * cos(p * 1.9 + 2.3);
      float dx = 0.16 * m + 0.16 * t * dm;

      float keepNodes = smoothstep(0.010, 0.150, t) * (1.0 - smoothstep(0.78, 1.0, t));
      float ap = t * 14.0 + at * 0.10;
      dx += keepNodes * (0.018 * 14.0 * cos(ap + 0.8) +
                         0.010 * 0.67 * 14.0 * cos(ap * 0.67 + 2.4));

      float q = tb * 2.1 + at * 0.10;
      float gapDx = 0.07
                  + 0.11 * (0.5 + 0.5 * sin(q))
                  + 0.11 * tb * 0.5 * 2.1 * cos(q);
      dx += gapDx * rightSide;
      return dx;
    }

    // PERF: the two curtains share ONE curve. auroraPathX(tb2, …, 1.0) evaluates
    // auroraCurveX at (tb2 + originDelta), and the plane loop's tb1/tb2 differ by
    // exactly originDelta — so both curtains call auroraCurveX with the SAME
    // argument. These split helpers let the loop evaluate the curve (and its
    // derivative) once per sample and add only the cheap gap term for the right
    // curtain. Bit-identical to calling auroraPathX/auroraPathDxLite twice.
    float auroraCurveDxLite(float tb, float at){
      float t = clamp(tb, 0.0, 1.0);
      float p = t * 6.0 + at * 0.16;
      float m = 0.65 * sin(p) + 0.22 * sin(p * 0.57 + 1.1) + 0.30 * sin(p * 1.9 + 2.3);
      float dm = 0.65 * 6.0 * cos(p)
               + 0.22 * 0.57 * 6.0 * cos(p * 0.57 + 1.1)
               + 0.30 * 1.9 * 6.0 * cos(p * 1.9 + 2.3);
      float dx = 0.16 * m + 0.16 * t * dm;
      float keepNodes = smoothstep(0.010, 0.150, t) * (1.0 - smoothstep(0.78, 1.0, t));
      float ap = t * 14.0 + at * 0.10;
      dx += keepNodes * (0.018 * 14.0 * cos(ap + 0.8) +
                         0.010 * 0.67 * 14.0 * cos(ap * 0.67 + 2.4));
      return dx;
    }
    float auroraGapDx(float tb, float at){
      float q = tb * 2.1 + at * 0.10;
      return 0.07
           + 0.11 * (0.5 + 0.5 * sin(q))
           + 0.11 * tb * 0.5 * 2.1 * cos(q);
    }

    vec2 auroraRayBaseInfo(float tb, float at, float sweep, float span, float originDelta,
                           float rightSide, float originY, float x, float x0){
      float e = 0.010;
      float lo = max(0.0, tb - e);
      float hi = min(1.0, tb + e);
      float xLo = auroraPathX(lo, at, sweep, originDelta, rightSide);
      float xHi = auroraPathX(hi, at, sweep, originDelta, rightSide);
      float invSpan = 1.0 / max(hi - lo, 0.001);
      float dxdtRaw = (xHi - xLo) * invSpan;
      float dxdt = abs(dxdtRaw) < 0.010 ? (dxdtRaw < 0.0 ? -0.010 : 0.010) : dxdtRaw;
      float d2x = (xHi - 2.0 * x0 + xLo) / max(e * e, 0.00001);

      float wantDx = x - x0;
      float dt = clamp(wantDx / dxdt, -0.055, 0.055);
      float f = dxdt * dt + 0.5 * d2x * dt * dt - wantDx;
      float fp = dxdt + d2x * dt;
      dt -= f / (abs(fp) < 0.010 ? (fp < 0.0 ? -0.010 : 0.010) : fp);
      dt = clamp(dt, -0.060, 0.060);

      float baseY = originY - clamp(tb + dt, 0.0, 1.0) * span;
      float bendDx = abs(dxdtRaw);
      float bendD2 = abs(d2x);
      float nearVertical = 1.0 - smoothstep(0.045, 0.180, bendDx);
      float tightBend = smoothstep(0.90, 4.80, bendD2);
      float pinch = clamp(max(nearVertical, tightBend * 0.62), 0.0, 1.0);
      return vec2(baseY, mix(1.0, 0.22, pinch));
    }

    float auroraFilamentField(float tb, float planeT, float sheet, float x, float bandX,
                              float at, float pulseAt, float sweep, float originDelta, float side){
      if (tb <= 0.0) return 0.0;
      float depth = smoothstep(0.03, 0.58, tb);
      float laneScale = 82.0 * max(u_aurFilamentDensity, 0.10);
      float laneCoord = x + side * 0.37;
      if (u_aurFilamentTrack > 2.5) {
        float e = 0.010;
        float lo = max(0.0, tb - e);
        float hi = min(1.0, tb + e);
        float xLo = auroraPathX(lo, at, sweep, originDelta, side);
        float xHi = auroraPathX(hi, at, sweep, originDelta, side);
        float dxdtRaw = (xHi - xLo) / max(hi - lo, 0.001);
        float dxdt = abs(dxdtRaw) < 0.012 ? (dxdtRaw < 0.0 ? -0.012 : 0.012) : dxdtRaw;
        float curveT = clamp(tb + (x - bandX) / dxdt, 0.0, 1.0);
        laneCoord = curveT + side * 0.37;
      } else if (u_aurFilamentTrack > 1.5) {
        // Curve-lite keeps the cheap/stable vertical filament field. Earlier this
        // projected the stripe coordinate along the curve, which made filaments
        // bend visibly around the aurora folds.
        laneScale *= mix(1.0, 1.17, side);
        laneCoord = x + side * 0.213;
      } else if (u_aurFilamentTrack > 0.5) {
        laneScale *= mix(1.0, 1.17, side);
        laneCoord = x + side * 0.213;
      }
      float laneWarp = 1.7 * vnoise(vec2(floor(laneCoord * 19.0) + side * 17.0, 66.0));
      float lane = laneCoord * laneScale + laneWarp;
      float cell = floor(lane);
      float local = fract(lane);
      float center = 0.16 + 0.68 * hash(vec2(cell, 24.0 + side * 31.0));
      float width = mix(0.06, 0.21, hash(vec2(cell, 54.0 + side * 17.0))) *
                    max(u_aurFilamentWidth, 0.10);
      float stripe = exp(-sq((local - center) / max(width, 0.025)));

      float ampSeed = hash(vec2(cell, 81.0 + side * 13.0));
      float heightSeed = hash(vec2(cell, 117.0 + side * 19.0));
      float rayH = mix(0.10, 0.48, pow(heightSeed, 1.35)) * mix(0.45, 1.0, depth) *
                   max(u_aurFilamentHeight, 0.10);
      float heightGate = smoothstep(0.025, 0.10, planeT) *
                         (1.0 - smoothstep(rayH * 0.92, rayH * 1.18, planeT));
      float shimmer = 0.55 + 0.45 * sin(pulseAt * mix(0.24, 0.76, ampSeed) +
                                        ampSeed * 6.2831853 + cell * 0.71);
      float amp = mix(0.18, 1.45, pow(ampSeed, 1.50)) *
                  (1.0 + 0.45 * smoothstep(0.82, 0.98, ampSeed));
      float baseBias = 0.74 + 0.44 * (1.0 - smoothstep(0.20, 0.68, planeT));
      return sheet * stripe * heightGate * amp * shimmer * baseBias * u_aurFilamentIntensity;
    }
`;
