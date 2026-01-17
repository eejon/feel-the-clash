import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Modal, FlatList, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Data & Storage
import { getPackCount, getCollection, clearStorage, PetInstance } from '@/utils/storage';
import { getAnimalById } from '@/constants/GameData';

export default function HomeScreen() {
  const router = useRouter();
  const [packCount, setPackCount] = useState(0);
  const [featuredPetInstance, setFeaturedPetInstance] = useState<PetInstance | null>(null);
  
  // NEW: Store full collection for the swap menu
  const [userCollection, setUserCollection] = useState<PetInstance[]>([]);
  const [swapModalVisible, setSwapModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    // 1. Load Packs
    const count = await getPackCount();
    setPackCount(count);

    // 2. Load Collection
    const collection = await getCollection();
    setUserCollection(collection); // Save for the modal
    
    if (collection.length > 0) {
      const savedInstanceId = await AsyncStorage.getItem('user_featured_pet_id_v2');
      const foundPet = collection.find(p => p.instanceId === savedInstanceId);

      if (foundPet) {
        setFeaturedPetInstance(foundPet);
      } else {
        // Default to the first one if saved ID is invalid
        const firstPet = collection[0];
        await AsyncStorage.setItem('user_featured_pet_id_v2', firstPet.instanceId);
        setFeaturedPetInstance(firstPet);
      }
    } else {
      setFeaturedPetInstance(null);
    }
  };
  
  const getBaseStats = (animalId: number) => {
      return getAnimalById(animalId);
  }

  const startChallenge = () => {
    const modes = ['shake', 'slap', 'blow'];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];
    router.push({ pathname: '/game', params: { mode: randomMode } });
  };

  const handleOpenPack = () => {
    if (packCount <= 0) {
      Alert.alert("No Packs", "Play games to earn packs!");
      return;
    }
    router.push('/packOpening');
  };

  // NEW: Swap Logic
  const handleSwapPet = async (pet: PetInstance) => {
    await AsyncStorage.setItem('user_featured_pet_id_v2', pet.instanceId);
    setFeaturedPetInstance(pet);
    setSwapModalVisible(false);
  };

  const clearAllData = async () => {
    Alert.alert("Reset Game?", "Delete all pets and packs?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await clearStorage();
        setPackCount(0);
        setFeaturedPetInstance(null);
        setUserCollection([]);
      }}
    ]);
  };

  const baseStats = featuredPetInstance ? getBaseStats(featuredPetInstance.animalId) : null;

  return (
    <View style={{flex:1}}>
    <SafeAreaView style={styles.container}>
      
      {/* 1. TOP HEADER */}
      <View style={styles.header}>
        <View style={styles.statPill}>
          <Text style={styles.statEmoji}>📦</Text>
          <Text style={styles.statText}>{packCount}</Text>
        </View>
        <Text style={styles.appTitle}>GachaPets</Text>
        <TouchableOpacity onPress={clearAllData}>
           <Ionicons name="settings-sharp" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* 2. CENTER STAGE */}
      <View style={styles.stageContainer}>
        {/* OnPress now opens the modal instead of cycling */}
        <TouchableOpacity 
            style={styles.petCircle} 
            onPress={() => setSwapModalVisible(true)} 
            activeOpacity={0.9}
        >
            {featuredPetInstance && baseStats ? (
                <>
                    <Text style={styles.petEmoji}>🐾</Text>
                    <Text style={styles.petName}>{featuredPetInstance.name}</Text>
                    <Text style={styles.petRarity}>{'⭐'.repeat(baseStats.rarity)}</Text>
                    
                    <View style={styles.speechBubble}>
                        <Text style={styles.speechText}>Swap Me!</Text>
                        <View style={styles.speechTail} />
                    </View>
                    
                    {/* Small icon to indicate clickable */}
                    <View style={styles.swapIconBadge}>
                        <Ionicons name="swap-horizontal" size={14} color="#fff" />
                    </View>
                </>
            ) : (
                <View style={{alignItems:'center'}}>
                    <Text style={{fontSize: 50, opacity: 0.3}}>🥚</Text>
                    <Text style={styles.emptyText}>No pets yet...</Text>
                </View>
            )}
        </TouchableOpacity>
        <View style={styles.shadow} />
      </View>



      {/* 4. SWAP MODAL */}
      <Modal visible={swapModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose a Companion</Text>
                <TouchableOpacity onPress={() => setSwapModalVisible(false)}>
                    <Ionicons name="close-circle" size={30} color="#ccc" />
                </TouchableOpacity>
            </View>
            
            <FlatList 
                data={userCollection}
                keyExtractor={item => item.instanceId}
                contentContainerStyle={{padding: 20}}
                renderItem={({item}) => {
                    const stats = getBaseStats(item.animalId);
                    const isSelected = featuredPetInstance?.instanceId === item.instanceId;
                    
                    return (
                        <TouchableOpacity 
                            style={[styles.swapCard, isSelected && styles.swapCardSelected]} 
                            onPress={() => handleSwapPet(item)}
                        >
                            <Text style={{fontSize: 30, marginRight: 15}}>🐾</Text>
                            <View style={{flex: 1}}>
                                <Text style={styles.swapName}>{item.name}</Text>
                                <Text style={styles.swapSpecies}>{stats?.name} • {'⭐'.repeat(stats?.rarity||1)}</Text>
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={24} color="#4dff4d" />}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 50, color:'#999'}}>No pets found.</Text>}
            />
        </View>
      </Modal>

    </SafeAreaView>
          {/* 3. BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.largePlayBtn} onPress={startChallenge}>
          <View style={styles.playIconCircle}>
             <Ionicons name="play" size={32} color="#fff" style={{marginLeft: 4}}/>
          </View>
          <View>
            <Text style={styles.playBtnText}>PLAY GAME</Text>
            <Text style={styles.playBtnSub}>Earn Packs</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleOpenPack}>
                <View style={[styles.iconBox, {backgroundColor: '#3498db'}]}>
                    <Text style={{fontSize: 24}}>📦</Text>
                </View>
                <Text style={styles.actionLabel}>Open Pack</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/collection')}>
                <View style={[styles.iconBox, {backgroundColor: '#9b59b6'}]}>
                    <Text style={{fontSize: 24}}>📖</Text>
                </View>
                <Text style={styles.actionLabel}>Collection</Text>
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F2E8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  appTitle: { fontSize: 20, fontWeight: '900', color: '#333', letterSpacing: 1 },
  statPill: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, alignItems: 'center', gap: 5 },
  statText: { fontWeight: 'bold', fontSize: 16 },
  statEmoji: { fontSize: 16 },

  // Stage
  stageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 50 },
  petCircle: { width: 260, height: 260, borderRadius: 130, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 8, borderColor: '#e1e5eb', zIndex: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  shadow: { width: 20, height: 20, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 10, marginTop: -20, zIndex: 1, transform: [{ scaleX: 10 }] },
  petEmoji: { fontSize: 80, marginBottom: 10 },
  petName: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  petRarity: { fontSize: 14, marginTop: 4, letterSpacing: 2 },
  emptyText: { color: '#aaa', marginTop: 10, fontWeight: '600' },
  
  speechBubble: { position: 'absolute', top: -40, right: 0, backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 15 },
  speechText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  speechTail: { position: 'absolute', bottom: -6, left: 15, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#333' },
  
  swapIconBadge: { position: 'absolute', bottom: 20, right: 50, backgroundColor: '#3498db', padding: 5, borderRadius: 15 },

  // Bottom Bar
  bottomBar: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  largePlayBtn: { backgroundColor: '#4dff4d', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 25, shadowColor: '#4dff4d', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: {width: 0, height: 4}, elevation: 5 },
  playIconCircle: { width: 50, height: 50, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  playBtnText: { fontSize: 20, fontWeight: '900', color: '#000' },
  playBtnSub: { fontSize: 12, color: '#004d00', fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center' },
  iconBox: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 5, elevation: 3 },
  actionLabel: { fontWeight: '600', color: '#555', fontSize: 12 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#F9F9F9' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  swapCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  swapCardSelected: { borderColor: '#4dff4d', backgroundColor: '#f0fff0' },
  swapName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  swapSpecies: { fontSize: 12, color: '#888', marginTop: 2 }
});