import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CAPSULE, COLORS, TIMING } from '@/constants/GachaBallConfig';

interface CapsuleOpenRevealProps {
  onComplete: () => void;
}

export function CapsuleOpenReveal({ onComplete }: CapsuleOpenRevealProps) {
  // Animation values
  const shakeX = useSharedValue(0);
  const topHalfY = useSharedValue(0);
  const bottomHalfY = useSharedValue(0);
  const topRotation = useSharedValue(0);
  const bottomRotation = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const contentScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  useEffect(() => {
    // Phase 1: Shake/vibrate (0-400ms)
    shakeX.value = withSequence(
      withTiming(6, { duration: 40 }),
      withTiming(-6, { duration: 40 }),
      withTiming(6, { duration: 40 }),
      withTiming(-6, { duration: 40 }),
      withTiming(5, { duration: 40 }),
      withTiming(-5, { duration: 40 }),
      withTiming(4, { duration: 40 }),
      withTiming(-4, { duration: 40 }),
      withTiming(0, { duration: 40 })
    );
    runOnJS(triggerHaptic)();

    // Phase 2: Glow intensifies (300-600ms)
    setTimeout(() => {
      glowScale.value = withTiming(1.8, { duration: 300 });
      glowOpacity.value = withTiming(0.8, { duration: 300 });
      runOnJS(triggerHaptic)();
    }, 300);

    // Phase 3: Split open (500-900ms)
    setTimeout(() => {
      topHalfY.value = withSpring(-120, { damping: 10, stiffness: 80 });
      bottomHalfY.value = withSpring(120, { damping: 10, stiffness: 80 });
      topRotation.value = withSpring(-25, { damping: 8, stiffness: 100 });
      bottomRotation.value = withSpring(25, { damping: 8, stiffness: 100 });
      glowScale.value = withTiming(2.5, { duration: 400 });
      runOnJS(triggerHaptic)();
    }, 500);

    // Phase 4: Content reveal (700-1000ms)
    setTimeout(() => {
      contentScale.value = withSpring(1, { damping: 8, stiffness: 100 });
      contentOpacity.value = withTiming(1, { duration: 300 });
    }, 700);

    // Phase 5: Fade glow, complete (1200-1500ms)
    setTimeout(() => {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }, 1200);

    // Callback
    setTimeout(() => {
      onComplete();
    }, TIMING.OPENING_DURATION);
  }, []);

  // Container shake
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Top half
  const topHalfStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: topHalfY.value },
      { rotate: `${topRotation.value}deg` },
    ],
  }));

  // Bottom half
  const bottomHalfStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bottomHalfY.value },
      { rotate: `${bottomRotation.value}deg` },
    ],
  }));

  // Glow
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  // Content
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Glow effect */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {/* Top half */}
      <Animated.View style={[styles.topHalf, topHalfStyle]}>
        <View style={styles.topHighlight} />
      </Animated.View>

      {/* Center band splits with capsule */}
      <View style={styles.centerBandContainer}>
        <Animated.View style={[styles.centerBandTop, topHalfStyle]} />
        <Animated.View style={[styles.centerBandBottom, bottomHalfStyle]} />
      </View>

      {/* Bottom half */}
      <Animated.View style={[styles.bottomHalf, bottomHalfStyle]}>
        <View style={styles.bottomHighlight} />
      </Animated.View>

      {/* Content reveal */}
      <Animated.View style={[styles.content, contentStyle]}>
        <Text style={styles.packIcon}>📦</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CAPSULE.WIDTH,
    height: CAPSULE.HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: CAPSULE.WIDTH * 1.5,
    height: CAPSULE.HEIGHT * 1.5,
    borderRadius: CAPSULE.WIDTH,
    backgroundColor: COLORS.GLOW,
    shadowColor: COLORS.GLOW,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  topHalf: {
    position: 'absolute',
    top: 0,
    width: CAPSULE.WIDTH,
    height: CAPSULE.HEIGHT * 0.45,
    backgroundColor: COLORS.CAPSULE_TOP,
    borderTopLeftRadius: CAPSULE.WIDTH / 2,
    borderTopRightRadius: CAPSULE.WIDTH / 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  topHighlight: {
    position: 'absolute',
    top: 15,
    left: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  centerBandContainer: {
    position: 'absolute',
    top: CAPSULE.HEIGHT * 0.45 - 8,
    width: CAPSULE.WIDTH + 4,
    height: 16,
    overflow: 'hidden',
  },
  centerBandTop: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 8,
    backgroundColor: COLORS.CAPSULE_BAND,
  },
  centerBandBottom: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 8,
    backgroundColor: COLORS.CAPSULE_BAND,
  },
  bottomHalf: {
    position: 'absolute',
    bottom: 0,
    width: CAPSULE.WIDTH,
    height: CAPSULE.HEIGHT * 0.45,
    backgroundColor: COLORS.CAPSULE_BOTTOM,
    borderBottomLeftRadius: CAPSULE.WIDTH / 2,
    borderBottomRightRadius: CAPSULE.WIDTH / 2,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomHighlight: {
    position: 'absolute',
    top: 20,
    left: 25,
    width: 20,
    height: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  content: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packIcon: {
    fontSize: 60,
  },
});
