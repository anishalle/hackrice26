import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Easing, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, type, spacing, softShadow } from '../theme';
import Thinking from '../components/Thinking';
import StreamingText from '../components/StreamingText';
import TypingDots from '../components/TypingDots';
import PromptBar from '../components/PromptBar';
import VoiceRecorder from '../components/VoiceRecorder';
import VoiceNote from '../components/VoiceNote';
import AgentBlob from '../components/AgentBlob';
import Bubble from '../components/Bubble';
import Icon from '../components/Icon';

const LOADING_MS = 1100;

const GREETING = [
  { id: 'g1', text: "Hi, I'm Axl." },
  { id: 'g2', text: 'Ask me about equipment, daily routines, or what other people at your stage have found that works.' },
];

const clock = () =>
  new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');

// Axl's byline sits with each answer rather than in the nav bar, so a long
// thread always says who is speaking.
function AgentLine({ stage, children }) {
  return (
    <View style={styles.agentTurn}>
      <View style={styles.byline}>
        <AgentBlob size={26} stage={stage} />
        <Text style={styles.bylineName}>Axl</Text>
        <Text style={styles.bylineTime}>{clock()}</Text>
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
  const scrollRef = useRef(null);
  const boot = useRef(new Animated.Value(0)).current;
  const busy = turns.some((t) => t.stage !== 'done');

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

  return (
    <View style={styles.root}>
      <View style={[styles.navBar, { paddingTop: insets.top + spacing(0.5) }]}>
        <Pressable
          style={styles.navBtn}
          hitSlop={10}
          onPress={() => {
            Haptics.selectionAsync();
            navigation.navigate('Home');
          }}
        >
          <Icon name="back" size={17} color={colors.ink} />
        </Pressable>
        <Text style={styles.navTitle}>Axl</Text>
        <View style={styles.navSpacer} />
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
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
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
        </Animated.ScrollView>

        <View style={[styles.promptWrap, { paddingBottom: keyboardUp ? spacing(1) : insets.bottom + spacing(1) }]}>
          {recording ? (
            <VoiceRecorder onSend={submitVoice} onCancel={() => setRecording(false)} />
          ) : (
            <PromptBar onSubmit={submitPrompt} onVoice={() => setRecording(true)} editable={!busy} />
          )}
        </View>
      </KeyboardAvoidingView>
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
  navSpacer: { width: 38 },
  navTitle: { flex: 1, ...type.heading, color: colors.ink, textAlign: 'center' },

  container: { paddingHorizontal: spacing(2.5), paddingBottom: spacing(2), gap: spacing(2.5) },
  turn: { gap: spacing(2) },

  agentTurn: { gap: spacing(1) },
  byline: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
  bylineName: { ...type.label, color: colors.ink },
  bylineTime: { ...type.footnote, fontSize: 11, color: colors.inkMuted },
  // Answers are unboxed. Only the person's own messages get a bubble.
  agentBody: { gap: spacing(1), paddingRight: spacing(2) },
  agentText: { ...type.body, color: colors.ink },

  promptText: { ...type.body, color: '#fff' },
  agentVoice: { marginBottom: spacing(0.5) },
  promptWrap: { paddingHorizontal: spacing(2.5), paddingTop: spacing(1) },
});
