import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, type, spacing, radii, cardShadow, softShadow } from '../theme';
import { DEMO_LOGIN } from '../data/profile';
import AgentBlob from '../components/AgentBlob';
import Icon from '../components/Icon';

// Hardcoded sign-in, on purpose: there is no account system behind this yet,
// and the demo needs a door rather than a wall. The credentials are printed on
// the screen for the same reason.
//
// Every field is labelled and every target is composer-sized, because this is
// the first screen someone using a switch or gaze has to get through.
export default function LoginScreen({ onDone, onBack }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const submit = () => {
    const ok =
      email.trim().toLowerCase() === DEMO_LOGIN.email && password === DEMO_LOGIN.password;
    if (!ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('That email and password do not match. The demo pair is filled in below.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDone?.();
  };

  const fill = () => {
    Haptics.selectionAsync();
    setEmail(DEMO_LOGIN.email);
    setPassword(DEMO_LOGIN.password);
    setError(null);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing(1) }]}>
      <Pressable style={styles.back} hitSlop={12} onPress={onBack} accessibilityLabel="Back">
        <Icon name="back" size={17} color={colors.ink} />
      </Pressable>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <AgentBlob size={84} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Axl has your week ready.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              placeholder="you@example.com"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              keyboardAppearance="light"
              accessibilityLabel="Email address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              placeholder="••••••••"
              placeholderTextColor={colors.inkMuted}
              secureTextEntry
              keyboardAppearance="light"
              onSubmitEditing={submit}
              returnKeyType="go"
              accessibilityLabel="Password"
            />
          </View>

          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <Pressable style={styles.cta} onPress={submit}>
            <Text style={styles.ctaText}>Log in</Text>
            <Icon name="forward" size={16} color={colors.ink} />
          </Pressable>

          <Pressable style={styles.demo} onPress={fill}>
            <Text style={styles.demoText}>
              Demo account: <Text style={styles.demoMono}>{DEMO_LOGIN.email}</Text> ·{' '}
              <Text style={styles.demoMono}>{DEMO_LOGIN.password}</Text>
            </Text>
            <Text style={styles.demoHint}>Tap to fill</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page, paddingHorizontal: spacing(2.5) },
  flex: { flex: 1 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  body: { flex: 1, justifyContent: 'center', gap: spacing(1.25), paddingBottom: spacing(4) },
  title: { ...type.title, color: colors.ink, marginTop: spacing(1) },
  subtitle: { ...type.body, color: colors.inkMuted, marginBottom: spacing(1) },

  field: { gap: spacing(0.5) },
  label: { ...type.label, color: colors.ink },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2),
    ...type.body,
    color: colors.ink,
    ...softShadow,
  },
  error: { ...type.footnote, color: colors.ink, paddingHorizontal: spacing(0.5) },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.25),
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: spacing(2.25),
    marginTop: spacing(1),
    ...cardShadow,
  },
  ctaText: { ...type.heading, color: colors.ink },

  demo: { alignItems: 'center', gap: 2, paddingVertical: spacing(1.5) },
  demoText: { ...type.footnote, color: colors.inkMuted, textAlign: 'center' },
  demoMono: { color: colors.ink },
  demoHint: { ...type.caption, color: colors.inkMuted },
});
