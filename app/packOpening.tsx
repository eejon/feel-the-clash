import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import {
  CardStack,
  PackTearZone,
  AmbientParticles,
  ScreenFlash,
  ScreenFlashRef,
} from '@/components/pack-opening';
import { consumePack, addPetsToCollection, PetInstance } from '@/utils/storage';
import { getRandomAnimal, getAnimalById } from '@/constants/GameData';
import { PackOpeningPhase, CARD_COUNT, RARITY_COLORS } from '@/constants/PackOpeningConfig';

export default function PackOpeningScreen() {
  const router = useRouter();
  const screenFlashRef = useRef<ScreenFlashRef>(null);

  // State machine
  const [phase, setPhase] = useState<PackOpeningPhase>('IDLE');
  const [pulledPets, setPulledPets] = useState<PetInstance[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Screen shake for legendary
  const screenShakeX = useSharedValue(0);
  const screenShakeY = useSharedValue(0);

  useEffect(() => {
    openPack();
  }, []);

  const openPack = async () => {
    const packsLeft = await consumePack();
    if (packsLeft === false) {
      Alert.alert('Error', 'No packs left!', [
        { text: 'Back', onPress: () => router.back() },
      ]);
      return;
    }

    // Generate random pets using weighted rarity
    const newInstances: PetInstance[] = [];
    for (let i = 0; i < CARD_COUNT; i++) {
      const randomAnimal = getRandomAnimal();
      newInstances.push({
        instanceId: `${Date.now()}-${i}`,
        animalId: randomAnimal.id,
        name: randomAnimal.name,
        obtainedAt: Date.now(),
      });
    }

    // Save immediately
    await addPetsToCollection(newInstances);
    setPulledPets(newInstances);
    setIsLoading(false);
  };

  // Handle pack tear complete
  const handleTearComplete = useCallback(() => {
    // Small delay for the tear animation to finish visually
    setTimeout(() => {
      setPhase('CASCADE');
    }, 200);
  }, []);

  // Handle cascade complete
  const handleCascadeComplete = useCallback(() => {
    setPhase('REVEALING');
  }, []);

  // Handle card flip
  const handleCardFlipped = useCallback(
    (index: number) => {
      setFlippedCards((prev) => {
        const newSet = new Set(prev);
        newSet.add(index);
        return newSet;
      });

      // Check for rare cards and trigger effects
      const pet = pulledPets[index];
      const animal = pet ? getAnimalById(pet.animalId) : null;

      if (animal) {
        // Screen flash for rare cards (rarity 4+)
        if (animal.rarity >= 4) {
          setTimeout(() => {
            screenFlashRef.current?.flash(RARITY_COLORS[animal.rarity]);
          }, 250); // Delay to sync with flip
        }

        // Screen shake for legendary (rarity 5)
        if (animal.rarity === 5) {
          setTimeout(() => {
            triggerScreenShake();
          }, 300);
        }
      }
    },
    [pulledPets]
  );

  // Handle card dismissed (swiped up)
  const handleCardDismissed = useCallback(() => {
    const nextIndex = currentCardIndex + 1;
    if (nextIndex >= pulledPets.length) {
      setPhase('COMPLETE');
    } else {
      setCurrentCardIndex(nextIndex);
    }
  }, [currentCardIndex, pulledPets.length]);

  // Screen shake for legendary reveals
  const triggerScreenShake = () => {
    const shakeAnimation = withSequence(
      withTiming(5, { duration: 30 }),
      withTiming(-5, { duration: 30 }),
      withTiming(4, { duration: 30 }),
      withTiming(-4, { duration: 30 }),
      withTiming(3, { duration: 30 }),
      withTiming(-3, { duration: 30 }),
      withTiming(2, { duration: 30 }),
      withTiming(-2, { duration: 30 }),
      withTiming(0, { duration: 30 })
    );
    screenShakeX.value = shakeAnimation;
    screenShakeY.value = shakeAnimation;
  };

  const screenShakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: screenShakeX.value },
      { translateY: screenShakeY.value },
    ],
  }));

  // Handle collect all
  const handleCollectAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  // Get header text based on phase
  const getHeaderText = () => {
    if (isLoading) return 'Preparing pack...';
    switch (phase) {
      case 'IDLE':
        return 'Tear it open!';
      case 'CASCADE':
        return 'Here they come...';
      case 'REVEALING':
        return 'Tap to reveal!';
      case 'COMPLETE':
        return 'All Revealed!';
      default:
        return '';
    }
  };

  return (
    <Animated.View style={[styles.outerContainer, screenShakeStyle]}>
      {/* Ambient floating particles */}
      {(phase === 'CASCADE' || phase === 'REVEALING') && (
        <AmbientParticles count={25} color="rgba(255, 215, 0, 0.6)" />
      )}

      {/* Screen flash effect */}
      <ScreenFlash ref={screenFlashRef} />

      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>{getHeaderText()}</Text>
        </View>

        {/* Content area */}
        <View style={styles.content}>
          {/* Pack Tear Zone (shown in IDLE phase) */}
          {phase === 'IDLE' && (
            <PackTearZone
              onTearComplete={handleTearComplete}
              disabled={isLoading}
            />
          )}

          {/* Card Stack (shown in CASCADE and REVEALING phases) */}
          {(phase === 'CASCADE' || phase === 'REVEALING') && (
            <CardStack
              pets={pulledPets}
              currentCardIndex={currentCardIndex}
              flippedCards={flippedCards}
              onCascadeComplete={handleCascadeComplete}
              onCardFlipped={handleCardFlipped}
              onCardDismissed={handleCardDismissed}
              startCascade={phase === 'CASCADE' || phase === 'REVEALING'}
            />
          )}

          {/* Complete state */}
          {phase === 'COMPLETE' && (
            <View style={styles.completeContainer}>
              <Text style={styles.completeEmoji}>🎉</Text>
              <Text style={styles.completeText}>
                You got {pulledPets.length} new pets!
              </Text>
            </View>
          )}
        </View>

        {/* Bottom button */}
        {phase === 'COMPLETE' && (
          <TouchableOpacity style={styles.collectBtn} onPress={handleCollectAll}>
            <Text style={styles.collectBtnText}>Collect All</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerText: {
    color: '#ffd700',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Complete styles
  completeContainer: {
    alignItems: 'center',
  },
  completeEmoji: {
    fontSize: 100,
    marginBottom: 20,
  },
  completeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  // Button
  collectBtn: {
    backgroundColor: '#4dff4d',
    marginHorizontal: 40,
    marginBottom: 40,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    // Shadow
    shadowColor: '#4dff4d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  collectBtnText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
  },
});
