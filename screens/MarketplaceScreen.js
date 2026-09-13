import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radii, tagPalette, tagGlyph, type, cardShadow, softShadow } from '../theme';
import { SKILLS, CATEGORIES } from '../data/skills';
import SkillCard from '../components/SkillCard';
import Icon from '../components/Icon';

const PAGE = 6;
const FEATURED = SKILLS.filter((s) => s.featured);

function FeaturedCard({ skill, width }) {
  const palette = tagPalette[skill.tags[0]];
  return (
    <View style={[styles.featured, { backgroundColor: palette.bg, width }]}>
      <View style={styles.featuredMark}>
        <Icon name={tagGlyph[skill.tags[0]]} size={24} color={palette.text} />
      </View>
      <Text style={[styles.featuredTitle, { color: palette.text }]}>{skill.title}</Text>
      <Text style={styles.featuredBody} numberOfLines={3}>{skill.description}</Text>
      <View style={styles.featuredFooter}>
        <Text style={styles.featuredAuthor}>{skill.author}</Text>
        <Pressable style={styles.addBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const featuredW = Math.min(width - spacing(8), 320);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [shown, setShown] = useState(PAGE);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SKILLS.filter(
      (s) =>
        (!category || s.tags.includes(category)) &&
        (!q ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.author.toLowerCase().includes(q))
    );
  }, [query, category]);

  // Featured is a browse affordance — it only gets in the way once the list
  // has been narrowed down.
  const browsing = !query.trim() && !category;

  const pick = (next) => {
    Haptics.selectionAsync();
    setCategory(next);
    setShown(PAGE);
  };

  const visible = results.slice(0, shown);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing(2) }]}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>What others have worked out, ranked by what helped.</Text>
        </View>

        <View style={styles.searchField}>
          <Icon name="search" size={16} color={colors.inkMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search resources"
            placeholderTextColor={colors.inkMuted}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setShown(PAGE);
            }}
            returnKeyType="search"
            autoCorrect={false}
            keyboardAppearance="light"
          />
          {query.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setQuery('')}>
              <Icon name="clear" size={16} color={colors.inkMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          <Pressable style={[styles.chip, !category && styles.chipActive]} onPress={() => pick(null)}>
            <Text style={[styles.chipText, !category && styles.chipTextActive]}>All</Text>
          </Pressable>
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <Pressable
                key={c}
                style={[styles.chip, active && { backgroundColor: tagPalette[c].bg, borderColor: tagPalette[c].bg }]}
                onPress={() => pick(active ? null : c)}
              >
                <Text style={[styles.chipText, active && { color: tagPalette[c].text }]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {browsing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={featuredW + spacing(1.5)}
              decelerationRate="fast"
              contentContainerStyle={styles.featuredRow}
              style={styles.featuredScroll}
            >
              {FEATURED.map((s) => (
                <FeaturedCard key={s.id} skill={s} width={featuredW} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{browsing ? 'All resources' : 'Results'}</Text>
            <Text style={styles.sectionCount}>{results.length}</Text>
          </View>

          {results.length === 0 ? (
            <Text style={styles.empty}>Nothing matches that yet. Try another word or category.</Text>
          ) : (
            <View style={styles.grid}>
              {visible.map((s) => (
                <SkillCard key={s.id} skill={s} style={styles.gridItem} />
              ))}
              {/* An odd count would stretch the last tile to full width otherwise. */}
              {visible.length % 2 === 1 && <View style={styles.gridItem} />}
            </View>
          )}

          {shown < results.length && (
            <Pressable
              style={styles.loadMore}
              onPress={() => {
                Haptics.selectionAsync();
                setShown((n) => n + PAGE);
              }}
            >
              <Text style={styles.loadMoreText}>Load more</Text>
              <Text style={styles.loadMoreCount}>
                {shown} / {results.length}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: spacing(2.5), paddingBottom: spacing(3), gap: spacing(2) },
  headerBlock: { gap: spacing(0.5) },
  title: { ...type.title, color: colors.ink },
  subtitle: { ...type.callout, color: colors.inkMuted },

  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    ...softShadow,
  },
  searchInput: { flex: 1, padding: 0, ...type.callout, color: colors.ink },

  // Chips and the featured row bleed to the screen edge, so they cancel the
  // container padding and re-add it inside.
  chipScroll: { marginHorizontal: -spacing(2.5) },
  chipRow: { paddingHorizontal: spacing(2.5), gap: spacing(1) },
  chip: {
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingVertical: spacing(0.875),
    paddingHorizontal: spacing(1.75),
  },
  chipActive: { backgroundColor: colors.green },
  chipText: { ...type.label, color: colors.inkMuted },
  chipTextActive: { color: colors.ink },

  section: { gap: spacing(1.25) },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...type.heading, color: colors.ink },
  sectionCount: { ...type.footnote, color: colors.inkMuted },

  featuredScroll: { marginHorizontal: -spacing(2.5) },
  featuredRow: { paddingHorizontal: spacing(2.5), gap: spacing(1.5) },
  featured: { borderRadius: 26, padding: spacing(2.25), gap: spacing(1), ...cardShadow },
  featuredMark: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredTitle: { ...type.bodyMedium },
  featuredBody: { ...type.footnote, color: colors.ink, opacity: 0.75 },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing(0.5),
  },
  featuredAuthor: { ...type.caption, color: colors.ink, opacity: 0.6 },
  addBtn: {
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(2),
  },
  addText: { ...type.label, color: '#fff' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.25) },
  gridItem: { width: '48%', flexGrow: 0 },
  empty: { ...type.callout, color: colors.inkMuted, paddingVertical: spacing(2) },

  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    marginTop: spacing(0.5),
    paddingVertical: spacing(1.5),
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...softShadow,
  },
  loadMoreText: { ...type.label, color: colors.ink },
  loadMoreCount: { ...type.footnote, color: colors.inkMuted },
});
