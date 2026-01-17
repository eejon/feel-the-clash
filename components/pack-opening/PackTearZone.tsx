import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const PACK_WIDTH = 220;
const PACK_HEIGHT = 300;
const TEAR_THRESHOLD = 300; // pixels to complete tear (longer drag for dramatic effect)

interface PackTearZoneProps {
  onTearComplete: () => void;
  disabled?: boolean;
}

export function PackTearZone({ onTearComplete, disabled }: PackTearZoneProps) {
  const tearProgress = useSharedValue(0);
  const hasCompletedTear = useSharedValue(false);
  const lastHapticProgress = useSharedValue(0);

  // Idle wobble animation
  const wobble = useSharedValue(0);

  useEffect(() => {
    // Subtle idle wobble
    const interval = setInterval(() => {
      wobble.value = withSpring(Math.random() * 4 - 2, { damping: 10 });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Haptic feedback at progress milestones - more frequent and stronger
  useAnimatedReaction(
    () => tearProgress.value,
    (current) => {
      const milestones = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
      for (const milestone of milestones) {
        if (current >= milestone && lastHapticProgress.value < milestone) {
          // Stronger haptics as we get closer to completion
          if (milestone >= 0.6) {
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
      }
      lastHapticProgress.value = current;
    }
  );

  const handleTearComplete = () => {
    // Strong haptic burst on complete
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 50);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 100);
    onTearComplete();
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((event) => {
      if (hasCompletedTear.value) return;

      // Only allow downward swipe with resistance
      const rawProgress = Math.max(0, event.translationY / TEAR_THRESHOLD);
      // Apply resistance curve - harder to tear as you go (power > 1 makes it resistant)
      const resistedProgress = Math.min(1, Math.pow(rawProgress, 1.5));
      tearProgress.value = resistedProgress;
    })
    .onEnd((event) => {
      if (hasCompletedTear.value) return;

      if (tearProgress.value > 0.8 || event.velocityY > 1500) {
        // Complete the tear with slower animation
        hasCompletedTear.value = true;
        tearProgress.value = withTiming(1, { duration: 800 });
        runOnJS(handleTearComplete)();
      } else {
        // Snap back
        tearProgress.value = withSpring(0, { damping: 12 });
      }
    });

  // Pack container with wobble
  const packContainerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value}deg` }],
  }));

  // Top half tears upward and rotates back
  const topHalfStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(tearProgress.value, [0, 1], [0, -60]) },
      { rotateX: `${interpolate(tearProgress.value, [0, 1], [0, -50])}deg` },
      { perspective: 800 },
    ],
    opacity: interpolate(tearProgress.value, [0.7, 1], [1, 0], Extrapolation.CLAMP),
  }));

  // Bottom half stays but fades
  const bottomHalfStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tearProgress.value, [0.5, 1], [1, 0], Extrapolation.CLAMP),
  }));

  // Tear line (jagged edge) appears during tear
  const tearLineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tearProgress.value, [0.1, 0.3, 0.8, 1], [0, 1, 1, 0]),
    transform: [
      { scaleX: interpolate(tearProgress.value, [0, 0.5], [0.3, 1], Extrapolation.CLAMP) },
    ],
  }));

  // Glow effect intensifies during tear
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tearProgress.value, [0, 0.5, 1], [0.3, 0.8, 0]),
    transform: [
      { scale: interpolate(tearProgress.value, [0, 1], [1, 1.3]) },
    ],
  }));

  // Hint text fades during tear
  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tearProgress.value, [0, 0.2], [1, 0]),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {/* Glow behind pack */}
        <Animated.View style={[styles.glow, glowStyle]} />

        <Animated.View style={[styles.packContainer, packContainerStyle]}>
          {/* Top half of pack */}
          <Animated.View style={[styles.packTop, topHalfStyle]}>
            <View style={styles.packTopInner}>
              <Text style={styles.packTopText}>RARE</Text>
              <View style={styles.packTopStripe} />
            </View>
          </Animated.View>

          {/* Tear line */}
          <Animated.View style={[styles.tearLine, tearLineStyle]}>
            {[...Array(12)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tearTooth,
                  { transform: [{ rotate: i % 2 === 0 ? '45deg' : '-45deg' }] },
                ]}
              />
            ))}
          </Animated.View>

          {/* Bottom half of pack */}
          <Animated.View style={[styles.packBottom, bottomHalfStyle]}>
            <View style={styles.packBottomInner}>
              <Text style={styles.packEmoji}>📦</Text>
              <Text style={styles.packLabel}>BOOSTER PACK</Text>
              <View style={styles.packBottomStripe} />
            </View>
          </Animated.View>
        </Animated.View>

        {/* Swipe hint */}
        <Animated.View style={[styles.hintContainer, hintStyle]}>
          <Text style={styles.hintArrow}>↓</Text>
          <Text style={styles.hintText}>Swipe down to tear open</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: PACK_WIDTH + 60,
    height: PACK_HEIGHT + 60,
    borderRadius: 30,
    backgroundColor: '#ffd700',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
  },
  packContainer: {
    width: PACK_WIDTH,
    height: PACK_HEIGHT,
  },
  // Top half
  packTop: {
    height: PACK_HEIGHT * 0.35,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#ffd700',
    overflow: 'hidden',
  },
  packTopInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16213e',
  },
  packTopText: {
    color: '#ffd700',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
  },
  packTopStripe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#ffd700',
  },
  // Tear line
  tearLine: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: 16,
    marginVertical: -8,
    zIndex: 10,
  },
  tearTooth: {
    width: 16,
    height: 16,
    backgroundColor: '#0a0a0f',
    marginHorizontal: 1,
  },
  // Bottom half
  packBottom: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: '#ffd700',
    overflow: 'hidden',
  },
  packBottomInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16213e',
  },
  packEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  packLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
  packBottomStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#ffd700',
  },
  // Hint
  hintContainer: {
    position: 'absolute',
    bottom: -80,
    alignItems: 'center',
  },
  hintArrow: {
    color: '#ffd700',
    fontSize: 32,
    marginBottom: 4,
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
});
