import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withDelay,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { CARD_WIDTH, CARD_HEIGHT } from '@/constants/PackOpeningConfig';

interface SparklesProps {
  color: string;
  count?: number;
}

interface Particle {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  duration: number;
  size: number;
  symbol: string;
}

const SPARKLE_SYMBOLS = ['✦', '✧', '★', '·'];

export function Sparkles({ color, count = 12 }: SparklesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i): Particle => {
      // Start from edges of card
      const angle = (i / count) * Math.PI * 2;
      const startRadius = Math.min(CARD_WIDTH, CARD_HEIGHT) * 0.4;
      const endRadius = startRadius + 40 + Math.random() * 60;

      return {
        id: i,
        startX: Math.cos(angle) * startRadius,
        startY: Math.sin(angle) * startRadius,
        endX: Math.cos(angle) * endRadius + (Math.random() - 0.5) * 30,
        endY: Math.sin(angle) * endRadius + (Math.random() - 0.5) * 30 - 20,
        delay: Math.random() * 800,
        duration: 1200 + Math.random() * 600,
        size: 12 + Math.random() * 10,
        symbol: SPARKLE_SYMBOLS[Math.floor(Math.random() * SPARKLE_SYMBOLS.length)],
      };
    });
  }, [count]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <SparkleParticle key={particle.id} particle={particle} color={color} />
      ))}
    </View>
  );
}

function SparkleParticle({ particle, color }: { particle: Particle; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: particle.duration,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0, { duration: 0 }) // Reset instantly
        ),
        -1, // Infinite
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [particle.startX, particle.endX]
        ),
      },
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [particle.startY, particle.endY]
        ),
      },
      {
        scale: interpolate(
          progress.value,
          [0, 0.2, 0.7, 1],
          [0, 1.3, 1, 0]
        ),
      },
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg`,
      },
    ],
    opacity: interpolate(progress.value, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
  }));

  return (
    <Animated.View style={[styles.particle, style]}>
      <Text
        style={[
          styles.sparkleText,
          { color, fontSize: particle.size, textShadowColor: color },
        ]}
      >
        {particle.symbol}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: CARD_HEIGHT / 2,
    left: CARD_WIDTH / 2,
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute',
  },
  sparkleText: {
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
