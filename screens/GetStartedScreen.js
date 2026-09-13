import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fonts, type, spacing, radii, cardShadow } from '../theme';
import AgentBlob, { AXL_HERO_SEED } from '../components/AgentBlob';
import Icon from '../components/Icon';

export default function GetStartedScreen({ onStart }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const blob = Math.max(160, Math.min(width - spacing(2), 420));

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing(3), paddingBottom: insets.bottom + spacing(2) }]}>
      <Text style={styles.headline}>
        Your <Text style={styles.accent}>shared agent</Text> for every stage of ALS
      </Text>

      <View style={styles.stage}>
        {/* The bubble is anchored to the blob, not the column, so its tail
            always lands on his upper-left curve whatever size he is. */}
        <View style={{ width: blob, height: blob }}>
          <AgentBlob seed={AXL_HERO_SEED} size={blob} />
          <View style={[styles.bubble, { bottom: blob * 0.66, left: blob * 0.02 }]}>
            <Text style={styles.bubbleText}>Hi, I'm Axl.</Text>
            <View style={styles.bubbleTail} />
          </View>
        </View>
      </View>

      <Text style={styles.subhead}>
        Care that adapts as your needs change, built on what other people living with ALS
        have already worked out.
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
          // No auth yet, so this lands in the same place as Get started rather
          // than being a dead control in a demo.
          onStart?.();
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
    color: colors.ink,
    textAlign: 'center',
    alignSelf: 'stretch',
    marginTop: spacing(5),
    paddingHorizontal: spacing(1),
  },
  accent: { color: colors.blue },

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
