import { useEffect, useRef, useState } from 'react';
import { MorphingBlobatar } from '@blobatar/react-native';
import { idle, thinking, happy, sleepy, smug, unsure, surprised } from 'blobatar/expression';

const STAGE_EXPRESSION = {
  loading: thinking,
  thinking: thinking,
  streaming: happy,
  done: happy,
};

// Hand-rolled idle motion: Reanimated's real breathe/bob/glance loop needs a
// native dev client (Expo Go can't run it), so this fakes blinks and glances
// with plain timers cycling through existing static poses instead — sleepy
// reads as a blink, smug/unsure/surprised read as a look to the side/up.
const IDLE_POSES = [sleepy, sleepy, smug, unsure, surprised]; // weighted toward blink
const IDLE_MIN_MS = 2200;
const IDLE_MAX_MS = 4200;
const IDLE_HOLD_MS = 180;

export default function AgentAvatar({ stage, size = 36 }) {
  const base = STAGE_EXPRESSION[stage] ?? idle;
  const [glance, setGlance] = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    const scheduleGlance = () => {
      const delay = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
      timers.current.push(
        setTimeout(() => {
          setGlance(IDLE_POSES[Math.floor(Math.random() * IDLE_POSES.length)]);
          timers.current.push(
            setTimeout(() => {
              setGlance(null);
              scheduleGlance();
            }, IDLE_HOLD_MS)
          );
        }, delay)
      );
    };
    scheduleGlance();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <MorphingBlobatar
      name="aid-agent"
      size={size}
      expression={glance ?? base}
      title="Your agent"
    />
  );
}
