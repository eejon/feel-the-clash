import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { RARITY_COLORS, TIMING, CARD_WIDTH, CARD_HEIGHT } from '@/constants/PackOpeningConfig';
import { Sparkles } from './Sparkles';

interface RareEffectsProps {
  rarity: number;
  showParticles?: boolean;
}

export function RareEffects({ rarity, showParticles = true }: RareEffectsProps) {
  const glowIntensity = useSharedValue(0);
  const color = RARITY_COLORS[rarity] || RARITY_COLORS[1];

  useEffect(() => {
    // Pulsing glow animation
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: TIMING.GLOW_PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.4, {
          duration: TIMING.GLOW_PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1, // Infinite
      true // Reverse
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(glowIntensity.value, [0.4, 1], [0.5, 1]),
    shadowRadius: interpolate(glowIntensity.value, [0.4, 1], [20, 40]),
    elevation: interpolate(glowIntensity.value, [0.4, 1], [15, 30]),
  }));

  // Inner glow overlay
  const innerGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowIntensity.value, [0.4, 1], [0.1, 0.25]),
  }));

  return (
    <>
      {/* Outer glow container */}
      <Animated.View style={[styles.glowContainer, glowStyle]} pointerEvents="none" />

      {/* Inner gradient-like glow */}
      <Animated.View
        style={[styles.innerGlow, { backgroundColor: color }, innerGlowStyle]}
        pointerEvents="none"
      />

      {/* Sparkle particles for rarity 4+ */}
      {showParticles && rarity >= 4 && <Sparkles color={color} count={rarity >= 5 ? 16 : 10} />}
    </>
  );
}

const styles = StyleSheet.create({
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});
