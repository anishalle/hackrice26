import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Blobatar } from '@blobatar/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, accents, type, spacing, radii, tagPalette, tagGlyph, cardShadow, softShadow } from '../theme';
import AgentBlob from '../components/AgentBlob';
import TiltGaze from '../components/TiltGaze';
import Icon from '../components/Icon';
import BlobMark from '../components/BlobMark';

const ACTIONS = [
  { key: 'Speech', label: 'Speech' },
  { key: 'Mobility', label: 'Mobility' },
  { key: 'Daily', label: 'Daily living' },
  { key: 'Care', label: 'Caregiving' },
];

const HISTORY = [
  {
    id: 'h1',
    skillId: 'voice-banking',
    tag: 'Speech',
    title: 'Voice banking',
    note: 'How many phrases should I record before my speech changes?',
    author: 'sunay',
  },
  {
    id: 'h2',
    skillId: 'transfer-playbook',
    tag: 'Mobility',
    title: 'Bathroom transfers',
    note: 'Grab bars beat a ramp in a narrow hallway. Here is the layout that worked.',
    author: 'sarahw',
  },
  {
    id: 'h3',
    skillId: 'grip-kitchen',
    tag: 'Daily',
    title: 'Eating with weak grip',
    note: 'Weighted utensils and a plate guard bought me another eight months of eating alone.',
    author: 'devonk',
  },
  {
    id: 'h4',
    skillId: 'night-shift-split',
    tag: 'Care',
    title: 'Night shifts',
    note: 'What my partner and I split once I needed help turning at night.',
    author: 'priya',
  },
];

const FILTERS = ['All', 'Speech', 'Mobility', 'Daily', 'Care'];

// Blobatar picks a hue from the seed; override the head so members land on the
// four accents instead of anywhere on the wheel.
const ACCENT_CYCLE = [accents.blue, accents.green, accents.purple, accents.gold];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [filter, setFilter] = useState('All');

  const shown = filter === 'All' ? HISTORY : HISTORY.filter((h) => h.tag === filter);

  const openAgent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Agents');
  };

  const openMarketplace = (skillId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Marketplace', skillId ? { skillId } : undefined);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing(1.5) }]}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Hi, Anish</Text>
            <Text style={styles.greetingSub}>How can I help?</Text>
          </View>
          <Pressable style={styles.bell} hitSlop={8}>
            <Icon name="bell" size={18} color={colors.ink} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        <Pressable style={styles.agentCard} onPress={openAgent}>
          <TiltGaze style={styles.agentFigure}>
            <AgentBlob size={248} animate={false} />
          </TiltGaze>

          <View style={styles.agentCopy}>
            <Text style={styles.agentTitle}>Axl is tuned to where you are now</Text>
            <Pressable style={styles.agentBtn} onPress={() => openMarketplace()}>
              <Text style={styles.agentBtnText}>Explore</Text>
              <Icon name="next" size={14} color={colors.ink} />
            </Pressable>
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
                <BlobMark
                  seed={a.key}
                  fill={palette.bg}
                  glyph={tagGlyph[a.key]}
                  glyphColor={palette.text}
                />
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
            <Pressable key={h.id} style={styles.entry} onPress={() => openMarketplace(h.skillId)}>
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
  root: { flex: 1, backgroundColor: colors.page },
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
    minHeight: 172,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing(2.5),
    // Clears the blob, so the column below starts where he ends rather than
    // running across him.
    paddingLeft: spacing(18.5),
    overflow: 'hidden',
    ...cardShadow,
  },
  // Pushed past the card's edge so the rounded corner crops him.
  agentFigure: { position: 'absolute', left: -64, bottom: -76, zIndex: 0 },
  agentCopy: { gap: spacing(1.5), zIndex: 1 },
  agentTitle: { ...type.bodyMedium, color: colors.ink },
  agentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    alignSelf: 'stretch',
    borderRadius: radii.pill,
    backgroundColor: colors.green,
    paddingVertical: spacing(1.75),
  },
  agentBtnText: { ...type.heading, color: colors.ink },

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
