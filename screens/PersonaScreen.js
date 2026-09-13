import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthAvatar } from '../components/AuthAvatar';
import VerificationCheck from '../components/VerificationCheck';
import Icon from '../components/Icon';
import { openPersona, preparePersona } from '../lib/persona';
import { cardShadow, colors, radii, softShadow, spacing, type } from '../theme';

export default function PersonaScreen({ onDone, onBack }) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState('preparing');
  const [error, setError] = useState('');
  const session = useRef(null);
  const alive = useRef(true);
  const busy = useRef(false);
  const prepare = async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus('preparing');
    setError('');
    try {
      session.current = await preparePersona();
      if (alive.current) setStatus('ready');
    } catch (e) {
      if (alive.current) { setError(e.message || 'We couldn’t connect to Persona. Try again.'); setStatus('error'); }
    } finally { busy.current = false; }
  };
  useEffect(() => {
    alive.current = true;
    prepare();
    return () => { alive.current = false; };
  }, []);
  const verify = async () => {
    if (busy.current || !session.current) return;
    busy.current = true;
    setStatus('opening');
    setError('');
    try {
      // Open directly from the tap so mobile web browsers allow the popup.
      const completed = await openPersona(session.current);
      if (alive.current) {
        setStatus(completed ? 'success' : 'error');
        if (!completed) setError('No rush. Try again when you’re ready.');
      }
    } catch (e) {
      if (alive.current) { setError(e.message || 'Something went wrong. Please try again.'); setStatus('error'); }
    } finally { busy.current = false; }
  };
  const success = status === 'success';
  const loading = status === 'preparing' || status === 'opening';
  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.container}>
        {!success && <Pressable onPress={onBack} disabled={status === 'opening'} accessibilityRole="button" accessibilityLabel="Back to login" style={styles.back}><Icon name="back" size={17} color={colors.ink} /></Pressable>}
        <View style={styles.body}>
          {success ? <VerificationCheck /> : <AuthAvatar size={84} />}
          <Text style={styles.title}>{success ? 'You’re all set.' : 'Just one more thing…'}</Text>
          <Text style={styles.subtitle}>{success ? 'Axl is ready when you are.' : 'A quick stop at Persona, then back to Axl.'}</Text>
          {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
          <Pressable disabled={loading} accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} onPress={success ? onDone : status === 'error' ? prepare : verify} style={({ pressed }) => [styles.cta, (pressed || loading) && { opacity: 0.65 }]}>
            {loading && <ActivityIndicator color={colors.ink} size="small" />}
            <Text style={styles.ctaText}>{success ? 'Let’s go' : status === 'preparing' ? 'Getting ready…' : status === 'opening' ? 'Over to Persona…' : status === 'error' ? 'Try again' : 'Continue with Persona'}</Text>
            {!loading && <Icon name="forward" size={16} color={colors.ink} />}
          </Pressable>
          {!success && <Text style={styles.note}>Sandbox demo · No identity check is saved.</Text>}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing(2.5), backgroundColor: colors.page },
  container: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center' },
  back: { width: 48, height: 48, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...softShadow },
  body: { flexGrow: 1, justifyContent: 'center', gap: spacing(1.5), paddingVertical: spacing(4) },
  title: { ...type.title, color: colors.ink, marginTop: spacing(1.5) },
  subtitle: { ...type.body, color: colors.inkMuted },
  error: { ...type.footnote, color: colors.ink },
  cta: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1.25), padding: spacing(2), marginTop: spacing(3), backgroundColor: colors.surface, borderRadius: radii.pill, ...cardShadow },
  ctaText: { ...type.heading, color: colors.ink },
  note: { ...type.footnote, color: colors.inkMuted, textAlign: 'center', marginTop: spacing(0.5) },
});
