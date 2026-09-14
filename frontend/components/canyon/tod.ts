/**
 * The day cycle, from river.ai's hero script.
 *
 * Time advances through a FULL day — sunrise, daytime, sunset, night all
 * happen — but a monotonic warp lingers on the dawn and dusk golden hours and
 * moves quickest across midnight and noon. Combined with the lifted night floor
 * and the softened midday in the grade, every moment stays cinematic.
 *
 * Aurora colour is chosen once per night and latched at sunset (minute 1080),
 * so it stays constant for the whole dark window and can never flip mid-aurora.
 * It simply alternates every night; the first colour shown on a given page load
 * is picked at random. Drift speed is rolled from the same night index.
 */

export const TOD_CYCLE_MS = 90000; // one full (warped) day ~90s
export const TOD_DWELL = 0.6; // dawn/dusk dwell strength (0..<1)

/**
 * Manual nudge. river.ai solves for the start minute whose first sunset lands
 * half-set over the river's vanishing point; the solver's result is then shifted
 * by hand so the canyon heading clears the walls at that moment. 08:30 is the
 * value the shipped page uses, so it is carried directly rather than re-solved.
 */
export const TOD_START_MIN = 510; // 08:30

// Matches the sandbox default: global speed 0.30 × aurora 4.6 = 1.38.
const AUR_SPEEDS = [1.38, 1.38, 1.38, 1.38];

export class TimeOfDay {
  /** 0 = green, 1 = violet. */
  hue = 0;
  speed = 1;
  private auroraStart = Math.random() < 0.5 ? 0 : 1; // random first colour at load
  private baseMin = TOD_START_MIN; // linear, unwarped minute at startTs
  private startTs = -1; // set from the rAF clock on the first frame
  private rate: number;

  constructor(rate = 1) {
    this.rate = rate;
  }

  private nightHue(nightIndex: number) {
    const parity = ((nightIndex % 2) + 2) % 2; // 0,1,0,1 … (handles negatives)
    return parity ^ this.auroraStart ? 1 : 0;
  }

  private nightSpeed(nightIndex: number) {
    const r = Math.abs(Math.sin(nightIndex * 91.73 + 13.13) * 43758.5453);
    return AUR_SPEEDS[Math.floor((r - Math.floor(r)) * 4) & 3];
  }

  /** Linear phase 0..1 → the monotonic dwell warp. */
  static warp(pl: number) {
    const pw = pl + (TOD_DWELL / (4 * Math.PI)) * Math.sin(4 * Math.PI * pl);
    return ((pw % 1) + 1) % 1;
  }

  /** Advance to the rAF timestamp and return u_tod in 0..1. */
  frac(ts: number) {
    if (this.startTs < 0) this.startTs = ts;
    const adv = (ts - this.startTs) * (1440 / TOD_CYCLE_MS) * this.rate;
    const linearMin = this.baseMin + adv;
    // The night index advances at sunset (1080) so the latched colour spans the
    // entire dark window (sunset → midnight → sunrise) without changing.
    const nightIndex = Math.floor((linearMin - 1080) / 1440);
    this.hue = this.nightHue(nightIndex);
    this.speed = this.nightSpeed(nightIndex);
    const pl = (((linearMin % 1440) + 1440) % 1440) / 1440;
    return TimeOfDay.warp(pl);
  }
}
