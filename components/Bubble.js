import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

// iMessage bubble. The tail is the classic two-shape trick: a rounded blob
// bleeding out of the bottom corner, then a page-colored mask carving the
// concave curve back out of it. No SVG, no clipping, just two Views.
export default function Bubble({ side = 'left', color, style, children }) {
  const mine = side === 'right';
  const fill = color ?? (mine ? colors.ink : colors.surface);

  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs, { backgroundColor: fill }, style]}>
      <View style={[styles.tail, mine ? styles.tailMine : styles.tailTheirs, { backgroundColor: fill }]} />
      <View style={[styles.mask, mine ? styles.maskMine : styles.maskTheirs]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '82%',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },

  tail: { position: 'absolute', bottom: -1, width: 20, height: 20 },
  tailTheirs: { left: -7, borderBottomRightRadius: 15 },
  tailMine: { right: -7, borderBottomLeftRadius: 15 },

  mask: { position: 'absolute', bottom: -1, width: 26, height: 21, backgroundColor: colors.bg },
  maskTheirs: { left: -26, borderBottomRightRadius: 10 },
  maskMine: { right: -26, borderBottomLeftRadius: 10 },
});
