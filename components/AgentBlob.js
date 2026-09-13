import { MorphingBlobatar } from '@blobatar/react-native';
import { idle, thinking, happy } from 'blobatar/expression';

// Axl's face. Blobatar seeds, pinned round so he matches the community blobs
// rather than sitting apart from them.
export const AXL_SEED = 'sarahw';
export const AXL_HERO_SEED = 'mara';

const ROUND = { shape: 0.05 };

const STAGE_EXPRESSION = {
  loading: thinking,
  thinking: thinking,
  streaming: happy,
  done: happy,
};

export default function AgentBlob({ seed = AXL_SEED, size = 40, stage }) {
  return (
    <MorphingBlobatar
      name={seed}
      size={size}
      traits={ROUND}
      expression={STAGE_EXPRESSION[stage] ?? idle}
      title="Axl"
    />
  );
}
