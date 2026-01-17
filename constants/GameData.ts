export const ANIMALS = [
  { id: 1, name: 'Dog', rarity: 4 },
  { id: 2, name: 'Cat', rarity: 4 },
  { id: 3, name: 'Bunny', rarity: 4 },
  { id: 4, name: 'Fennec Fox', rarity: 4 },
  { id: 5, name: 'Lion', rarity: 4 },
];

export const getAnimalById = (id: number) => ANIMALS.find(a => a.id === id);