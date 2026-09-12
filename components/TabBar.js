import { useRef, useState } from 'react';
import { View, Pressable, Text, Animated, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';

const ICONS = {
  Home: { active: 'home', inactive: 'home-outline' },
  Agents: { active: 'sparkles', inactive: 'sparkles-outline' },
};

export default function TabBar({ state, navigation }) {
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

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + spacing(1.5) }]} pointerEvents="box-none">
      <BlurView intensity={60} tint="light" style={styles.glass}>
        <Animated.View
          style={[
            styles.pill,
            { transform: [{ translateX: pillX }], width: pillW, opacity: ready ? 1 : 0 },
          ]}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icons = ICONS[route.name] ?? ICONS.Home;

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
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={16}
                color={focused ? '#fff' : colors.inkMuted}
              />
              <Text style={[styles.label, focused && styles.labelActive]}>{route.name}</Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  glass: {
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(21,21,21,0.08)',
    padding: 4,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.9)' : 'transparent',
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
  },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkMuted },
  labelActive: { color: '#fff' },
});
