import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CaretLeft } from 'phosphor-react-native';
import { colors, fonts, spacing, radii, cardShadow } from '../theme';
import LoadingState from '../components/LoadingState';
import Thinking from '../components/Thinking';
import StreamingText from '../components/StreamingText';
import PromptBar from '../components/PromptBar';
import AgentAvatar from '../components/AgentAvatar';

const LOADING_MS = 1100;

export default function AgentsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [turns, setTurns] = useState([]);
  const scrollRef = useRef(null);
  const busy = turns.some((t) => t.stage !== 'done');

  // Widget sync disabled until an EAS dev client build links expo-widgets.
  // useEffect(() => {
  //   if (Platform.OS !== 'ios') return;
  //   const activeCount = turns.filter((t) => t.stage !== 'done').length;
  //   require('../widgets/AgentStatusWidget').default.updateSnapshot({ activeCount });
  // }, [turns]);

  const advance = (id, stage) => {
    setTurns((current) => current.map((t) => (t.id === id ? { ...t, stage } : t)));
  };

  const submitPrompt = (text) => {
    const id = `${Date.now()}`;
    setTurns((current) => [...current, { id, prompt: text, stage: 'loading' }]);
    setTimeout(() => advance(id, 'thinking'), LOADING_MS);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing(2) }]}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} hitSlop={8} onPress={() => navigation.navigate('Home')}>
            <CaretLeft size={20} color={colors.ink} />
          </Pressable>
          <AgentAvatar stage="idle" size={40} />
          <View>
            <Text style={styles.title}>Agents</Text>
            <Text style={styles.subtitle}>Ask your agent anything.</Text>
          </View>
        </View>

        {turns.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Try asking about accessibility tools, shared findings, or what your agent
              should do next.
            </Text>
          </View>
        )}

        {turns.map((turn) => (
          <View key={turn.id} style={styles.turn}>
            <View style={styles.promptBubble}>
              <Text style={styles.promptBubbleText}>{turn.prompt}</Text>
            </View>

            <View style={styles.agentRow}>
              <AgentAvatar stage={turn.stage} />
              <View style={styles.agentContent}>
                {turn.stage === 'loading' && <LoadingState label="Thinking" />}
                {turn.stage === 'thinking' && (
                  <Thinking onComplete={() => advance(turn.id, 'streaming')} />
                )}
                {(turn.stage === 'streaming' || turn.stage === 'done') && (
                  <StreamingText onComplete={() => advance(turn.id, 'done')} />
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.promptWrap, { paddingBottom: insets.bottom + spacing(1.5) }]}>
        <PromptBar onSubmit={submitPrompt} editable={!busy} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(3), paddingBottom: spacing(2), gap: spacing(2.5) },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.light, fontSize: 30, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkMuted },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
  },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  turn: { gap: spacing(1.5) },
  promptBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: colors.ink,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2),
  },
  promptBubbleText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 21, color: '#fff' },
  agentRow: { flexDirection: 'row', gap: spacing(1.5) },
  agentContent: { flex: 1, gap: spacing(1.5) },
  promptWrap: { paddingHorizontal: spacing(3), paddingTop: spacing(1) },
});
