import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  Modal, TextInput, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Data & Storage
import { consumePack, addPetsToCollection, renamePet, PetInstance } from '@/utils/storage';
import { ANIMALS } from '@/constants/GameData';

export default function PackOpeningScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'revealing' | 'done'>('loading');
  
  // Now we store PetInstances, not just animals
  const [pulledPets, setPulledPets] = useState<PetInstance[]>([]);
  
  // Renaming State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    openPack();
  }, []);

  const openPack = async () => {
    const packsLeft = await consumePack();
    if (packsLeft === false) {
      Alert.alert("Error", "No packs left!", [{ text: "Back", onPress: () => router.back() }]);
      return;
    }

    // 1. Generate Random Pets with Unique Instance IDs
    const newInstances: PetInstance[] = [];
    
    for (let i = 0; i < 5; i++) {
      const randomBaseAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      
      newInstances.push({
        instanceId: `${Date.now()}-${i}`, // Unique ID
        animalId: randomBaseAnimal.id,
        name: randomBaseAnimal.name, // Default name (e.g. "Dog")
        obtainedAt: Date.now()
      });
    }

    // 2. Save immediately (prevents data loss if app crashes)
    await addPetsToCollection(newInstances);
    
    // 3. Reveal Animation
    setTimeout(() => {
      setPulledPets(newInstances);
      setStatus('done');
    }, 1500); 
  };

  // Open the rename modal
  const handleCardPress = (pet: PetInstance) => {
    setSelectedPetId(pet.instanceId);
    setNewName(pet.name);
    setModalVisible(true);
  };

  // Save the new name
  const saveName = async () => {
    if (!selectedPetId || !newName.trim()) return;

    // 1. Update Storage
    await renamePet(selectedPetId, newName);

    // 2. Update Local State (so the UI updates immediately)
    setPulledPets(prev => prev.map(p => 
        p.instanceId === selectedPetId ? { ...p, name: newName } : p
    ));

    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>
        {status === 'done' ? "Tap to Rename!" : "Opening Pack..."}
      </Text>

      <View style={styles.content}>
        {status !== 'done' ? (
          <View style={{alignItems: 'center'}}>
            <Text style={{fontSize: 80}}>📦</Text>
            <Text style={styles.text}>Ripping open...</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {pulledPets.map((pet, index) => {
                // Find original stats for rarity/image
                const baseStats = ANIMALS.find(a => a.id === pet.animalId);
                
                return (
                  <TouchableOpacity 
                    key={pet.instanceId} 
                    style={styles.card}
                    onPress={() => handleCardPress(pet)}
                  >
                    <View style={styles.editIcon}>
                        <Ionicons name="pencil-sharp" size={12} color="#000" />
                    </View>
                    <Text style={{fontSize: 30}}>🐾</Text>
                    <Text style={styles.name}>{pet.name}</Text>
                    <Text style={styles.rarity}>{'⭐'.repeat(baseStats?.rarity || 1)}</Text>
                  </TouchableOpacity>
                );
            })}
          </View>
        )}
      </View>

      {status === 'done' && (
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Collect All</Text>
        </TouchableOpacity>
      )}

      {/* RENAME MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalBg}
        >
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Rename your Pet</Text>
                
                <TextInput 
                    style={styles.input} 
                    value={newName} 
                    onChangeText={setNewName} 
                    autoFocus 
                    placeholder="Enter new name..." 
                    placeholderTextColor="#666"
                />

                <View style={styles.modalBtns}>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveName} style={styles.saveBtn}>
                        <Text style={styles.saveText}>Save Name</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', padding: 20 },
  header: { color: '#ffd700', fontSize: 24, fontWeight: 'bold', marginBottom: 40 },
  content: { flex: 1, justifyContent: 'center' },
  text: { color: '#fff', fontSize: 20, marginTop: 20 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center' },
  card: { 
    width: 100, height: 120, 
    backgroundColor: '#222', 
    alignItems: 'center', justifyContent: 'center', 
    borderRadius: 10, borderWidth: 1, borderColor: '#ffd700',
    position: 'relative'
  },
  editIcon: {
    position: 'absolute', top: 5, right: 5,
    backgroundColor: '#ffd700', borderRadius: 10, padding: 3
  },
  name: { color: '#fff', marginTop: 5, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  rarity: { fontSize: 10, marginTop: 2 },
  
  btn: { backgroundColor: '#4dff4d', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, marginBottom: 20 },
  btnText: { fontWeight: 'bold', fontSize: 18 },

  // Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#222', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#444' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { backgroundColor: '#333', color: '#fff', padding: 15, borderRadius: 8, fontSize: 18, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { padding: 15 },
  cancelText: { color: '#aaa' },
  saveBtn: { backgroundColor: '#3498db', padding: 15, borderRadius: 8 },
  saveText: { color: '#fff', fontWeight: 'bold' }
});