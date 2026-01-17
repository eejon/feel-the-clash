import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PACKS: 'user_packs_count',
  COLLECTION: 'user_animal_collection',
};

// --- PACKS ---
export const getPackCount = async (): Promise<number> => {
  const val = await AsyncStorage.getItem(KEYS.PACKS);
  return val ? parseInt(val, 10) : 0;
};

export const addPack = async (amount: number = 1) => {
  const current = await getPackCount();
  const newValue = current + amount;
  await AsyncStorage.setItem(KEYS.PACKS, newValue.toString());
  return newValue;
};

export const consumePack = async () => {
  const current = await getPackCount();
  if (current <= 0) return false;
  const newValue = current - 1;
  await AsyncStorage.setItem(KEYS.PACKS, newValue.toString());
  return newValue;
};

// --- COLLECTION ---
export const getCollection = async (): Promise<number[]> => {
  const val = await AsyncStorage.getItem(KEYS.COLLECTION);
  return val ? JSON.parse(val) : [];
};

export const addToCollection = async (newAnimalIds: number[]) => {
  const current = await getCollection();
  const updated = [...current, ...newAnimalIds];
  await AsyncStorage.setItem(KEYS.COLLECTION, JSON.stringify(updated));
  return updated;
};