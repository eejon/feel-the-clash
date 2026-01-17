export interface Animal {
  id: number;
  name: string;
  rarity: number;
  emoji: string;
  image?: any;
}

export const sprites: Animal[] = [
  { id: 1, name: 'Seagull', rarity: 2, emoji: '🐦', image: require('@/assets/sprites/Bird.png') },
  { id: 2, name: 'Turtle', rarity: 2, emoji: '🐢', image: require('@/assets/sprites/Turtle.png') },
  { id: 3, name: 'Tiger', rarity: 4, emoji: '🐅', image: require('@/assets/sprites/Tiger.png') },
  { id: 4, name: 'Sparrow', rarity: 1, emoji: '🐦', image: require('@/assets/sprites/Bird.png') },
  { id: 5, name: 'Blue Bear', rarity: 5, emoji: '🐻❄️', image: require('@/assets/sprites/Blue-bear.png') },
  { id: 6, name: 'Brown Bear', rarity: 3, emoji: '🐻', image: require('@/assets/sprites/Brown-bear.png') },
  { id: 7, name: 'Bunny', rarity: 1, emoji: '🐰', image: require('@/assets/sprites/Bunny.png') },
  { id: 8, name: 'Cat', rarity: 1, emoji: '🐱', image: require('@/assets/sprites/Cat.png') },
  { id: 9, name: 'Chicken', rarity: 1, emoji: '🐔', image: require('@/assets/sprites/Chicken.png') },
  { id: 10, name: 'Cow', rarity: 1, emoji: '🐮', image: require('@/assets/sprites/Cow.png') },
  { id: 11, name: 'Crocodile', rarity: 3, emoji: '🐊', image: require('@/assets/sprites/Croc.png') },
  { id: 12, name: 'Deer', rarity: 2, emoji: '🦌', image: require('@/assets/sprites/Deer.png') },
  { id: 13, name: 'Dog', rarity: 1, emoji: '🐶', image: require('@/assets/sprites/Dog.png') },
  { id: 14, name: 'Duck', rarity: 1, emoji: '🦆', image: require('@/assets/sprites/Duck.png') },
  { id: 15, name: 'Elephant', rarity: 4, emoji: '🐘', image: require('@/assets/sprites/Elephant.png') },
  { id: 16, name: 'Fox', rarity: 2, emoji: '🦊', image: require('@/assets/sprites/Fox.png') },
  { id: 17, name: 'Frog', rarity: 2, emoji: '🐸', image: require('@/assets/sprites/Frog.png') },
  { id: 18, name: 'Giraffe', rarity: 4, emoji: '🦒', image: require('@/assets/sprites/Giraffe.png') },
  { id: 19, name: 'Hippo', rarity: 3, emoji: '🦛', image: require('@/assets/sprites/Hippo.png') },
  { id: 20, name: 'Koala', rarity: 3, emoji: '🐨', image: require('@/assets/sprites/Koala.png') },
  { id: 21, name: 'Lion', rarity: 4, emoji: '🦁', image: require('@/assets/sprites/Lion.png') },
  { id: 22, name: 'Monkey', rarity: 2, emoji: '🐵', image: require('@/assets/sprites/Monkey.png') },
  { id: 23, name: 'Owl', rarity: 2, emoji: '🦉', image: require('@/assets/sprites/Owl.png') },
  { id: 24, name: 'Panda', rarity: 5, emoji: '🐼', image: require('@/assets/sprites/Panda.png') },
  { id: 25, name: 'Penguin', rarity: 3, emoji: '🐧', image: require('@/assets/sprites/Penguin.png') },
  { id: 26, name: 'Pig', rarity: 1, emoji: '🐷', image: require('@/assets/sprites/Pig.png') },
  { id: 27, name: 'Sheep', rarity: 1, emoji: '🐑', image: require('@/assets/sprites/Sheep.png') },
  { id: 28, name: 'Sloth', rarity: 3, emoji: '🦥', image: require('@/assets/sprites/Sloth.png') },
  { id: 29, name: 'Snake', rarity: 2, emoji: '🐍', image: require('@/assets/sprites/Snake.png') },
];

export const getAnimalById = (id: number): Animal | undefined =>
  sprites.find((a) => a.id === id);

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
      const spritesOfRarity = sprites.filter((a) => a.rarity === rarity);
      if (spritesOfRarity.length > 0) {
        return spritesOfRarity[Math.floor(Math.random() * spritesOfRarity.length)];
      }
    }
  }
  return sprites[0]; // Fallback
}