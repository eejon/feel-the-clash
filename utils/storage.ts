import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PACKS: 'user_packs_count',
  // Changed key to v2 to avoid conflicts with your old number[] data.
  // This will reset your collection, but it's cleaner for development.
  COLLECTION: 'user_collection_v2', 
};

// The new structure for a captured pet
export interface PetInstance {
  instanceId: string; // Unique ID (e.g., "1705634-dog")
  animalId: number;   // Links to the static data (Stats, Rarity)
  name: string;       // Custom user name
  obtainedAt: number;
}

// --- PACKS (Unchanged) ---
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

// --- COLLECTION (New Logic) ---
export const getCollection = async (): Promise<PetInstance[]> => {
  const val = await AsyncStorage.getItem(KEYS.COLLECTION);
  return val ? JSON.parse(val) : [];
};

// Add new pets (generating unique IDs is done in the UI usually, or here)
export const addPetsToCollection = async (newPets: PetInstance[]) => {
  const current = await getCollection();
  const updated = [...current, ...newPets];
  await AsyncStorage.setItem(KEYS.COLLECTION, JSON.stringify(updated));
  return updated;
};

// RENAME FUNCTION
export const renamePet = async (instanceId: string, newName: string) => {
  const current = await getCollection();
  const updated = current.map(pet => {
    // Find the specific pet instance and update its name
    if (pet.instanceId === instanceId) {
        return { ...pet, name: newName };
    }
    return pet;
  });
  
  await AsyncStorage.setItem(KEYS.COLLECTION, JSON.stringify(updated));
  return updated; // Return new list to update UI
};

// DEBUG: Clear
export const clearStorage = async () => {
    await AsyncStorage.clear();
};