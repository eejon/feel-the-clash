import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { DeviceMotion } from 'expo-sensors';
import { Audio } from 'expo-av';
import { GameVisuals } from '@/components/GameVisuals';

// IMPORT STORAGE & DATA
import { addPack, getPackCount, consumePack, addToCollection } from '@/utils/storage';
import { ANIMALS } from '@/constants/GameData';

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = params.mode || 'shake';

  const [debugData, setDebugData] = useState({});
  const [packCount, setPackCount] = useState(0);
  
  // Gacha State
  const [gachaVisible, setGachaVisible] = useState(false);
  const [pulledAnimals, setPulledAnimals] = useState([]);

  // Refs
  const isActive = useRef(false);
  const recordingRef = useRef(null);
  const historyRef = useRef([]);

  useFocusEffect(
    useCallback(() => {
      isActive.current = true;
      refreshPacks(); // Load packs on entry
      startChallenge();

      return () => {
        isActive.current = false;
        forceKillSensors();
      };
    }, [mode])
  );

  const refreshPacks = async () => {
    const count = await getPackCount();
    setPackCount(count);
  };

  const forceKillSensors = async () => {
    DeviceMotion.removeAllListeners();
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
    }
  };

  const startChallenge = async () => {
    await forceKillSensors();
    if (!isActive.current) return;
    if (mode === 'shake') runShake();
    else if (mode === 'slap') runSlap();
    else if (mode === 'blow') runBlow();
  };

  // === WIN LOGIC ===
  const handleWin = async () => {
    if (!isActive.current) return;
    isActive.current = false; 
    forceKillSensors();

    // 1. SAVE TO STORAGE
    const newCount = await addPack(1);
    setPackCount(newCount);

    Alert.alert(
      "SUCCESS! 🎉",
      `You earned a Booster Pack!`,
      [{ 
        text: "Play Again", 
        onPress: () => {
            isActive.current = true;
            startChallenge(); // Restart game logic
        }
      }, {
        text: "Back to Home",
        onPress: () => router.back()
      }]
    );
  };

  // === GACHA LOGIC ===
  const openBoosterPack = async () => {
    if (packCount <= 0) {
        Alert.alert("No Packs", "You need to complete challenges to earn packs!");
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

  // === SENSOR LOGIC BLOCKS (Same as before) ===
  const runShake = () => {
    DeviceMotion.setUpdateInterval(50);
    DeviceMotion.addListener(({ acceleration }) => {
      if (!isActive.current) return;
      const force = Math.sqrt((acceleration?.x||0)**2 + (acceleration?.y||0)**2 + (acceleration?.z||0)**2);
      if (force > 30) handleWin();
    });
  };

  const runSlap = () => {
    DeviceMotion.setUpdateInterval(16);
    let lastUpdate = 0;
    historyRef.current = []; 
    DeviceMotion.addListener(({ acceleration, rotationRate }) => {
      if (!isActive.current) return;
      const now = Date.now();
      const rot = rotationRate?.gamma || 0;
      const force = Math.sqrt((acceleration?.x||0)**2 + (acceleration?.y||0)**2 + (acceleration?.z||0)**2);
      historyRef.current.push({ t: now, r: rot });
      historyRef.current = historyRef.current.filter(h => now - h.t < 200);

      if (Math.abs(rot) > 4.0 && force > 12) {
        const isPositive = rot > 0;
        const hasReversal = historyRef.current.some(h => isPositive ? h.r < -2.0 : h.r > 2.0);
        if (!hasReversal) handleWin();
      }
      if (now - lastUpdate > 100) {
        lastUpdate = now;
        setDebugData({ rot: rot.toFixed(1), force: force.toFixed(1) });
      }
    });
  };

  const runBlow = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted' || !isActive.current) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        { ...Audio.RecordingOptionsPresets.LOW_QUALITY, isMeteringEnabled: true },
        (status) => {
          if (!isActive.current) return;
          const vol = status.metering || -160;
          setDebugData({ vol: vol.toFixed(0) });
          if (vol > -10) handleWin();
        }
      );
      if (!isActive.current) { await recording.stopAndUnloadAsync(); return; }
      recordingRef.current = recording;
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.packBtn} onPress={openBoosterPack}>
            <Text style={styles.packText}>📦 Packs: {packCount}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.collectionBtn} onPress={() => router.push('/collection')}>
            <Text style={styles.collectionText}>📖 Collection</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <GameVisuals mode={mode} debugValue={debugData} />
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Stop Game</Text>
      </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  packBtn: { backgroundColor: '#3498db', padding: 10, borderRadius: 8 },
  packText: { color: '#fff', fontWeight: 'bold' },
  collectionBtn: { backgroundColor: '#9b59b6', padding: 10, borderRadius: 8 },
  collectionText: { color: '#fff', fontWeight: 'bold' },
  
  card: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 20, borderColor: '#333', borderWidth: 1, marginBottom: 20 },
  cancelBtn: { padding: 15, backgroundColor: '#333', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#ff4d4d', fontWeight: 'bold' },

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