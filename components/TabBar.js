import { useRef, useState } from 'react';
import { View, Pressable, Text, Animated, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { House, Sparkle, Storefront } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';

const ICONS = {
  Home: House,
  Agents: Sparkle,
  Marketplace: Storefront,
};

export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const layouts = useRef({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);

  const animateToIndex = (index) => {
    const l = layouts.current[index];
    if (!l) return;
    Animated.spring(pillX, { toValue: l.x, useNativeDriver: false, damping: 18, mass: 0.6, stiffness: 220 }).start();
    Animated.spring(pillW, { toValue: l.width, useNativeDriver: false, damping: 18, mass: 0.6, stiffness: 220 }).start();
    if (!ready) setReady(true);
  };

  // A screen can opt out via options={{ tabBarStyle: { display: 'none' } }} —
  // React Navigation only auto-hides its own default tab bar for that, a
  // custom one (like this) has to check it itself.
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions.tabBarStyle?.display === 'none') return null;

  return (
    // Normal flex flow (not floating) — the navigator reserves this height,
    // so screen content can never end up hidden behind it.
    <View style={[styles.wrap, { paddingBottom: insets.bottom + spacing(1) }]}>
      <BlurView intensity={60} tint="light" style={styles.glass}>
        <Animated.View
          style={[
            styles.pill,
            { transform: [{ translateX: pillX }], width: pillW, opacity: ready ? 1 : 0 },
          ]}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = ICONS[route.name] ?? House;

          return (
            <Pressable
              key={route.key}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                layouts.current[index] = { x, width };
                if (focused) animateToIndex(index);
              }}
              onPress={() => {
                animateToIndex(index);
                navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <Icon size={20} weight={focused ? 'fill' : 'regular'} color={focused ? '#fff' : colors.inkMuted} />
              <Text style={[styles.label, focused && styles.labelActive]}>{route.name}</Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: spacing(1), backgroundColor: colors.bg },
  glass: {
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(21,21,21,0.08)',
    padding: 6,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.92)' : 'transparent',
  },
  pill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2.5),
  },
  label: { fontFamily: fonts.medium, fontSize: 15, color: colors.inkMuted },
  labelActive: { color: '#fff' },
});
