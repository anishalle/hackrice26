import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Blobatar } from '@blobatar/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, accents, type, spacing, radii, tagPalette, tagGlyph, cardShadow, softShadow } from '../theme';
import AgentBlob from '../components/AgentBlob';
import Icon from '../components/Icon';

const ACTIONS = [
  { key: 'Speech', label: 'Speech' },
  { key: 'Mobility', label: 'Mobility' },
  { key: 'Daily', label: 'Daily living' },
  { key: 'Care', label: 'Caregiving' },
];

const HISTORY = [
  {
    id: 'h1',
    tag: 'Speech',
    title: 'Voice banking',
    note: 'How many phrases should I record before my speech changes?',
    author: 'mara',
  },
  {
    id: 'h2',
    tag: 'Mobility',
    title: 'Bathroom transfers',
    note: 'Grab bars beat a ramp in a narrow hallway — here is the layout that worked.',
    author: 'sarahw',
  },
  {
    id: 'h3',
    tag: 'Daily',
    title: 'Eating with weak grip',
    note: 'Weighted utensils and a plate guard bought me another eight months of eating alone.',
    author: 'devonk',
  },
  {
    id: 'h4',
    tag: 'Care',
    title: 'Night shifts',
    note: 'What my partner and I split once I needed help turning at night.',
    author: 'priya',
  },
];

const FILTERS = ['All', 'Speech', 'Mobility', 'Daily', 'Care'];

// Blobatar picks a hue from the seed; override the head so members land on the
// four accents instead of anywhere on the wheel.
const ACCENT_CYCLE = [accents.blue, accents.green, accents.purple, accents.agent];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [filter, setFilter] = useState('All');

  const shown = filter === 'All' ? HISTORY : HISTORY.filter((h) => h.tag === filter);

  const openAgent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Agents');
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing(1.5) }]}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Hi, Jasmin</Text>
            <Text style={styles.greetingSub}>How can Axl help today?</Text>
          </View>
          <Pressable style={styles.bell} hitSlop={8}>
            <Icon name="bell" size={18} color={colors.ink} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        <Pressable style={styles.agentCard} onPress={openAgent}>
          <View style={styles.agentFigure} pointerEvents="none">
            <AgentBlob size={190} />
          </View>
          <View style={styles.agentCopy}>
            <Text style={styles.agentTitle}>Axl is tuned to where you are now</Text>
            <View style={styles.agentBtn}>
              <Text style={styles.agentBtnText}>Update stage</Text>
            </View>
          </View>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tileScroll}
          contentContainerStyle={styles.tileRow}
        >
          {ACTIONS.map((a) => {
            const palette = tagPalette[a.key];
            return (
              <Pressable key={a.key} style={styles.tile} onPress={openAgent}>
                <View style={[styles.tileMark, { backgroundColor: palette.bg }]}>
                  <Icon name={tagGlyph[a.key]} size={18} color={palette.text} />
                </View>
                <Text style={styles.tileLabel}>{a.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.historyHead}>
          <Text style={styles.sectionTitle}>Shared by others</Text>
          <Pressable onPress={() => navigation.navigate('Marketplace')}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                style={[styles.filter, active && styles.filterActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(f);
                }}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.historyList}>
          {shown.map((h, i) => (
            <Pressable key={h.id} style={styles.entry} onPress={openAgent}>
              {/* Community members keep the deterministic blobatar, pinned round
                  so the list reads as one family with Axl. */}
              <Blobatar
                name={h.author}
                size={38}
                traits={{ shape: 0.05 }}
                palette={{ head: ACCENT_CYCLE[i % ACCENT_CYCLE.length] }}
                title={h.author}
              />
              <View style={styles.entryBody}>
                <Text style={styles.entryTitle}>{h.title}</Text>
                <Text style={styles.entryNote} numberOfLines={2}>{h.note}</Text>
              </View>
              <Icon name="next" size={14} color={colors.inkMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: spacing(2.5), paddingBottom: spacing(3), gap: spacing(2) },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greeting: { ...type.title, color: colors.ink },
  greetingSub: { ...type.callout, color: colors.inkMuted },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  bellDot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.green,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  agentCard: {
    minHeight: 158,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing(2.5),
    paddingLeft: spacing(16),
    overflow: 'hidden',
    ...cardShadow,
  },
  // Pushed past the card's edge so the rounded corner crops him.
  agentFigure: { position: 'absolute', left: -34, bottom: -44 },
  agentCopy: { gap: spacing(1) },
  agentTitle: { ...type.bodyMedium, color: colors.ink },
  agentBtn: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.ink,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.75),
  },
  agentBtnText: { ...type.label, color: colors.ink },

  tileScroll: { marginHorizontal: -spacing(2.5) },
  tileRow: { paddingHorizontal: spacing(2.5), gap: spacing(1.25) },
  tile: {
    width: 136,
    height: 136,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    padding: spacing(1.75),
    ...softShadow,
  },
  tileMark: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { ...type.bodyMedium, color: colors.ink },

  historyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...type.heading, color: colors.ink },
  viewAll: { ...type.label, color: colors.inkMuted },

  filterScroll: { marginHorizontal: -spacing(2.5), marginTop: -spacing(1) },
  filterRow: { paddingHorizontal: spacing(2.5), gap: spacing(1) },
  filter: {
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingVertical: spacing(0.875),
    paddingHorizontal: spacing(1.75),
  },
  filterActive: { backgroundColor: colors.green },
  filterText: { ...type.label, color: colors.inkMuted },
  filterTextActive: { color: colors.ink },

  historyList: { gap: spacing(1.25), marginTop: -spacing(0.5) },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    padding: spacing(1.75),
    ...softShadow,
  },
  entryBody: { flex: 1, gap: 2 },
  entryTitle: { ...type.bodyMedium, color: colors.ink },
  entryNote: { ...type.footnote, color: colors.inkMuted },
});
