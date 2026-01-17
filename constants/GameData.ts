export interface Animal {
  id: number;
  name: string;
  rarity: number;
  emoji: string;
}

export const ANIMALS: Animal[] = [
  { id: 1, name: 'Dog', rarity: 2, emoji: '🐕' },
  { id: 2, name: 'Cat', rarity: 2, emoji: '🐱' },
  { id: 3, name: 'Hamster', rarity: 1, emoji: '🐹' },
  { id: 4, name: 'Bunny', rarity: 3, emoji: '🐰' },
  { id: 5, name: 'Fennec Fox', rarity: 4, emoji: '🦊' },
  { id: 6, name: 'Lion', rarity: 5, emoji: '🦁' },
  { id: 7, name: 'Panda', rarity: 4, emoji: '🐼' },
  { id: 8, name: 'Penguin', rarity: 3, emoji: '🐧' },
  { id: 9, name: 'Koala', rarity: 3, emoji: '🐨' },
  { id: 10, name: 'Dragon', rarity: 5, emoji: '🐉' },
];

export const getAnimalById = (id: number): Animal | undefined =>
  ANIMALS.find((a) => a.id === id);

// Weighted random for gacha pulls
const RARITY_WEIGHTS: Record<number, number> = {
  1: 30, // Common
  2: 35, // Common+
  3: 20, // Uncommon
  4: 12, // Rare
  5: 3,  // Legendary
};

export function getRandomAnimal(): Animal {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [rarityStr, weight] of Object.entries(RARITY_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      const rarity = Number(rarityStr);
      const animalsOfRarity = ANIMALS.filter((a) => a.rarity === rarity);
      if (animalsOfRarity.length > 0) {
        return animalsOfRarity[Math.floor(Math.random() * animalsOfRarity.length)];
      }
    }
  }
  return ANIMALS[0]; // Fallback
}