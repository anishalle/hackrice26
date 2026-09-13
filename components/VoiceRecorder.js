import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import BlobMark from './BlobMark';
import VoiceWave from './VoiceWave';
import Icon from './Icon';
import { colors, type, spacing, radii, cardShadow } from '../theme';

// The same lopsided blob the marketplace tiles wear, turning on the spot. A
// perfect circle spinning is indistinguishable from one sitting still, and the
// droplet this used to be read as a cog; the organic silhouette is off-centre
// enough for the rotation to show without looking like machinery.
const SPIN_MS = 3000;

const clock = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function VoiceRecorder({ onSend, onCancel }) {
  const [seconds, setSeconds] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      clearInterval(tick);
      loop.stop();
    };
  }, []);

  const stop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend?.(Math.max(1, seconds));
  };

  return (
    <View style={styles.card}>
      <Pressable style={styles.cancel} hitSlop={10} onPress={onCancel}>
        <Icon name="clear" size={18} color={colors.inkMuted} />
      </Pressable>

      <Pressable style={styles.spinner} onPress={stop}>
        <Animated.View
          style={{
            transform: [
              { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          }}
        >
          <BlobMark seed="axl-voice" size={30} fill={colors.ink} />
        </Animated.View>
      </Pressable>

      <Text style={styles.time}>{clock(seconds)}</Text>

      <VoiceWave active color={colors.ink} height={26} style={styles.wave} />

      <Text style={styles.hint}>Listening. Tap to send.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2.5),
    ...cardShadow,
  },
  cancel: { position: 'absolute', top: spacing(1.5), right: spacing(2), zIndex: 1 },
  spinner: { height: 40, justifyContent: 'center' },
  time: { ...type.footnote, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  wave: { alignSelf: 'stretch' },
  hint: { ...type.caption, color: colors.inkMuted },
});
