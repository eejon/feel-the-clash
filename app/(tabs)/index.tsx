import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Data & Storage
import { getPackCount } from '@/utils/storage';

export default function HomeScreen() {
  const router = useRouter();
  const [packCount, setPackCount] = useState(0);

  // Refresh pack count every time we return
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
    router.push({ pathname: '/game', params: { mode: randomMode } });
  };

  // === NEW SIMPLIFIED FUNCTION ===
  const handleOpenPack = () => {
    if (packCount <= 0) {
      Alert.alert("No Packs", "Play the game to earn more packs!");
      return;
    }
    // Navigate to the new page
    router.push('/packOpening');
  };

  const clearAllData = async () => {
    Alert.alert("Reset?", "Delete everything?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await AsyncStorage.clear();
        setPackCount(0);
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="game-controller" size={60} color="#4dff4d" />
        <Text style={styles.title}>Sensor Game</Text>
        <Text style={styles.subtitle}>Test your reflexes & Collect 'em all</Text>
      </View>

      <TouchableOpacity style={styles.playButton} onPress={startChallenge}>
        <Text style={styles.playText}>START RANDOM CHALLENGE</Text>
        <Ionicons name="arrow-forward-circle" size={30} color="#000" style={{marginLeft: 10}} />
      </TouchableOpacity>
      
      <View style={styles.btnRow}>
        {/* UPDATED BUTTON */}
        <TouchableOpacity style={styles.packBtn} onPress={handleOpenPack}>
            <Text style={styles.btnText}>📦 Open Pack ({packCount})</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.collectionBtn} onPress={() => router.push('/collection')}>
            <Text style={styles.btnText}>📖 Collection</Text>
        </TouchableOpacity>
      </View>

      <View style={{flex: 1, justifyContent: 'flex-end', marginBottom: 20}}>
        <TouchableOpacity onPress={clearAllData} style={styles.debugBtn}>
            <Text style={styles.debugText}>⚠️ [DEBUG] Clear Storage</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', alignItems: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 50, marginTop: 40 },
  title: { fontSize: 40, fontWeight: 'bold', color: '#fff', marginTop: 10 },
  subtitle: { fontSize: 16, color: '#888', marginTop: 5 },
  playButton: { flexDirection: 'row', backgroundColor: '#4dff4d', paddingVertical: 20, paddingHorizontal: 40, borderRadius: 30, alignItems: 'center', elevation: 5, marginBottom: 20 },
  playText: { color: '#000', fontSize: 18, fontWeight: '900' },
  btnRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  packBtn: { backgroundColor: '#3498db', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 15 },
  collectionBtn: { backgroundColor: '#9b59b6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 15 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  debugBtn: { padding: 10 },
  debugText: { color: '#ff4d4d', fontSize: 12, opacity: 0.6 },
});