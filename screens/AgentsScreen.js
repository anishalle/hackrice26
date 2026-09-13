import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Easing, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, accents, liveAccents, spacing, radii, type, softShadow } from '../theme';
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
import AgentBlob, { VOICE_SEED } from '../components/AgentBlob';
import AgentSidebar from '../components/AgentSidebar';
import ClinicianSheet from '../components/ClinicianSheet';
import Bubble from '../components/Bubble';
import Icon from '../components/Icon';
import BlobMark from '../components/BlobMark';
import GazeComposer from '../components/GazeComposer';
import { useAccess } from '../components/AccessMode';
import { CHECK_IN, REPLIES } from '../data/phrases';


// Axl's two sizes in the gaze header. One render, scaled between them.
const BLOB_BIG = 180;
const BLOB_SMALL = 120;

const GREETING = [
  { id: 'g1', text: "Hi, I'm Axl." },
  { id: 'g2', text: 'Ask me to handle something: a refill, a form, a ride. Or tell me how the week has gone and I will log it.' },
];

// The voice agent's pink, taken from the gaze palette but fixed rather than
// per-mode: it identifies a handler, not a screen.
const VOICE_HEAD = liveAccents.peach;

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
function AgentLine({ stage, time, head, seed, children }) {
  return (
    <View style={styles.agentTurn}>
      <View style={styles.byline}>
        <AgentBlob size={44} stage={stage} head={head} seed={seed} />
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
  const { gaze, t: access, setMode: setAccessMode } = useAccess();
  // In gaze mode the thread is a script: Axl asks, and the composer offers the
  // answers. `step` is where in the check-in we are.
  const [step, setStep] = useState(0);
  // The keyboard is the last rung of the ladder: reachable from the board when
  // nothing fits, and never on the main path.
  const [spelling, setSpelling] = useState(false);
  const [composerMode, setComposerMode] = useState('asking');
  // The board and the narrowing step are taller than the thread and the big
  // header can both afford, so while one is up the screen gives them the room.
  const speaking = gaze && composerMode === 'speaking';
  const shrink = useRef(new Animated.Value(0)).current;
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
    setStep(0);
    setSpelling(false);
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

  // He eases between his two sizes on the curve the web app uses for its press
  // settle, cubic-bezier(0.16, 1, 0.3, 1): fast out of the gate and slow into
  // the end, so the shrink reads as one move rather than a cut.
  //
  // This is the one animation gaze mode keeps. The rule against motion is about
  // ambient movement and anything a person has to track; a 220ms transition on
  // a control that just changed is the alternative to a jump, and a jump is
  // also a change the eye has to absorb.
  useEffect(() => {
    Animated.timing(shrink, {
      toValue: speaking ? 1 : 0,
      duration: 220,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      // Height cannot go on the native driver, and the scale has to stay in
      // lockstep with it, so both ride the JS one.
      useNativeDriver: false,
    }).start();
  }, [speaking]);

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
      { id: `${Date.now()}`, stage: 'done', prompt: phrase, answer: 'Said out loud in your voice.', via: 'voice' },
    ]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: access.motion }));
  };

  // A spoken question gets a spoken answer back, with the transcript under it.
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
    <View style={[styles.root, { backgroundColor: gaze ? access.ground : colors.bg }]}>
      {/* Gaze mode gets its own header: Axl centred at the top, three times
          the size of the two controls flanking him. The name is redundant next
          to his face, and a title is one more thing to read on a screen built
          to be read as little as possible. */}
      {gaze ? (
        <View style={[styles.gazeHeader, { paddingTop: insets.top + spacing(0.5) }]}>
          {/* He shrinks in place rather than being re-laid-out: the box height
              is what gives the board its room, and the blob inside stays a
              single 180pt render scaled from its own top edge. Re-rendering him
              at a smaller size would recentre him in a shorter box, which
              reads as a jump up the screen rather than a shrink. */}
          <Animated.View
            style={[
              styles.navBlobBig,
              { height: shrink.interpolate({ inputRange: [0, 1], outputRange: [BLOB_BIG, BLOB_SMALL] }) },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  { scale: shrink.interpolate({ inputRange: [0, 1], outputRange: [1, BLOB_SMALL / BLOB_BIG] }) },
                ],
                transformOrigin: 'top center',
              }}
            >
              {/* The mode's pink up here, where he is presence rather than a
                  speaker: the blue byline below is what marks a question. */}
              <AgentBlob size={BLOB_BIG} animate={false} calm head={access.accents.peach} />
            </Animated.View>
          </Animated.View>

          {/* Pinned to the corners rather than laid out in a row with him: in
              a flex row a 180pt blob drags both controls down to its centre. */}
          <Pressable
            style={[styles.navBtn, styles.navBtnGaze, styles.gazeLeft, { top: insets.top + spacing(0.5) }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            onPress={() => {
              Haptics.selectionAsync();
              setDay(null);
              navigation.navigate('Home');
            }}
          >
            <Icon name="back" size={20} color={colors.ink} />
          </Pressable>

          <Pressable
            style={[styles.navBtn, styles.navBtnGaze, styles.gazeRight, { top: insets.top + spacing(0.5) }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={() => {
              Haptics.selectionAsync();
              setSidebar(true);
            }}
          >
            <Icon name="sidebar" size={20} color={colors.ink} />
          </Pressable>
        </View>
      ) : (
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

          {/* Same width as the left cluster, so the title is centred on the
              screen rather than on whatever is left over. */}
          <View style={[styles.navCluster, styles.navClusterEnd]}>
            {reviewing ? (
              <Pressable style={styles.navBtn} hitSlop={10} onPress={() => setSheet(reviewing)}>
                <Icon name="paperplane" size={16} color={colors.ink} />
              </Pressable>
            ) : (
              <Pressable
                style={styles.offer}
                accessibilityRole="button"
                accessibilityLabel="Switch to gaze mode"
                onPress={() => {
                  Haptics.selectionAsync();
                  setAccessMode('gaze');
                }}
              >
                <Text style={styles.offerText}>Gaze</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {speaking ? (
          // Bottom of the gap rather than the top: it sits just above the
          // phrases it refers to, so confirming what was last said costs a
          // glance instead of a trip up the screen.
          <View style={[styles.flex, styles.lastSaidWrap]}>
            {turns.length > 0 && (
              <View style={styles.lastSaid}>
                <AgentBlob
                  size={30}
                  animate={false}
                  calm
                  seed={turns[turns.length - 1].via === 'voice' ? VOICE_SEED : undefined}
                  head={turns[turns.length - 1].via === 'voice' ? VOICE_HEAD : accents.periwinkle}
                />
                <Text style={styles.lastSaidText} numberOfLines={2}>
                  {turns[turns.length - 1].prompt}
                </Text>
              </View>
            )}
          </View>
        ) : (
        <Animated.ScrollView
          ref={scrollRef}
          style={[
            styles.flex,
            { opacity: boot, transform: [{ translateY: boot.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
          ]}
          contentContainerStyle={styles.container}
          keyboardDismissMode="interactive"
          onContentSizeChange={() => !reviewing && scrollRef.current?.scrollToEnd({ animated: access.motion })}
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

                  <AgentLine
                    stage={turn.stage}
                    seed={turn.via === 'voice' ? VOICE_SEED : undefined}
                    head={turn.via === 'voice' ? VOICE_HEAD : gaze ? accents.periwinkle : undefined}
                  >
                    {turn.stage === 'loading' && <TypingDots />}
                    {(turn.tools?.length ?? 0) > 0 && <Thinking tools={turn.tools} done={turn.stage === 'done'} />}
                    {turn.stage === 'thinking' && (turn.tools?.length ?? 0) === 0 && <TypingDots />}
                    {!!turn.answer && <Text selectable style={styles.agentText}>{turn.answer}</Text>}
                    {!!turn.error && <Text style={styles.agentText}>{turn.error}</Text>}
                  </AgentLine>
                </View>
              ))}

              {/* Last in the thread, so the question sits directly above the
                  answers and the eye never travels up the screen to re-read
                  what it is answering. */}
              {gaze && composerMode === 'asking' && (
                <AgentLine stage="done" head={gaze ? accents.periwinkle : undefined}>
                  <Text style={[styles.agentText, styles.agentTextBig]}>{CHECK_IN[step].ask}</Text>
                </AgentLine>
              )}
            </>
          )}
          {!reviewing && <AgentBrowser key={browserSession?.id || 'empty'} session={browserSession} onApprove={approveBrowser} onStop={stopBrowser} />}
        </Animated.ScrollView>
        )}

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
              onExit={() => setAccessMode('standard')}
            />
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
  navClusterEnd: { justifyContent: 'flex-end' },
  // Smaller than the composer's targets on purpose: these are secondary in
  // gaze mode, and the blob between them has to be the largest thing up here.
  navBtnGaze: { width: 60, height: 60, borderRadius: 30 },
  gazeHeader: { paddingBottom: spacing(0.5) },
  // Lifted, because the silhouette leaves a band of empty box above it.
  navBlobBig: { alignItems: 'center', marginTop: -spacing(3), overflow: 'hidden' },
  gazeLeft: { position: 'absolute', left: spacing(2) },
  gazeRight: { position: 'absolute', right: spacing(2) },
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
  // The one line the board keeps: what was last said, so the screen is not
  // blank above it and there is something to check against.
  lastSaidWrap: { justifyContent: 'flex-end', paddingBottom: spacing(2) },
  lastSaid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginHorizontal: spacing(2.5),
  },
  lastSaidText: { flex: 1, ...type.bodyMedium, fontSize: 16, color: colors.inkMuted },

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
