import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Data & Storage
import { getCollection, renamePet, PetInstance } from '@/utils/storage';
import { getAnimalById } from '@/constants/GameData';

export default function CollectionScreen() {
  const router = useRouter();
  const [inventory, setInventory] = useState<PetInstance[]>([]);
  
  // Rename Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPet, setSelectedPet] = useState<PetInstance | null>(null);
  const [newName, setNewName] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadCollection();
    }, [])
  );

  const loadCollection = async () => {
    const pets = await getCollection();
    // Sort by newest first
    setInventory(pets.sort((a, b) => b.obtainedAt - a.obtainedAt));
  };

  const handleRelease = (pet: PetInstance) => {
    Alert.alert(
      "Release Pet?", 
      `Are you sure you want to say goodbye to ${pet.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Release", 
          style: "destructive",
          onPress: async () => {
             // Filter out the pet and save
             const newStats = inventory.filter(p => p.instanceId !== pet.instanceId);
             await AsyncStorage.setItem('user_collection_v2', JSON.stringify(newStats));
             loadCollection(); // Refresh UI
          }
        }
      ]
    );
  };

  const handleRenameRequest = (pet: PetInstance) => {
    setSelectedPet(pet);
    setNewName(pet.name);
    setModalVisible(true);
  };

  const saveNewName = async () => {
    if (selectedPet && newName.trim()) {
        await renamePet(selectedPet.instanceId, newName);
        loadCollection();
        setModalVisible(false);
    }
  };

  const renderItem = ({ item }: { item: PetInstance }) => {
    const baseStats = getAnimalById(item.animalId);
    if (!baseStats) return null;

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleRenameRequest(item)}
        onLongPress={() => handleRelease(item)}
      >
        <Text style={styles.emoji}>🐾</Text>
        <View style={styles.infoContainer}>
            <Text style={styles.customName}>{item.name}</Text>
            <Text style={styles.speciesName}>
                {baseStats.name} • {'⭐'.repeat(baseStats.rarity)}
            </Text>
        </View>
        <Ionicons name="create-outline" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
           <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>My Collection</Text>
      </View>

      <Text style={styles.subtitle}>Tap to Rename • Hold to Release</Text>

      <FlatList
        data={inventory}
        keyExtractor={item => item.instanceId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={{fontSize: 50}}>🕸️</Text>
                <Text style={styles.empty}>Your collection is empty!</Text>
                <Text style={styles.emptySub}>Go play games to earn packs.</Text>
            </View>
        }
      />

      {/* RENAME MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
         <KeyboardAvoidingView 
             behavior={Platform.OS === "ios" ? "padding" : "height"}
             style={styles.modalBg}
         >
             <View style={styles.modalContent}>
                 <Text style={styles.modalTitle}>Rename Pet</Text>
                 <TextInput 
                     style={styles.input} 
                     value={newName} 
                     onChangeText={setNewName} 
                     autoFocus 
                     placeholder="Name..." 
                     placeholderTextColor="#999"
                 />
                 <View style={styles.modalBtns}>
                     <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                         <Text style={styles.cancelText}>Cancel</Text>
                     </TouchableOpacity>
                     <TouchableOpacity onPress={saveNewName} style={styles.saveBtn}>
                         <Text style={styles.saveText}>Save</Text>
                     </TouchableOpacity>
                 </View>
             </View>
         </KeyboardAvoidingView>
       </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 10 },
  backBtn: { marginRight: 15, padding: 5 },
  title: { fontSize: 28, fontWeight: '900', color: '#333' },
  subtitle: { marginLeft: 20, marginBottom: 15, color: '#888', fontSize: 12, fontWeight: '600' },
  
  list: { paddingHorizontal: 20, paddingBottom: 50 },
  
  card: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  emoji: { fontSize: 32, marginRight: 15 },
  infoContainer: { flex: 1 },
  customName: { color: '#333', fontWeight: 'bold', fontSize: 18 },
  speciesName: { color: '#888', fontSize: 12, marginTop: 2, fontWeight: '500' },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  empty: { color: '#333', marginTop: 20, fontSize: 18, fontWeight: 'bold' },
  emptySub: { color: '#888', marginTop: 5 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', padding: 25, borderRadius: 20, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  input: { backgroundColor: '#F0F4F8', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20, color: '#333' },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { padding: 15 },
  cancelText: { color: '#888', fontWeight: '600' },
  saveBtn: { backgroundColor: '#3498db', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  saveText: { color: '#fff', fontWeight: 'bold' }
});