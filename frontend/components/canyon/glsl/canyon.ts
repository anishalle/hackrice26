/**
 * The in-valley canyon: heightfield, adaptive march caps, and the coverage
 * helpers the silhouette anti-aliasing is built on. From river.ai's FS_COMMON.
 *
 * A perspective camera flies along a winding valley; walls rise on both sides
 * and converge on a warm glow at the vanishing point. The meander is one gentle
 * harmonic — two put visible wiggles in the ridge line — wrapped to its own
 * spatial period so sin() stays precise over a long session, and the wrap is
 * seamless because the harmonic shares that period.
 */
export const CANYON = /* glsl */ `
    float vCenter(float z){
      float zz = mod(z, 69.813170);
      return 2.0 * sin(zz * 0.09 + 0.4);
    }
    // Pure smooth wall profile — clean gradient slopes like the reference, no
    // bumps/flutes on the silhouette. Only the gentle meander varies it.
    float canyonDepth(){
      return clamp(u_canyonDepth, 0.35, 2.20);
    }
    // PERF A/B (u_hoist): canyonMaxH/lowCanyon are constant for the whole frame
    // yet are read every march step and inside every vH(). With u_hoist on we
    // compute them once at the top of renderValley() and read the cached globals
    // here; with it off they recompute each call (the original behaviour) so the
    // FPS delta is measurable from the debug menu.
    float gCanyonMaxH = 0.0, gLowCanyon = 0.0;
    // PERF: the march-cap math below is re-evaluated on EVERY march step (148×
    // per ray, ×9 on AA edges) but several terms depend only on frame uniforms.
    // We cache those once per frame in renderValley() and read them here, so each
    // step does only the genuinely t/gap-dependent smoothsteps. Bit-identical.
    float gNearCap = 0.0, gLocalCapBase = 0.0, gStepScale = 1.0;
    float canyonMaxHCalc(){ return 16.0 * canyonDepth(); }
    float lowCanyonCalc(){ return 1.0 - smoothstep(0.35, 1.0, canyonDepth()); }
    float canyonMaxH(){ return (u_hoist > 0.5) ? gCanyonMaxH : canyonMaxHCalc(); }
    float lowCanyon(){ return (u_hoist > 0.5) ? gLowCanyon : lowCanyonCalc(); }
    float marchCap(float t){
      // Low canyon values need finer foreground steps to avoid ridge scallops,
      // but the far march must recover quickly so the river still reaches the
      // same vanishing point instead of shortening with the height slider.
      return mix(gNearCap, 0.8, smoothstep(6.0, 16.0, t));
    }
    float nearSurfaceMarchCap(float t, float gap){
      float cap = marchCap(t);
      // The remaining low-height scallop comes from grazing rays crossing the
      // wall in chunky depth steps. Shrink the step only while the ray is close
      // to the foreground/midground heightfield; sky/open-space and the far
      // horizon keep the normal cap so the valley mouth does not shorten.
      float nearSurface = smoothstep(2.2, 0.02, gap);
      float foreground = 1.0 - smoothstep(18.0, 34.0, t);
      // A lighter mid-distance clamp catches the second layered rim without
      // pulling the valley mouth/horizon forward like the original foreground
      // clamp did when it ran too far.
      float secondRim = smoothstep(20.0, 34.0, t) * (1.0 - smoothstep(34.0, 58.0, t)) * gLowCanyon * 0.42;
      float localCap = gLocalCapBase + max(gap, 0.0) * 0.12;
      float secondCap = min(cap, localCap * 1.65);
      float baseCap = mix(cap, min(cap, localCap), nearSurface * foreground);
      return mix(baseCap, min(baseCap, secondCap), nearSurface * secondRim) * gStepScale;
    }
    float vH(float x, float z){
      float d = abs(x - vCenter(z));
      return canyonMaxH() * smoothstep(2.6, 6.6, d);   // wider flat bed before the walls rise
    }
    float missCoverage(float minGap, float feather){
      if (feather <= 0.0001) return 0.0;
      return 1.0 - smoothstep(0.0, feather, minGap);
    }
    float signedCoverage(float mn, float feather){
      if (feather <= 0.0001) return (mn < 0.0) ? 1.0 : 0.0;
      return 1.0 - smoothstep(-feather, feather, mn);
    }
    // Build the valley view ray for a (possibly offset) screen uv.
    vec3 valleyRay(vec2 uvp, float asp, float fx){
      float sx  = (uvp.x - 0.5) * 2.0 * fx * asp;
      float sy  = (u_viewHorizon - uvp.y) * 2.0 * fx;  // uv is y-down
      float cpi = cos(0.0), spi = sin(0.0);            // centered active horizon
      return normalize(vec3(sx, sy * cpi - spi, sy * spi + cpi));
    }
    vec3 yawValleyRay(vec2 uvp, float asp, float fx, float yaw){
      vec3 r = valleyRay(uvp, asp, fx);
      float cyw = cos(yaw), syw = sin(yaw);
      return vec3(cyw * r.x + syw * r.z, r.y, cyw * r.z - syw * r.x);
    }
    // Coverage-only silhouette test for ONE ray: 1.0 solid, feathered at the
    // grazing rim, 0.0 sky. Same march + parabolic minGap refine as the main
    // pass, but no binary search / shading — cheap enough to supersample.
    // tc = the MAIN ray's grazing/hit distance. A sub-pixel offset ray crosses
    // the silhouette within a hair of there, so we only march a tight window
    // around tc instead of the whole ray (0.4 → far). The coverage result is
    // identical to a full march — we just skip the empty near/far span that the
    // main pass already proved holds no closer wall, cutting AA-edge cost ~3-5×.
    const float AA_WIN = 7.0;
    float wallCoverage(vec3 ro, vec3 dir, float camZ, float feather, float tc){
      float tStop = tc + AA_WIN;
      float t = max(0.4, tc - AA_WIN), stp = 0.30, tHit = -1.0;
      float minGap = 1.0e9, minGapT = 0.0;
      for (int k = 0; k < 240; k++){
        if (float(k) >= u_canyonMaxSteps) break;
        if (t > tStop) break;
        vec3 p = ro + dir * t;
        float gapNow = 1.0e6;
        if (p.y > canyonMaxH() + 0.5 && dir.y >= 0.0) break;
        if (p.z > camZ + 0.05){
          float gap = p.y - vH(p.x, p.z);
          gapNow = gap;
          if (gap < minGap){ minGap = gap; minGapT = t; }
          if (gap < 0.0){ tHit = t; break; }
        }
        stp = min(stp * 1.045, nearSurfaceMarchCap(t, gapNow)); t += stp;
      }
      if (tHit >= 0.0) return 1.0;
      if (minGap < 1.0e8){
        float h  = 0.18;
        vec3  pa = ro + dir * (minGapT - h);
        vec3  pb = ro + dir *  minGapT;
        vec3  pc = ro + dir * (minGapT + h);
        float ga = pa.y - vH(pa.x, pa.z);
        float gb = pb.y - vH(pb.x, pb.z);
        float gc = pc.y - vH(pc.x, pc.z);
        float den = ga - 2.0 * gb + gc;
        if (den > 1.0e-4){ float d = ga - gc; minGap = max(gb - (d * d) / (8.0 * den), 0.0); }
      }
      return missCoverage(minGap, feather);
    }
    // Signed-distance coverage: track the MIN of (p.y − vH) over the whole ray
    // — deeply negative inside the wall, ~0 at the silhouette, positive in sky.
    // A single continuous field, feathered by ±feather → comb-free analytic AA.
    float wallCoverageSDF(vec3 ro, vec3 dir, float camZ, float feather){
      float t = 0.4, stp = 0.30, mn = 1.0e9;
      for (int k = 0; k < 240; k++){
        if (float(k) >= u_canyonMaxSteps) break;
        vec3 p = ro + dir * t;
        float gapNow = 1.0e6;
        if (p.y > canyonMaxH() + 0.5 && dir.y >= 0.0) break;
        if (p.z > camZ + 0.05){
          float gap = p.y - vH(p.x, p.z);
          gapNow = gap;
          mn = min(mn, gap);
          if (gap < -3.0) break;                  // deep inside → certainly solid
        }
        stp = min(stp * 1.045, nearSurfaceMarchCap(t, gapNow)); t += stp;
      }
      return signedCoverage(mn, feather);
    }
    float canyonSunShadow(vec3 p, vec3 lightDir, float lowSun){
      float reach = mix(0.70, 2.20, lowSun);
      float shadow = 0.0;
      for (int i = 1; i <= 6; i++){
        float fi = float(i);
        vec3 q = p + lightDir * reach * fi;
        float clearance = q.y - vH(q.x, q.z);
        float block = 1.0 - smoothstep(-0.45, 0.95, clearance);
        shadow = max(shadow, block * (1.0 - fi * 0.105));
      }
      return clamp(shadow, 0.0, 1.0);
    }
`;
