import React, { useState, useEffect, useCallback } from 'react';
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
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { CardStack } from '@/components/pack-opening';
import { consumePack, addPetsToCollection, PetInstance } from '@/utils/storage';
import { getRandomAnimal, getAnimalById } from '@/constants/GameData';
import { PackOpeningPhase, CARD_COUNT } from '@/constants/PackOpeningConfig';

export default function PackOpeningScreen() {
  const router = useRouter();

  // State machine
  const [phase, setPhase] = useState<PackOpeningPhase>('IDLE');
  const [pulledPets, setPulledPets] = useState<PetInstance[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  // Pack animation values
  const packScale = useSharedValue(1);
  const packRotation = useSharedValue(0);
  const packOpacity = useSharedValue(1);

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
  };

  // Handle pack tap to start opening
  const handlePackTap = useCallback(() => {
    if (phase !== 'IDLE') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Animate pack opening
    packScale.value = withSequence(
      withSpring(1.1, { damping: 8 }),
      withTiming(0.8, { duration: 200 }),
      withTiming(0, { duration: 300 })
    );
    packRotation.value = withTiming(15, {
      duration: 400,
      easing: Easing.out(Easing.quad),
    });
    packOpacity.value = withTiming(0, { duration: 400 });

    // Transition to cascade phase
    setTimeout(() => {
      setPhase('CASCADE');
    }, 500);
  }, [phase]);

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

      // Check for legendary and trigger screen shake
      const pet = pulledPets[index];
      const animal = pet ? getAnimalById(pet.animalId) : null;
      if (animal?.rarity === 5) {
        triggerScreenShake();
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
      withTiming(4, { duration: 40 }),
      withTiming(-4, { duration: 40 }),
      withTiming(3, { duration: 40 }),
      withTiming(-3, { duration: 40 }),
      withTiming(2, { duration: 40 }),
      withTiming(-2, { duration: 40 }),
      withTiming(0, { duration: 40 })
    );
    screenShakeX.value = shakeAnimation;
    screenShakeY.value = shakeAnimation;
  };

  // Animated styles
  const packStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: packScale.value },
      { rotate: `${packRotation.value}deg` },
    ],
    opacity: packOpacity.value,
  }));

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

  return (
    <Animated.View style={[styles.outerContainer, screenShakeStyle]}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {phase === 'IDLE' && 'Tap to Open!'}
            {phase === 'CASCADE' && 'Here they come...'}
            {phase === 'REVEALING' && 'Tap cards to reveal!'}
            {phase === 'COMPLETE' && 'All Revealed!'}
          </Text>
        </View>

        {/* Content area */}
        <View style={styles.content}>
          {/* Pack (shown in IDLE phase) */}
          {phase === 'IDLE' && (
            <TouchableOpacity
              onPress={handlePackTap}
              activeOpacity={0.9}
              disabled={pulledPets.length === 0}
            >
              <Animated.View style={[styles.packContainer, packStyle]}>
                <View style={styles.pack}>
                  <Text style={styles.packEmoji}>📦</Text>
                  <Text style={styles.packText}>
                    {pulledPets.length > 0 ? 'TAP TO OPEN' : 'Loading...'}
                  </Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
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
  // Pack styles
  packContainer: {
    alignItems: 'center',
  },
  pack: {
    width: 200,
    height: 260,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#ffd700',
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  packEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  packText: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
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
