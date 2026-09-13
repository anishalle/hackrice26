import { AnimatedBlobatar } from '@blobatar/react-native/animated';
import { useEffect, useState } from 'react';
import { idle, thinking, happy, sleepy, smug, poseVars, bakePose } from 'blobatar/expression';
import { accents, colors } from '../theme';

// Axl's face. Blobatar seeds, pinned round so he matches the community blobs
// rather than sitting apart from them.
//
// AnimatedBlobatar over MorphingBlobatar: it keeps the expression morph and
// adds blobatar's idle layer on top: breathe, bob, blink, glance, and the
// seesaw that belongs to `thinking`. Those loops run on the UI thread via
// Reanimated, so a blob per message costs no React renders. The community
// avatars stay still on purpose; four idling faces in a list is noise.
export const AXL_SEED = 'sarahw';

// The voice agent: the one that speaks a phrase out loud in the banked voice.
// It answers a different question than Axl does, so it gets its own face and
// its own colour rather than being Axl in a different hat.
export const VOICE_SEED = 'vox-carrier';
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
// periwinkle whichever of the two shapes he is wearing, and the eye is pinned
// to ink so it does not track the head's lightness — blobatar would otherwise
// pick a different near-black per accent.
export const EYE = colors.ink;
const PALETTE = { head: accents.periwinkle, eye: EYE };

// A blink on a timer, for the one blob whose idle layer is switched off.
// blobatar's `amp` (which scales the saccade and the blink together) is not
// exposed through the adapter, so the choice is the whole idle layer or none,
// and the glance is what fights the tilt.
//
// The roster has no shut-eye pose — `sleepy`, its flattest, is a 22%-height
// droop — so the lid is authored here. An expression is just `{ p, vars, bake }`,
// and `poseVars`/`bakePose` are the same two the built-in poses carry.
const BLINK = {
  p: {
    ...sleepy.p,
    esx: 1.08,
    esy: 0.05,
    tilt: 0,
    edy: 0.5,
    edx: 0.2,
    esx2: 0.02,
    esy2: 0,
    tilt2: 0,
    edy2: 0,
  },
  vars: poseVars,
  bake: bakePose,
};

// The hold has to outlast the adapter's 300ms morph-in or the lid never
// arrives: at the old 130ms it got 40% of the way into a droop and reversed,
// which is what read as a flutter rather than a blink. 340ms shut plus the
// 400ms morph back out is a slow blink, and slow is the cost of those two
// clocks being fixed.
// ponytail: tied to the adapter's IN/OUT; if blobatar exposes the morph clock,
// shorten both.
const BLINK_HOLD = 340;

// And every fourth beat or so he squints instead — `happy` is the roster's
// smiling squint, held long enough to read as a held expression rather than a
// blink that stuck.
const SQUINT_HOLD = 900;
const SQUINT_CHANCE = 0.28;

const REST_MIN = 2600;
const REST_MAX = 6200;

function useRest(enabled, calm = false) {
  const [pose, setPose] = useState(null);

  useEffect(() => {
    if (!enabled) return;
    let hold;
    let gap;
    const beat = () => {
      gap = setTimeout(() => {
        const squint = !calm && Math.random() < SQUINT_CHANCE;
        setPose(squint ? happy : BLINK);
        hold = setTimeout(() => {
          setPose(null);
          beat();
        }, squint ? SQUINT_HOLD : BLINK_HOLD * (calm ? 1.3 : 1));
      }, (calm ? REST_MIN * 2.4 : REST_MIN) + Math.random() * (REST_MAX - REST_MIN) * (calm ? 1.8 : 1));
    };
    beat();
    return () => {
      clearTimeout(gap);
      clearTimeout(hold);
    };
  }, [enabled, calm]);

  return pose;
}

// He narrows his eyes the moment a prompt lands, then settles into the
// thinking rock while he works, and comes back to `idle` to answer.
//
// Answering is deliberately the hero's face rather than `happy`: every pose
// here carries `lock: 1`, which holds the idle layer still, so a thread of
// finished answers was a column of frozen faces. `idle` is the identity pose,
// so it leaves breathe, bob, blink and glance running — and `happy` squashes
// the eyes to a third of their height at nearly twice the width, which is a
// wide flat squint that only reads as a smile at hero size.
const STAGE_EXPRESSION = {
  loading: smug,
  thinking: thinking,
  streaming: idle,
  done: idle,
};

// `calm` slows him down. blobatar seeds the blink and saccade periods from
// traits, so pinning both to the top of their ranges (6.5s and 7.6s) is the
// supported way to make him idle less often rather than less far — the
// amplitude knob is not exposed through the adapter.
//
// Paired with `animate={false}` it drops the breathe, bob and glance entirely
// and leaves only the slow blink below, which is what the gaze screens want:
// a face that is present without ever pulling the eye off a target.
const CALM = { ...FACE, 'motion.blink': 1, 'motion.saccade': 1 };

export default function AgentBlob({ seed = AXL_SEED, size = 40, stage, animate = true, calm = false, head }) {
  const rest = useRest(!animate, calm);
  const pose = rest ?? STAGE_EXPRESSION[stage] ?? idle;

  return (
    <AnimatedBlobatar
      name={seed}
      size={size}
      traits={calm ? CALM : FACE}
      palette={head ? { head, eye: EYE } : PALETTE}
      expression={pose}
      animate={animate}
      title="Axl"
    />
  );
}
