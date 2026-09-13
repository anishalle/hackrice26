import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, accents, type, spacing, radii, softShadow } from '../theme';
import { useAccess } from './AccessMode';
import { PHRASE_BOARD, rankPhrases, partOfDay } from '../data/phrases';
import Icon from './Icon';

// The composer for gaze mode. No text field: Axl's question arrives with its
// answers, and everything here is a dwell target at the size the tokens set.
//
// iOS Eye Tracking with Dwell Control does the dwelling and hands us an
// ordinary tap, so there is no cursor or timing code in here. What this file
// owns is the part Apple cannot do for us: target size, spacing, and the two
// guards below.
//
// Guard one is Rest. Impaired suppression of reflexive saccades means a person
// cannot reliably look at a screen without selecting on it, so there has to be
// a state where nothing is armed and reading is safe.
//
// Guard two is where the confirm sits. An irreversible answer is confirmed on
// a target deliberately placed away from the one that triggered it, so a
// second unintended dwell cannot chain into a send.
const CONFIRM_SHIFT = 'flex-end';

// Nothing here scrolls. Gaze scrolling is the documented failure of this input
// model, so a board shows a page of four and offers another page instead: a
// reroll is one dwell, where scrolling to a phrase is an unbounded number.
//
// Four rather than six because a page has to fit above the utility row at 88pt
// a target, and a fifth option costs a scan of the whole screen to find it.
const PAGE = 4;

// Options wear the mode's four accents in order. Colour is a second channel on
// top of the label: any four accents this close in lightness sit within about
// 1.2:1 of each other, so colour alone could never carry meaning, but paired
// with a fixed position it makes a repeated question recognisable before it is
// read.
const fillsFor = (a) => [a.periwinkle, a.mint, a.amber, a.peach];

