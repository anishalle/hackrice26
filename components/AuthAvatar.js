import { createContext, useContext, useEffect, useRef } from 'react';
import { View } from 'react-native';
import AgentBlob, { AXL_HERO_SEED } from './AgentBlob';

export const AvatarContext = createContext(null);

// Measure the actual layout so the journey works with either form and screen size.
export function AuthAvatar({ size }) {
  const context = useContext(AvatarContext);
  const ref = useRef(null);
  const measure = () => ref.current?.measureInWindow((x, y, width, height) => {
    if (width && height) context?.report({ x, y, size: width });
  });
  useEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [context?.screen]);
  return (
    <View ref={ref} collapsable={false} onLayout={measure} style={{ width: size, height: size }}>
      <View style={{ opacity: context?.moving ? 0 : 1 }}>
        <AgentBlob seed={AXL_HERO_SEED} size={size} />
      </View>
    </View>
  );
}

