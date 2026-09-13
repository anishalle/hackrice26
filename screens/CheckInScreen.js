import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AgentBlob, { AXL_HERO_SEED } from '../components/AgentBlob';
import VerificationCheck from '../components/VerificationCheck';
import VoiceWave from '../components/VoiceWave';
import Icon from '../components/Icon';
import { CHECK_IN_LINES } from '../data/checkin';
import { ensureVoiceProfile, matchedCount, saveTake, wordsOf } from '../lib/checkin';
import { listen, requestSpeechPermission, speechAvailable } from '../lib/speech';
import { cardShadow, colors, radii, softShadow, spacing, type } from '../theme';

// The weekly check-in: five lines read out loud, one at a time. Each word sits
// faded until the recogniser hears it, then comes up to full ink, so the line
// itself is the progress bar and there is nothing else to watch.
//
// Sits after Persona on the way in, and behind the Home card's Check in.
// Start and Stop are the whole control surface: Stop ends the take whether or
// not every word landed, so a bad line never traps anyone. Skip leaves.

const DIM = 0.3;
// Long enough for the last word to finish brightening before the line swaps.
const SETTLE_MS = 700;

function Word({ text, lit }) {
  const opacity = useRef(new Animated.Value(lit ? 1 : DIM)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: lit ? 1 : DIM,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [lit, opacity]);
  return <Animated.Text style={[styles.word, { opacity }]}>{text}</Animated.Text>;
}

