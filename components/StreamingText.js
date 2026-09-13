import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors, spacing, radii, type, softShadow } from '../theme';

const ANSWER =
  'Most people bank phrases in short sittings rather than one long one — twenty minutes at a time, while your voice is still steady. Sarah recorded hers over three weeks and says the everyday lines mattered more than the long ones.';
const SOURCES = ['ALS Association', 'Community notes', 'Your care team'];
const FOLLOW_UPS = ['Which phrases should I record first?', 'Show me what others recorded'];

export default function StreamingText({ onComplete }) {
  const words = ANSWER.split(' ');
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= words.length) {
      onComplete?.();
      return;
    }
    const t = setTimeout(() => setCount((c) => c + 1), 40);
    return () => clearTimeout(t);
  }, [count]);

  const done = count >= words.length;

  return (
    <View style={styles.wrap}>
      {/* No bubble — Axl speaks straight onto the page. */}
      <Text style={styles.answer}>
        {words.slice(0, count).join(' ')}
        {!done && <Text style={styles.cursor}> ▍</Text>}
      </Text>

      {done && (
        <>
          <View style={styles.sourceRow}>
            {SOURCES.map((s) => (
              <View key={s} style={styles.sourceChip}>
                <Text style={styles.sourceChipText}>{s}</Text>
              </View>
            ))}
          </View>

          <View style={styles.followUps}>
            {FOLLOW_UPS.map((f) => (
              <Pressable key={f} style={styles.followUp}>
                <Text style={styles.followUpText}>{f}</Text>
                <Icon name="next" size={12} color={colors.inkMuted} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start', gap: spacing(1.5) },
  answer: { ...type.body, color: colors.ink },
  cursor: { color: colors.inkMuted },

  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(0.75) },
  sourceChip: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...softShadow,
  },
  sourceChipText: { ...type.caption, color: colors.inkMuted },

  followUps: { alignSelf: 'stretch', alignItems: 'flex-end', gap: spacing(1) },
  followUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2),
    ...softShadow,
  },
  followUpText: { ...type.label, color: colors.ink },
});
