/**
 * Baked value-noise LUT, ported from river.ai's hero script.
 *
 * 256², RGBA. R is a 256-periodic random grid — hardware bilinear filtering
 * reconstructs 2D value noise from it in a single fetch, replacing the four
 * hash chains and manual smoothstep blend the procedural path needs. G is the
 * same grid shifted by (37,17), so it doubles as the z+1 slice for the IQ-style
 * 3D lookup: one texture read plus one lerp instead of eight hashes and seven
 * mixes. That noise is the dominant ALU cost of the cloud, aurora and god-ray
 * passes, so this is the single biggest win in the frame.
 *
 * Seeded with a fixed xorshift32, so the grain is identical on every load.
 *
 * The script also bakes a 512² terrain heightfield, but it is dead in the live
 * path: the only readers are `terrainInk()` and `field()`, both of which are
 * reachable only from the `#if 0` block in the original's `main()`. The canyon
 * geometry comes from the analytic `vH()`/`vCenter()` in the valley shader, not
 * from a sampled texture, so it is not ported here.
 */

export type BakedTexture = { size: number; data: Uint8Array };

export function buildNoiseTexture(size: number): BakedTexture {
  const N = size;
  const base = new Float32Array(N * N);
  let s = 0x9e3779b9 >>> 0; // deterministic xorshift32 so the look is stable
  const rnd = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = 0; i < N * N; i++) base[i] = rnd();
  const data = new Uint8Array(N * N * 4);
  const mask = N - 1; // N is a power of two → cheap wrap
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const idx = y * N + x;
      const g = base[((y + 17) & mask) * N + ((x + 37) & mask)];
      data[idx * 4 + 0] = (base[idx] * 255) | 0;
      data[idx * 4 + 1] = (g * 255) | 0;
      data[idx * 4 + 2] = 0;
      data[idx * 4 + 3] = 255;
    }
  }
  return { size: N, data };
}
