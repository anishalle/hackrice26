import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { Blobatar } from '@blobatar/react-native';
import * as Haptics from 'expo-haptics';
import VoiceWave from './VoiceWave';
import Icon from './Icon';
import { colors, type, spacing, radii, cardShadow } from '../theme';

// A droplet rather than a circle: a round blob spinning is indistinguishable
// from one sitting still. Eye colour is pinned to the head colour, which is
// how blobatar draws a silhouette with no face.
const SPIN_MS = 3000;
const SHAPE = { shape: 0.95 };

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
          <Blobatar
            name="axl-voice"
            size={30}
            traits={SHAPE}
            palette={{ head: colors.ink, eye: colors.ink }}
            title="Recording"
          />
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
