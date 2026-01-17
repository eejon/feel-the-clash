import React from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { CARD_WIDTH, CARD_HEIGHT, RARITY_COLORS } from '@/constants/PackOpeningConfig';
import type { PetInstance } from '@/utils/storage';

interface CardFrontProps {
  pet: PetInstance;
  baseAnimal: {
    id: number;
    name: string;
    rarity: number;
    emoji?: string;
    image?: any;
  };
}

export function CardFront({ pet, baseAnimal }: CardFrontProps) {
  const rarityColor = RARITY_COLORS[baseAnimal.rarity] || RARITY_COLORS[1];
  const stars = '★'.repeat(baseAnimal.rarity);

  return (
    <View style={styles.container}>
      {/* Top rarity banner */}
      <View style={[styles.rarityBanner, { backgroundColor: rarityColor }]}>
        <Text style={styles.rarityStars}>{stars}</Text>
      </View>

      {/* Main content area */}
      <View style={styles.content}>
        {/* Pet emoji - large and centered */}
        <View style={styles.emojiContainer}>
          {baseAnimal.image ? (
            <Image
              source={baseAnimal.image}
              style={{ width: 100, height: 100, resizeMode: 'contain' }}
            />
          ) : (
            <Text style={styles.emoji}>{baseAnimal.emoji || '🐾'}</Text>
          )}
        </View>

        {/* Name plate */}
        <View style={styles.namePlate}>
          <Text style={styles.petName} numberOfLines={1}>
            {pet.name}
          </Text>
          <Text style={styles.speciesName}>{baseAnimal.name}</Text>
        </View>
      </View>

      {/* Bottom accent */}
      <View style={[styles.bottomAccent, { backgroundColor: rarityColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    // Card shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  rarityBanner: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rarityStars: {
    fontSize: 20,
    color: '#fff',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    // Inner shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emoji: {
    fontSize: 80,
  },
  namePlate: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  petName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  speciesName: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  bottomAccent: {
    height: 8,
  },
});
