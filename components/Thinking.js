import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CaretDown, CaretRight } from 'phosphor-react-native';
import { colors, fonts, spacing, radii, cardShadow } from '../theme';

const STEPS = [
  'Reading flavor briefs',
  'Scanning supplier lists',
  'Comparing tasting notes',
  'Writing the scoop report',
];

const STEP_INTERVAL = 420;

export default function Thinking({ onComplete }) {
  const [open, setOpen] = useState(true);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= STEPS.length) {
      onComplete?.();
      return;
    }
    const t = setTimeout(() => setRevealed((r) => r + 1), STEP_INTERVAL);
    return () => clearTimeout(t);
  }, [revealed]);

  const seconds = Math.max(1, Math.round((STEPS.length * STEP_INTERVAL) / 1000));

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.title}>Thought for {seconds} seconds</Text>
        {open ? (
          <CaretDown size={16} color={colors.inkMuted} />
        ) : (
          <CaretRight size={16} color={colors.inkMuted} />
        )}
      </Pressable>

      {open && (
        <View style={styles.steps}>
          {STEPS.slice(0, revealed).map((s) => (
            <View key={s} style={styles.stepRow}>
              <View style={styles.dot} />
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.5),
    gap: spacing(1.5),
    ...cardShadow,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  steps: { gap: spacing(1) },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.pastelLavender, borderWidth: 1, borderColor: colors.indigo },
  stepText: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkMuted },
});