function Target({ label, hint, tone, height, gap, wide, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={({ pressed }) => [
        styles.target,
        {
          minHeight: height,
          marginBottom: gap,
          backgroundColor: tone ?? colors.surface,
          width: wide ? '100%' : `${(100 - 4) / 2}%`,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.targetLabel} numberOfLines={2}>{label}</Text>
      {hint ? <Text style={styles.targetHint}>{hint}</Text> : null}
    </Pressable>
  );
}

export default function GazeComposer({ step, onAnswer, onSpeak, onSpell, onExit, openBoard, onMode }) {
  const { t } = useAccess();
  const FILLS = fillsFor(t.accents);
  const [resting, setResting] = useState(false);
  const [confirming, setConfirming] = useState(null);
  // Arriving from "Say something" on the gaze home lands on the board itself,
  // so a sentence is two selections from the home screen rather than three.
  const [board, setBoard] = useState(openBoard ? PHRASE_BOARD[0].id : null);
  const [page, setPage] = useState(0);
  const [narrowing, setNarrowing] = useState(false);

  // The screen above hides Axl's question while the board or the narrowing
  // step is up: those are speaking surfaces, not a conversation, and a
  // question left on screen is one more thing to read past.
  useEffect(() => {
    onMode?.(board || narrowing ? 'speaking' : 'asking');
  }, [board, narrowing]);
  const pulse = useRef(new Animated.Value(0)).current;

  // The rest banner is the one thing allowed to move, and only as a slow fade:
  // it has to be noticeable without pulling the eye off a target, so it never
  // changes position or size.
  useEffect(() => {
    if (!resting) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [resting]);

  // Leaving rest is itself a target, so it is the only thing armed while
  // resting. Everything else is disabled rather than hidden, because a target
  // that moves between states is a target that gets mis-hit.
  if (resting) {
    return (
      <View style={styles.wrap}>
        <Animated.View
          style={[
            styles.restCard,
            { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
          ]}
        >
          <Text style={styles.restText}>Resting. Nothing will be selected.</Text>
        </Animated.View>
        <Target
          label="Start again"
          height={t.target}
          gap={0}
          wide
          tone={t.accents.mint}
          onPress={() => {
            Haptics.selectionAsync();
            setResting(false);
          }}
        />
      </View>
    );
  }

  // Skipped, so Axl narrows instead of offering more of the same. Three
  // buckets and a keyboard: recognising which bucket is cheap, and it is the
  // question a person would ask next anyway.
  if (narrowing) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.kicker}>Which is it closest to?</Text>
        <View style={styles.grid}>
          {PHRASE_BOARD.slice(0, 3).map((g, i) => (
            <Target
              key={g.id}
              label={g.label}
              tone={FILLS[i % FILLS.length]}
              height={t.target}
              gap={t.gap}
              wide={i === 2}
              onPress={() => {
                Haptics.selectionAsync();
                setNarrowing(false);
                setPage(0);
                setBoard(g.id);
              }}
            />
          ))}
        </View>
        <Target
          label="Spell it out"
          hint="Keyboard, one letter at a time"
          height={t.target}
          gap={0}
          wide
          onPress={() => {
            setNarrowing(false);
            onSpell?.();
          }}
        />
      </View>
    );
  }

  if (board) {
    const group = PHRASE_BOARD.find((g) => g.id === board);
    const ranked = rankPhrases(group.phrases);
    const pages = Math.ceil(ranked.length / PAGE);
    const shown = ranked.slice(page * PAGE, page * PAGE + PAGE);
    return (
      <View style={styles.wrap}>
        <Text style={styles.kicker}>
          {group.label} · {partOfDay()}
          {pages > 1 ? ` · ${page + 1} of ${pages}` : ''}
        </Text>
        <View style={styles.grid}>
          {shown.map((phrase, i) => (
            <Target
              key={phrase.text}
              label={phrase.text}
              tone={FILLS[i % FILLS.length]}
              height={t.target}
              gap={t.gap}
              wide
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSpeak?.(phrase.text);
                setBoard(null);
                setPage(0);
              }}
            />
          ))}
        </View>
        <View style={styles.grid}>
          <Target
            label="Show more"
            height={t.target * 0.8}
            gap={0}
            onPress={() => {
              Haptics.selectionAsync();
              setPage((n) => (n + 1) % pages);
            }}
          />
          {/* "Skip" rather than "None of these": the person is handing the
              problem to Axl, not filing a complaint about the options. */}
          <Target
            label="Skip"
            height={t.target * 0.8}
            gap={0}
            onPress={() => {
              Haptics.selectionAsync();
              setNarrowing(true);
            }}
          />
        </View>
        <Target
          label="Back"
          height={t.target * 0.7}
          gap={0}
          wide
          onPress={() => {
            setBoard(null);
            setPage(0);
          }}
        />
      </View>
    );
  }

  if (confirming) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.kicker}>This one leaves the app. Confirm to send.</Text>
        <View style={styles.grid}>
          <Target
            label="Cancel"
            height={t.target}
            gap={t.gap}
            onPress={() => {
              Haptics.selectionAsync();
              setConfirming(null);
            }}
          />
          {/* Right-aligned on purpose: the trigger was on the left, so a second
              stray dwell lands on Cancel rather than on Send. */}
          <View style={[styles.confirmSlot, { alignItems: CONFIRM_SHIFT }]}>
            <Target
              label="Send"
              height={t.target}
              gap={t.gap}
              wide
              tone={t.accents.mint}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onAnswer(confirming);
                setConfirming(null);
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  const options = step?.options ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {options.map((o, i) => (
          <Target
            key={o.id}
            label={o.label}
            tone={FILLS[i % FILLS.length]}
            height={t.target}
            gap={t.gap}
            wide={options.length < 3 ? false : options.length % 2 === 1 && o === options[options.length - 1]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // An irreversible answer never commits on its own dwell.
              if (o.confirm) return setConfirming(o);
              if (o.say === null) return setBoard(PHRASE_BOARD[0].id);
              onAnswer(o);
            }}
          />
        ))}
      </View>

      {/* Utility row. Rest first, because it is the one someone reaches for
          when the interface is misbehaving. */}
      <View style={styles.utility}>
        <Pressable
          style={[styles.util, { minHeight: t.target * 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Rest. Stops anything from being selected."
          onPress={() => {
            Haptics.selectionAsync();
            setResting(true);
          }}
        >
          <Icon name="pause" size={18} color={colors.ink} />
          <Text style={styles.utilText}>Rest</Text>
        </Pressable>

        <Pressable
          style={[styles.util, { minHeight: t.target * 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Say something from my phrases"
          onPress={() => {
            Haptics.selectionAsync();
            setBoard(PHRASE_BOARD[0].id);
          }}
        >
          <Icon name="waveform" size={18} color={colors.ink} />
          <Text style={styles.utilText}>My phrases</Text>
        </Pressable>

        <Pressable
          style={[styles.util, { minHeight: t.target * 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Leave gaze mode and go back to the standard layout"
          onPress={onExit}
        >
          <Icon name="back" size={18} color={colors.ink} />
          <Text style={styles.utilText}>Standard</Text>
        </Pressable>
      </View>

      {/* Board categories are one dwell from the composer rather than nested
          under My phrases, so a common phrase is two selections total. */}
      <View style={styles.boardRow}>
        {PHRASE_BOARD.map((g) => (
          <Pressable
            key={g.id}
            style={[styles.category, { minHeight: t.target * 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`${g.label} phrases`}
            onPress={() => {
              Haptics.selectionAsync();
              setBoard(g.id);
            }}
          >
            <Text style={styles.categoryText}>{g.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing(1) },
  kicker: { ...type.label, color: colors.inkMuted, paddingHorizontal: spacing(0.5) },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  target: {
    borderRadius: radii.tile,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    justifyContent: 'center',
    ...softShadow,
  },
  pressed: { backgroundColor: colors.page },
  disabled: { opacity: 0.4 },
  // 19pt: one step up from body, which is what a propped phone at arm's length
  // needs before the text starts costing fixations of its own.
  targetLabel: { ...type.bodyMedium, fontSize: 19, lineHeight: 25, color: colors.ink },
  targetHint: { ...type.footnote, color: colors.inkMuted, marginTop: 2 },

  confirmSlot: { width: '48%' },

  restCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    padding: spacing(2),
    marginBottom: spacing(1),
    ...softShadow,
  },
  restText: { ...type.bodyMedium, fontSize: 17, color: colors.ink, textAlign: 'center' },

  utility: { flexDirection: 'row', gap: spacing(1) },
  util: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...softShadow,
  },
  utilText: { ...type.label, fontSize: 15, color: colors.ink },

  boardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  category: {
    flexGrow: 1,
    flexBasis: '47%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.tile,
    backgroundColor: colors.page,
  },
  categoryText: { ...type.label, fontSize: 16, color: colors.ink },
});
