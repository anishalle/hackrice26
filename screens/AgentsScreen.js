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
import ExecutionMode from '../components/ExecutionMode';
import AgentBrowser from '../components/AgentBrowser';
import { agentSession } from '../lib/agent-session';
import { streamAgent } from '../lib/hermes';
import { applyAgentEvent } from '../lib/agent-events.mjs';
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
  const isFocused = useIsFocused();
  const [turns, setTurns] = useState([]);
  const [mode, setMode] = useState('guide');
  const [browserSession, setBrowserSession] = useState(null);
  const sessionRef = useRef(null);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [day, setDay] = useState(null);
  const [sheet, setSheet] = useState(null);
  // Sends made while the app is open sit on top of the seeded log.
  const [sent, setSent] = useState({});
  const scrollRef = useRef(null);
  const activeRequest = useRef(null);
  const previousResponseId = useRef(null);
  useEffect(() => () => {
    activeRequest.current?.abort();
    if (sessionRef.current) agentSession(`/${sessionRef.current}`, { method: 'DELETE' }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!browserSession?.id) return;
    const id = browserSession.id;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const state = await agentSession(`/${id}`);
        if (!cancelled && sessionRef.current === id) setBrowserSession(state);
      } catch (error) {
        if (!cancelled) setBrowserSession((current) => current?.id === id ? { ...current, error: error.message } : current);
      }
      if (!cancelled) timer = setTimeout(poll, 800);
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [browserSession?.id]);

  const resetChat = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    const id = sessionRef.current;
    sessionRef.current = null;
    setBrowserSession(null);
    previousResponseId.current = null;
    setTurns([]);
    if (id) agentSession(`/${id}`, { method: 'DELETE' }).catch(() => {});
  };
  const stopBrowser = async () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    const id = sessionRef.current;
    sessionRef.current = null;
    previousResponseId.current = null;
    setBrowserSession(null);
    setTurns((current) => current.map((turn) => turn.stage === 'done' ? turn : { ...turn, stage: 'done', error: 'Stopped by you.' }));
    if (id) await agentSession(`/${id}`, { method: 'DELETE' }).catch(() => {});
  };
  const approveBrowser = async (approvalId, allow) => {
    const id = sessionRef.current;
    if (!id) return;
    await agentSession(`/${id}/approval`, { method: 'POST', body: JSON.stringify({ approval_id: approvalId, allow }) });
    if (sessionRef.current === id) setBrowserSession((current) => ({ ...current, pending: null }));
  };
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

  const submitPrompt = async (text) => {
    if (activeRequest.current || !text.trim()) return;
    const id = `${Date.now()}`;
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 600000);
    setTurns((current) => [...current, { id, prompt: text, stage: 'loading', answer: '', tools: [] }]);
    try {
      if (!sessionRef.current) {
        const session = await agentSession('', { method: 'POST', signal: controller.signal, body: JSON.stringify({ mode }) });
        if (activeRequest.current !== controller) {
          agentSession(`/${session.id}`, { method: 'DELETE' }).catch(() => {});
          return;
        }
        sessionRef.current = session.id;
        setBrowserSession(session);
      }
      const responseId = await streamAgent({
        sessionId: sessionRef.current,
        input: text, previousResponseId: previousResponseId.current,
        signal: controller.signal,
        onEvent: (event) => {
          if (activeRequest.current !== controller) return;
          setTurns((current) => current.map((turn) => turn.id === id ? applyAgentEvent(turn, event) : turn));
        },
      });
      if (activeRequest.current === controller) previousResponseId.current = responseId;
    } catch (error) {
      if (activeRequest.current === controller) {
        setTurns((current) => current.map((turn) => turn.id === id ? {
          ...turn, stage: 'done', error: error.name === 'AbortError'
            ? 'The request timed out. Please try again.' : error.message,
        } : turn));
      }
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  };

  const submitVoice = () => {
    setRecording(false);
    setTurns((current) => [...current, {
      id: `${Date.now()}`, prompt: 'Voice message', stage: 'done', tools: [], answer: '',
      error: 'Voice transcription is not connected yet. Please type your request.',
    }]);
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
                    {turn.tools.length > 0 && <Thinking tools={turn.tools} done={turn.stage === 'done'} />}
                    {turn.stage === 'thinking' && turn.tools.length === 0 && <TypingDots />}
                    {!!turn.answer && <Text selectable style={styles.agentText}>{turn.answer}</Text>}
                    {!!turn.error && <Text style={styles.agentText}>{turn.error}</Text>}

                  </AgentLine>
                </View>
              ))}
            </>
          )}
          {!reviewing && <AgentBrowser key={browserSession?.id || 'empty'} session={browserSession} onApprove={approveBrowser} onStop={stopBrowser} />}
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
          ) : recording ? (
            <VoiceRecorder onSend={submitVoice} onCancel={() => setRecording(false)} />
          ) : (
            <>
              <ExecutionMode mode={mode} disabled={busy} onChange={(next) => { if (next !== mode) { resetChat(); setMode(next); } }} />
              <PromptBar onSubmit={submitPrompt} onVoice={() => setRecording(true)} editable={!busy} />
            </>
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
          resetChat();
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
