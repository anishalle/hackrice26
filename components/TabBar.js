import { useEffect, useRef } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, type } from '../theme';

const R = 20;
const GAP = spacing(1);

const ACTIVE = { Home: colors.green, Agents: colors.blue, Marketplace: colors.purple };

// Morphic segmented nav: one solid white strip where the active item detaches
// into its own accent pill, and the segments either side round off the edges
// they now face.
//
// Each item carries its own 0..1 spring rather than reading a shared cursor
// position. A single cursor springing from index 2 to index 0 passes through 1
// on the way, which lit the middle item up mid-flight; with a value per item
// only the two actually involved ever move.
export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const count = state.routes.length;
  const one = useRef(new Animated.Value(1)).current;
  const acts = useRef(state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))).current;

  useEffect(() => {
    Animated.parallel(
      acts.map((v, i) =>
        Animated.spring(v, {
          toValue: i === state.index ? 1 : 0,
          useNativeDriver: false,
          damping: 18,
          mass: 0.7,
          stiffness: 170,
        })
      )
    ).start();
  }, [state.index]);

  // A screen can opt out via options={{ tabBarStyle: { display: 'none' } }}.
  // React Navigation only auto-hides its own default tab bar for that, so a
  // custom one (like this) has to check it itself.
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions.tabBarStyle?.display === 'none') return null;

  // A corner opens when this item is active or the neighbour it faces is.
  // During a cross-fade the two sum to 1, so the edge tracks continuously
  // where a boolean would flip.
  const corner = (value) =>
    value.interpolate({ inputRange: [0, 1], outputRange: [0, R], extrapolate: 'clamp' });

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom || spacing(1.5) }]}>
      <View style={styles.glass}>
        {state.routes.map((route, index) => {
          const act = acts[index];
          const leftOpen = index === 0 ? one : Animated.add(act, acts[index - 1]);
          const rightOpen = index === count - 1 ? one : Animated.add(act, acts[index + 1]);

          return (
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
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: spacing(1), backgroundColor: colors.page },
  // No shell and no padding: the white segments fill the container, and the
  // active item's side margins let the page show through as gaps.
  glass: { flexDirection: 'row', alignItems: 'center', borderRadius: R, overflow: 'hidden' },
  item: { paddingVertical: spacing(2.25), paddingHorizontal: spacing(3), alignItems: 'center' },
  // One weight throughout. A weight swap on selection is a jump no spring can
  // smooth over.
  label: { ...type.label, fontFamily: fonts.semibold, fontSize: 15 },
});
