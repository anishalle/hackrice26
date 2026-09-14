import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Icon from './Icon';
import { colors, type, spacing, radii } from '../theme';

// One vote control for both the grid card and the detail page, so the two
// cannot drift on what a vote does.
export default function VoteRail({ karma, large = false, style }) {
  const [vote, setVote] = useState(null); // null | 'up' | 'down'
  const score = karma + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0);

  const toggle = (direction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVote((current) => (current === direction ? null : direction));
  };

  const size = large ? 16 : 12;

  return (
    <View style={[styles.row, large && styles.rowLarge, style]}>
      <Pressable hitSlop={10} onPress={() => toggle('up')}>
        <Icon name="voteUp" size={size} color={vote === 'up' ? colors.ink : colors.inkMuted} />
      </Pressable>
      <Text style={[styles.karma, large && styles.karmaLarge, vote && styles.karmaVoted]}>{score}</Text>
      <Pressable hitSlop={10} onPress={() => toggle('down')}>
        <Icon name="voteDown" size={size} color={vote === 'down' ? colors.ink : colors.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.5) },
  rowLarge: {
    gap: spacing(1),
    backgroundColor: colors.page,
    borderRadius: radii.pill,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.5),
  },
  karma: { ...type.caption, color: colors.inkMuted, minWidth: 22, textAlign: 'center' },
  karmaLarge: { ...type.label, minWidth: 30 },
  karmaVoted: { color: colors.ink },
});
