import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, type, spacing, radii, tagPalette, tagGlyph, cardShadow, softShadow } from '../theme';
import { CATEGORIES, shareSkill } from '../lib/skills';
import Icon from '../components/Icon';
import BlobMark from '../components/BlobMark';

// Sharing a skill is three fields and a couple of taps, on purpose. The
// marketplace is other people's work, and the bar to adding yours should be
// "I worked out the steps", not "I filled in a form".
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 280;

export default function ShareSkillScreen({ onBack, onShared }) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [summary, setSummary] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  // Mirrors the server's limits so the button tells the truth about whether a
  // tap will work, rather than round-tripping to find out.
  const valid = title.trim().length >= 3 && description.trim().length >= 10 && tags.length > 0;
  const lead = tags[0];
  const palette = lead ? tagPalette[lead] : { bg: colors.surface, text: colors.inkMuted };

  const toggle = (c) => {
    Haptics.selectionAsync();
    setTags((current) => {
      if (current.includes(c)) return current.filter((t) => t !== c);
      // Two at most. The first pick is the icon, so a third pick replaces the
      // second rather than silently doing nothing.
      return current.length < 2 ? [...current, c] : [current[0], c];
    });
  };

  const submit = async () => {
    if (!valid || pending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPending(true);
    setError(null);
    try {
      const skill = await shareSkill({
        title: title.trim(),
        description: description.trim(),
        tags,
        summary: summary.trim(),
      });
      onShared(skill);
    } catch (e) {
      setError(e.message);
      setPending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.navBar, { paddingTop: insets.top + spacing(0.5) }]}>
        <Pressable
          style={styles.navBtn}
          hitSlop={10}
          onPress={() => {
            Haptics.selectionAsync();
            onBack();
          }}
        >
          <Icon name="back" size={17} color={colors.ink} />
        </Pressable>
        <Pressable
          style={[styles.shareBtn, (!valid || pending) && styles.shareBtnOff]}
          onPress={submit}
          disabled={!valid || pending}
        >
          <Text style={styles.shareText}>{pending ? 'Sharing…' : 'Share'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing(3) }]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <BlobMark
            seed={title.trim() || 'new-skill'}
            size={52}
            glyphSize={26}
            fill={palette.bg}
            glyph={lead ? tagGlyph[lead] : undefined}
            glyphColor="#FFFFFF"
          />
          <Text style={styles.title}>Share a skill</Text>
          <Text style={styles.subtitle}>
            Something you worked out the steps for, written once so nobody else has to.
          </Text>
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHead}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.count}>{title.length} / {TITLE_MAX}</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Pill Box Checker"
            placeholderTextColor={colors.inkMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={TITLE_MAX}
            autoCapitalize="words"
            keyboardAppearance="light"
          />
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHead}>
            <Text style={styles.label}>What it does</Text>
            <Text style={styles.count}>{description.length} / {DESCRIPTION_MAX}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="One or two sentences. What does Axl do for someone, and when does it ask?"
            placeholderTextColor={colors.inkMuted}
            value={description}
            onChangeText={setDescription}
            maxLength={DESCRIPTION_MAX}
            multiline
            keyboardAppearance="light"
          />
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHead}>
            <Text style={styles.label}>Categories</Text>
            <Text style={styles.count}>{tags.length ? 'First pick sets the icon' : 'Pick one or two'}</Text>
          </View>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const on = tags.includes(c);
              return (
                <Pressable
                  key={c}
                  style={[styles.chip, on && { backgroundColor: tagPalette[c].bg }]}
                  onPress={() => toggle(c)}
                >
                  <Text style={[styles.chipText, on && { color: tagPalette[c].text }]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHead}>
            <Text style={styles.label}>Longer notes</Text>
            <Text style={styles.count}>Optional</Text>
          </View>
          <TextInput
            style={[styles.input, styles.multiline, styles.tall]}
            placeholder="Anything someone should know before they add it: what to have ready, where it pauses, what it will not do."
            placeholderTextColor={colors.inkMuted}
            value={summary}
            onChangeText={setSummary}
            maxLength={2000}
            multiline
            keyboardAppearance="light"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2.5),
    paddingBottom: spacing(1.5),
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  shareBtn: {
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2.5),
  },
  shareBtnOff: { opacity: 0.35 },
  shareText: { ...type.label, color: '#fff' },

  container: { paddingHorizontal: spacing(2.5), gap: spacing(2.5) },

  hero: { gap: spacing(1) },
  title: { ...type.title, color: colors.ink, marginTop: spacing(0.5) },
  subtitle: { ...type.callout, color: colors.inkMuted },

  field: { gap: spacing(1) },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...type.heading, color: colors.ink },
  count: { ...type.footnote, color: colors.inkMuted },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    ...type.callout,
    color: colors.ink,
    ...softShadow,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing(1.5) },
  tall: { minHeight: 140 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  chip: {
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingVertical: spacing(0.875),
    paddingHorizontal: spacing(1.75),
    ...softShadow,
  },
  chipText: { ...type.label, color: colors.inkMuted },

  error: {
    ...type.footnote,
    color: colors.ink,
    backgroundColor: colors.peach,
    borderRadius: radii.tile,
    padding: spacing(1.5),
    ...cardShadow,
  },
});
