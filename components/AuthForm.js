import { useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type, spacing, radii, cardShadow, softShadow } from '../theme';
import { AuthAvatar } from './AuthAvatar';
import Icon from './Icon';

// Form values live only on this screen; both account flows are local demo stubs.
export default function AuthForm({ signup = false, onDone, onBack, onSwitch }) {
  const insets = useSafeAreaInsets();
  const inputs = useRef({});
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const fields = [
    ...(signup ? [{ key: 'name', label: 'Full name', placeholder: 'Your name', autoComplete: 'name' }] : []),
    { key: 'email', label: 'Email', placeholder: 'you@example.com', autoComplete: 'email' },
    { key: 'password', label: 'Password', placeholder: 'Enter your password', autoComplete: signup ? 'new-password' : 'current-password' },
  ];

  const submit = () => {
    const missing = fields.find(({ key }) => !values[key].trim());
    if (missing) {
      setError(`Enter your ${missing.label.toLowerCase()} to continue.`);
      inputs.current[missing.key]?.focus();
      return;
    }
    // Deliberately no credential check, account creation, or persistence.
    onDone?.();
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing(1), paddingBottom: insets.bottom + spacing(3) }]}
      >
        <View style={styles.container}>
          <Pressable
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to welcome"
          >
            <Icon name="back" size={17} color={colors.ink} />
          </Pressable>
          <View style={styles.body}>
            <AuthAvatar size={84} />
            <Text style={styles.title}>{signup ? 'Create your account' : 'Welcome back'}</Text>
            <Text style={styles.subtitle}>{signup ? 'Get started with Axl.' : 'Axl has your week ready.'}</Text>

            {fields.map(({ key, label, placeholder, autoComplete }, index) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  ref={(input) => { inputs.current[key] = input; }}
                  style={styles.input}
                  value={values[key]}
                  onChangeText={(value) => {
                    setValues((previous) => ({ ...previous, [key]: value }));
                    setError('');
                  }}
                  placeholder={placeholder}
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize={key === 'name' ? 'words' : 'none'}
                  autoCorrect={false}
                  autoComplete={autoComplete}
                  keyboardType={key === 'email' ? 'email-address' : 'default'}
                  secureTextEntry={key === 'password'}
                  keyboardAppearance="light"
                  accessibilityLabel={label}
                  returnKeyType={index === fields.length - 1 ? 'go' : 'next'}
                  submitBehavior={index === fields.length - 1 ? 'blurAndSubmit' : 'submit'}
                  onSubmitEditing={() => {
                    if (index === fields.length - 1) submit();
                    else inputs.current[fields[index + 1].key]?.focus();
                  }}
                />
              </View>
            ))}
            {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
            <Pressable style={({ pressed }) => [styles.cta, pressed && styles.pressed]} onPress={submit} accessibilityRole="button">
              <Text style={styles.ctaText}>{signup ? 'Create account' : 'Log in'}</Text>
              <Icon name="forward" size={16} color={colors.ink} />
            </Pressable>
            <Pressable style={({ pressed }) => [styles.switch, pressed && styles.pressed]} onPress={onSwitch} accessibilityRole="button">
              <Text style={styles.switchText}>
                {signup ? 'Already have an account? ' : 'New to Axl? '}
                <Text style={styles.switchLink}>{signup ? 'Log in' : 'Get started'}</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  scroll: { flexGrow: 1, paddingHorizontal: spacing(2.5) },
  container: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center' },
  back: { width: 48, height: 48, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...softShadow },
  body: { flexGrow: 1, justifyContent: 'center', gap: spacing(1.25), paddingVertical: spacing(3) },
  title: { ...type.title, color: colors.ink, marginTop: spacing(1) },
  subtitle: { ...type.body, color: colors.inkMuted, marginBottom: spacing(1) },
  field: { gap: spacing(0.5) },
  label: { ...type.label, color: colors.ink },
  input: { backgroundColor: colors.surface, borderRadius: radii.tile, minHeight: 56, paddingVertical: spacing(2), paddingHorizontal: spacing(2), ...type.body, color: colors.ink, ...softShadow },
  error: { ...type.footnote, color: colors.ink, paddingHorizontal: spacing(0.5) },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1.25), backgroundColor: colors.surface, borderRadius: radii.pill, paddingVertical: spacing(2.25), marginTop: spacing(1), ...cardShadow },
  ctaText: { ...type.heading, color: colors.ink },
  switch: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing(1.5) },
  switchText: { ...type.callout, color: colors.inkMuted, textAlign: 'center' },
  switchLink: { ...type.bodyMedium, color: colors.ink },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
