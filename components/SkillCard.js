import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Icon from './Icon';
import { colors, spacing, radii, tagPalette, tagGlyph, type, softShadow } from '../theme';

// Compact marketplace tile: symbol, name, author, description, tag + karma.
export default function SkillCard({ skill, style }) {
  const [vote, setVote] = useState(null); // null | 'up' | 'down'
  const karma = skill.karma + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0);
  const palette = tagPalette[skill.tags[0]] ?? { bg: colors.bg, text: colors.inkMuted };

  const toggleVote = (direction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVote((current) => (current === direction ? null : direction));
  };

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.mark, { backgroundColor: palette.bg }]}>
        <Icon name={tagGlyph[skill.tags[0]]} size={20} color={palette.text} />
      </View>

      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={2}>{skill.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{skill.author}</Text>
      </View>

      <Text style={styles.description} numberOfLines={3}>{skill.description}</Text>

      <View style={styles.footer}>
        <View style={[styles.tag, { backgroundColor: palette.bg }]}>
          <Text style={[styles.tagText, { color: palette.text }]}>{skill.tags[0]}</Text>
        </View>

        <View style={styles.voteRail}>
          <Pressable hitSlop={8} onPress={() => toggleVote('up')}>
            <Icon name="voteUp" size={12} color={vote === 'up' ? colors.ink : colors.inkMuted} />
          </Pressable>
          <Text style={[styles.karma, vote === 'up' && { color: colors.ink }]}>{karma}</Text>
          <Pressable hitSlop={8} onPress={() => toggleVote('down')}>
            <Icon name="voteDown" size={12} color={vote === 'down' ? colors.ink : colors.inkMuted} />
          </Pressable>
        </View>
      </View>
    </View>
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
  mark: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  head: { gap: 1 },
  title: { ...type.label, fontSize: 15, color: colors.ink },
  author: { ...type.caption, color: colors.inkMuted },
  description: { ...type.footnote, color: colors.inkMuted, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(0.5) },
  tag: { borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 1 },
  tagText: { ...type.caption },
  voteRail: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.5) },
  karma: { ...type.caption, color: colors.ink, minWidth: 22, textAlign: 'center' },
});
