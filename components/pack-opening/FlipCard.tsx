import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { CardBack } from './CardBack';
import { CardFront } from './CardFront';
import { RareEffects } from './RareEffects';
import { CardShine } from './CardShine';
import { RARITY_COLORS } from '@/constants/PackOpeningConfig';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  TIMING,
  THRESHOLDS,
  STACK,
  RARITY_EFFECTS,
} from '@/constants/PackOpeningConfig';
import type { PetInstance } from '@/utils/storage';

interface FlipCardProps {
  pet: PetInstance;
  baseAnimal: {
    id: number;
    name: string;
    rarity: number;
    emoji?: string;
  };
  isTopCard: boolean;
  isFlipped: boolean;
  stackIndex: number;
  totalCards: number;
  onFlip: () => void;
  onDismiss: () => void;
}

export function FlipCard({
  pet,
  baseAnimal,
  isTopCard,
  isFlipped,
  stackIndex,
  totalCards,
  onFlip,
  onDismiss,
}: FlipCardProps) {
  // Flip animation value (0 = back showing, 180 = front showing)
  const rotateY = useSharedValue(0);

  // Dismiss animation values
  const dismissY = useSharedValue(0);
  const dismissOpacity = useSharedValue(1);
  const dismissScale = useSharedValue(1);

  // Stack positioning values - cards behind current card get offset
  const depthIndex = totalCards - 1 - stackIndex; // 0 for top card, increases for cards behind
  const stackOffsetY = depthIndex * STACK.OFFSET_Y;
  const stackScale = 1 - depthIndex * STACK.SCALE_DECREMENT;
  const stackRotation = depthIndex * STACK.ROTATION_INCREMENT;

  // Effects for this rarity
  const effects = RARITY_EFFECTS[baseAnimal.rarity] || RARITY_EFFECTS[1];

  // Handle flip action
  const handleFlip = () => {
    if (isFlipped || !isTopCard) return;

    // Strong haptic on flip
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    rotateY.value = withTiming(180, {
      duration: TIMING.FLIP_DURATION,
      easing: Easing.out(Easing.back(1.5)),
    });

    onFlip();

    // Extra haptic burst for rare cards
    if (baseAnimal.rarity >= 4) {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, TIMING.FLIP_DURATION * 0.4);
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, TIMING.FLIP_DURATION * 0.6);
      if (baseAnimal.rarity === 5) {
        // Extra burst for legendary
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, TIMING.FLIP_DURATION * 0.8);
      }
    }
  };

  // Handle dismiss action (animate out then callback)
  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Animate out
    dismissY.value = withTiming(-600, { duration: TIMING.DISMISS_DURATION });
    dismissOpacity.value = withTiming(0, { duration: TIMING.DISMISS_DURATION });
    // Callback after animation starts
    setTimeout(() => {
      onDismiss();
    }, 50);
  };

  // Handle tap - either flip or dismiss depending on state
  const handleTap = () => {
    if (!isTopCard) return;

    if (!isFlipped) {
      handleFlip();
    } else {
      handleDismiss();
    }
  };

  // Tap gesture - flip if not flipped, dismiss if flipped
  const tapGesture = Gesture.Tap()
    .enabled(isTopCard)
    .onEnd(() => {
      runOnJS(handleTap)();
    });

  // Pan gesture for dismissing (swipe up) - only when flipped
  const panGesture = Gesture.Pan()
    .enabled(isTopCard && isFlipped)
    .minDistance(10) // Require some movement to activate pan
    .onUpdate((event) => {
      // Only allow upward swipe
      if (event.translationY < 0) {
        dismissY.value = event.translationY;
        dismissScale.value = interpolate(
          event.translationY,
          [-200, 0],
          [0.8, 1]
        );
        dismissOpacity.value = interpolate(
          event.translationY,
          [-200, 0],
          [0.3, 1]
        );
      }
    })
    .onEnd((event) => {
      const shouldDismiss =
        event.translationY < -THRESHOLDS.DISMISS_DISTANCE ||
        event.velocityY < -THRESHOLDS.DISMISS_VELOCITY;

      if (shouldDismiss) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        // Animate out
        dismissY.value = withTiming(-600, { duration: TIMING.DISMISS_DURATION });
        dismissOpacity.value = withTiming(0, { duration: TIMING.DISMISS_DURATION });
        runOnJS(onDismiss)();
      } else {
        // Snap back
        dismissY.value = withSpring(0, { damping: 15 });
        dismissScale.value = withSpring(1, { damping: 15 });
        dismissOpacity.value = withSpring(1, { damping: 15 });
      }
    });

  // Combine gestures - pan takes priority if moving, otherwise tap
  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  // Container style (position in stack + dismiss animation)
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: stackOffsetY + dismissY.value },
      { scale: stackScale * dismissScale.value },
      { rotateZ: `${stackRotation}deg` },
    ],
    opacity: dismissOpacity.value,
  }));

  // Back face style (visible when rotateY is 0-90)
  const backStyle = useAnimatedStyle(() => {
    const opacity = rotateY.value < 90 ? 1 : 0;
    return {
      transform: [
        { perspective: STACK.PERSPECTIVE },
        { rotateY: `${rotateY.value}deg` },
      ],
      opacity,
      backfaceVisibility: 'hidden' as const,
    };
  });

  // Front face style (visible when rotateY is 90-180)
  const frontStyle = useAnimatedStyle(() => {
    const opacity = rotateY.value >= 90 ? 1 : 0;
    return {
      transform: [
        { perspective: STACK.PERSPECTIVE },
        { rotateY: `${rotateY.value - 180}deg` },
      ],
      opacity,
      backfaceVisibility: 'hidden' as const,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.cardContainer, containerStyle]}>
        {/* Card Back */}
        <Animated.View style={[styles.cardFace, backStyle]}>
          <CardBack />
        </Animated.View>

        {/* Card Front */}
        <Animated.View style={[styles.cardFace, frontStyle]}>
          <CardFront pet={pet} baseAnimal={baseAnimal} />
          {effects.glow && <RareEffects rarity={baseAnimal.rarity} />}
          <CardShine
            active={isFlipped}
            delay={200}
            color={RARITY_COLORS[baseAnimal.rarity] || '#fff'}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardFace: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    borderRadius: 16,
  },
});
