import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fonts, type, spacing, radii, cardShadow } from '../theme';
import { AuthAvatar } from '../components/AuthAvatar';
import Icon from '../components/Icon';

export default function GetStartedScreen({ onStart, onLogin }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const blob = Math.max(160, Math.min(width - spacing(2), 420));

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing(3), paddingBottom: insets.bottom + spacing(2) }]}>
      {/* The break is explicit: "velocity back" is the line that has to land,
          so it gets one to itself rather than wrapping wherever the width
          happens to run out. */}
      <Text style={styles.headline}>
        Get your{'\n'}
        <Text style={styles.accent}>velocity</Text> back
      </Text>

      <View style={styles.stage}>
        {/* The bubble is anchored to the blob, not the column, so its tail
            always lands on his upper-left curve whatever size he is. */}
        <View style={{ width: blob, height: blob }}>
          <AuthAvatar size={blob} />
          <View style={[styles.bubble, { bottom: blob * 0.66, left: blob * 0.02 }]}>
            <Text style={styles.bubbleText}>Hi, I'm Axl.</Text>
            <View style={styles.bubbleTail} />
          </View>
        </View>
      </View>

      <Text style={styles.subhead}>
        Axl runs the things ALS made harder: the calls, the refills, the forms. It checks in
        with you weekly, and grows the buttons before you start missing them.
      </Text>

      <Pressable
        style={styles.cta}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onStart?.();
        }}
      >
        <Text style={styles.ctaText}>Get started</Text>
        <Icon name="forward" size={16} color={colors.ink} />
      </Pressable>

      <Pressable
        style={styles.login}
        hitSlop={8}
        onPress={() => {
          Haptics.selectionAsync();
          onLogin?.();
        }}
      >
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginLink}>Log in</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page, paddingHorizontal: spacing(2.5), alignItems: 'center' },
  headline: {
    ...type.display,
    // Bigger than the display size, and the side padding comes off so the
    // second line has the full column to sit on one row.
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1,
    color: colors.ink,
    textAlign: 'center',
    alignSelf: 'stretch',
    marginTop: spacing(5),
  },
  accent: { color: colors.periwinkle },

  stage: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },

  bubble: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2),
    ...cardShadow,
  },
  bubbleText: { ...type.bodyMedium, color: colors.ink },
  // Triangle tail, pointing down-right into the blob.
  bubbleTail: {
    position: 'absolute',
    right: 16,
    bottom: -9,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 3,
    borderTopWidth: 13,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.surface,
  },

  subhead: {
    ...type.body,
    color: colors.inkMuted,
    textAlign: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: spacing(1),
    marginBottom: spacing(2.5),
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.25),
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: spacing(2.25),
    ...cardShadow,
  },
  ctaText: { ...type.heading, color: colors.ink },

  login: { paddingTop: spacing(2), paddingBottom: spacing(0.5) },
  loginText: { ...type.callout, color: colors.inkMuted },
  loginLink: { fontFamily: fonts.semibold, color: colors.ink },
});
