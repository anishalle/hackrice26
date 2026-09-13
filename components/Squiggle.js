import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

// A hand-drawn underline. Same idea as the blob dots: a seeded wobble, so no
// two lines in a list are the same stroke twice.
//
// The wobble comes off a hash rather than a random call, so a line keeps its
// shape across renders. Amplitude stays under a point and a half — enough to
// read as drawn, not enough to read as a mistake.
const noise = (seed, salt) => {
  const x = Math.sin((seed + 1) * 91.7 + salt * 217.3) * 43758.5453;
  return x - Math.floor(x);
};

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h;
};

export default function Squiggle({ seed = '', width = 120, height = 7, color, opacity = 0.5 }) {
  const n = typeof seed === 'string' ? hash(seed) : seed;
  const mid = height / 2;

  // Four segments, each a quadratic whose control point rides above or below
  // the baseline by a seeded amount. The end points stay on the baseline so
  // the line never looks like it is climbing.
  const steps = 4;
  const dx = width / steps;
  let d = `M 0 ${mid}`;
  for (let i = 0; i < steps; i += 1) {
    const lift = (noise(n, i) - 0.5) * (height - 2);
    d += ` Q ${dx * i + dx / 2} ${mid + lift} ${dx * (i + 1)} ${mid + (noise(n, i + 9) - 0.5) * 1.2}`;
  }

  return (
    <Svg width={width} height={height} style={{ opacity }}>
      <Path d={d} stroke={color ?? colors.ink} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
