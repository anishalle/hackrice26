import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';

// Wavefront delays for a 3x3 grid: chevron pattern driving left-to-right.
const DELAYS = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  return total < 60 ? `${total.toFixed(1)}s` : `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

function Cell({ delay }) {
  const opacity = useRef(new Animated.Value(0.15)).current;
  useEffect(() => {
    let loop;
    const timer = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.15, duration: 260, useNativeDriver: true }),
          Animated.delay(130),
        ])
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(timer);
      loop && loop.stop();
    };
  }, [delay]);
  return <Animated.View style={[styles.cell, { opacity }]} />;
}

export default function LoadingState({ label = 'Working' }) {
  const elapsed = useElapsed();
  return (
    <View style={styles.row}>
      <View style={styles.grid}>
        {DELAYS.map((d, i) => (
          <Cell key={i} delay={d} />
        ))}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.elapsed}>{elapsed}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  grid: { width: 15, height: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 1.5 },
  cell: { width: 4, height: 4, borderRadius: 1, backgroundColor: colors.ink },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  elapsed: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkMuted, marginLeft: 'auto' },
});
