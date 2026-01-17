import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { COLORS, TIMING } from '@/constants/GachaBallConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DustParticlesProps {
  x: number;
  y: number;
}

interface Particle {
  id: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
  rotationSpeed: number;
}

const PARTICLE_COUNT = 12;

export function DustParticles({ x, y }: DustParticlesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i): Particle => ({
      id: i,
      angle: (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
      speed: 80 + Math.random() * 60,
      size: 4 + Math.random() * 6,
      color: Math.random() > 0.5 ? COLORS.DUST_GOLD : COLORS.DUST_SILVER,
      rotationSpeed: (Math.random() - 0.5) * 720,
    }));
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          left: SCREEN_WIDTH / 2 + x,
          top: SCREEN_HEIGHT / 2 + y,
        },
      ]}
      pointerEvents="none"
    >
      {particles.map((particle) => (
        <DustParticle key={particle.id} particle={particle} />
      ))}
    </View>
  );
}

function DustParticle({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: TIMING.DUST_BURST_DURATION,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  const style = useAnimatedStyle(() => {
    const translateX = Math.cos(particle.angle) * particle.speed * progress.value;
    const translateY =
      Math.sin(particle.angle) * particle.speed * progress.value - 30 * progress.value; // Arc upward

    return {
      position: 'absolute' as const,
      width: particle.size,
      height: particle.size,
      borderRadius: particle.size / 2,
      backgroundColor: particle.color,
      transform: [
        { translateX },
        { translateY },
        { scale: interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 1.3, 1, 0]) },
        { rotate: `${particle.rotationSpeed * progress.value}deg` },
      ],
      opacity: interpolate(progress.value, [0, 0.1, 0.7, 1], [0, 1, 0.8, 0]),
      shadowColor: particle.color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    };
  });

  return <Animated.View style={style} />;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 0,
    height: 0,
    marginLeft: -SCREEN_WIDTH / 2,
    marginTop: -SCREEN_HEIGHT / 2,
  },
});
