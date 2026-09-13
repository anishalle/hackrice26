import { useEffect, useMemo, useRef } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, type } from '../theme';

const R = 20;
const GAP = spacing(1);

const ACTIVE = { Home: colors.blue, Agents: colors.purple, Marketplace: colors.green };

// Morphic segmented nav: one solid white strip where the active item detaches
// into its own accent pill, and the segments either side round off the edges
// they now face.
//
// All of that hangs off a single spring holding the active index, so the
// detach, the corner rounding and the fill cross together instead of snapping
// the moment state.index flips. None of it can use the native driver — margin,
// radius and colour are JS-thread props — but three items is well inside
// budget.
export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const pos = useRef(new Animated.Value(state.index)).current;
  const one = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(pos, {
      toValue: state.index,
      useNativeDriver: false,
      damping: 18,
      mass: 0.7,
      stiffness: 170,
    }).start();
  }, [state.index]);

  const last = state.routes.length - 1;

  const segments = useMemo(() => {
    // 1 when this item is the active one, falling to 0 either side of it.
    const activeness = (i) =>
      pos.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0, 1, 0], extrapolate: 'clamp' });

    return state.routes.map((route, i) => {
      const act = activeness(i);
      // A corner opens when this item is active or the neighbour it faces is.
      // Mid-slide the two activenesses sum to 1, so adding them tracks the edge
      // continuously where a boolean would flip.
      return {
        route,
        act,
        leftOpen: i === 0 ? one : Animated.add(act, activeness(i - 1)),
        rightOpen: i === last ? one : Animated.add(act, activeness(i + 1)),
      };
    });
  }, [state.routes, last]);

  // A screen can opt out via options={{ tabBarStyle: { display: 'none' } }} —
  // React Navigation only auto-hides its own default tab bar for that, a
  // custom one (like this) has to check it itself.
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions.tabBarStyle?.display === 'none') return null;

  const corner = (value) =>
    value.interpolate({ inputRange: [0, 1], outputRange: [0, R], extrapolate: 'clamp' });

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom || spacing(1.5) }]}>
      <View style={styles.glass}>
        {segments.map(({ route, act, leftOpen, rightOpen }) => (
          <Pressable
            key={route.key}
            onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate(route.name);
            }}
          >
            <Animated.View
              style={[
                styles.item,
                {
                  marginHorizontal: act.interpolate({ inputRange: [0, 1], outputRange: [0, GAP] }),
                  backgroundColor: act.interpolate({
                    inputRange: [0, 1],
                    outputRange: [colors.surface, ACTIVE[route.name] ?? colors.blue],
                  }),
                  borderTopLeftRadius: corner(leftOpen),
                  borderBottomLeftRadius: corner(leftOpen),
                  borderTopRightRadius: corner(rightOpen),
                  borderBottomRightRadius: corner(rightOpen),
                },
              ]}
            >
              <Animated.Text
                style={[
                  styles.label,
                  {
                    color: act.interpolate({
                      inputRange: [0, 1],
                      outputRange: [colors.inkMuted, colors.ink],
                    }),
                  },
                ]}
              >
                {route.name.toLowerCase()}
              </Animated.Text>
            </Animated.View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: spacing(1), backgroundColor: colors.bg },
  // No shell and no padding: the white segments fill the container, and the
  // active item's side margins let the page show through as gaps.
  glass: { flexDirection: 'row', alignItems: 'center', borderRadius: R, overflow: 'hidden' },
  item: { paddingVertical: spacing(2.25), paddingHorizontal: spacing(3), alignItems: 'center' },
  // One weight throughout — a weight swap on selection is a jump no spring can
  // smooth over.
  label: { ...type.label, fontFamily: fonts.semibold, fontSize: 15 },
});
