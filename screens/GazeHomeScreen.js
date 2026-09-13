import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, accents, type, spacing, radii, softShadow } from '../theme';
import { useAccess } from '../components/AccessMode';
import { PROFILE } from '../data/profile';
import AgentBlob from '../components/AgentBlob';
import Icon from '../components/Icon';
import Squiggle from '../components/Squiggle';

// Home for gaze mode. Not a smaller version of the touch home: a different
// screen, because the touch one is a scrolling feed of small cards and every
// one of those is a dwell someone cannot afford.
//
// Ordering and size both follow urgency. "Speak for me" is first and largest
// because the thing you need at 3am is a sentence, and by the time someone is
// in this mode their own voice is usually gone: the phone is what speaks, so
// this is the lifeline rather than a convenience.
//
// The rest shrink from there, and the exit is the smallest thing on screen. A
// uniform grid spends the same pixels on "Standard layout" as on the sentence,
// which is the wrong trade: a rarely-used control can cost a little effort.
//
// The status strip costs zero selections on purpose. Most of what the agent
// does needs no interaction at all, so the reassurance that it happened should
// not need one either.
const STATUS = [
  'Refill ordered, arriving Thursday',
  'Ride booked for 9:40 tomorrow',
  'Two banking sittings queued from this week',
];

// The underline is measured, not guessed: `onTextLayout` hands back each laid
// out line, and the squiggle takes the width of the last one. A fixed width
// underlines the column rather than the sentence, and a wrapped line would
// have it running past the final word.
//
// `onTextLayout` is iOS and Android only — react-native-web never fires it, so
// the block width from `onLayout` stands in. That over-runs a wrapped last
// line in the browser preview and is exact on device, which is the right way
// round for the platform this ships on.
function Underlined({ children }) {
  const [line, setLine] = useState(0);
  const [block, setBlock] = useState(0);
  const width = line || block;

  return (
    <View style={styles.statusTextWrap}>
      <Text
        style={styles.statusText}
        onLayout={(e) => setBlock(Math.round(e.nativeEvent.layout.width))}
        onTextLayout={(e) => {
          const lines = e.nativeEvent.lines;
          if (lines?.length) setLine(Math.round(lines[lines.length - 1].width));
        }}
      >
        {children}
      </Text>
      {width > 0 && <Squiggle seed={children} width={width} height={7} opacity={0.4} />}
    </View>
  );
}

function BigTarget({ label, hint, icon, tone, height, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={({ pressed }) => [
        styles.target,
        { flex: 1, minHeight: height, backgroundColor: tone ?? colors.surface },
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={26} color={colors.ink} /> : null}
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Pressable>
  );
}

export default function GazeHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t, setMode } = useAccess();
  const [called, setCalled] = useState(false);

  const partner = PROFILE.care.find((c) => c.role === 'Care partner');
  const go = (screen, params) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: t.ground, paddingTop: insets.top + spacing(1.5), paddingBottom: insets.bottom + spacing(1.5) },
      ]}
    >
      <View style={styles.head}>
        {/* Still, and blinking slowly: `calm` pins the blink and saccade
            periods to the top of their range, and no idle layer means nothing
            here ever pulls a gaze off a target. */}
        <AgentBlob size={104} animate={false} calm />
        <View style={styles.headText}>
          <Text style={styles.greeting}>Hi, {PROFILE.name.split(' ')[0]}</Text>
        </View>
      </View>

      <View style={styles.status}>
        {STATUS.map((line) => (
          <View key={line} style={styles.statusRow}>
            <Icon name="check" size={13} color={colors.ink} />
            {/* Underlined by hand rather than ruled: the same seeded wobble
                the dots and the blobs use, so a finished line reads as
                crossed off by a person. */}
            <Underlined>{line}</Underlined>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {/* First, full width, tallest, and the only coloured one. Someone who
            needs a sentence should not have to choose between six cards. */}
        <View style={[styles.row, styles.rowTall]}>
          <BigTarget
            label="Speak for me"
            hint="Your phrases, in your banked voice"
            icon="waveform"
            tone={accents.mint}
            height={t.target}
            onPress={() => go('Agents', { board: true })}
          />
        </View>

        <View style={styles.row}>
          <BigTarget
            label="Talk to Axl"
            hint="Check in or ask for something"
            tone={accents.periwinkle}
            height={t.target}
            onPress={() => go('Agents')}
          />
          <BigTarget
            label={called ? 'Elena is coming' : `Call ${partner?.name.split(' ')[0] ?? 'for help'}`}
            hint={called ? 'Sent just now' : 'Sends an alert straight away'}
            tone={called ? colors.surface : accents.peach}
            height={t.target}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setCalled(true);
            }}
          />
        </View>

        <View style={styles.rowShort}>
          <BigTarget
            label="My week"
            hint="What Axl has tracked"
            tone={accents.amber}
            height={t.target * 0.7}
            onPress={() => go('Profile')}
          />
        </View>

        {/* The exit, at a third of a target. Small enough to stay out of the
            way of a stray gaze, big enough for a care partner's thumb. */}
        <Pressable
          style={styles.exit}
          accessibilityRole="button"
          accessibilityLabel="Standard layout. Back to touch."
          onPress={() => {
            Haptics.selectionAsync();
            setMode('standard');
          }}
        >
          <Text style={styles.exitText}>Standard layout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing(2) },

  head: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), marginBottom: spacing(1.5) },
  headText: { flex: 1 },
  greeting: { ...type.title, fontSize: 36, lineHeight: 42, color: colors.ink },
  sub: { ...type.body, color: colors.inkMuted },

  status: {
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    padding: spacing(1.75),
    gap: spacing(0.75),
    marginBottom: spacing(2),
    ...softShadow,
  },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1) },
  statusTextWrap: { flex: 1 },
  statusText: { ...type.callout, color: colors.ink },

  grid: { flex: 1, gap: spacing(1.5) },
  row: { flex: 1, flexDirection: 'row', gap: spacing(1.5) },
  rowShort: { flex: 0.55, flexDirection: 'row' },
  exit: {
    marginTop: 'auto',
    alignSelf: 'center',
    minHeight: 34,
    paddingHorizontal: spacing(2.5),
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  exitText: { ...type.label, color: colors.inkMuted },
  // The sentence target gets half again the height of the others, because it
  // is the one someone reaches for when they cannot wait.
  rowTall: { flex: 1.5 },
  target: {
    borderRadius: radii.tile,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(2),
    justifyContent: 'center',
    gap: 2,
    ...softShadow,
  },
  pressed: { backgroundColor: colors.page },
  label: { ...type.bodyMedium, fontSize: 20, lineHeight: 26, color: colors.ink },
  hint: { ...type.footnote, color: colors.inkMuted },
});
