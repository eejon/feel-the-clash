import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';
import { CAPSULE, COLORS } from '@/constants/GachaBallConfig';

interface GachaCapsuleProps {
  positionX: SharedValue<number>;
  positionY: SharedValue<number>;
  rotation: SharedValue<number>;
  isShaking: SharedValue<boolean>;
  children?: React.ReactNode;
}

export function GachaCapsule({
  positionX,
  positionY,
  rotation,
  isShaking,
  children,
}: GachaCapsuleProps) {
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: positionX.value },
      { translateY: positionY.value },
      { rotate: `${rotation.value}deg` },
      { scale: withSpring(isShaking.value ? 1.08 : 1, { damping: 10, stiffness: 300 }) },
    ],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Top half (colored) */}
      <View style={styles.topHalf}>
        <View style={styles.topHighlight} />
      </View>

      {/* Center band */}
      <View style={styles.centerBand}>
        <View style={styles.bandLine} />
      </View>

      {/* Bottom half (white/clear) */}
      <View style={styles.bottomHalf}>
        <View style={styles.bottomHighlight} />
      </View>

      {/* Children (effects overlay) */}
      {children}

      {/* Shine effect */}
      <View style={styles.shineOverlay} />
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
  topHalf: {
    width: CAPSULE.WIDTH,
    height: CAPSULE.HEIGHT * 0.45,
    backgroundColor: COLORS.CAPSULE_TOP,
    borderTopLeftRadius: CAPSULE.WIDTH / 2,
    borderTopRightRadius: CAPSULE.WIDTH / 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
    // Shadow
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
  centerBand: {
    width: CAPSULE.WIDTH + 4,
    height: 16,
    backgroundColor: COLORS.CAPSULE_BAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -2,
    zIndex: 10,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bandLine: {
    width: CAPSULE.WIDTH - 10,
    height: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 1,
  },
  bottomHalf: {
    width: CAPSULE.WIDTH,
    height: CAPSULE.HEIGHT * 0.45,
    backgroundColor: COLORS.CAPSULE_BOTTOM,
    borderBottomLeftRadius: CAPSULE.WIDTH / 2,
    borderBottomRightRadius: CAPSULE.WIDTH / 2,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
    // Shadow
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
  shineOverlay: {
    position: 'absolute',
    top: 10,
    left: 15,
    width: 40,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ rotate: '-20deg' }],
  },
});
