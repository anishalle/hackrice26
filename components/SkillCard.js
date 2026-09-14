import { View, Text, Pressable, StyleSheet } from 'react-native';
import BlobMark from './BlobMark';
import VoteRail from './VoteRail';
import { colors, spacing, radii, tagPalette, tagGlyph, type, softShadow } from '../theme';

// Compact marketplace tile: symbol, name, author, description, tag + karma.
export default function SkillCard({ skill, style, onPress }) {
  const palette = tagPalette[skill.tags[0]] ?? { bg: colors.page, text: colors.inkMuted };

  return (
    <Pressable style={[styles.card, style]} onPress={onPress}>
      <BlobMark
        seed={skill.slug}
        size={38}
        glyphSize={20}
        fill={palette.bg}
        glyph={tagGlyph[skill.tags[0]]}
        glyphColor="#FFFFFF"
      />

      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={2}>{skill.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{skill.author}</Text>
      </View>

      <Text style={styles.description} numberOfLines={3}>{skill.description}</Text>

      <View style={styles.footer}>
        <View style={[styles.tag, { backgroundColor: palette.bg }]}>
          <Text style={[styles.tagText, { color: palette.text }]}>{skill.tags[0]}</Text>
        </View>

        <VoteRail karma={skill.karma} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing(1.75),
    ...softShadow,
  },
  head: { gap: 1 },
  title: { ...type.label, fontSize: 15, color: colors.ink },
  author: { ...type.caption, color: colors.inkMuted },
  description: { ...type.footnote, color: colors.inkMuted, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(0.5) },
  tag: { borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 1 },
  tagText: { ...type.caption },
});
