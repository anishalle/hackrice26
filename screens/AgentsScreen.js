import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radii } from '../theme';
import LoadingState from '../components/LoadingState';
import Thinking from '../components/Thinking';
import StreamingText from '../components/StreamingText';
import PromptBar from '../components/PromptBar';

const TAB_BAR_CLEARANCE = 76;

export default function AgentsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing(2), paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
      >
        <Text style={styles.title}>Agents</Text>
        <Text style={styles.subtitle}>Your agent, working on shared findings.</Text>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Loading</Text>
          <LoadingState label="Churning" />
        </View>

        <Thinking seconds={4} />

        <StreamingText />
      </ScrollView>

      <View style={[styles.promptWrap, { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
        <PromptBar />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(2), gap: spacing(2.5) },
  title: { fontFamily: fonts.light, fontSize: 30, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkMuted, marginTop: -spacing(1.5) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.5),
    gap: spacing(1.5),
  },
  sectionLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  promptWrap: { paddingHorizontal: spacing(3), paddingTop: spacing(1), paddingBottom: spacing(2) },
});
