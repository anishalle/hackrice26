import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Easing, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
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

const LOADING_MS = 1100;

const GREETING = [
  { id: 'g1', text: "Hi, I'm Axl." },
  { id: 'g2', text: 'Ask me about equipment, daily routines, or what other people at your stage have found that works.' },
];

const FLAG_TINT = { gold: accents.gold, blue: accents.blue, green: accents.green, purple: accents.purple };

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
  const isFocused = useIsFocused();
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
    Animated.timing(boot, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

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
    <View style={styles.root}>
      <View style={[styles.navBar, { paddingTop: insets.top + spacing(0.5) }]}>
        {/* The tab bar is hidden on this screen, so leaving Axl has to be one
            tap in the nav bar. Back goes home; the sidebar sits beside it. */}
        <View style={styles.navCluster}>
          <Pressable
            style={styles.navBtn}
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
            style={styles.navBtn}
            hitSlop={10}
            onPress={() => {
              Haptics.selectionAsync();
              setSidebar(true);
            }}
          >
            <Icon name="sidebar" size={17} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.navTitleWrap}>
          <Text style={styles.navTitle}>{reviewing ? reviewing.date : 'Axl'}</Text>
          {reviewing && <Text style={styles.navSub}>day log</Text>}
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
              {/* A past day is read-only and says so. The flags are Axl's own
                  reading of the thread, which is what a clinician skims first. */}
              <View style={styles.logCard}>
                <View style={styles.logHead}>
                  <Icon name="audit" size={14} color={colors.inkMuted} />
                  <Text style={styles.logKicker}>Audited · read only</Text>
                </View>
                <Text style={styles.logTitle}>{reviewing.title}</Text>
                <Text style={styles.logSummary}>{reviewing.summary}</Text>

                {reviewing.flags.map((f, i) => (
                  <View key={i} style={styles.flag}>
                    <BlobMark seed={f.text} size={10} fill={FLAG_TINT[f.tone] ?? accents.blue} />
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
              <AgentLine stage="done">
                {GREETING.map((g) => (
                  <Text key={g.id} style={styles.agentText}>
                    {g.text}
                  </Text>
                ))}
              </AgentLine>

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
                    {turn.stage === 'loading' && <TypingDots />}
                    {turn.stage === 'thinking' && <Thinking onComplete={() => advance(turn.id, 'streaming')} />}
                    {(turn.stage === 'streaming' || turn.stage === 'done') && (
                      <>
                        {turn.voice ? <VoiceNote seconds={22} style={styles.agentVoice} /> : null}
                        <StreamingText onComplete={() => advance(turn.id, 'done')} />
                      </>
                    )}
                  </AgentLine>
                </View>
              ))}
            </>
          )}
        </Animated.ScrollView>

        <View style={[styles.promptWrap, { paddingBottom: keyboardUp ? spacing(1) : insets.bottom + spacing(1) }]}>
          {reviewing ? (
            <View style={styles.logBar}>
              <Pressable style={styles.logBack} onPress={today}>
                <Icon name="back" size={14} color={colors.ink} />
                <Text style={styles.logBackText}>Back to today</Text>
              </Pressable>
              <Pressable style={styles.logSend} onPress={() => setSheet(reviewing)}>
                <Icon name="note" size={14} color="#fff" />
                <Text style={styles.logSendText}>Send with a note</Text>
              </Pressable>
            </View>
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
  root: { flex: 1, backgroundColor: colors.bg },
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
