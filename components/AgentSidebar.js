import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Animated, Easing, StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, accents, spacing, radii, type, tagPalette, cardShadow } from '../theme';
import { SKILLS, CATEGORIES } from '../data/skills';
import Icon from './Icon';
import AgentBlob from './AgentBlob';
import BlobMark from './BlobMark';

// Axl's sidebar. Three things live here that the thread has no room for: the
// marketplace (with a peek at each sub-market before you commit to leaving the
// chat), the day log, and the way a day gets to a clinician.
//
// It slides rather than collapsing to a rail. A 52px rail of icons is a desktop
// affordance: on a phone the same pixels are better spent on the thread, so
// closed means gone.

const SPRING = { damping: 24, mass: 0.9, stiffness: 210 };

// The search field grows right-to-left out of the magnifier and the "Day log"
// label fades off to the left, in one 180ms move. Same storyboard as the web
// sidebar; here the width is measured rather than percentage-based because
// Animated cannot interpolate to '100%'.
const SEARCH_MS = 180;
const SEARCH_CLOSED_W = 32;

// Sub-markets are not a separate list. A category's standing is the karma its
// resources have earned, so trending falls out of the marketplace data itself.
const SUBMARKETS = CATEGORIES.map((name) => {
  const items = SKILLS.filter((s) => s.tags.includes(name)).sort((a, b) => b.karma - a.karma);
  return { name, items, karma: items.reduce((n, s) => n + s.karma, 0) };
}).sort((a, b) => b.karma - a.karma);

function Row({ icon, label, meta, tint, seed, active, onPress, children }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, (active || pressed) && styles.rowOn]}
    >
      {icon ? (
        <View style={styles.rowIcon}>
          <Icon name={icon} size={17} color={active ? colors.ink : colors.inkMuted} />
        </View>
      ) : tint ? (
        <View style={styles.rowDot}>
          <BlobMark seed={seed} size={12} fill={tint} />
        </View>
      ) : null}
      <Text style={[styles.rowLabel, active && styles.rowLabelOn]} numberOfLines={1}>
        {label}
      </Text>
      {children}
      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
    </Pressable>
  );
}

