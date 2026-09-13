import { AnimatedBlobatar } from '@blobatar/react-native/animated';
import { useEffect, useState } from 'react';
import { idle, thinking, happy, sleepy, smug } from 'blobatar/expression';
import { accents } from '../theme';

// Axl's face. Blobatar seeds, pinned round so he matches the community blobs
// rather than sitting apart from them.
//
// AnimatedBlobatar over MorphingBlobatar: it keeps the expression morph and
// adds blobatar's idle layer on top: breathe, bob, blink, glance, and the
// seesaw that belongs to `thinking`. Those loops run on the UI thread via
// Reanimated, so a blob per message costs no React renders. The community
// avatars stay still on purpose; four idling faces in a list is noise.
export const AXL_SEED = 'sarahw';
export const AXL_HERO_SEED = 'mara';

// Trait overrides are positions in [0,1) inside blobatar's own ranges.
//
// `eye.ratio` and `eye.rx` size both eyes; `eye.scale` and `eye.stretch` only
// touch the second one, which is what makes the pair uneven by default. So the
// eyes get long through ratio/rx, `eye.scale` is tuned to the value that lands
// the second eye on the first's height, and `eye.lean` is straightened: a
// tilted capsule has a wider, shorter bounding box, which is what made them
// read short and fat. Measured, not guessed: 6.6 x 21 against a 100-unit
// viewBox, h/w 3.2.
const FACE = {
  shape: 0.05,
  'eye.ratio': 1,
  'eye.rx': 1,
  'eye.scale': 0.85,
  'eye.stretch': 0,
  'eye.lean': 0.5,
  'eye.dy': 0.5,
  'eye.lean2': 0.5,
};

// The seed picks the silhouette; the head colour is pinned so Axl is the same
// blue whichever of the two shapes he is wearing.
const PALETTE = { head: accents.blue };

// A blink on a timer, for the one blob whose idle layer is switched off.
// blobatar's `amp` (which scales the saccade and the blink together) is not
// exposed through the adapter, so the choice is the whole idle layer or none,
// and the glance is what fights the tilt. `sleepy` closes the lids, so a short
// hold of it reads as a blink.
const BLINK_MIN = 2600;
const BLINK_MAX = 6200;
const BLINK_HOLD = 130;

function useBlink(enabled) {
  const [shut, setShut] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let open;
    let close;
    const schedule = () => {
      close = setTimeout(() => {
        setShut(true);
        open = setTimeout(() => {
          setShut(false);
          schedule();
        }, BLINK_HOLD);
      }, BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN));
    };
    schedule();
    return () => {
      clearTimeout(close);
      clearTimeout(open);
    };
  }, [enabled]);

  return shut;
}

// He narrows his eyes the moment a prompt lands, then settles into the
// thinking rock while he works.
const STAGE_EXPRESSION = {
  loading: smug,
  thinking: thinking,
  streaming: happy,
  done: happy,
};

export default function AgentBlob({ seed = AXL_SEED, size = 40, stage, animate = true }) {
  const shut = useBlink(!animate);
  const pose = shut ? sleepy : STAGE_EXPRESSION[stage] ?? idle;

  return (
    <AnimatedBlobatar
      name={seed}
      size={size}
      traits={FACE}
      palette={PALETTE}
      expression={pose}
      animate={animate}
      title="Axl"
    />
  );
}
