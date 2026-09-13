import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function VerificationCheck() {
  const ring = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    let active = true;
    const finish = () => { ring.setValue(1); check.setValue(1); scale.setValue(1); };
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(ring, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: false }),
      ]),
      Animated.timing(check, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]);
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (active) { if (reduced) finish(); else animation.start(); }
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      if (reduced) { animation.stop(); finish(); }
    });
    return () => { active = false; animation.stop(); subscription.remove(); };
  }, [ring, check, scale]);
  return (
    <View accessible accessibilityLabel="Persona demo completed" accessibilityRole="image">
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={104} height={104} viewBox="0 0 104 104">
          <Circle cx={52} cy={52} r={44} fill={colors.mint} fillOpacity={0.25} />
          <AnimatedCircle cx={52} cy={52} r={44} fill="none" stroke={colors.mint} strokeWidth={5} strokeLinecap="round" strokeDasharray="276.46 276.46" strokeDashoffset={ring.interpolate({ inputRange: [0, 1], outputRange: [276.46, 0] })} rotation={-90} origin="52, 52" />
          <AnimatedPath d="M 32 52 L 46 66 L 73 39" fill="none" stroke={colors.ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="59 59" strokeDashoffset={check.interpolate({ inputRange: [0, 1], outputRange: [59, 0] })} />
        </Svg>
      </Animated.View>
    </View>
  );
}