export default function CheckInScreen({ onDone }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState('invite');
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState(0);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(0);
  const session = useRef(null);
  const alive = useRef(true);
  const heardRef = useRef(0);
  const indexRef = useRef(0);
  const finishing = useRef(false);
  const failed = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      session.current?.cancel();
    };
  }, []);

  const line = CHECK_IN_LINES[index];
  const words = wordsOf(line);
  const last = index === CHECK_IN_LINES.length - 1;

  const begin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('');
    // Continuing is the consent, so the profile is created here and the
    // microphone asked for after, never the other way round.
    ensureVoiceProfile().catch(() => {});
    if (!speechAvailable()) {
      setError('Axl cannot listen on this device. Skip for now, or try on your phone.');
    } else if (!(await requestSpeechPermission())) {
      setError('Axl needs the microphone to hear you. Turn it on in Settings, or skip this week.');
    }
    if (alive.current) setPhase('read');
  };

  const advance = () => {
    if (!alive.current) return;
    if (indexRef.current >= CHECK_IN_LINES.length - 1) {
      setPhase('done');
      return;
    }
    indexRef.current += 1;
    heardRef.current = 0;
    setIndex(indexRef.current);
    setHeard(0);
  };

  // Ends the take. The recogniser's own `end` is what moves on, so the wav is
  // closed before it is uploaded.
  const finish = () => {
    if (finishing.current || !session.current) return;
    finishing.current = true;
    session.current.stop();
  };

  const start = async () => {
    if (session.current) return;
    setError('');
    if (!speechAvailable()) {
      setError('Axl cannot listen on this device. Skip for now, or try on your phone.');
      return;
    }
    if (!(await requestSpeechPermission())) {
      setError('Axl needs the microphone to hear you. Turn it on in Settings, or skip this week.');
      return;
    }
    if (!alive.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phrase = CHECK_IN_LINES[indexRef.current];
    finishing.current = false;
    failed.current = false;
    setListening(true);
    session.current = listen({
      onTranscript: (transcript) => {
        if (!alive.current) return;
        const count = matchedCount(phrase, transcript, heardRef.current);
        if (count === heardRef.current) return;
        heardRef.current = count;
        setHeard(count);
        if (count >= wordsOf(phrase).length) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          finish();
        }
      },
      onError: (e) => {
        failed.current = true;
        if (alive.current) setError(e.message);
      },
      onEnd: (take) => {
        session.current = null;
        if (!alive.current) return;
        setListening(false);
        // A take the recogniser dropped before hearing anything is not a
        // line read: stay put with the error showing, so Start tries again.
        if (failed.current && !heardRef.current) return;
        if (take.uri || take.blob) {
          saveTake({ ...take, phrase })
            .then((sample) => { if (sample && alive.current) setSaved((n) => n + 1); })
            .catch(() => {});
        }
        setTimeout(advance, heardRef.current ? SETTLE_MS : 0);
      },
    });
  };

  const stop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    finish();
  };

  const skip = () => {
    Haptics.selectionAsync();
    session.current?.cancel();
    session.current = null;
    onDone?.();
  };

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.container}>
        <View style={styles.body}>
          {phase === 'done' ? <VerificationCheck /> : <AgentBlob seed={AXL_HERO_SEED} size={84} />}

          {phase === 'invite' && (
            <>
              <Text style={styles.title}>Ready for your weekly check-in?</Text>
              <Text style={styles.subtitle}>Five short lines, read out loud. About two minutes. Each take goes into your voice bank, so Axl can follow your speech and, when you want it, speak in your voice.</Text>
              <Pressable onPress={begin} accessibilityRole="button" style={({ pressed }) => [styles.cta, styles.ctaMint, pressed && styles.pressed]}>
                <Text style={styles.ctaText}>Continue</Text>
                <Icon name="forward" size={16} color={colors.ink} />
              </Pressable>
              <Pressable onPress={skip} accessibilityRole="button" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
                <Text style={styles.linkText}>Skip this week</Text>
              </Pressable>
            </>
          )}

          {phase === 'read' && (
            <>
              <View style={styles.progress} accessibilityLabel={`Line ${index + 1} of ${CHECK_IN_LINES.length}`}>
                {CHECK_IN_LINES.map((_, i) => (
                  <View key={i} style={[styles.dot, i < index && styles.dotDone, i === index && styles.dotNow]} />
                ))}
              </View>
              <View style={styles.line} accessible accessibilityLabel={line}>
                {words.map((word, i) => <Word key={`${index}-${i}`} text={word} lit={i < heard} />)}
              </View>
              <VoiceWave active={listening} color={colors.ink} height={26} style={styles.wave} />
              <Text style={styles.hint} accessibilityLiveRegion="polite">
                {error || (listening ? 'Listening. Read the line at your own pace.' : `Tap start, then read the line${last ? '. Last one.' : '.'}`)}
              </Text>
              <Pressable
                onPress={listening ? stop : start}
                accessibilityRole="button"
                style={({ pressed }) => [styles.cta, listening ? styles.ctaInk : styles.ctaMint, pressed && styles.pressed]}
              >
                <Icon name={listening ? 'pause' : 'mic'} size={16} color={listening ? colors.surface : colors.ink} />
                <Text style={[styles.ctaText, listening && { color: colors.surface }]}>{listening ? 'Stop' : 'Start'}</Text>
              </Pressable>
              <Pressable onPress={skip} accessibilityRole="button" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
                <Text style={styles.linkText}>Skip</Text>
              </Pressable>
            </>
          )}

          {phase === 'done' && (
            <>
              <Text style={styles.title}>That’s this week logged.</Text>
              <Text style={styles.subtitle}>
                {saved > 0
                  ? `${saved === CHECK_IN_LINES.length ? 'All five' : saved} ${saved === 1 ? 'take is' : 'takes are'} in your voice bank. Axl will read the trend before Tuesday.`
                  : 'Axl heard your lines. Nothing more to do this week.'}
              </Text>
              <Pressable onPress={onDone} accessibilityRole="button" style={({ pressed }) => [styles.cta, styles.ctaSurface, pressed && styles.pressed]}>
                <Text style={styles.ctaText}>Let’s go</Text>
                <Icon name="forward" size={16} color={colors.ink} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing(2.5), backgroundColor: colors.page },
  container: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center' },
  body: { flexGrow: 1, justifyContent: 'center', gap: spacing(1.5), paddingVertical: spacing(4) },
  title: { ...type.title, color: colors.ink, marginTop: spacing(1.5) },
  subtitle: { ...type.body, color: colors.inkMuted },

  progress: { flexDirection: 'row', gap: spacing(0.75), marginTop: spacing(2) },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surface, ...softShadow },
  dotDone: { backgroundColor: colors.mint },
  dotNow: { backgroundColor: colors.ink },

  line: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing(1), marginTop: spacing(0.5) },
  word: { ...type.title, color: colors.ink },
  wave: { alignSelf: 'stretch', marginTop: spacing(1) },
  hint: { ...type.footnote, color: colors.inkMuted },

  cta: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1.25), padding: spacing(2), marginTop: spacing(1.5), borderRadius: radii.pill },
  ctaMint: { backgroundColor: colors.mint },
  ctaInk: { backgroundColor: colors.ink },
  ctaSurface: { backgroundColor: colors.surface, ...cardShadow },
  ctaText: { ...type.heading, color: colors.ink },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkText: { ...type.callout, color: colors.inkMuted },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
