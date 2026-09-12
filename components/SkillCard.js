import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowFatUp, ArrowFatDown } from 'phosphor-react-native';
import { colors, fonts, spacing, radii, tagPalette, cardShadow } from '../theme';

export default function SkillCard({ skill }) {
  const [vote, setVote] = useState(null); // null | 'up' | 'down'
  const karma = skill.karma + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0);

  const toggleVote = (direction) => {
    setVote((current) => (current === direction ? null : direction));
  };

  return (
    <View style={styles.card}>
      <View style={styles.voteRail}>
        <Pressable hitSlop={8} onPress={() => toggleVote('up')}>
          <ArrowFatUp
            size={18}
            weight={vote === 'up' ? 'fill' : 'regular'}
            color={vote === 'up' ? colors.indigo : colors.inkMuted}
          />
        </Pressable>
        <Text style={styles.karma}>{karma}</Text>
        <Pressable hitSlop={8} onPress={() => toggleVote('down')}>
          <ArrowFatDown
            size={18}
            weight={vote === 'down' ? 'fill' : 'regular'}
            color={vote === 'down' ? colors.inkMuted : colors.inkMuted}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{skill.title}</Text>
          <View style={styles.installBtn}>
            <Pressable>
              <Text style={styles.installText}>Add</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.description}>{skill.description}</Text>

        <View style={styles.footerRow}>
          <View style={styles.tagRow}>
            {skill.tags.map((tag) => {
              const palette = tagPalette[tag] ?? { bg: colors.bg, text: colors.inkMuted };
              return (
                <View key={tag} style={[styles.tag, { backgroundColor: palette.bg }]}>
                  <Text style={[styles.tagText, { color: palette.text }]}>{tag}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.author}>{skill.author}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.5),
    ...cardShadow,
  },
  voteRail: { alignItems: 'center', gap: spacing(0.5), paddingTop: spacing(0.25) },
  karma: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  body: { flex: 1, gap: spacing(1) },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing(1) },
  title: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  installBtn: { backgroundColor: colors.ink, borderRadius: radii.pill, paddingVertical: spacing(0.5), paddingHorizontal: spacing(1.5) },
  installText: { fontFamily: fonts.medium, fontSize: 13, color: '#fff' },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(1), marginTop: spacing(0.5) },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(0.75), flex: 1 },
  tag: { borderRadius: radii.pill, paddingVertical: spacing(0.4), paddingHorizontal: spacing(1) },
  tagText: { fontFamily: fonts.medium, fontSize: 11.5 },
  author: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkMuted },
});
