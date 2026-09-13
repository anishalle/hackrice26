import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Blobatar } from '@blobatar/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, accents, type, spacing, radii, tagPalette, tagGlyph, cardShadow, softShadow } from '../theme';
import AgentBlob, { EYE } from '../components/AgentBlob';
import TiltGaze from '../components/TiltGaze';
import Icon from '../components/Icon';
import BlobMark from '../components/BlobMark';
import { PROFILE } from '../data/profile';
import { useAccess } from '../components/AccessMode';
import GazeHomeScreen from './GazeHomeScreen';

const ACTIONS = [
  { key: 'Speech', label: 'Speech' },
  { key: 'Mobility', label: 'Mobility' },
  { key: 'Daily', label: 'Daily' },
  { key: 'Care', label: 'Care' },
];

const HISTORY = [
  {
    id: 'h1',
    skillId: 'voice-bank',
    tag: 'Speech',
    title: 'Voice Bank Builder',
    note: 'It records in the gaps instead of asking me to sit down for an hour. 1,240 phrases in.',
    author: 'sunay',
  },
  {
    id: 'h2',
    skillId: 'refill-runner',
    tag: 'Care',
    title: 'Refill Runner',
    note: 'I have not sat in a pharmacy queue since January. It only pings me for decisions.',
    author: 'sahas',
  },
  {
    id: 'h3',
    skillId: 'grocery-loop',
    tag: 'Daily',
    title: 'Grocery Loop',
    note: 'Orders the shop on my rhythm and swaps in packaging I can still open one-handed.',
    author: 'jordan',
  },
  {
    id: 'h4',
    skillId: 'care-roster',
    tag: 'Care',
    title: 'Care Shift Roster',
    note: 'It asks the next person for me. My partner and I stopped negotiating at 3am.',
    author: 'priya',
  },
];

const FILTERS = ['All', 'Speech', 'Mobility', 'Daily', 'Care'];

// Blobatar picks a hue from the seed; override the head so members land on the
// four accents instead of anywhere on the wheel.
const ACCENT_CYCLE = [accents.periwinkle, accents.mint, accents.peach, accents.amber];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { gaze } = useAccess();
  const [filter, setFilter] = useState('All');

  // A scrolling feed of small cards is the one shape gaze cannot use, so the
  // mode gets its own screen rather than a resized version of this one.
  if (gaze) return <GazeHomeScreen />;

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
            <Text style={styles.greeting}>Hi, {PROFILE.name.split(' ')[0]}</Text>
            <Text style={styles.greetingSub}>How can I help?</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable style={styles.bell} hitSlop={8} accessibilityLabel="Notifications">
              <Icon name="bell" size={18} color={colors.ink} />
              <View style={styles.bellDot} />
            </Pressable>
            {/* The profile is where the adaptive settings live, so it stays one
                tap from the first screen rather than behind the agent. */}
            <Pressable
              style={styles.bell}
              hitSlop={8}
              accessibilityLabel="Your profile"
              onPress={() => {
                Haptics.selectionAsync();
                navigation.navigate('Profile');
              }}
            >
              <Blobatar
                name={PROFILE.handle}
                size={26}
                traits={{ shape: 0.05 }}
                palette={{ head: accents.periwinkle, eye: EYE }}
                title={PROFILE.name}
              />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.agentCard} onPress={openAgent}>
          <TiltGaze style={styles.agentFigure}>
            <AgentBlob size={248} animate={false} />
          </TiltGaze>

          <View style={styles.agentCopy}>
            <Text style={styles.agentTitle}>Your weekly check-in takes two minutes</Text>
            <Pressable style={styles.agentBtn} onPress={openAgent}>
              <Text style={styles.agentBtnText}>Check in</Text>
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
                  size={56}
                  glyphSize={22}
                  fill={palette.bg}
                  glyph={tagGlyph[a.key]}
                  glyphColor="#FFFFFF"
                />
                <Text style={styles.tileLabel}>{a.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.historyHead}>
          <Text style={styles.sectionTitle}>Skills others built</Text>
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
                palette={{ head: ACCENT_CYCLE[i % ACCENT_CYCLE.length], eye: EYE }}
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
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
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
    backgroundColor: colors.mint,
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
    backgroundColor: colors.mint,
    paddingVertical: spacing(1.75),
  },
  agentBtnText: { ...type.heading, color: colors.ink },

  tileScroll: { marginHorizontal: -spacing(2.5) },
  tileRow: { paddingHorizontal: spacing(2.5), gap: spacing(1.25) },
  tile: {
    width: 150,
    height: 150,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    padding: spacing(2),
    ...softShadow,
  },
  tileLabel: { ...type.title, fontSize: 26, lineHeight: 30, color: colors.ink },

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
  filterActive: { backgroundColor: colors.mint },
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
