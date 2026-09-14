import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { colors } from '../theme';

// The bar field from a voice note, shared by recording and playback so the
// two read as the same waveform in two states.
//
// Each bar owns its scaleY and its own loop timing, which is what stops the
// field pulsing in unison. Heights are drawn once into a ref rather than per
// render: re-rolling them every frame turns a waveform into static.
const BARS = 40;
const BASE = 0.14;

function Bar({ peak, period, delay, active, color, height }) {
  const v = useRef(new Animated.Value(BASE)).current;

  useEffect(() => {
    if (!active) {
      Animated.timing(v, { toValue: BASE, duration: 220, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: peak, duration: period, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: BASE + 0.08, duration: period, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  return (
    <Animated.View
      style={[styles.bar, { height, backgroundColor: color, transform: [{ scaleY: v }] }]}
    />
  );
}

export default function VoiceWave({ active = false, color = colors.ink, height = 26, count = BARS, style }) {
  const shape = useRef(
    Array.from({ length: count }, (_, i) => ({
      peak: 0.3 + Math.random() * 0.7,
      period: 320 + Math.random() * 420,
      delay: i * 28,
    }))
  ).current;

  return (
    <View style={[styles.row, { height }, style]}>
      {shape.map((b, i) => (
        <Bar key={i} {...b} active={active} color={color} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bar: { width: 2.5, borderRadius: 2 },
});
