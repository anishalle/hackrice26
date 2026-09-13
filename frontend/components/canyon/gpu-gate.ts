/**
 * Upfront perf gate, from river.ai's hero script.
 *
 * This must run BEFORE the expensive scene shader is compiled and linked. Weak
 * mobile and Windows GPUs can freeze the browser just compiling the main
 * fragment shader, even if we would later decide to show the static fallback.
 *
 * Two layers. `perfVetoReason` is a cheap synchronous blocklist read off the
 * WebGL renderer string plus device hints — software rasterisers, known
 * low-end Intel/Adreno parts, thin ChromeOS boxes. `detectGpuTier` then asks
 * @pmndrs/detect-gpu for a benchmarked tier.
 *
 * detect-gpu's tier is authoritative whenever it could actually classify the
 * GPU: a real BENCHMARK match, a FALLBACK default for a recognised-but-
 * unbenchmarked part, or a blocklist verdict. The one case we don't trust is a
 * transient benchmark-DB fetch failure — that is a network race on a cold first
 * visit, not a device verdict, so we fall back to our own veto rather than
 * demoting a capable device. (That misread was what forced iPhones to the
 * static hero on the first load only.)
 */

export const DETECT_GPU_URL = "https://esm.sh/@pmndrs/detect-gpu?bundle";
export const DETECT_GPU_MIN_TIER = 3; // 0..3; only top-tier GPUs run the live hero.

export type GpuTier = {
  tier?: number;
  fps?: number;
  type?: string;
  gpu?: string;
  total: number;
};

function webglRendererString(gl: WebGLRenderingContext) {
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)).toLowerCase() : "";
  } catch {
    return "";
  }
}

export function perfVetoReason(gl: WebGLRenderingContext): string | null {
  const renderer = webglRendererString(gl);
  if (/swiftshader|llvmpipe|software|basic render|mesa offscreen/.test(renderer)) {
    return "software-gl:" + renderer;
  }
  if (/intel.*\b(hd|uhd) graphics (400|405|500|505|510|515|600|605|610|615)\b/.test(renderer)) {
    return "low-end-intel:" + renderer;
  }
  if (/\badreno (3\d\d|4\d\d|5\d\d|61[0-8])\b/.test(renderer)) {
    return "low-end-adreno:" + renderer;
  }

  const ua = navigator.userAgent || "";
  const isChromeOS = /\bCrOS\b/i.test(ua);
  const mem = Number((navigator as { deviceMemory?: number }).deviceMemory || 0); // Chromium only; 0 = unknown
  const cores = Number(navigator.hardwareConcurrency || 0); // 0 = unknown
  if (isChromeOS && ((mem && mem < 8) || (cores && cores < 8))) {
    return "low-resource-chromeos:" + (mem || "?") + "gb/" + (cores || "?") + "cores";
  }
  if (mem && mem <= 2) return "low-mem:" + mem + "gb";
  return null;
}

export function gpuTierGoodEnough(gpu: GpuTier | null) {
  const tier = Number(gpu && gpu.tier);
  return Number.isFinite(tier) && tier >= DETECT_GPU_MIN_TIER;
}

export function gpuTierMessage(gpu: GpuTier | null, live: boolean) {
  return (
    "[river] detect-gpu " +
    (gpu
      ? "tier " +
        gpu.tier +
        (typeof gpu.fps === "number" ? ", fps " + Math.round(gpu.fps) : "") +
        (gpu.type ? ", " + gpu.type : "") +
        (gpu.gpu ? ", " + gpu.gpu : "") +
        " (" + gpu.total.toFixed(0) + "ms)"
      : "failed") +
    "  ->  " +
    (live ? "LIVE" : "STATIC")
  );
}

export async function detectGpuTier(gl: WebGLRenderingContext): Promise<GpuTier> {
  const t0 = performance.now();
  const mod = await import(/* webpackIgnore: true */ DETECT_GPU_URL);
  const opts = { failIfMajorPerformanceCaveat: true, glContext: gl };
  let gpu = await mod.getGPUTier(opts);
  // detect-gpu matches against a benchmark DB fetched from a CDN at runtime.
  // On a cold load that fetch can lose the race / fail (BENCHMARK_FETCH_FAILED),
  // which would wrongly demote a capable device on the FIRST visit only. It's
  // documented as safe to retry, so give it one more shot.
  if (gpu && gpu.type === "BENCHMARK_FETCH_FAILED") {
    gpu = await mod.getGPUTier(opts);
  }
  gpu.total = performance.now() - t0;
  return gpu as GpuTier;
}

/** Resolves true when the live WebGL hero should run. */
export async function liveHeroAllowed(
  gl: WebGLRenderingContext,
  force: { live: boolean; static: boolean },
): Promise<boolean> {
  try {
    if (force.live) {
      console.info("[river] forced live hero");
      return true;
    }
    if (force.static) {
      console.info("[river] forced static fallback");
      return false;
    }
    const veto = perfVetoReason(gl);
    if (veto) {
      console.info("[river] perf veto " + veto + "  ->  STATIC");
      return false;
    }
    const gpuTier = await detectGpuTier(gl);
    const postDetectVeto = perfVetoReason(gl);
    const fetchFailed = gpuTier && gpuTier.type === "BENCHMARK_FETCH_FAILED";
    const allowed = !postDetectVeto && (fetchFailed ? true : gpuTierGoodEnough(gpuTier));
    console.info(
      gpuTierMessage(gpuTier, allowed) +
        (postDetectVeto ? " veto:" + postDetectVeto : "") +
        (fetchFailed ? " (DB fetch failed → veto-gated)" : ""),
    );
    return allowed;
  } catch (e) {
    // The detect-gpu module itself failed to load (CDN/network — most likely on
    // a cold first visit). Fall back to our perf veto rather than defaulting
    // everyone to the static hero.
    console.warn("[river] detect-gpu failed; falling back to perf veto", e);
    return force.static ? false : !perfVetoReason(gl);
  }
}
