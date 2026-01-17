import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Data & Storage
import { getPackCount, consumePack, addToCollection } from '@/utils/storage';
import { ANIMALS } from '@/constants/GameData';

export default function HomeScreen() {
  const router = useRouter();
  const [packCount, setPackCount] = useState(0);
  
  // Gacha State
  const [gachaVisible, setGachaVisible] = useState(false);
  const [pulledAnimals, setPulledAnimals] = useState([]);

  // Refresh pack count every time we return to this screen
  useFocusEffect(
    useCallback(() => {
      loadPacks();
    }, [])
  );

  const loadPacks = async () => {
    const count = await getPackCount();
    setPackCount(count);
  };

  const startChallenge = () => {
    const modes = ['shake', 'slap', 'blow'];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];
    
    router.push({
      pathname: '/game',
      params: { mode: randomMode }
    });
  };

  // === GACHA LOGIC ===
  const openBoosterPack = async () => {
    if (packCount <= 0) {
        Alert.alert("No Packs", "Play the game to earn more packs!");
        return;
    }

    // 1. Consume Pack
    const newCount = await consumePack();
    if (newCount !== false) setPackCount(newCount);

    // 2. Randomize 5 Animals
    const newPull = [];
    const newIds = [];
    for(let i=0; i<5; i++) {
        const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
        newPull.push(randomAnimal);
        newIds.push(randomAnimal.id);
    }

    // 3. Save to Collection
    await addToCollection(newIds);

    // 4. Show Animation
    setPulledAnimals(newPull);
    setGachaVisible(true);
  };

  // === DEBUG LOGIC ===
  const clearAllData = async () => {
    Alert.alert(
      "Reset Game?", 
      "This will delete all your packs and animals.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Everything", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            setPackCount(0);
            Alert.alert("Reset", "Storage cleared.");
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="game-controller" size={60} color="#4dff4d" />
        <Text style={styles.title}>Gacha Pets Demo</Text>
        <Text style={styles.subtitle}>Collect 'em all</Text>
      </View>

      {/* MAIN PLAY BUTTON */}
      <TouchableOpacity style={styles.playButton} onPress={startChallenge}>
        <Text style={styles.playText}>START RANDOM CHALLENGE</Text>
        <Ionicons name="arrow-forward-circle" size={30} color="#000" style={{marginLeft: 10}} />
      </TouchableOpacity>
      
      {/* MANAGEMENT BUTTONS */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.packBtn} onPress={openBoosterPack}>
            <Text style={styles.btnText}>📦 Open Pack ({packCount})</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.collectionBtn} onPress={() => router.push('/collection')}>
            <Text style={styles.btnText}>📖 Collection</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>Possibilities:</Text>
        <Text style={styles.tag}>🥤 Shake</Text>
        <Text style={styles.tag}>👋 Slap</Text>
        <Text style={styles.tag}>💨 Blow</Text>
      </View>

      {/* DEBUG BUTTON */}
      <View style={{flex: 1, justifyContent: 'flex-end', marginBottom: 20}}>
        <TouchableOpacity onPress={clearAllData} style={styles.debugBtn}>
            <Text style={styles.debugText}>⚠️ [DEBUG] Clear Storage</Text>
        </TouchableOpacity>
      </View>

      {/* GACHA REVEAL MODAL */}
      <Modal visible={gachaVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>✨ PACK OPENED! ✨</Text>
                <View style={styles.pullGrid}>
                    {pulledAnimals.map((animal, index) => (
                        <View key={index} style={styles.pullItem}>
                            <Text style={{fontSize: 30}}>🐾</Text>
                            <Text style={styles.pullName}>{animal.name}</Text>
                        </View>
                    ))}
                </View>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setGachaVisible(false)}>
                    <Text style={styles.closeModalText}>Awesome!</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', alignItems: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 50, marginTop: 40 },
  title: { fontSize: 40, fontWeight: 'bold', color: '#fff', marginTop: 10 },
  subtitle: { fontSize: 16, color: '#888', marginTop: 5 },
  
  playButton: { 
    flexDirection: 'row',
    backgroundColor: '#4dff4d', 
    paddingVertical: 20, 
    paddingHorizontal: 40, 
    borderRadius: 30, 
    alignItems: 'center',
    elevation: 5,
    marginBottom: 20
  },
  playText: { color: '#000', fontSize: 18, fontWeight: '900' },

  btnRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  packBtn: { backgroundColor: '#3498db', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 15 },
  collectionBtn: { backgroundColor: '#9b59b6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 15 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  info: { marginTop: 20, alignItems: 'center' },
  infoText: { color: '#666', marginBottom: 10 },
  tag: { color: '#888', fontSize: 16, marginVertical: 2 },

  // Debug Styles
  debugBtn: { padding: 10 },
  debugText: { color: '#ff4d4d', fontSize: 12, opacity: 0.6 },

  // Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#222', padding: 20, borderRadius: 20, width: '90%', alignItems: 'center', borderColor: '#ffd700', borderWidth: 2 },
  modalTitle: { color: '#ffd700', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  pullGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
  pullItem: { backgroundColor: '#333', width: 80, height: 80, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  pullName: { color: '#fff', fontSize: 10, marginTop: 5, textAlign: 'center' },
  closeModalBtn: { backgroundColor: '#4dff4d', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20 },
  closeModalText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});