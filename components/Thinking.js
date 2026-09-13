import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform } from 'react-native';
import Icon from './Icon';
import { colors, spacing, type } from '../theme';

const STEPS = [
  'Reading your last three check-ins',
  'Checking your speech trend',
  'Looking up skills the community ran',
  'Drafting what to do next',
];

const STEP_INTERVAL = 420;

// Inline disclosure above the answer bubble: flat, no card, the way iOS
// surfaces secondary detail in a thread.
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

  const toggle = () => {
    // LayoutAnimation is iOS-only here; Android needs an opt-in flag we don't set.
    if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={toggle} hitSlop={6}>
        <Text style={styles.title}>Thought for {seconds} seconds</Text>
        <Icon name={open ? 'down' : 'next'} size={12} color={colors.inkMuted} />
      </Pressable>

      {open && (
        <View style={styles.steps}>
          {STEPS.slice(0, revealed).map((s) => (
            <Text key={s} style={styles.stepText}>
              {s}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing(0.75), paddingLeft: spacing(0.5) },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
  title: { ...type.footnote, color: colors.inkMuted },
  steps: { gap: 2, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border, paddingLeft: spacing(1.25) },
  stepText: { ...type.footnote, color: colors.inkMuted },
});
