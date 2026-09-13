import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, accents, type, spacing, radii, softShadow } from '../theme';
import { PROFILE, ACCESS, INPUTS, TARGET_STEPS, TEXT_STEPS, TRENDS } from '../data/profile';
import AgentBlob from '../components/AgentBlob';
import BlobMark from '../components/BlobMark';
import Icon from '../components/Icon';
import { useAccess } from '../components/AccessMode';

const TONE = { amber: accents.amber, periwinkle: accents.periwinkle, mint: accents.mint, peach: accents.peach };

// The accessible profile: who Axl is working for, how they want to be met, and
// the numbers behind every adjustment the app has made on its own.
//
// The tracking sits on the same page as the settings on purpose. An app that
// resizes itself without showing its reasons is one people stop trusting, so
// the measurement that moved a target is listed next to the target.
function Section({ title, hint, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Stepper({ label, steps, value, onChange }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        {steps.map((s) => {
          const on = s === value;
          return (
            <Pressable
              key={s}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(s);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.step, on && styles.stepOn]}
            >
              <Text style={[styles.stepText, on && styles.stepTextOn]}>{s}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const { gaze, setMode } = useAccess();
  const [inputs, setInputs] = useState(ACCESS.inputs);
  const [target, setTarget] = useState(ACCESS.target);
  const [text, setText] = useState(ACCESS.text);
  const [adaptive, setAdaptive] = useState(ACCESS.adaptive);
  const [speak, setSpeak] = useState(ACCESS.speakReplies);
  const [motion, setMotion] = useState(ACCESS.reduceMotion);

  const toggleInput = (id) => {
    Haptics.selectionAsync();
    setInputs((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };

  return (
    <View style={styles.root}>
      <View style={[styles.navBar, { paddingTop: insets.top + spacing(0.5) }]}>
        <Pressable style={styles.navBtn} hitSlop={12} onPress={onBack} accessibilityLabel="Back">
          <Icon name="back" size={17} color={colors.ink} />
        </Pressable>
        <Text style={styles.navTitle}>Profile</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing(3) }]}>
        <View style={styles.hero}>
          <AgentBlob size={64} />
          <View style={styles.heroText}>
            <Text style={styles.name}>{PROFILE.name}</Text>
            <Text style={styles.meta}>{PROFILE.handle} · {PROFILE.since}</Text>
            <Text style={styles.meta}>{PROFILE.diagnosis}</Text>
          </View>
        </View>

        <View style={styles.verified}>
          <Icon name="audit" size={15} color={colors.ink} />
          <View style={styles.verifiedText}>
            <Text style={styles.verifiedTitle}>{PROFILE.verified.status}</Text>
            <Text style={styles.meta}>
              {PROFILE.verified.method} · {PROFILE.verified.when}
            </Text>
          </View>
          <Icon name="check" size={15} color={colors.ink} />
        </View>

        <Section title="How you use the app" hint="Pick as many as you use. Axl keeps all of them live.">
          {INPUTS.map((i, n) => {
            const on = inputs.includes(i.id);
            return (
              <Pressable
                key={i.id}
                onPress={() => toggleInput(i.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={[styles.row, n > 0 && styles.divided]}
              >
                <View style={[styles.box, on && styles.boxOn]}>
                  {on && <Icon name="check" size={12} color="#fff" />}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{i.label}</Text>
                  <Text style={styles.meta}>{i.hint}</Text>
                </View>
              </Pressable>
            );
          })}
        </Section>

        <Section title="Size" hint="Axl grows these on its own when accuracy drops. You can move them any time.">
          <Stepper label="Buttons" steps={TARGET_STEPS} value={target} onChange={setTarget} />
          <View style={styles.divided} />
          <Stepper label="Text" steps={TEXT_STEPS} value={text} onChange={setText} />
        </Section>

        <Section title="Gaze mode" hint="For driving the app with iOS Eye Tracking or a single switch.">
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Use gaze mode</Text>
              <Text style={styles.meta}>88pt targets, no gestures, Axl asks instead of you typing</Text>
            </View>
            <Switch value={gaze} onValueChange={(on) => setMode(on ? 'gaze' : 'standard')} />
          </View>
        </Section>

        <Section title="Let Axl adapt" hint="Off means it proposes a change and waits for you.">
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Grow targets automatically</Text>
              <Text style={styles.meta}>Last change: buttons stepped up on Feb 26</Text>
            </View>
            <Switch value={adaptive} onValueChange={setAdaptive} />
          </View>
          <View style={[styles.row, styles.divided]}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Speak replies in my banked voice</Text>
              <Text style={styles.meta}>1,240 phrases banked</Text>
            </View>
            <Switch value={speak} onValueChange={setSpeak} />
          </View>
          <View style={[styles.row, styles.divided]}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Reduce motion</Text>
              <Text style={styles.meta}>Keeps Axl still and cuts transitions</Text>
            </View>
            <Switch value={motion} onValueChange={setMotion} />
          </View>
        </Section>

        <Section title="What Axl is tracking" hint="From your weekly check-ins. Nothing here leaves without you sending it.">
          {TRENDS.map((t, n) => (
            <View key={t.id} style={[styles.row, n > 0 && styles.divided]}>
              <BlobMark seed={t.id} size={10} fill={TONE[t.tone] ?? accents.periwinkle} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{t.label}</Text>
                <Text style={styles.meta}>{t.delta}</Text>
              </View>
              <Text style={styles.value}>{t.value}</Text>
            </View>
          ))}
        </Section>

        <Section title="Who can see it" hint="Each person sees only what you gave them.">
          {PROFILE.care.map((c, n) => (
            <View key={c.id} style={[styles.row, n > 0 && styles.divided]}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{c.name}</Text>
                <Text style={styles.meta}>{c.role}</Text>
              </View>
              <Text style={styles.sharing}>{c.sharing}</Text>
            </View>
          ))}
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(1),
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  navSpacer: { width: 44 },
  navTitle: { flex: 1, ...type.heading, color: colors.ink, textAlign: 'center' },

  container: { paddingHorizontal: spacing(2.5), gap: spacing(2) },

  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), paddingTop: spacing(1) },
  heroText: { flex: 1, gap: 2 },
  name: { ...type.title, fontSize: 26, lineHeight: 32, color: colors.ink },
  meta: { ...type.footnote, color: colors.inkMuted },

  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.25),
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    padding: spacing(1.75),
    ...softShadow,
  },
  verifiedText: { flex: 1, gap: 1 },
  verifiedTitle: { ...type.bodyMedium, fontSize: 15, color: colors.ink },

  section: { gap: spacing(0.75) },
  sectionTitle: { ...type.heading, color: colors.ink },
  sectionHint: { ...type.footnote, color: colors.inkMuted },
  card: { backgroundColor: colors.surface, borderRadius: radii.tile, overflow: 'hidden', ...softShadow },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.25),
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(2),
    minHeight: 60,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.border },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...type.bodyMedium, fontSize: 15, color: colors.ink },
  value: { ...type.label, color: colors.ink },
  sharing: { ...type.caption, color: colors.inkMuted },

  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.ink, borderColor: colors.ink },

  stepperRow: { paddingVertical: spacing(1.5), paddingHorizontal: spacing(2), gap: spacing(1) },
  stepper: { flexDirection: 'row', gap: spacing(0.75) },
  step: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.page,
  },
  stepOn: { backgroundColor: colors.ink },
  stepText: { ...type.label, color: colors.inkMuted },
  stepTextOn: { color: '#fff' },
});
