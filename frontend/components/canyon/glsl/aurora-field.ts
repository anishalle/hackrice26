/**
 * The full aurora curtain accumulation for one scene uv (y-down), including the
 * time-of-day window, tonemap and origin taper.
 *
 * This runs only in the offscreen sky pass (half res, ~30Hz); the main pass
 * fetches the stored scalar and applies the per-night colour and halftone dots.
 * It lives in the shared prelude so a future caller can never drift from it.
 */
export const AURORA_FIELD = /* glsl */ `
    float auroraField(vec2 uv){
      float todHr = u_tod * 24.0;
      float aurZ  = max(smoothstep(19.5, 22.5, todHr), 1.0 - smoothstep(2.0, 4.0, todHr));
        float at = u_time * u_aurSpeed;      // aurora's own clock (per-night speed, rolled at sunset)
        float pulseAt = at * 2.8;            // faster brightness flutter, slower spatial drift
        float heightScale = clamp(u_aurHeightScale, 0.5, 5.0);
        float span = 0.66;
        float oySwap   = 0.015 * sin(at * 0.110 + 0.6);
        float oyIndepR = 0.020 * sin(at * 0.130)       + 0.015 * sin(at * 0.071 + 2.1);
        float oyIndepL = 0.020 * sin(at * 0.097 + 1.2) + 0.015 * sin(at * 0.054 + 0.2);
        float originY = u_viewHorizon - clamp(u_aurOriginY, -0.25, 0.25);
        float oy  = originY + oyIndepR - oySwap;
        float oyL = originY + oyIndepL + oySwap;
        float originDelta = (oyL - oy) / span;
        float oyLow = max(oy, oyL);
        float aur = 0.0;
        if (uv.y < oyLow) {
          // Global left/right drift of the whole curtain — kept small (~0.4x) so
          // the aurora stays near centre and out of the canyon walls, while the
          // per-height sine terms below still give it multiple nodes/bends.
          float sweep = 0.014 * sin(at * 0.06) + 0.009 * sin(at * 0.041 + 1.3)
                      + 0.007 * (fbm(vec2(at * 0.03, 21.0)) - 0.5);
          float plane = 0.0;
          float lowerPlane = 0.0;
          float rays = 0.0;
          float filamentField = 0.0;
          float baseSearchMax = 0.34;
          float baseSearchReach = min(baseSearchMax, max(0.0, oyLow - uv.y));
          float searchMax = baseSearchMax * heightScale;
          float searchReach = min(searchMax, max(0.0, oyLow - uv.y));
          float searchNorm = clamp(searchReach / searchMax, 0.0, 1.0);
          float sampleEnergy = searchReach / max(baseSearchReach, 0.001);
          float searchWeight = smoothstep(0.0, 0.12, searchNorm);
          float planeSamples = clamp(u_aurPlaneSamples, 1.0, 56.0);
          float sampleFill = clamp(u_aurSampleFill, 0.0, 1.0);
          float raySamples = clamp(u_aurRaySamples, 0.0, 48.0);
          float fieldMode = 1.0 - smoothstep(0.5, 1.5, raySamples);
          // PERF: loop-invariants lifted out of the 28× plane loop (depend only
          // on frame uniforms / this pixel, not on the sample index k).
          float sampleCellY = searchReach / max(planeSamples, 1.0);
          float cellHalfY = 0.5 * sampleCellY * sampleFill * (1.0 + 0.32 * sampleFill);
          float fillBaseFloor = 0.58 * sampleFill;
          float topGain = clamp(u_aurTopGain, 0.25, 1.0);
          // PERF: skip radius for off-curtain samples. Beyond ~4.3σ of the widest
          // sheet gaussian (sgFill ≤ ~0.035) plus the worst-case xFill drift
          // (|dxdy| · cellHalfY), every term a sample adds is < e⁻⁹ — invisible.
          float skipDist = 0.15 + 2.6 * cellHalfY;
          for (int k = 0; k < 56; k++) {
            if (float(k) >= planeSamples) break;
            float sk = (float(k) + 0.5) / planeSamples;
            float yb = uv.y + searchReach * sk;
            float tb1 = (oyL - yb) / span;
            float tb2 = (oy  - yb) / span;
            // PERF: tb1 == tb2 + originDelta, so both curtains share one curve
            // evaluation (see auroraCurveDxLite) — only the gap term differs.
            float curveX = auroraCurveX(tb1, at, sweep);
            float b1 = curveX;
            float b2 = curveX + auroraGapX(tb2, at);
            float d1 = abs(uv.x - b1);
            float d2 = abs(uv.x - b2);
            // PERF: this pixel column is far from BOTH curtains at this sample
            // height — all of the taper/noise/filament math below scales by the
            // sheet gaussians, so the whole tail can be skipped.
            if (min(d1, d2) > skipDist) continue;
            float sgCore1 = 0.013 * (0.15 + 0.95 * tb1);
            float sgCore2 = 0.013 * (0.15 + 0.95 * tb2);
            float sheetCore1 = (tb1 > 0.0) ? exp(-d1 * d1 / (2.0 * sgCore1 * sgCore1)) : 0.0;
            float sheetCore2 = (tb2 > 0.0) ? exp(-d2 * d2 / (2.0 * sgCore2 * sgCore2)) : 0.0;

            float centerHeight = mix(0.048, 0.120, smoothstep(0.03, 0.56, tb2)) * heightScale;
            float centerPlaneT = max(0.0, yb - uv.y) / max(centerHeight, 0.001);
            float originDamp = mix(0.24, 1.0, smoothstep(0.0, 0.20, max(tb1, tb2)));

            float dCurve = auroraCurveDxLite(tb1, at);   // shared curve slope (see above)
            float dxdy1 = -dCurve / span;
            float dxdy2 = -(dCurve + auroraGapDx(tb2, at)) / span;
            float shift1 = (abs(dxdy1) > 0.002) ? clamp((uv.x - b1) / dxdy1, -cellHalfY, cellHalfY) : 0.0;
            float shift2 = (abs(dxdy2) > 0.002) ? clamp((uv.x - b2) / dxdy2, -cellHalfY, cellHalfY) : 0.0;
            float srcY1 = clamp(yb + shift1, uv.y, oyL);
            float srcY2 = clamp(yb + shift2, uv.y, oy);
            float cellTb1 = (oyL - srcY1) / span;
            float cellTb2 = (oy - srcY2) / span;
            float xFill1 = b1 + dxdy1 * (srcY1 - yb);
            float xFill2 = b2 + dxdy2 * (srcY2 - yb);
            float sweepFill1 = min(abs(dxdy1) * cellHalfY * 0.42, 0.030);
            float sweepFill2 = min(abs(dxdy2) * cellHalfY * 0.42, 0.030);
            float sgFill1 = sqrt(sgCore1 * sgCore1 + sweepFill1 * sweepFill1);
            float sgFill2 = sqrt(sgCore2 * sgCore2 + sweepFill2 * sweepFill2);
            float sheet1 = step(0.0, cellTb1) *
                           exp(-sq(uv.x - xFill1) / (2.0 * sgFill1 * sgFill1));
            float sheet2 = step(0.0, cellTb2) *
                           exp(-sq(uv.x - xFill2) / (2.0 * sgFill2 * sgFill2));
            float planeHeight1 = mix(0.048, 0.120, smoothstep(0.03, 0.56, cellTb1)) * heightScale;
            float planeHeight2 = mix(0.048, 0.120, smoothstep(0.03, 0.56, cellTb2)) * heightScale;
            float planeT1 = max(0.0, srcY1 - uv.y) / max(planeHeight1, 0.001);
            float planeT2 = max(0.0, srcY2 - uv.y) / max(planeHeight2, 0.001);
            float bottomTaper1 = max(smoothstep(0.025, 0.12, planeT1), fillBaseFloor);
            float bottomTaper2 = max(smoothstep(0.025, 0.12, planeT2), fillBaseFloor);
            float topTaper1 = 1.0 - smoothstep(0.94, 1.34, planeT1);
            float topTaper2 = 1.0 - smoothstep(0.94, 1.34, planeT2);
            float crest1 = exp(-sq((planeT1 - 0.18) / 0.24));
            float crest2 = exp(-sq((planeT2 - 0.18) / 0.24));
            float midShelf1 = smoothstep(0.22, 0.36, planeT1) * (1.0 - smoothstep(0.78, 1.12, planeT1));
            float midShelf2 = smoothstep(0.22, 0.36, planeT2) * (1.0 - smoothstep(0.78, 1.12, planeT2));
            float planeGradient1 = 0.44 + 2.10 * crest1 + 0.95 * midShelf1;
            float planeGradient2 = 0.44 + 2.10 * crest2 + 0.95 * midShelf2;
            float upperScale1 = mix(1.0, topGain, smoothstep(0.52, 1.10, planeT1));
            float upperScale2 = mix(1.0, topGain, smoothstep(0.52, 1.10, planeT2));
            float fall1 = exp(-planeT1 * 0.42) * bottomTaper1 * topTaper1;
            float fall2 = exp(-planeT2 * 0.42) * bottomTaper2 * topTaper2;
            plane += (sheet1 * fall1 * planeGradient1 * upperScale1 + sheet2 * fall2 * planeGradient2 * upperScale2) *
                     0.25 * searchWeight * originDamp * sampleEnergy;

            float lowerH1 = mix(0.15, 0.40, vnoise(vec2(cellTb1 * 9.5 + at * 0.09, 41.0)));
            float lowerH2 = mix(0.15, 0.40, vnoise(vec2(cellTb2 * 9.5 + at * 0.08 + 5.7, 73.0)));
            float lowerGate1 = smoothstep(0.018, 0.080, planeT1) *
                               (1.0 - smoothstep(lowerH1 * 0.82, lowerH1 * 1.18, planeT1));
            float lowerGate2 = smoothstep(0.018, 0.080, planeT2) *
                               (1.0 - smoothstep(lowerH2 * 0.82, lowerH2 * 1.18, planeT2));
            float patch1 = fbm(vec2(cellTb1 * 13.0 + at * 0.18, uv.x * 2.1 + 18.0));
            float patch2 = fbm(vec2(cellTb2 * 13.0 + at * 0.16 + 3.4, uv.x * 2.1 + 29.0));
            float flicker1 = 0.72 + 0.28 * sin(pulseAt * (0.22 + patch1 * 0.30) + patch1 * 6.2831853);
            float flicker2 = 0.72 + 0.28 * sin(pulseAt * (0.20 + patch2 * 0.30) + patch2 * 6.2831853 + 1.2);
            float local1 = mix(0.28, 1.58, pow(patch1, 1.55)) * flicker1;
            float local2 = mix(0.28, 1.58, pow(patch2, 1.55)) * flicker2;
            lowerPlane += (sheet1 * lowerGate1 * local1 + sheet2 * lowerGate2 * local2) *
                          0.16 * searchWeight * originDamp * sampleEnergy;
            filamentField += fieldMode * searchWeight * originDamp * (
              auroraFilamentField(tb1, centerPlaneT, sheetCore1, uv.x, b1, at, pulseAt, sweep, originDelta, 0.0) +
              auroraFilamentField(tb2, centerPlaneT, sheetCore2, uv.x, b2, at, pulseAt, sweep, originDelta, 1.0)
            ) * 0.20 * sampleEnergy;
          }

          float raySampleDenom = max(raySamples, 1.0);
          for (int r = 0; r < 48; r++) {
            if (float(r) >= raySamples) break;
            float ri = float(r);
            float seedA = hash(vec2(ri, 18.4));
            float seedB = hash(vec2(ri, 72.9));
            float jitterA = (seedA - 0.5) * 1.18 + (hash(vec2(ri, 104.2)) - 0.5) * 0.42;
            float jitterB = (seedB - 0.5) * 1.18 + (hash(vec2(ri, 144.7)) - 0.5) * 0.42;
            float srcTb1 = 0.97 * fract((ri + 0.5 + jitterA) / raySampleDenom);
            float srcTb2 = 0.97 * fract((ri + 0.5 + jitterB) / raySampleDenom + 0.47);
            float srcX1 = auroraPathX(srcTb1, at, sweep, originDelta, 0.0);
            float srcX2 = auroraPathX(srcTb2, at, sweep, originDelta, 1.0);
            vec2 baseInfo1 = auroraRayBaseInfo(srcTb1, at, sweep, span, originDelta, 0.0, oyL, uv.x, srcX1);
            vec2 baseInfo2 = auroraRayBaseInfo(srcTb2, at, sweep, span, originDelta, 1.0, oy,  uv.x, srcX2);
            float drop1 = max(0.0, baseInfo1.x - uv.y);
            float drop2 = max(0.0, baseInfo2.x - uv.y);
            float lenSeed1 = hash(vec2(ri, 31.7));
            float lenSeed2 = hash(vec2(ri, 52.6));
            float widthSeed1 = hash(vec2(ri, 203.4));
            float widthSeed2 = hash(vec2(ri, 261.8));
            float brightSeed1 = hash(vec2(ri, 318.2));
            float brightSeed2 = hash(vec2(ri, 377.6));
            float rayDepth1 = smoothstep(0.04, 0.58, srcTb1);
            float rayDepth2 = smoothstep(0.04, 0.58, srcTb2);
            float len1 = mix(0.040, 0.240, clamp(srcTb1, 0.0, 1.0)) * heightScale * mix(0.46, 0.96, pow(lenSeed1, 1.25));
            float len2 = mix(0.040, 0.240, clamp(srcTb2, 0.0, 1.0)) * heightScale * mix(0.46, 0.96, pow(lenSeed2, 1.25));
            float rawT1 = drop1 / max(len1, 0.001);
            float rawT2 = drop2 / max(len2, 0.001);
            float tailT1 = clamp(rawT1, 0.0, 1.0);
            float tailT2 = clamp(rawT2, 0.0, 1.0);
            float upperRamp1 = smoothstep(0.12, 0.92, tailT1);
            float upperRamp2 = smoothstep(0.12, 0.92, tailT2);
            float baseHot1 = 1.0 - smoothstep(0.26, 0.62, tailT1);
            float baseHot2 = 1.0 - smoothstep(0.26, 0.62, tailT2);
            float rayShape1 = smoothstep(0.025, 0.14, rawT1) * (1.0 - smoothstep(1.02, 1.28, rawT1));
            float rayShape2 = smoothstep(0.025, 0.14, rawT2) * (1.0 - smoothstep(1.02, 1.28, rawT2));
            float yRay1 = rayShape1 * mix(1.05, 0.60, upperRamp1);
            float yRay2 = rayShape2 * mix(1.05, 0.60, upperRamp2);
            float bendWidth1 = baseInfo1.y;
            float bendWidth2 = baseInfo2.y;
            float bendFade1 = mix(0.38, 1.0, smoothstep(0.24, 0.76, bendWidth1));
            float bendFade2 = mix(0.38, 1.0, smoothstep(0.24, 0.76, bendWidth2));
            float xWidth1 = mix(0.0026, 0.0060, pow(widthSeed1, 1.55)) * mix(0.40, 1.0, rayDepth1) * bendWidth1;
            float xWidth2 = mix(0.0026, 0.0060, pow(widthSeed2, 1.55)) * mix(0.40, 1.0, rayDepth2) * bendWidth2;
            float xRay1 = exp(-sq((uv.x - srcX1) / xWidth1));
            float xRay2 = exp(-sq((uv.x - srcX2) / xWidth2));
            float fade1 = mix(0.20, 1.0, smoothstep(0.0, 0.24, srcTb1)) * (1.0 - smoothstep(1.05, 1.32, srcTb1));
            float fade2 = mix(0.20, 1.0, smoothstep(0.0, 0.24, srcTb2)) * (1.0 - smoothstep(1.05, 1.32, srcTb2));
            float wave1 = 0.5 + 0.5 * sin(pulseAt * (0.22 + seedA * 0.36) + seedA * 6.2831853 + ri * 0.43);
            float wave2 = 0.5 + 0.5 * sin(pulseAt * (0.20 + seedB * 0.34) + seedB * 6.2831853 + ri * 0.39 + 1.7);
            float pulse1 = mix(0.16, 1.42, pow(wave1, 1.35));
            float pulse2 = mix(0.16, 1.42, pow(wave2, 1.35));
            float amp1 = mix(0.08, 1.20, pow(brightSeed1, 1.70));
            float amp2 = mix(0.08, 1.20, pow(brightSeed2, 1.70));
            amp1 *= 1.0 + 0.70 * smoothstep(0.78, 0.96, seedA);
            amp2 *= 1.0 + 0.70 * smoothstep(0.78, 0.96, seedB);
            float tailBoost1 = mix(0.95, 1.12 + 0.18 * hash(vec2(ri, 519.8)), baseHot1);
            float tailBoost2 = mix(0.95, 1.12 + 0.18 * hash(vec2(ri, 563.1)), baseHot2);
            rays += xRay1 * yRay1 * fade1 * pulse1 * amp1 * tailBoost1 * bendFade1;
            rays += xRay2 * yRay2 * fade2 * pulse2 * amp2 * tailBoost2 * bendFade2;
          }
          plane = 1.0 - exp(-plane * 0.23);
          lowerPlane = 1.0 - exp(-lowerPlane * 0.44);
          rays = 1.0 - exp(-rays * 0.40);
          filamentField = 1.0 - exp(-filamentField * 0.44);
          aur = 0.62 * plane + 0.30 * mix(rays, filamentField, fieldMode) + 0.34 * lowerPlane;
        }
        aur = clamp(aurZ * aur, 0.0, 1.0);
        float originDistance = max(0.0, oyLow - uv.y);
        float originTaper = clamp(u_aurOriginTaper, 0.5, 4.0);
        float originRamp = pow(smoothstep(0.030, 0.280, originDistance), originTaper);
        float originFloor = mix(0.32, 0.16, smoothstep(1.0, 4.0, originTaper));
        float originScale = mix(originFloor, 1.0, originRamp);
        aur *= originScale;
        return aur;
    }
`;
