import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Easing, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, accents, spacing, radii, type, softShadow } from '../theme';
import { DAYS, CLINICIANS } from '../data/days';
import Thinking from '../components/Thinking';
import StreamingText from '../components/StreamingText';
import TypingDots from '../components/TypingDots';
import PromptBar from '../components/PromptBar';
import VoiceRecorder from '../components/VoiceRecorder';
import VoiceNote from '../components/VoiceNote';
import AgentBlob from '../components/AgentBlob';
import AgentSidebar from '../components/AgentSidebar';
import ClinicianSheet from '../components/ClinicianSheet';
import Bubble from '../components/Bubble';
import Icon from '../components/Icon';
import BlobMark from '../components/BlobMark';
import GazeComposer from '../components/GazeComposer';
import { useAccess } from '../components/AccessMode';
import { CHECK_IN, REPLIES } from '../data/phrases';

const LOADING_MS = 1100;

const GREETING = [
  { id: 'g1', text: "Hi, I'm Axl." },
  { id: 'g2', text: 'Ask me to handle something: a refill, a form, a ride. Or tell me how the week has gone and I will log it.' },
];

const FLAG_TINT = {
  amber: accents.amber,
  periwinkle: accents.periwinkle,
  mint: accents.mint,
  peach: accents.peach,
};

const clock = () =>
  new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');

// Axl's byline sits with each answer rather than in the nav bar, so a long
// thread always says who is speaking.
function AgentLine({ stage, time, children }) {
  return (
    <View style={styles.agentTurn}>
      <View style={styles.byline}>
        <AgentBlob size={44} stage={stage} />
        <Text style={styles.bylineTime}>{time ?? clock()}</Text>
      </View>
      <View style={styles.agentBody}>{children}</View>
    </View>
  );
}

