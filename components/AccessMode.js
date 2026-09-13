import { createContext, useContext, useMemo, useState } from 'react';
import { accents, liveAccents } from '../theme';

// Two input models, one piece of state. `standard` is touch; `gaze` is the mode
// for someone driving the phone with iOS Eye Tracking and Dwell Control, or
// with a single switch.
//
// The numbers are not taste. A gaze target wants roughly 2° of visual angle:
// at arm's length (~40cm) on this device 1° is about 42pt, so 88pt is a little
// over 2°, and the gap is a full degree so a dwell cannot land between two
// targets. Dwell itself is 600ms, the value that measured highest efficiency
// and lowest task load in the ergonomics work.
//
// `motion: false` in gaze mode is a hard requirement rather than a preference.
// Reduced smooth-pursuit gain and impaired suppression of reflexive saccades
// mean a moving element both cannot be tracked and pulls the eye off target.
export const TOKENS = {
  standard: { target: 48, gap: 12, dwellMs: null, motion: true, ground: '#ECE9F8', accents },
  gaze: { target: 88, gap: 24, dwellMs: 600, motion: false, ground: '#F6F1E8', accents: liveAccents },
};

// Which mode the app starts in. 'gaze' boots straight to the gaze home, which
// is what someone who uses this mode every day wants; 'standard' is touch.
//
// ponytail: a constant rather than storage, because the choice does not vary
// per launch yet. When a care partner needs it to stick after a restart, swap
// this for AsyncStorage and keep the same provider prop.
export const START_MODE = 'standard';

const AccessContext = createContext(null);

export function AccessProvider({ children, initial = START_MODE }) {
  const [mode, setMode] = useState(initial);

  // ponytail: in-memory for now. A care partner sets this once, so it wants to
  // survive a restart — add AsyncStorage when the demo stops being a demo.
  const value = useMemo(
    () => ({
      mode,
      gaze: mode === 'gaze',
      t: TOKENS[mode],
      setMode,
      toggle: () => setMode((m) => (m === 'gaze' ? 'standard' : 'gaze')),
    }),
    [mode]
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

// Safe outside the provider so a screen rendered before it (or in isolation)
// still gets touch defaults rather than throwing.
export function useAccess() {
  return (
    useContext(AccessContext) ?? {
      mode: 'standard',
      gaze: false,
      t: TOKENS.standard,
      setMode: () => {},
      toggle: () => {},
    }
  );
}