// A sub-market opens in place: the top few resources, then the door out to the
// marketplace proper. Previewing is the point — leaving the chat to find out a
// sub-market is not what you wanted is the trip this saves.
function SubMarket({ market, open, onToggle, onOpenSkill, onOpenMarket }) {
  const palette = tagPalette[market.name];
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(grow, {
      toValue: open ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open]);

  return (
    <View>
      <Row label={market.name} tint={palette.bg} seed={market.name} active={open} meta={`${market.karma}`} onPress={onToggle}>
        <Animated.View
          style={{
            transform: [{ rotate: grow.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }],
          }}
        >
          <Icon name="down" size={12} color={colors.inkMuted} />
        </Animated.View>
      </Row>

      {open && (
        <Animated.View
          style={[
            styles.preview,
            {
              opacity: grow,
              transform: [{ translateY: grow.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
            },
          ]}
        >
          {market.items.slice(0, 3).map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onOpenSkill(s.id)}
              style={({ pressed }) => [styles.previewItem, pressed && styles.rowOn]}
            >
              <Text style={styles.previewTitle} numberOfLines={1}>{s.title}</Text>
              <Text style={styles.previewMeta}>{s.karma}</Text>
            </Pressable>
          ))}

          <Pressable onPress={onOpenMarket} style={({ pressed }) => [styles.previewAll, pressed && styles.rowOn]}>
            <Text style={styles.previewAllText}>All {market.items.length} in Marketplace</Text>
            <Icon name="next" size={11} color={colors.ink} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

export default function AgentSidebar({
  open,
  onClose,
  onNewChat,
  onOpenDay,
  onSend,
  activeDayId,
  days,
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const panelW = Math.min(302, width * 0.86);

  const slide = useRef(new Animated.Value(0)).current;
  const [market, setMarket] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [fieldW, setFieldW] = useState(0);
  const search = useRef(new Animated.Value(0)).current;
  const input = useRef(null);

  useEffect(() => {
    Animated.spring(slide, { toValue: open ? 1 : 0, useNativeDriver: true, ...SPRING }).start();
    if (!open) {
      setSearchOpen(false);
      setQuery('');
      setMarket(null);
    }
  }, [open]);

  useEffect(() => {
    Animated.timing(search, {
      toValue: searchOpen ? 1 : 0,
      duration: SEARCH_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    if (searchOpen) input.current?.focus();
  }, [searchOpen]);

  const q = query.trim().toLowerCase();
  const visibleDays = useMemo(
    () => (q ? days.filter((d) => `${d.title} ${d.summary} ${d.date}`.toLowerCase().includes(q)) : days),
    [days, q]
  );

  const leave = (run) => {
    Haptics.selectionAsync();
    onClose();
    run();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[styles.scrim, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: panelW,
            paddingTop: insets.top + spacing(1),
            paddingBottom: insets.bottom + spacing(1.5),
            transform: [
              { translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-panelW - 24, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.head}>
          <AgentBlob size={44} stage="done" />
          <View style={styles.headSpacer} />
          <Pressable hitSlop={10} onPress={onClose} style={styles.headBtn}>
            <Icon name="sidebar" size={17} color={colors.inkMuted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.group}>
            <Row icon="newChat" label="New chat" onPress={() => leave(onNewChat)} />
            <Row icon="home" label="Home" onPress={() => leave(() => navigation.navigate('Home'))} />
            <Row
              icon="store"
              label="Marketplace"
              meta={`${SKILLS.length}`}
              onPress={() => leave(() => navigation.navigate('Marketplace'))}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Icon name="trend" size={13} color={colors.inkMuted} />
              <Text style={styles.sectionLabel}>Trending sub-markets</Text>
            </View>
            <View style={styles.group}>
              {SUBMARKETS.map((m) => (
                <SubMarket
                  key={m.name}
                  market={m}
                  open={market === m.name}
                  onToggle={() => {
                    Haptics.selectionAsync();
                    setMarket((c) => (c === m.name ? null : m.name));
                  }}
                  onOpenSkill={(skillId) => leave(() => navigation.navigate('Marketplace', { skillId }))}
                  onOpenMarket={() => leave(() => navigation.navigate('Marketplace', { category: m.name }))}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.searchRow} onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}>
              <Animated.View
                style={[
                  styles.sectionHead,
                  styles.searchLabel,
                  {
                    opacity: search.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                    transform: [{ translateX: search.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
                  },
                ]}
              >
                <Icon name="history" size={13} color={colors.inkMuted} />
                <Text style={styles.sectionLabel}>Day log</Text>
              </Animated.View>

              <Animated.View
                pointerEvents={searchOpen ? 'none' : 'auto'}
                style={[styles.searchBtnWrap, { opacity: search.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
              >
                <Pressable hitSlop={6} style={styles.searchBtn} onPress={() => setSearchOpen(true)}>
                  <Icon name="search" size={14} color={colors.inkMuted} />
                </Pressable>
              </Animated.View>

              <Animated.View
                pointerEvents={searchOpen ? 'auto' : 'none'}
                style={[
                  styles.field,
                  {
                    opacity: search,
                    width: search.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SEARCH_CLOSED_W, fieldW || SEARCH_CLOSED_W],
                    }),
                  },
                ]}
              >
                <Icon name="search" size={13} color={colors.inkMuted} />
                <TextInput
                  ref={input}
                  style={styles.fieldInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search days"
                  placeholderTextColor={colors.inkMuted}
                  autoCorrect={false}
                  keyboardAppearance="light"
                  returnKeyType="search"
                />
                <Pressable
                  hitSlop={6}
                  onPress={() => {
                    setSearchOpen(false);
                    setQuery('');
                  }}
                >
                  <Icon name="clear" size={14} color={colors.inkMuted} />
                </Pressable>
              </Animated.View>
            </View>

            <View style={styles.group}>
              {visibleDays.map((d) => {
                const active = d.id === activeDayId;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => leave(() => onOpenDay(d))}
                    style={({ pressed }) => [styles.day, (active || pressed) && styles.rowOn]}
                  >
                    <View style={styles.dayHead}>
                      <Text style={[styles.dayTitle, active && styles.rowLabelOn]} numberOfLines={1}>
                        {d.title}
                      </Text>
                      {d.sent && <BlobMark seed={`sent-${d.id}`} size={9} fill={accents.green} />}
                    </View>
                    <View style={styles.dayFoot}>
                      <Text style={styles.dayDate}>{d.label}</Text>
                      {d.flags.length > 0 && (
                        <>
                          <Text style={styles.dayDivider}>·</Text>
                          <Icon name="audit" size={11} color={colors.inkMuted} />
                          <Text style={styles.dayDate}>
                            {d.flags.length} flagged
                          </Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                );
              })}
              {q && visibleDays.length === 0 && <Text style={styles.empty}>No days match that.</Text>}
            </View>
          </View>
        </ScrollView>

        <Pressable
          onPress={() => leave(() => onSend(null))}
          style={({ pressed }) => [styles.footer, pressed && { opacity: 0.85 }]}
        >
          <Icon name="paperplane" size={14} color="#fff" />
          <Text style={styles.footerText}>Send to clinician</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,21,21,0.22)' },

  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: spacing(1),
    ...cardShadow,
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(1),
    paddingBottom: spacing(1.5),
  },
  headSpacer: { flex: 1 },
  headBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  body: { paddingBottom: spacing(2), gap: spacing(2.5) },
  group: { gap: 2 },
  section: { gap: spacing(0.75) },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
  sectionLabel: { ...type.caption, color: colors.inkMuted, letterSpacing: 0.2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    height: 38,
    paddingHorizontal: spacing(1),
    borderRadius: 12,
  },
  rowOn: { backgroundColor: colors.page },
  rowIcon: { width: 20, alignItems: 'center' },
  rowDot: { marginHorizontal: 5 },
  rowLabel: { flex: 1, ...type.label, fontSize: 14, color: colors.inkMuted },
  rowLabelOn: { color: colors.ink },
  rowMeta: { ...type.caption, color: colors.inkMuted },

  preview: {
    marginLeft: spacing(2.5),
    marginBottom: spacing(0.75),
    paddingLeft: spacing(1.25),
    borderLeftWidth: 1.5,
    borderLeftColor: colors.border,
    gap: 2,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    height: 32,
    paddingHorizontal: spacing(0.75),
    borderRadius: 10,
  },
  previewTitle: { flex: 1, ...type.footnote, color: colors.ink },
  previewMeta: { ...type.caption, color: colors.inkMuted },
  previewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    height: 30,
    paddingHorizontal: spacing(0.75),
    borderRadius: 10,
  },
  previewAllText: { ...type.caption, color: colors.ink },

  searchRow: { height: 32, justifyContent: 'center' },
  searchLabel: { paddingHorizontal: spacing(1) },
  searchBtnWrap: { position: 'absolute', right: 0 },
  searchBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  field: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    height: 32,
    paddingHorizontal: spacing(1),
    borderRadius: 10,
    backgroundColor: colors.page,
    overflow: 'hidden',
  },
  fieldInput: { flex: 1, padding: 0, ...type.footnote, color: colors.ink },

  day: { paddingVertical: spacing(0.875), paddingHorizontal: spacing(1), borderRadius: 12, gap: 3 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
  dayTitle: { flex: 1, ...type.label, fontSize: 14, color: colors.inkMuted },
  dayFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.5) },
  dayDate: { ...type.caption, color: colors.inkMuted },
  dayDivider: { ...type.caption, color: colors.inkMuted },
  empty: { ...type.footnote, color: colors.inkMuted, padding: spacing(1) },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    height: 40,
    marginTop: spacing(1),
    marginHorizontal: spacing(0.5),
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  footerText: { ...type.label, color: '#fff' },
});
