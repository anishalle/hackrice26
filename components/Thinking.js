import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radii } from '../theme';

const TABS = ['Steps', 'Reasoning', 'Search', 'Coding'];
const STEPS = [
  'Reading flavor briefs',
  'Scanning supplier lists',
  'Comparing tasting notes',
  'Writing the scoop report',
];

export default function Thinking({ seconds = 4 }) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState('Steps');

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.title}>Thought for {seconds} seconds</Text>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.inkMuted} />
      </Pressable>

      {open && (
        <>
          <View style={styles.tabRow}>
            {TABS.map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, t === tab && styles.tabActive]}>
                <Text style={[styles.tabText, t === tab && styles.tabTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.steps}>
            {STEPS.map((s) => (
              <View key={s} style={styles.stepRow}>
                <View style={styles.dot} />
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
          </View>
        </>
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
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  tabRow: { flexDirection: 'row', gap: spacing(0.75) },
  tab: { paddingVertical: spacing(0.5), paddingHorizontal: spacing(1.25), borderRadius: radii.pill, backgroundColor: colors.bg },
  tabActive: { backgroundColor: colors.ink },
  tabText: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted },
  tabTextActive: { color: '#fff' },
  steps: { gap: spacing(1) },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.pastelLavender, borderWidth: 1, borderColor: colors.indigo },
  stepText: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkMuted },
});
