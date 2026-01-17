import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PACKS: 'user_packs_count',
  COLLECTION: 'user_collection_v2', 
};

export interface PetInstance {
  instanceId: string;
  animalId: number;
  name: string;
  obtainedAt: number;
  lastFed?: number; // <--- NEW: Track hunger
}

// ... (Keep getPackCount, addPack, consumePack the same) ...
export const getPackCount = async (): Promise<number> => {
  const val = await AsyncStorage.getItem(KEYS.PACKS);
  return val ? parseInt(val, 10) : 0;
};

export const addPack = async (amount: number = 1) => {
  const current = await getPackCount();
  await AsyncStorage.setItem(KEYS.PACKS, (current + amount).toString());
  return current + amount;
};

export const consumePack = async () => {
  const current = await getPackCount();
  if (current <= 0) return false;
  await AsyncStorage.setItem(KEYS.PACKS, (current - 1).toString());
  return current - 1;
};

// ... (Keep getCollection, addPetsToCollection same) ...
export const getCollection = async (): Promise<PetInstance[]> => {
  const val = await AsyncStorage.getItem(KEYS.COLLECTION);
  return val ? JSON.parse(val) : [];
};

export const addPetsToCollection = async (newPets: PetInstance[]) => {
  const current = await getCollection();
  const updated = [...current, ...newPets];
  await AsyncStorage.setItem(KEYS.COLLECTION, JSON.stringify(updated));
  return updated;
};

export const renamePet = async (instanceId: string, newName: string) => {
  const current = await getCollection();
  const updated = current.map(pet => {
    if (pet.instanceId === instanceId) {
        return { ...pet, name: newName };
    }
    return pet;
  });
  await AsyncStorage.setItem(KEYS.COLLECTION, JSON.stringify(updated));
  return updated;
};

// --- NEW: FEED FUNCTION ---
export const feedPet = async (instanceId: string) => {
  const current = await getCollection();
  const updated = current.map(pet => {
    if (pet.instanceId === instanceId) {
        return { ...pet, lastFed: Date.now() }; // Update timestamp
    }
    return pet;
  });
  await AsyncStorage.setItem(KEYS.COLLECTION, JSON.stringify(updated));
  return updated;
};

export const clearStorage = async () => {
    await AsyncStorage.clear();
};