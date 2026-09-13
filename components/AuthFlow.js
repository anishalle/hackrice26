import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import AgentBlob, { AXL_HERO_SEED } from './AgentBlob';
import GetStartedScreen from '../screens/GetStartedScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import PersonaScreen from '../screens/PersonaScreen';
import CheckInScreen from '../screens/CheckInScreen';
import { colors } from '../theme';
import { AvatarContext } from './AuthAvatar';

export default function AuthFlow({ onLogin }) {
  const [screen, setScreen] = useState('start');
  const [journey, setJourney] = useState(null);
  const current = useRef(null);
  const locked = useRef(false);
  const started = useRef(false);
  const reduced = useRef(false);
  const root = useRef(null);
  const origin = useRef({ x: 0, y: 0 });
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const animation = useRef(null);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) reduced.current = value; });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => { reduced.current = value; });
    return () => { mounted = false; subscription.remove(); animation.current?.stop(); };
  }, []);

  const navigate = (next) => {
    if (locked.current) return;
    // Persona hands over to the check-in on a plain cross-fade: no avatar to
    // carry, and the check mark has just landed, so nothing should move.
    if (next === 'checkin' && !reduced.current) {
      locked.current = true;
      animation.current = Animated.timing(opacity, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
      animation.current.start(({ finished }) => {
        if (!finished) { locked.current = false; return; }
        current.current = null;
        setScreen(next);
        animation.current = Animated.timing(opacity, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true });
        animation.current.start(() => { locked.current = false; });
      });
      return;
    }
    if (screen !== 'start' || !current.current || reduced.current) {
      current.current = null;
      setScreen(next);
      return;
    }
    locked.current = true;
    started.current = false;
    progress.setValue(0);
    // Keep the welcome screen mounted until its exit fade completes.
    // The separate avatar layer stays opaque and stationary throughout.
    setJourney({ from: current.current, to: null, next });
  };

  const report = (bounds) => {
    current.current = bounds;
    if (screen === 'start' || !locked.current || started.current) return;
    started.current = true;
    setJourney((previous) => ({ ...previous, to: bounds }));
  };

  useEffect(() => {
    if (!journey || screen !== 'start') return;
    animation.current = Animated.timing(opacity, {
      toValue: 0,
      duration: 360,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.current.start(({ finished }) => {
      // The form mounts invisibly, measures its avatar, then begins the move.
      if (finished) setScreen(journey.next);
    });
    return () => animation.current?.stop();
  }, [journey?.next, screen, opacity]);

  useEffect(() => {
    if (!journey?.to) return;
    animation.current = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 850, easing: Easing.bezier(0.65, 0, 0.25, 1), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.current.start(({ finished }) => {
      if (finished) { setJourney(null); locked.current = false; }
    });
    return () => animation.current?.stop();
  }, [journey?.to, opacity, progress]);

  const from = journey?.from;
  const to = journey?.to ?? from;
  return (
    <View ref={root} style={styles.root} onLayout={() => root.current?.measureInWindow((x, y) => { origin.current = { x, y }; })}>
      <AvatarContext.Provider value={{ screen, moving: !!journey, report }}>
        <Animated.View
          style={[styles.root, { opacity }]}
          pointerEvents={journey ? 'none' : 'auto'}
          accessibilityElementsHidden={!!journey}
          importantForAccessibility={journey ? 'no-hide-descendants' : 'auto'}
        >
          {screen === 'start' ? (
            <GetStartedScreen
              onStart={() => navigate('signup')}
              onLogin={() => navigate('login')}
              onGaze={onLogin}
            />
          )
            : screen === 'signup' ? <SignupScreen onDone={() => navigate('start')} onBack={() => navigate('start')} onLogin={() => navigate('login')} />
              : screen === 'persona' ? <PersonaScreen onDone={() => navigate('checkin')} onSkip={() => navigate('checkin')} onBack={() => navigate('login')} />
                : screen === 'checkin' ? <CheckInScreen onDone={onLogin} />
                  : <LoginScreen onDone={() => navigate('persona')} onBack={() => navigate('start')} onSignup={() => navigate('signup')} />}
        </Animated.View>
      </AvatarContext.Provider>
      {from && (
        <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{
          position: 'absolute', left: from.x - origin.current.x, top: from.y - origin.current.y,
          width: from.size, height: from.size,
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, to.x - from.x + (to.size - from.size) / 2] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, to.y - from.y + (to.size - from.size) / 2] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, to.size / from.size] }) },
          ],
        }}>
          <AgentBlob seed={AXL_HERO_SEED} size={from.size} animate={false} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.page } });
