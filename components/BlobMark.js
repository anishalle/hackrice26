import { View, StyleSheet } from 'react-native';
import { Blobatar } from '@blobatar/react-native';
import Icon from './Icon';

// A glyph sitting on a lopsided blob instead of a rounded square.
//
// The shape is blobatar's `organic` silhouette with the eyes painted out (eye
// colour pinned to head colour), so each mark is an uneven circle that the
// seed makes slightly different from its neighbours, and the whole set stays
// in the same family as Axl and the member avatars.
const ORGANIC = { shape: 0.25 };

export default function BlobMark({ seed, size = 44, fill, glyph, glyphColor, glyphSize = 18 }) {
  return (
    <View style={{ width: size, height: size }}>
      <Blobatar name={seed} size={size} traits={ORGANIC} palette={{ head: fill, eye: fill }} />
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Icon name={glyph} size={glyphSize} color={glyphColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
