import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Data & Storage
import { getCollection, renamePet, PetInstance } from '@/utils/storage';
import { getAnimalById } from '@/constants/GameData';
import { RARITY_COLORS } from '@/constants/PackOpeningConfig';

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
    setInventory(pets);
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
             const newStats = inventory.filter(p => p.instanceId !== pet.instanceId);
             await AsyncStorage.setItem('user_collection_v2', JSON.stringify(newStats));
             loadCollection(); 
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

  // Grouper logic
  const groupedPets = React.useMemo(() => {
    const groups: Record<number, PetInstance[]> = {};
    // Initialize groups 5 to 1
    [5, 4, 3, 2, 1].forEach(r => groups[r] = []);
    
    inventory.forEach(pet => {
        const data = getAnimalById(pet.animalId);
        if (data) {
            groups[data.rarity].push(pet);
        }
    });
    return groups;
  }, [inventory]);

  const RARITY_NAMES: Record<number, string> = {
      5: "LEGENDARY",
      4: "EPIC",
      3: "RARE",
      2: "UNCOMMON",
      1: "COMMON"
  };

  const renderCard = ({ item }: { item: PetInstance }) => {
      const baseStats = getAnimalById(item.animalId);
      if (!baseStats) return null;

      const rarityColor = RARITY_COLORS[baseStats.rarity] || '#ccc';

      return (
        <TouchableOpacity 
            style={styles.cardContainer}
            onPress={() => handleRenameRequest(item)}
            onLongPress={() => handleRelease(item)}
        >
            <View style={[styles.cardImageContainer, { borderColor: rarityColor }]}>
                {baseStats.image ? (
                    <Image source={baseStats.image} style={styles.cardImage} resizeMode="contain" />
                ) : (
                    <Text style={styles.cardEmoji}>{baseStats.emoji}</Text>
                )}
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.cardRarity, { color: rarityColor }]}>
                    {'★'.repeat(baseStats.rarity)}
                </Text>
            </View>
        </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
           <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>My Collection</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
          {Object.entries(groupedPets)
            .sort(([r1], [r2]) => Number(r2) - Number(r1)) // 5 to 1
            .map(([rarityStr, pets]) => {
                const rarity = Number(rarityStr);
                if (pets.length === 0) return null;

                return (
                    <View key={rarity} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: RARITY_COLORS[rarity] }]}>
                                {RARITY_NAMES[rarity]}
                            </Text>
                            <View style={[styles.line, { backgroundColor: RARITY_COLORS[rarity] }]} />
                            <Text style={styles.countBadge}>{pets.length}</Text>
                        </View>
                        
                        <FlatList
                            horizontal
                            data={pets}
                            renderItem={renderCard}
                            keyExtractor={item => item.instanceId}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.rowContent}
                        />
                    </View>
                );
            })
          }
          
          {inventory.length === 0 && (
             <View style={styles.emptyContainer}>
                <Text style={{fontSize: 50}}>🕸️</Text>
                <Text style={styles.empty}>Collection Empty</Text>
             </View>
          )}
      </ScrollView>

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
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  
  scrollContent: { paddingBottom: 50 },
  section: { marginBottom: 25 },
  sectionHeader: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingHorizontal: 20, 
      marginBottom: 10 
  },
  sectionTitle: { 
      fontSize: 14, 
      fontWeight: '900', 
      letterSpacing: 2, 
      marginRight: 10 
  },
  line: { flex: 1, height: 1, opacity: 0.3 },
  countBadge: { color: '#666', fontSize: 12, marginLeft: 10 },

  rowContent: { paddingHorizontal: 15 },
  
  // Card
  cardContainer: {
      width: 100,
      marginHorizontal: 5,
      alignItems: 'center',
  },
  cardImageContainer: {
      width: 90,
      height: 90,
      borderRadius: 12,
      borderWidth: 2,
      backgroundColor: '#1e1e1e',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      overflow: 'hidden'
  },
  cardImage: { width: '80%', height: '80%' },
  cardEmoji: { fontSize: 40 },
  cardInfo: { alignItems: 'center' },
  cardName: { color: '#fff', fontSize: 12, fontWeight: 'bold', width: 90, textAlign: 'center' },
  cardRarity: { fontSize: 10, marginTop: 2, letterSpacing: 1 },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  empty: { color: '#666', marginTop: 20, fontSize: 18, fontWeight: 'bold' },

  // Modal (Recycled)
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#222', padding: 25, borderRadius: 20, elevation: 5, borderWidth: 1, borderColor: '#333' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#fff' },
  input: { backgroundColor: '#333', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20, color: '#fff' },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { padding: 15 },
  cancelText: { color: '#888', fontWeight: '600' },
  saveBtn: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  saveText: { color: '#000', fontWeight: 'bold' }
});