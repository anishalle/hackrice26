import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';
import SkillCard from '../components/SkillCard';

const SKILLS = [
  {
    id: 'screen-reader-boost',
    title: 'Screen Reader Boost',
    author: '@mara.codes',
    tags: ['Sight'],
    karma: 128,
    description: 'Bumps contrast and font scale automatically based on ambient light and squint detection.',
  },
  {
    id: 'tap-to-caption',
    title: 'Tap-to-Caption',
    author: '@devonk',
    tags: ['Hearing', 'Voice'],
    karma: 94,
    description: 'Live captions overlay for any call or video, synced to your agent so you never miss a beat.',
  },
  {
    id: 'one-handed-mode',
    title: 'One-Handed Mode',
    author: '@priya.r',
    tags: ['Mobility'],
    karma: 76,
    description: 'Shifts every reachable control into thumb range and remembers your preferred hand.',
  },
  {
    id: 'slow-speech-pace',
    title: 'Slow Speech Pace',
    author: '@sarahw',
    tags: ['Speech', 'Automation'],
    karma: 41,
    description: 'Paces agent replies to match your speech rate instead of firing off a wall of text at once.',
  },
];

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing(2) }]}
      >
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.subtitle}>Skills the community built, ranked by karma.</Text>

        {SKILLS.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(3), paddingTop: spacing(2), gap: spacing(2.5) },
  title: { fontFamily: fonts.light, fontSize: 30, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkMuted, marginTop: -spacing(1.5) },
});
