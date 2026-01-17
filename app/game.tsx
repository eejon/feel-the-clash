import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { DeviceMotion } from 'expo-sensors';
import { Audio } from 'expo-av';
import { GameVisuals } from '@/components/GameVisuals';

// --- VISION CAMERA & FACE DETECTOR IMPORTS ---
// import { 
//   Camera, 
//   useCameraDevice, 
//   useCameraPermission, 
//   useFrameProcessor,
//   runAtTargetFps 
// } from 'react-native-vision-camera';
// import { useRunOnJS } from 'react-native-worklets-core';
// import { useFaceDetector } from 'react-native-vision-camera-face-detector';

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

  // --- CAMERA SETUP ---
  // const device = useCameraDevice('front');
  // const { hasPermission, requestPermission } = useCameraPermission();

  // Initialize the Face Detector
  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    landmarkMode: 'none',
    classificationMode: 'all', // Required for smile probability
  });

  // useEffect(() => {
  //   // Auto-request permission if in smile mode
  //   if (mode === 'smile' && !hasPermission) {
  //     requestPermission();
  //   }
  // }, [mode, hasPermission]);

  useFocusEffect(
    useCallback(() => {
      isActive.current = true;
      refreshPacks(); 
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
    // 'smile' logic runs automatically via the frame processor below
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
            startChallenge(); 
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

    const newCount = await consumePack();
    if (newCount !== false) setPackCount(newCount);

    const newPull = [];
    const newIds = [];
    for(let i=0; i<5; i++) {
        const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
        newPull.push(randomAnimal);
        newIds.push(randomAnimal.id);
    }

    await addToCollection(newIds);
    setPulledAnimals(newPull);
    setGachaVisible(true);
  };

  // === SMILE DETECTION LOGIC ===
  
  // // Wrapper to allow the Worklet to call back to the main JS thread
  // const onSmileDetected = useRunOnJS((smileProb) => {
  //     setDebugData({ smile: smileProb }); // Update Debug UI
  //     // Threshold: 0.7 means 70% sure it's a smile
  //     if (smileProb > 0.7 && isActive.current) {
  //         handleWin();
  //     }
  // }, []);

  // const frameProcessor = useFrameProcessor((frame) => {
  //   'worklet';
  //   // Only run this logic 5 times per second to save battery
  //   runAtTargetFps(5, () => {
  //       const faces = detectFaces(frame);

  //       if (faces.length > 0) {
  //           const smile = faces[0].smilingProbability || 0;
  //           onSmileDetected(smile);
  //       }
  //   });
  // }, [detectFaces]); // Dependency is important!

  // === SENSOR LOGIC BLOCKS ===
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

  // === RENDER HELPERS ===
  const renderGameContent = () => {
    // 1. SMILE MODE (Camera)
    // if (mode === 'smile') {
    //    if (!hasPermission) return <Text style={{color:'#fff'}}>Requesting Camera...</Text>;
    //    if (!device) return <Text style={{color:'#fff'}}>No Front Camera Found</Text>;

    //    return (
    //      <View style={{ flex: 1, width: '100%', borderRadius: 20, overflow: 'hidden' }}>
    //         <Camera
    //             style={StyleSheet.absoluteFill}
    //             device={device}
    //             isActive={isActive.current}
    //             frameProcessor={frameProcessor}
    //             pixelFormat="yuv"
    //         />
    //         {/* Overlay visuals on top of camera */}
    //         <View style={styles.cameraOverlay}>
    //             <GameVisuals mode={mode} debugValue={debugData} />
    //         </View>
    //      </View>
    //    );
    // }

    // 2. STANDARD MODES (Sensors)
    return <GameVisuals mode={mode} debugValue={debugData} />;
  };

  return (
    <View style={styles.container}>
      {/* Top Bar (Optional) */}
      <View style={styles.topBar}>
         {/* You can uncomment the pack/collection buttons if needed */}
      </View>

      <View style={styles.card}>
        {renderGameContent()}
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
  container: { flex: 1, backgroundColor: '#F7F2E8', padding: 20, paddingTop: 60 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, height: 20 },
  
  card: { 
    flex: 1, 
    backgroundColor: '#1a1a1a', 
    borderRadius: 20, 
    borderColor: '#333', 
    borderWidth: 1, 
    marginBottom: 20,
    overflow: 'hidden', // Ensures camera doesn't bleed out
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelBtn: { padding: 15, backgroundColor: '#333', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#ff4d4d', fontWeight: 'bold' },

  // Camera Overlay
  cameraOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    width: '100%', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

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