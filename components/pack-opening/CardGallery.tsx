import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { RARITY_COLORS } from '@/constants/PackOpeningConfig';
import { getAnimalById } from '@/constants/GameData';
import type { PetInstance } from '@/utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Gallery card dimensions (smaller than reveal cards)
const GALLERY_CARD_WIDTH = SCREEN_WIDTH * 0.35;
const GALLERY_CARD_HEIGHT = GALLERY_CARD_WIDTH * 1.4;
const CARD_SPACING = 12;

interface CardGalleryProps {
  pets: PetInstance[];
}

interface GalleryCardProps {
  pet: PetInstance;
  index: number;
}

function GalleryCard({ pet, index }: GalleryCardProps) {
  const animal = getAnimalById(pet.animalId);
  const rarityColor = RARITY_COLORS[animal?.rarity || 1] || RARITY_COLORS[1];
  const stars = '★'.repeat(animal?.rarity || 1);

  // Animation values
  const progress = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance animation
    progress.value = withDelay(
      index * 100,
      withSpring(1, { damping: 12, stiffness: 100 })
    );

    // Glow animation for rare cards (rarity 3+)
    if (animal && animal.rarity >= 3) {
      glowOpacity.value = withDelay(
        index * 100 + 300,
        withTiming(1, { duration: 500 })
      );
    }
  }, []);

  const cardStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        { scale: interpolate(progress.value, [0, 1], [0.5, 1], Extrapolation.CLAMP) },
        { translateY: interpolate(progress.value, [0, 1], [50, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value * 0.6,
      shadowOpacity: glowOpacity.value * 0.8,
    };
  });

  if (!animal) return null;

  return (
    <Animated.View style={[styles.cardWrapper, cardStyle]}>
      {/* Glow effect for rare cards */}
      {animal.rarity >= 3 && (
        <Animated.View
          style={[
            styles.cardGlow,
            glowStyle,
            { shadowColor: rarityColor, backgroundColor: rarityColor }
          ]}
        />
      )}

      <View style={styles.card}>
        {/* Rarity banner */}
        <View style={[styles.rarityBanner, { backgroundColor: rarityColor }]}>
          <Text style={styles.rarityStars}>{stars}</Text>
        </View>

        {/* Pet content */}
        <View style={styles.content}>
          <View style={styles.emojiContainer}>
            {animal.image ? (
              <Image
                source={animal.image}
                style={styles.petImage}
              />
            ) : (
              <Text style={styles.emoji}>{animal.emoji || '🐾'}</Text>
            )}
          </View>

          <Text style={styles.petName} numberOfLines={1}>
            {pet.name}
          </Text>
          <Text style={styles.speciesName} numberOfLines={1}>
            {animal.name}
          </Text>
        </View>

        {/* Bottom accent */}
        <View style={[styles.bottomAccent, { backgroundColor: rarityColor }]} />
      </View>
    </Animated.View>
  );
}

export function CardGallery({ pets }: CardGalleryProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={GALLERY_CARD_WIDTH + CARD_SPACING}
        snapToAlignment="center"
      >
        {pets.map((pet, index) => (
          <GalleryCard key={pet.instanceId} pet={pet} index={index} />
        ))}
      </ScrollView>

      {/* Scroll hint */}
      <Text style={styles.scrollHint}>Swipe to see all cards</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: (SCREEN_WIDTH - GALLERY_CARD_WIDTH) / 2,
    paddingVertical: 20,
    gap: CARD_SPACING,
  },
  cardWrapper: {
    width: GALLERY_CARD_WIDTH,
    height: GALLERY_CARD_HEIGHT,
  },
  cardGlow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  rarityBanner: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rarityStars: {
    fontSize: 12,
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  emojiContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  petImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  emoji: {
    fontSize: 36,
  },
  petName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 2,
  },
  speciesName: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomAccent: {
    height: 4,
  },
  scrollHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 8,
  },
});
