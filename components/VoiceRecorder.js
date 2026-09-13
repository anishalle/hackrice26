import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import BlobMark from './BlobMark';
import VoiceWave from './VoiceWave';
import Icon from './Icon';
import { listen, requestSpeechPermission, speechAvailable } from '../lib/speech';
import { colors, type, spacing, radii, cardShadow } from '../theme';

// Dictation for the prompt bar. The same recogniser the check-in uses,
// started the moment the card appears, with the words showing as they land
// so there is never a doubt about whether it is hearing anything.
//
// One full-width button ends the take; the recogniser's own `end` is what
// hands the transcript back, so the last words are in before it goes. The
// spinning blob is the same lopsided one the marketplace tiles wear: a
// perfect circle spinning is indistinguishable from one sitting still.
const SPIN_MS = 3000;

const clock = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function VoiceRecorder({ onSend, onCancel }) {
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [stopping, setStopping] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const session = useRef(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
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

    (async () => {
      if (!speechAvailable()) {
        setError('Axl cannot listen on this device. Type your request instead.');
        return;
      }
      if (!(await requestSpeechPermission())) {
        setError('Axl needs the microphone to hear you. Turn it on in Settings.');
        return;
      }
      if (!alive.current) return;
      session.current = listen({
        onTranscript: (text) => { if (alive.current) setTranscript(text); },
        onError: (e) => { if (alive.current) setError(e.message); },
        onEnd: ({ transcript: heard }) => {
          session.current = null;
          if (!alive.current) return;
          onSend?.(heard.trim());
        },
      });
    })();

    return () => {
      alive.current = false;
      clearInterval(tick);
      loop.stop();
      session.current?.cancel();
      session.current = null;
    };
  }, []);

  const stop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!session.current) {
      // Nothing was ever listening: hand back what there is and close.
      onSend?.(transcript.trim());
      return;
    }
    setStopping(true);
    session.current.stop();
  };

  const cancel = () => {
    Haptics.selectionAsync();
    session.current?.cancel();
    session.current = null;
    onCancel?.();
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Animated.View
          style={{
            transform: [
              { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          }}
        >
          <BlobMark seed="axl-voice" size={30} fill={colors.ink} />
        </Animated.View>
        <Text style={styles.time}>{clock(seconds)}</Text>
        <Pressable style={styles.cancel} hitSlop={12} onPress={cancel} accessibilityRole="button" accessibilityLabel="Cancel recording">
          <Icon name="clear" size={18} color={colors.inkMuted} />
        </Pressable>
      </View>

      <VoiceWave active={!error && !stopping} color={colors.ink} height={26} style={styles.wave} />

      <Text style={styles.transcript} numberOfLines={3} accessibilityLiveRegion="polite">
        {error || transcript || (stopping ? 'Finishing up.' : 'Listening. Say what you need.')}
      </Text>

      <Pressable
        onPress={stop}
        disabled={stopping}
        accessibilityRole="button"
        style={({ pressed }) => [styles.send, (pressed || stopping) && styles.pressed]}
      >
        <Icon name={error ? 'clear' : 'send'} size={16} color="#fff" />
        <Text style={styles.sendText}>{error ? 'Close' : stopping ? 'Sending' : 'Stop and send'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
    gap: spacing(1.25),
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2.5),
    ...cardShadow,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.25), minHeight: 40 },
  time: { flex: 1, ...type.footnote, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  cancel: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  wave: { alignSelf: 'stretch' },
  transcript: { ...type.callout, color: colors.ink, textAlign: 'center', minHeight: 21 },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  sendText: { ...type.heading, color: '#fff' },
  pressed: { opacity: 0.6 },
});
