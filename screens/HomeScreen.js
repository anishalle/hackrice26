import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radii } from '../theme';

const TAB_BAR_CLEARANCE = 76;

const senses = [
  { label: 'Sight', tint: colors.pastelGreen },
  { label: 'Hearing', tint: colors.pastelLavender },
  { label: 'Speech', tint: colors.pastelYellow },
  { label: 'Mobility', tint: colors.pastelPeach },
];

const findings = [
  { name: 'Sarah W.', tag: 'Mobility', tint: colors.pastelPeach, note: 'Grab bars work better than ramps for narrow hallways.' },
  { name: 'Devon K.', tag: 'Hearing', tint: colors.pastelLavender, note: 'Visual doorbell alerts synced straight to the agent.' },
  { name: 'Priya R.', tag: 'Sight', tint: colors.pastelGreen, note: 'High-contrast mode cuts navigation errors in half.' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing(2), paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
      >
        <View style={styles.logoRow}>
          <View style={styles.mark} />
          <Text style={styles.wordmark}>aid</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.headline}>Shared knowledge, one agent</Text>
          <Text style={styles.subhead}>
            People navigating the same conditions share the tools and findings that
            work. Your agent draws on all of it, tuned to how you sense the world.
          </Text>

          <View style={styles.ctaRow}>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>Join the network</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
            <Pressable style={styles.secondaryLink}>
              <Text style={styles.secondaryLinkText}>See how it works</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        <View style={styles.chipRow}>
          {senses.map((s) => (
            <View key={s.label} style={[styles.chip, { backgroundColor: s.tint }]}>
              <Text style={styles.chipText}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.findingsSection}>
          <Text style={styles.sectionTitle}>Recent findings</Text>
          {findings.map((f) => (
            <View key={f.name} style={styles.findingRow}>
              <View style={[styles.findingAvatar, { backgroundColor: f.tint }]}>
                <Text style={styles.findingAvatarText}>{f.name[0]}</Text>
              </View>
              <View style={styles.findingBody}>
                <Text style={styles.findingMeta}>
                  <Text style={styles.findingName}>{f.name}</Text> · {f.tag}
                </Text>
                <Text style={styles.findingNote}>{f.note}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.darkCard}>
          <Text style={styles.darkCardTitle}>Powered by shared findings</Text>
          <Text style={styles.darkCardBody}>
            Every tool your agent suggests comes from someone who's lived it,
            collected and verified in one place.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(4), gap: spacing(3) },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  mark: { width: 14, height: 14, borderRadius: 4, backgroundColor: colors.indigo },
  wordmark: { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink },
  hero: {
    backgroundColor: colors.periwinkle,
    borderRadius: radii.card,
    padding: spacing(3.5),
    gap: spacing(2.5),
  },
  headline: { fontFamily: fonts.light, fontSize: 34, lineHeight: 40, color: colors.ink },
  subhead: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.inkMuted },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing(2.5) },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(3),
  },
  ctaText: { fontFamily: fonts.medium, fontSize: 15, color: '#fff' },
  secondaryLink: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.5) },
  secondaryLinkText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  chip: { borderRadius: radii.pill, paddingVertical: spacing(1), paddingHorizontal: spacing(2) },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  findingsSection: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing(3),
    gap: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  findingRow: { flexDirection: 'row', gap: spacing(1.5) },
  findingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findingAvatarText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  findingBody: { flex: 1, gap: spacing(0.25) },
  findingMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkMuted },
  findingName: { fontFamily: fonts.medium, color: colors.ink },
  findingNote: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  darkCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.card,
    padding: spacing(3),
    gap: spacing(1),
  },
  darkCardTitle: { fontFamily: fonts.medium, fontSize: 18, color: '#fff' },
  darkCardBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: '#C7C7DA' },
});
