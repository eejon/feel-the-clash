import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AmbientParticlesProps {
  count?: number;
  color?: string;
}

interface Particle {
  id: number;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

export function AmbientParticles({ count = 20, color = '#ffd700' }: AmbientParticlesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i): Particle => ({
      id: i,
      startX: Math.random() * SCREEN_WIDTH,
      startY: SCREEN_HEIGHT + 20 + Math.random() * 100,
      size: 3 + Math.random() * 5,
      duration: 4000 + Math.random() * 4000,
      delay: Math.random() * 3000,
      drift: (Math.random() - 0.5) * 100,
    }));
  }, [count]);

  return (
    <>
      {particles.map((particle) => (
        <FloatingParticle key={particle.id} particle={particle} color={color} />
      ))}
    </>
  );
}

function FloatingParticle({ particle, color }: { particle: Particle; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(1, { duration: particle.duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: particle.startX + interpolate(progress.value, [0, 1], [0, particle.drift]),
    top: interpolate(progress.value, [0, 1], [particle.startY, -50]),
    width: particle.size,
    height: particle.size,
    borderRadius: particle.size / 2,
    backgroundColor: color,
    opacity: interpolate(progress.value, [0, 0.1, 0.5, 0.9, 1], [0, 0.6, 0.4, 0.2, 0]),
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  }));

  return <Animated.View style={style} pointerEvents="none" />;
}

const styles = StyleSheet.create({});
