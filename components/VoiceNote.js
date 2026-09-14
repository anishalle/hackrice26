import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import VoiceWave from './VoiceWave';
import Icon from './Icon';
import { colors, type, spacing } from '../theme';

// A finished voice note: play toggles the same waveform the recorder used, so
// a message looks the same whichever end of it you are on.
const clock = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function VoiceNote({ seconds = 4, tint = colors.ink, style }) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef(null);

  // Nothing is decoding audio yet, so playback ends on the clock instead.
  useEffect(() => {
    if (!playing) return;
    timer.current = setTimeout(() => setPlaying(false), seconds * 1000);
    return () => clearTimeout(timer.current);
  }, [playing, seconds]);

  return (
    <View style={[styles.row, style]}>
      <Pressable
        hitSlop={8}
        onPress={() => {
          Haptics.selectionAsync();
          setPlaying((p) => !p);
        }}
      >
        <Icon name={playing ? 'pause' : 'play'} size={15} color={tint} />
      </Pressable>

      <VoiceWave active={playing} color={tint} height={22} count={28} style={styles.wave} />

      <Text style={[styles.time, { color: tint }]}>{clock(seconds)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.25), minWidth: 210 },
  wave: { flex: 1 },
  time: { ...type.caption, fontVariant: ['tabular-nums'] },
});
