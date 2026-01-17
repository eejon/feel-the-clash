import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { FlipCard } from './FlipCard';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  TIMING,
  SPRING,
} from '@/constants/PackOpeningConfig';
import type { PetInstance } from '@/utils/storage';
import { getAnimalById } from '@/constants/GameData';

interface CardStackProps {
  pets: PetInstance[];
  currentCardIndex: number;
  flippedCards: Set<number>;
  onCascadeComplete: () => void;
  onCardFlipped: (index: number) => void;
  onCardDismissed: () => void;
  startCascade: boolean;
}

// Individual animated card wrapper component
function AnimatedCard({
  pet,
  index,
  currentCardIndex,
  flippedCards,
  totalCards,
  onCardFlipped,
  onCardDismissed,
  shouldAnimate,
}: {
  pet: PetInstance;
  index: number;
  currentCardIndex: number;
  flippedCards: Set<number>;
  totalCards: number;
  onCardFlipped: (index: number) => void;
  onCardDismissed: () => void;
  shouldAnimate: boolean;
}) {
  const translateY = useSharedValue(-400);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  const baseAnimal = getAnimalById(pet.animalId);

  useEffect(() => {
    if (shouldAnimate) {
      const delay = index * TIMING.CASCADE_DELAY;

      // Haptic feedback
      const hapticTimer = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, delay);

      // Animate in
      translateY.value = withDelay(delay, withSpring(0, SPRING.BOUNCY));
      opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
      scale.value = withDelay(delay, withSpring(1, SPRING.BOUNCY));

      return () => clearTimeout(hapticTimer);
    }
  }, [shouldAnimate, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  if (!baseAnimal) return null;
  if (index < currentCardIndex) return null;

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <FlipCard
        pet={pet}
        baseAnimal={baseAnimal}
        isTopCard={index === currentCardIndex}
        isFlipped={flippedCards.has(index)}
        stackIndex={index}
        totalCards={totalCards}
        onFlip={() => onCardFlipped(index)}
        onDismiss={onCardDismissed}
      />
    </Animated.View>
  );
}

export function CardStack({
  pets,
  currentCardIndex,
  flippedCards,
  onCascadeComplete,
  onCardFlipped,
  onCardDismissed,
  startCascade,
}: CardStackProps) {
  const [cascadeStarted, setCascadeStarted] = useState(false);

  // Start cascade animation
  useEffect(() => {
    if (startCascade && !cascadeStarted) {
      setCascadeStarted(true);

      // Notify when cascade is complete
      const totalDuration = pets.length * TIMING.CASCADE_DELAY + TIMING.CASCADE_DURATION;
      const timer = setTimeout(() => {
        onCascadeComplete();
      }, totalDuration);

      return () => clearTimeout(timer);
    }
  }, [startCascade, cascadeStarted, pets.length, onCascadeComplete]);

  // Instruction text
  const showInstruction = flippedCards.size === 0 && currentCardIndex === 0;
  const showSwipeHint = flippedCards.has(currentCardIndex) && currentCardIndex < pets.length - 1;

  return (
    <View style={styles.container}>
      {/* Instruction overlay */}
      {showInstruction && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>Tap to reveal!</Text>
        </View>
      )}

      {/* Swipe hint */}
      {showSwipeHint && (
        <View style={styles.swipeHintContainer}>
          <Text style={styles.swipeHintText}>↑ Swipe up for next card</Text>
        </View>
      )}

      {/* Card stack - render in reverse order so first card is on top */}
      <View style={styles.stackContainer}>
        {pets
          .slice()
          .reverse()
          .map((pet, reversedIndex) => {
            const actualIndex = pets.length - 1 - reversedIndex;
            return (
              <AnimatedCard
                key={pet.instanceId}
                pet={pet}
                index={actualIndex}
                currentCardIndex={currentCardIndex}
                flippedCards={flippedCards}
                totalCards={pets.length}
                onCardFlipped={onCardFlipped}
                onCardDismissed={onCardDismissed}
                shouldAnimate={cascadeStarted}
              />
            );
          })}
      </View>

      {/* Card counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {Math.min(currentCardIndex + 1, pets.length)} / {pets.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
  },
  instructionContainer: {
    position: 'absolute',
    top: 40,
    zIndex: 100,
  },
  instructionText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  swipeHintContainer: {
    position: 'absolute',
    bottom: 60,
    zIndex: 100,
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  counterContainer: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
