import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { CARD_WIDTH, CARD_HEIGHT } from '@/constants/PackOpeningConfig';

interface CardShineProps {
  active: boolean;
  delay?: number;
  color?: string;
}

export function CardShine({ active, delay = 0, color = '#fff' }: CardShineProps) {
  const shinePosition = useSharedValue(-1);

  useEffect(() => {
    if (active) {
      // Initial sweep after flip
      shinePosition.value = withDelay(
        delay,
        withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) })
      );

      // Then repeat periodically
      const timeout = setTimeout(() => {
        shinePosition.value = withRepeat(
          withSequence(
            withTiming(-1, { duration: 0 }),
            withDelay(2000, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }))
          ),
          -1,
          false
        );
      }, delay + 600);

      return () => clearTimeout(timeout);
    } else {
      shinePosition.value = -1;
    }
  }, [active, delay]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shinePosition.value, [-1, 1], [-CARD_WIDTH * 1.5, CARD_WIDTH * 1.5]) },
      { rotate: '25deg' },
    ],
    opacity: interpolate(shinePosition.value, [-1, -0.5, 0, 0.5, 1], [0, 0.6, 0.8, 0.6, 0]),
  }));

  if (!active) return null;

  return (
    <Animated.View style={[styles.shineContainer]} pointerEvents="none">
      <Animated.View style={[styles.shine, { backgroundColor: color }, shineStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 16,
  },
  shine: {
    position: 'absolute',
    top: -CARD_HEIGHT * 0.5,
    width: 60,
    height: CARD_HEIGHT * 2,
    opacity: 0.5,
  },
});
