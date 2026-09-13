import { useEffect, useRef } from 'react';
import { Animated, Platform, Easing } from 'react-native';
import { DeviceMotion } from 'expo-sensors';

// Tilts its child in 3D to follow how the phone is held.
//
// Blobatar's own gaze layer is a DOM driver writing CSS custom properties, so
// it does not reach React Native, and the adapter deliberately draws no
// geometry of its own. Real perspective gets the same read: with a short
// `perspective` distance, rotating the face about Y brings one side toward the
// viewer and pushes the other away, so the near eye widens and the far one
// narrows, which is the foreshortening blobatar's `project()` models on the
// web, done by the compositor instead.
const MAX_YAW = 16; // degrees; past this the crop edge starts to show
const MAX_PITCH = 15;
const REST_PITCH = 45; // holding a phone at ~45° counts as level

// How far a tilt is allowed to read, in degrees of device rotation.
const YAW_RANGE = 35;
const PITCH_RANGE = 30;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const deg = (rad) => (rad * 180) / Math.PI;

export default function TiltGaze({ children, style }) {
  const yaw = useRef(new Animated.Value(0)).current;
  const pitch = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub;
    let cancelled = false;

    DeviceMotion.isAvailableAsync().then((ok) => {
      if (!ok || cancelled) return;
      DeviceMotion.setUpdateInterval(60);
      sub = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return;
        // gamma is roll (tilt left/right), beta is pitch (tip toward/away).
        const g = clamp(deg(rotation.gamma) / YAW_RANGE, -1, 1);
        const b = clamp((deg(rotation.beta) - REST_PITCH) / PITCH_RANGE, -1, 1);
        // Timing, not spring: sensor samples already arrive smoothed and
        // continuous, so a spring per sample would fight the next one.
        Animated.timing(yaw, {
          toValue: g,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
        Animated.timing(pitch, {
          toValue: b,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    });

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          transform: [
            { perspective: 420 },
            { rotateY: yaw.interpolate({ inputRange: [-1, 1], outputRange: [`${MAX_YAW}deg`, `${-MAX_YAW}deg`] }) },
            { rotateX: pitch.interpolate({ inputRange: [-1, 1], outputRange: [`${-MAX_PITCH}deg`, `${MAX_PITCH}deg`] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
