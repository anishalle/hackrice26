import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Blobatar } from '@blobatar/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  colors, accents, type, spacing, radii, tagPalette, tagGlyph, cardShadow, softShadow,
} from '../theme';
import { removeSkill } from '../lib/skills';
import Icon from '../components/Icon';
import BlobMark from '../components/BlobMark';
import { EYE } from '../components/AgentBlob';
import VoteRail from '../components/VoteRail';

const ROUND = { shape: 0.05 };

function Person({ name, tint }) {
  return <Blobatar name={name} size={26} traits={ROUND} palette={{ head: tint, eye: EYE }} title={name} />;
}

export default function SkillDetailScreen({ skill, onBack }) {
  const insets = useSafeAreaInsets();
  const [asked, setAsked] = useState([]);
  const [draft, setDraft] = useState('');
  const [removing, setRemoving] = useState(false);

  const palette = tagPalette[skill.tags[0]];
  // Long-form docs ride along with the skill. Most only have the card text.
  const doc = skill.docs;
  const creator = skill.author.replace('@', '');

  // Only the person who shared a skill sees this, and it asks first: the skill
  // comes off the marketplace for everyone, not just this phone.
  const confirmRemove = () => {
    Haptics.selectionAsync();
    Alert.alert('Remove this skill?', 'It comes off the marketplace for everyone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemoving(true);
          try {
            await removeSkill(skill.slug);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onBack();
          } catch (e) {
            setRemoving(false);
            Alert.alert('Could not remove it', e.message);
          }
        },
      },
    ]);
  };

  const ask = () => {
    const question = draft.trim();
    if (!question) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // No answer yet, which is the honest state for a question nobody has seen.
    setAsked((current) => [...current, { id: String(Date.now()), asker: 'you', question }]);
    setDraft('');
  };

  const threads = [...(doc?.forum ?? []), ...asked];

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
        <View style={styles.navActions}>
          {skill.mine && (
            <Pressable style={styles.removeBtn} hitSlop={6} onPress={confirmRemove} disabled={removing}>
              <Text style={styles.removeText}>{removing ? 'Removing…' : 'Remove'}</Text>
            </Pressable>
          )}
          <Pressable style={styles.addBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing(2) }]}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.hero}>
          <BlobMark
            seed={skill.slug}
            size={52}
            glyphSize={26}
            fill={palette.bg}
            glyph={tagGlyph[skill.tags[0]]}
            glyphColor="#FFFFFF"
          />
          <Text style={styles.title}>{skill.title}</Text>

          <View style={styles.byline}>
            <Person name={creator} tint={accents.periwinkle} />
            <Text style={styles.author}>{skill.author}</Text>
            <View style={[styles.tag, { backgroundColor: palette.bg }]}>
              <Text style={[styles.tagText, { color: palette.text }]}>{skill.tags[0]}</Text>
            </View>
            <VoteRail karma={skill.karma} large style={styles.vote} />
          </View>
        </View>

        <Text style={styles.summary}>{doc?.summary ?? skill.description}</Text>

        {doc?.features?.length || doc?.why?.length ? (
          <>
            {doc.features?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What it does</Text>
              <View style={styles.features}>
                {doc.features.map((f) => (
                  <View key={f.title} style={styles.feature}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureBody}>{f.body}</Text>
                  </View>
                ))}
              </View>
            </View>
            ) : null}

            {doc.why?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why it helps</Text>
              <View style={styles.card}>
                {doc.why.map((w, i) => (
                  <View key={w} style={[styles.whyRow, i > 0 && styles.whyDivided]}>
                    <BlobMark seed={w} size={9} fill={palette.bg} style={styles.bullet} />
                    <Text style={styles.whyText}>{w}</Text>
                  </View>
                ))}
              </View>
            </View>
            ) : null}
          </>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions for {skill.author}</Text>

          {threads.map((t) => (
            <View key={t.id} style={styles.card}>
              <View style={styles.qHead}>
                <Person name={t.asker} tint={accents.mint} />
                <Text style={styles.qAsker}>@{t.asker}</Text>
              </View>
              <Text style={styles.question}>{t.question}</Text>

              {t.answer ? (
                <View style={styles.answer}>
                  <View style={styles.qHead}>
                    <Person name={creator} tint={accents.periwinkle} />
                    <Text style={styles.qAsker}>{skill.author}</Text>
                    <View style={styles.creatorTag}>
                      <Text style={styles.creatorTagText}>creator</Text>
                    </View>
                  </View>
                  <Text style={styles.answerText}>{t.answer}</Text>
                </View>
              ) : (
                <Text style={styles.pending}>Waiting on {skill.author}</Text>
              )}
            </View>
          ))}

          <View style={styles.askBar}>
            <TextInput
              style={styles.askInput}
              placeholder={'Ask ' + skill.author + ' a question'}
              placeholderTextColor={colors.inkMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
              submitBehavior="submit"
              onSubmitEditing={ask}
              keyboardAppearance="light"
            />
            <Pressable style={styles.askBtn} hitSlop={8} onPress={ask}>
              <Icon name="send" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
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
  navActions: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  addBtn: {
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2.5),
  },
  addText: { ...type.label, color: '#fff' },
  removeBtn: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2),
    ...softShadow,
  },
  removeText: { ...type.label, color: colors.ink },

  container: { paddingHorizontal: spacing(2.5), gap: spacing(3) },

  hero: { gap: spacing(1.5) },
  title: { ...type.title, color: colors.ink },
  byline: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  author: { ...type.label, color: colors.inkMuted },
  tag: { borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: 9 },
  tagText: { ...type.caption },
  vote: { marginLeft: 'auto' },

  summary: { ...type.body, color: colors.ink },

  section: { gap: spacing(1.25) },
  sectionTitle: { ...type.heading, color: colors.ink },

  features: { gap: spacing(1.25) },
  feature: {
    gap: 3,
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    padding: spacing(2),
    ...softShadow,
  },
  featureTitle: { ...type.bodyMedium, color: colors.ink },
  featureBody: { ...type.footnote, color: colors.inkMuted },

  card: {
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    padding: spacing(2),
    ...softShadow,
  },
  whyRow: { flexDirection: 'row', gap: spacing(1.25), alignItems: 'flex-start' },
  whyDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing(1),
  },
  bullet: { marginTop: 6 },
  whyText: { ...type.footnote, color: colors.ink, flex: 1 },

  qHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
  qAsker: { ...type.caption, color: colors.inkMuted },
  question: { ...type.bodyMedium, color: colors.ink },
  answer: {
    gap: spacing(0.75),
    borderLeftWidth: 2,
    borderLeftColor: colors.periwinkle,
    paddingLeft: spacing(1.5),
    marginTop: spacing(0.5),
  },
  answerText: { ...type.footnote, color: colors.inkMuted },
  creatorTag: {
    backgroundColor: colors.periwinkle,
    borderRadius: radii.pill,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  creatorTagText: { ...type.caption, fontSize: 10, color: colors.ink },
  pending: { ...type.caption, color: colors.inkMuted },

  askBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: spacing(0.75),
    paddingLeft: spacing(2),
    paddingRight: spacing(0.75),
    ...cardShadow,
  },
  askInput: {
    flex: 1,
    maxHeight: 100,
    paddingTop: 9,
    paddingBottom: 9,
    ...type.callout,
    color: colors.ink,
  },
  askBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
});
