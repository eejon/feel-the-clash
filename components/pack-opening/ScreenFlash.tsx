import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ScreenFlashRef {
  flash: (color?: string) => void;
}

interface ScreenFlashProps {
  defaultColor?: string;
}

export const ScreenFlash = forwardRef<ScreenFlashRef, ScreenFlashProps>(
  ({ defaultColor = '#fff' }, ref) => {
    const opacity = useSharedValue(0);
    const flashColor = useSharedValue(defaultColor);

    useImperativeHandle(ref, () => ({
      flash: (color?: string) => {
        if (color) {
          flashColor.value = color;
        }
        opacity.value = withSequence(
          withTiming(0.9, { duration: 80, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) })
        );
      },
    }));

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      backgroundColor: flashColor.value,
    }));

    return <Animated.View style={[styles.flash, animatedStyle]} pointerEvents="none" />;
  }
);

const styles = StyleSheet.create({
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
});
