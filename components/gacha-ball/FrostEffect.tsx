import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  SharedValue,
  Easing,
} from 'react-native-reanimated';
import { CAPSULE, COLORS } from '@/constants/GachaBallConfig';

interface FrostEffectProps {
  intensity: SharedValue<number>;
}

interface FrostCrystal {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  symbol: string;
}

const FROST_SYMBOLS = ['❄', '❅', '❆', '✧'];
const CRYSTAL_COUNT = 20;

export function FrostEffect({ intensity }: FrostEffectProps) {
  const crystals = useMemo(() => {
    return Array.from({ length: CRYSTAL_COUNT }, (_, i): FrostCrystal => ({
      id: i,
      x: (Math.random() - 0.5) * CAPSULE.WIDTH * 0.9,
      y: (Math.random() - 0.5) * CAPSULE.HEIGHT * 0.8,
      size: 10 + Math.random() * 14,
      delay: Math.random() * 500,
      duration: 1500 + Math.random() * 1000,
      symbol: FROST_SYMBOLS[Math.floor(Math.random() * FROST_SYMBOLS.length)],
    }));
  }, []);

  // Frost overlay
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intensity.value, [0, 1], [0, 0.5]),
  }));

  return (
    <>
      {/* Frost overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none" />

      {/* Frost crystals */}
      {crystals.map((crystal) => (
        <FrostCrystalComponent key={crystal.id} crystal={crystal} intensity={intensity} />
      ))}
    </>
  );
}

function FrostCrystalComponent({
  crystal,
  intensity,
}: {
  crystal: FrostCrystal;
  intensity: SharedValue<number>;
}) {
  const floatProgress = useSharedValue(0);

  useEffect(() => {
    floatProgress.value = withDelay(
      crystal.delay,
      withRepeat(
        withTiming(1, { duration: crystal.duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: CAPSULE.WIDTH / 2 + crystal.x - crystal.size / 2,
    top: CAPSULE.HEIGHT / 2 + crystal.y - crystal.size / 2,
    opacity: interpolate(intensity.value, [0, 0.3, 1], [0, 0.4, 0.9]) *
      interpolate(floatProgress.value, [0, 0.5, 1], [0.3, 1, 0.3]),
    transform: [
      { translateY: interpolate(floatProgress.value, [0, 1], [0, -20]) },
      { scale: interpolate(intensity.value, [0, 1], [0.5, 1]) },
      { rotate: `${floatProgress.value * 360}deg` },
    ],
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <Text
        style={[
          styles.crystalText,
          {
            fontSize: crystal.size,
          },
        ]}
      >
        {crystal.symbol}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    width: CAPSULE.WIDTH,
    height: CAPSULE.HEIGHT,
    borderRadius: CAPSULE.WIDTH / 2,
    backgroundColor: COLORS.FROST,
  },
  crystalText: {
    color: 'rgba(200, 230, 255, 0.9)',
    textShadowColor: 'rgba(200, 230, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});