export default function AgentsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { gaze, t: access, setMode } = useAccess();
  // In gaze mode the thread is a script: Axl asks, and the composer offers the
  // answers. `step` is where in the check-in we are.
  const [step, setStep] = useState(0);
  // The keyboard is the last rung of the ladder: reachable from the board when
  // nothing fits, and never on the main path.
  const [spelling, setSpelling] = useState(false);
  const [composerMode, setComposerMode] = useState('asking');
  const [turns, setTurns] = useState([]);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [day, setDay] = useState(null);
  const [sheet, setSheet] = useState(null);
  // Sends made while the app is open sit on top of the seeded log.
  const [sent, setSent] = useState({});
  const scrollRef = useRef(null);
  const boot = useRef(new Animated.Value(0)).current;
  const busy = turns.some((t) => t.stage !== 'done');

  const days = useMemo(() => DAYS.map((d) => (sent[d.id] ? { ...d, sent: sent[d.id] } : d)), [sent]);
  const reviewing = day ? days.find((d) => d.id === day.id) : null;

  // Axl boots up when the tab is entered: the thread rises and settles while
  // the navigator's cross-fade is still finishing, so the two read as one move.
  useEffect(() => {
    if (!isFocused) {
      boot.setValue(0);
      return;
    }
    // Reduced smooth-pursuit gain means a rising, fading thread is both
    // untrackable and a magnet for reflexive saccades, so gaze mode snaps.
    if (!access.motion) {
      boot.setValue(1);
      return;
    }
    Animated.timing(boot, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isFocused, access.motion]);

  // `behavior="padding"` already pads past the home indicator, so keeping the
  // bottom inset on the composer leaves exactly that much dead space under it.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const advance = (id, stage) => {
    setTurns((current) => current.map((t) => (t.id === id ? { ...t, stage } : t)));
  };

  const addTurn = (turn) => {
    const id = `${Date.now()}`;
    setTurns((current) => [...current, { id, stage: 'loading', ...turn }]);
    setTimeout(() => advance(id, 'thinking'), LOADING_MS);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const submitPrompt = (text) => addTurn({ prompt: text });

  // A scripted answer arrives complete. Nothing to stream, nothing to think
  // about: a spinner someone has to wait through costs fixations for nothing.
  const answer = (option) => {
    const current = CHECK_IN[step];
    const key = [`${current.id}-${option.id}`, option.id, current.id].find((k) => REPLIES[k]);
    setTurns((all) => [
      ...all,
      {
        id: `${Date.now()}`,
        stage: 'done',
        prompt: option.say ?? option.label,
        answer: REPLIES[key] ?? 'Noted.',
      },
    ]);
    setStep((n) => Math.min(n + 1, CHECK_IN.length - 1));
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: access.motion }));
  };

  // A phrase off the board is said rather than asked: it goes out in the
  // banked voice, so it is the person's own voice in the room.
  const speak = (phrase) => {
    setTurns((all) => [
      ...all,
      { id: `${Date.now()}`, stage: 'done', prompt: phrase, answer: 'Said out loud in your voice.' },
    ]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: access.motion }));
  };

  // A spoken question gets a spoken answer back, with the transcript under it.
  const submitVoice = (seconds) => {
    setRecording(false);
    addTurn({ voice: seconds });
  };

  const today = () => {
    Haptics.selectionAsync();
    setDay(null);
  };

  const commitSend = ({ clinicianId, dayIds, notes }) => {
    const to = CLINICIANS.find((c) => c.id === clinicianId);
    setSent((current) => ({
      ...current,
      ...Object.fromEntries(dayIds.map((id) => [id, { to: clinicianId, name: to.name, notes }])),
    }));
    setSheet(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: gaze ? access.ground : colors.bg }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + spacing(0.5) }]}>
        {/* The tab bar is hidden on this screen, so leaving Axl has to be one
            tap in the nav bar. Back goes home; the sidebar sits beside it. */}
        <View style={[styles.navCluster, gaze && { width: access.target * 2 + spacing(1) }]}>
          <Pressable
            style={[styles.navBtn, gaze && { width: access.target, height: access.target, borderRadius: access.target / 2 }]}
            hitSlop={10}
            onPress={() => {
              Haptics.selectionAsync();
              setDay(null);
              navigation.navigate('Home');
            }}
          >
            <Icon name="back" size={17} color={colors.ink} />
          </Pressable>
          <Pressable
            style={[styles.navBtn, gaze && { width: access.target, height: access.target, borderRadius: access.target / 2 }]}
            hitSlop={10}
            onPress={() => {
              Haptics.selectionAsync();
              setSidebar(true);
            }}
          >
            <Icon name="sidebar" size={17} color={colors.ink} />
          </Pressable>
        </View>

        {!gaze && (
          <Pressable
            style={styles.offer}
            accessibilityRole="button"
            accessibilityLabel="Switch to gaze mode"
            onPress={() => {
              Haptics.selectionAsync();
              setMode('gaze');
            }}
          >
            <Text style={styles.offerText}>Gaze</Text>
          </Pressable>
        )}

        <View style={styles.navTitleWrap}>
          <Text style={styles.navTitle}>{reviewing ? reviewing.date : 'Axl'}</Text>
          {reviewing && <Text style={styles.navSub}>check-in</Text>}
        </View>

        {/* Matches the left cluster's width so the title stays centred. */}
        <View style={styles.navCluster}>
          {reviewing && (
            <Pressable style={[styles.navBtn, styles.navBtnEnd]} hitSlop={10} onPress={() => setSheet(reviewing)}>
              <Icon name="paperplane" size={16} color={colors.ink} />
            </Pressable>
          )}
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.ScrollView
          ref={scrollRef}
          style={[
            styles.flex,
            { opacity: boot, transform: [{ translateY: boot.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
          ]}
          contentContainerStyle={styles.container}
          keyboardDismissMode="interactive"
          onContentSizeChange={() => !reviewing && scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {reviewing ? (
            <>
              {/* A past check-in is read-only and says so. The signals are
                  what Axl measured in the recording, and what a clinician
                  reads first; the transcript is the context under them. */}
              <View style={styles.logCard}>
                <View style={styles.logHead}>
                  <Icon name="audit" size={14} color={colors.inkMuted} />
                  <Text style={styles.logKicker}>Tracked · read only</Text>
                </View>
                <Text style={styles.logTitle}>{reviewing.title}</Text>
                <Text style={styles.logSummary}>{reviewing.summary}</Text>

                {reviewing.flags.map((f, i) => (
                  <View key={i} style={styles.flag}>
                    <BlobMark seed={f.text} size={10} fill={FLAG_TINT[f.tone] ?? accents.periwinkle} />
                    <Text style={styles.flagText}>{f.text}</Text>
                  </View>
                ))}

                {reviewing.sent && (
                  <View style={styles.sentRow}>
                    <Icon name="check" size={12} color={colors.ink} />
                    <Text style={styles.sentText}>
                      Sent to {reviewing.sent.name ?? CLINICIANS.find((c) => c.id === reviewing.sent.to)?.name}
                    </Text>
                  </View>
                )}
                {reviewing.sent?.notes ? (
                  <Text style={styles.sentNote}>“{reviewing.sent.notes}”</Text>
                ) : null}
              </View>

              {reviewing.transcript.map((t, i) => (
                <View key={i} style={styles.turn}>
                  <Bubble side="right">
                    <Text style={styles.promptText}>{t.q}</Text>
                  </Bubble>
                  <AgentLine stage="done" time={reviewing.date}>
                    <Text style={styles.agentText}>{t.a}</Text>
                  </AgentLine>
                </View>
              ))}
            </>
          ) : (
            <>
              {!gaze && (
                <AgentLine stage="done">
                  {GREETING.map((g) => (
                    <Text key={g.id} style={styles.agentText}>
                      {g.text}
                    </Text>
                  ))}
                </AgentLine>
              )}

              {turns.map((turn) => (
                <View key={turn.id} style={styles.turn}>
                  <Bubble side="right">
                    {turn.voice ? (
                      <VoiceNote seconds={turn.voice} tint="#fff" />
                    ) : (
                      <Text style={styles.promptText}>{turn.prompt}</Text>
                    )}
                  </Bubble>

                  <AgentLine stage={turn.stage}>
                    {turn.answer ? (
                      <Text style={styles.agentText}>{turn.answer}</Text>
                    ) : null}
                    {!turn.answer && turn.stage === 'loading' && <TypingDots />}
                    {!turn.answer && turn.stage === 'thinking' && (
                      <Thinking onComplete={() => advance(turn.id, 'streaming')} />
                    )}
                    {!turn.answer && (turn.stage === 'streaming' || turn.stage === 'done') && (
                      <>
                        {turn.voice ? <VoiceNote seconds={22} style={styles.agentVoice} /> : null}
                        <StreamingText onComplete={() => advance(turn.id, 'done')} />
                      </>
                    )}
                  </AgentLine>
                </View>
              ))}

              {/* Last in the thread, so the question sits directly above the
                  answers and the eye never travels up the screen to re-read
                  what it is answering. */}
              {gaze && composerMode === 'asking' && (
                <AgentLine stage="done">
                  <Text style={[styles.agentText, styles.agentTextBig]}>{CHECK_IN[step].ask}</Text>
                </AgentLine>
              )}
            </>
          )}
        </Animated.ScrollView>

        <View style={[styles.promptWrap, { paddingBottom: keyboardUp ? spacing(1) : insets.bottom + spacing(1) }]}>
          {reviewing ? (
            <View style={styles.logBar}>
              <Pressable style={styles.logBack} onPress={today}>
                <Icon name="back" size={14} color={colors.ink} />
                <Text style={styles.logBackText}>Back to Axl</Text>
              </Pressable>
              <Pressable style={styles.logSend} onPress={() => setSheet(reviewing)}>
                <Icon name="note" size={14} color="#fff" />
                <Text style={styles.logSendText}>Send with a note</Text>
              </Pressable>
            </View>
          ) : gaze && spelling ? (
            <PromptBar
              onSubmit={(text) => {
                setSpelling(false);
                speak(text);
              }}
              onVoice={() => setSpelling(false)}
              editable
            />
          ) : gaze ? (
            <GazeComposer
              openBoard={!!route.params?.board}
              step={CHECK_IN[step]}
              onAnswer={answer}
              onSpeak={speak}
              onSpell={() => setSpelling(true)}
              onMode={setComposerMode}
              onExit={() => setMode('standard')}
            />
          ) : recording ? (
            <VoiceRecorder onSend={submitVoice} onCancel={() => setRecording(false)} />
          ) : (
            <PromptBar onSubmit={submitPrompt} onVoice={() => setRecording(true)} editable={!busy} />
          )}
        </View>
      </KeyboardAvoidingView>

      <AgentSidebar
        open={sidebar}
        onClose={() => setSidebar(false)}
        days={days}
        activeDayId={reviewing?.id}
        onNewChat={() => {
          setDay(null);
          setTurns([]);
        }}
        onOpenDay={setDay}
        onSend={(d) => setSheet(d ?? reviewing ?? days[0])}
      />

      <ClinicianSheet
        visible={!!sheet}
        days={days}
        preselect={sheet}
        onClose={() => setSheet(null)}
        onSend={commitSend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(1.5),
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  navCluster: { flexDirection: 'row', alignItems: 'center', gap: spacing(1), width: 84 },
  navBtnEnd: { marginLeft: 'auto' },
  navTitleWrap: { flex: 1 },
  offer: {
    height: 34,
    paddingHorizontal: spacing(1.25),
    marginLeft: spacing(0.75),
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  offerText: { ...type.label, color: colors.ink },
  navTitle: { ...type.heading, color: colors.ink, textAlign: 'center' },
  navSub: { ...type.caption, color: colors.inkMuted, textAlign: 'center' },

  container: { paddingHorizontal: spacing(2.5), paddingBottom: spacing(2), gap: spacing(2.5) },
  turn: { gap: spacing(2) },

  agentTurn: { gap: spacing(1) },
  byline: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
  bylineTime: { ...type.footnote, fontSize: 11, color: colors.inkMuted },
  // Answers are unboxed. Only the person's own messages get a bubble.
  agentBody: { gap: spacing(1), paddingRight: spacing(2) },
  agentText: { ...type.body, color: colors.ink },
  // The question in gaze mode is read from a propped phone at arm's length.
  agentTextBig: { fontSize: 21, lineHeight: 28 },

  promptText: { ...type.body, color: '#fff' },
  agentVoice: { marginBottom: spacing(0.5) },
  promptWrap: { paddingHorizontal: spacing(2.5), paddingTop: spacing(1) },

  logCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    padding: spacing(2),
    gap: spacing(0.75),
    ...softShadow,
  },
  logHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
  logKicker: { ...type.caption, color: colors.inkMuted },
  logTitle: { ...type.heading, color: colors.ink },
  logSummary: { ...type.footnote, color: colors.inkMuted },
  flag: { flexDirection: 'row', alignItems: 'center', gap: spacing(1), marginTop: spacing(0.25) },
  flagText: { flex: 1, ...type.footnote, color: colors.ink },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    marginTop: spacing(0.75),
    paddingTop: spacing(0.75),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sentText: { ...type.caption, color: colors.ink },
  sentNote: { ...type.footnote, color: colors.inkMuted, fontStyle: 'italic' },

  logBar: { flexDirection: 'row', gap: spacing(1) },
  logBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    height: 46,
    paddingHorizontal: spacing(2),
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...softShadow,
  },
  logBackText: { ...type.label, color: colors.ink },
  logSend: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  logSendText: { ...type.label, color: '#fff' },
});
