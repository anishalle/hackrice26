import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

// The three-dot indicator from Messages: each dot runs the same pulse,
// staggered by 180ms.
function Dot({ delay }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 350, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(540 - delay),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }],
        },
      ]}
    />
  );
}

export default function TypingDots() {
  return (
    <View style={styles.row}>
      {[0, 180, 360].map((d) => (
        <Dot key={d} delay={d} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9B9BAE' },
});
