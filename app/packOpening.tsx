import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Data & Storage
import { getPackCount, consumePack, addToCollection } from '@/utils/storage';
import { ANIMALS } from '@/constants/GameData';

export default function PackOpeningScreen() {
  const router = useRouter();
  
  // States
  const [status, setStatus] = useState<'loading' | 'revealing' | 'done'>('loading');
  const [pulledAnimals, setPulledAnimals] = useState<any[]>([]);

  useEffect(() => {
    openPack();
  }, []);

  const openPack = async () => {
    // 1. Check & Consume Pack
    const packsLeft = await consumePack();
    
    if (packsLeft === false) {
      Alert.alert("Error", "You don't have any packs!", [
        { text: "Go Back", onPress: () => router.back() }
      ]);
      return;
    }

    // 2. Randomize Logic
    const newPull = [];
    const newIds = [];
    for (let i = 0; i < 5; i++) {
      const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      newPull.push(randomAnimal);
      newIds.push(randomAnimal.id);
    }

    // 3. Save to Storage
    await addToCollection(newIds);

    // 4. Start Reveal Sequence
    setStatus('revealing');
    
    // Simulate a suspenseful delay (optional)
    setTimeout(() => {
      setPulledAnimals(newPull);
      setStatus('done');
    }, 1000); 
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Opening Booster...</Text>
      </View>

      <View style={styles.content}>
        {status === 'loading' || status === 'revealing' ? (
          <View style={styles.loadingContainer}>
             <Text style={{fontSize: 80}}>📦</Text>
             <Text style={styles.loadingText}>Ripping open pack...</Text>
          </View>
        ) : (
          <View style={styles.grid}>
             {pulledAnimals.map((animal, index) => (
                <View key={index} style={styles.card}>
                   <Text style={{fontSize: 40}}>🐾</Text>
                   <Text style={styles.cardName}>{animal.name}</Text>
                   <Text style={styles.rarity}>{'⭐'.repeat(animal.rarity)}</Text>
                </View>
             ))}
          </View>
        )}
      </View>

      {/* FOOTER ACTIONS */}
      {status === 'done' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333' },
  title: { color: '#ffd700', fontSize: 24, fontWeight: 'bold' },
  
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  loadingContainer: { alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 20, fontSize: 18 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
  card: { 
    width: 100, height: 120, 
    backgroundColor: '#1a1a1a', 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffd700'
  },
  cardName: { color: '#fff', fontWeight: 'bold', marginTop: 5 },
  rarity: { fontSize: 10, marginTop: 2 },

  footer: { padding: 20, alignItems: 'center' },
  doneBtn: { 
    backgroundColor: '#4dff4d', 
    paddingVertical: 15, 
    paddingHorizontal: 40, 
    borderRadius: 30 
  },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 18 }
});