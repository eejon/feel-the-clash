import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Modal, FlatList, Animated, Easing, Image, ImageBackground, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceMotion } from 'expo-sensors';

// Data & Storage
import { getPackCount, getCollection, clearStorage, addPack, feedPet, PetInstance } from '@/utils/storage';
import { getAnimalById } from '@/constants/GameData';
import { RARITY_COLORS } from '@/constants/PackOpeningConfig';

// Get Screen Dimensions for boundaries
const { width, height } = Dimensions.get('window');

// --- PARTICLE COMPONENTS ---
const FloatingEmoji = ({ emoji, onComplete, id }: { emoji: string, onComplete: (id: number) => void, id: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }).start(() => onComplete(id));
  }, []);

  return (
    <Animated.Text style={{
      position: 'absolute', fontSize: 24, top: '50%', left: '50%',
      opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
      transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -150] }) },
        { translateX: Math.random() * 60 - 30 },
        { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0] }) }
      ]
    }}>{emoji}</Animated.Text>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [packCount, setPackCount] = useState(0);
  const [featuredPetInstance, setFeaturedPetInstance] = useState<PetInstance | null>(null);
  const [userCollection, setUserCollection] = useState<PetInstance[]>([]);
  const [swapModalVisible, setSwapModalVisible] = useState(false);

  // 👇 NEW: Rename Modal State
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  // --- ANIMATION STATE ---
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 👇 NEW: Position Animation (X, Y)
  const positionAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const [particles, setParticles] = useState<any[]>([]);
  const particleIdCounter = useRef(0);
  const [isHungry, setIsHungry] = useState(false);

  // --- MOVEMENT LOGIC ---
  useEffect(() => {
    // Start the wandering loop
    movePet();
  }, []);

  const movePet = () => {
    // Define bounds relative to center (approx 30% of screen width, 15% of screen height)
    const rangeX = width * 0.35;
    const rangeY = height * 0.15;

    // Random coordinates
    const nextX = (Math.random() * rangeX * 2) - rangeX;
    const nextY = (Math.random() * rangeY * 2) - rangeY;

    Animated.sequence([
      // 1. Wait a bit (idle)
      Animated.delay(1000 + Math.random() * 2000),
      // 2. Move to new spot
      Animated.timing(positionAnim, {
        toValue: { x: nextX, y: nextY },
        duration: 2000 + Math.random() * 1500, // Slow, natural movement
        easing: Easing.inOut(Easing.quad), // Smooth start/stop
        useNativeDriver: true,
      })
    ]).start(() => {
      // 3. Loop forever
      movePet();
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      DeviceMotion.setUpdateInterval(100);
      const subscription = DeviceMotion.addListener(({ acceleration }) => {
        const force = Math.sqrt(
          (acceleration?.x || 0) ** 2 +
          (acceleration?.y || 0) ** 2 +
          (acceleration?.z || 0) ** 2
        );
        if (force > 20) handleFeed();
      });
      return () => subscription.remove();
    }, [featuredPetInstance])
  );

  const loadData = async () => {
    const count = await getPackCount();
    setPackCount(count);
    const collection = await getCollection();
    setUserCollection(collection);

    let currentPet = null;
    if (collection.length > 0) {
      const savedInstanceId = await AsyncStorage.getItem('user_featured_pet_id_v2');
      currentPet = collection.find(p => p.instanceId === savedInstanceId);
      if (!currentPet) {
        currentPet = collection[0];
        await AsyncStorage.setItem('user_featured_pet_id_v2', currentPet.instanceId);
      }
      setFeaturedPetInstance(currentPet);
      checkHunger(currentPet);
    } else {
      setFeaturedPetInstance(null);
    }
  };

  const checkHunger = (pet: PetInstance) => {
    if (!pet.lastFed) { setIsHungry(true); return; }
    const hoursSinceFed = (Date.now() - pet.lastFed) / (1000 * 60 * 60);
    setIsHungry(hoursSinceFed > 4);
  };

  const getBaseStats = (animalId: number) => getAnimalById(animalId);

  // --- ACTIONS ---

  const spawnParticle = (emoji: string) => {
    const newId = particleIdCounter.current++;
    setParticles(prev => [...prev, { id: newId, emoji }]);
  };
  const removeParticle = (id: number) => setParticles(prev => prev.filter(p => p.id !== id));

  const handlePetPress = async () => {
    if (!featuredPetInstance) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();
    spawnParticle('❤️');
    if (Math.random() < 0.01) {
      await addPack(1);
      const newCount = await getPackCount();
      setPackCount(newCount);
      Alert.alert("Lucky!", "Your pet found a Booster Pack!");
    }
  };

  const handleFeed = async () => {
    if (!featuredPetInstance) return;
    spawnParticle('🍖');
    if (isHungry) {
      setIsHungry(false);
      const updatedList = await feedPet(featuredPetInstance.instanceId);
      const updatedPet = updatedList.find(p => p.instanceId === featuredPetInstance.instanceId);
      if (updatedPet) setFeaturedPetInstance(updatedPet);
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
      ]).start();
    }
  };

  const startChallenge = () => {
    // Shake and blow now use gachaBall, slap stays in game
    // const modes = ['shake', 'grab', 'blow', 'smile'];
    const modes = ['shake', 'grab', 'blow'];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];

    if (randomMode === 'shake' || randomMode === 'blow' || randomMode === 'grab') {
      // Route to gacha ball with the specific mode
      router.push({ pathname: '/gachaBall', params: { mode: randomMode } } as any);
    } else {
      // Slap still goes to the game screen
      router.push({ pathname: '/game', params: { mode: randomMode } });
    }
  };

  const handleOpenPack = () => {
    if (packCount <= 0) { Alert.alert("No Packs", "Play games to earn packs!"); return; }
    router.push('/packOpening');
  };

  const handleSwapPet = async (pet: PetInstance) => {
    await AsyncStorage.setItem('user_featured_pet_id_v2', pet.instanceId);
    setFeaturedPetInstance(pet);
    checkHunger(pet);
    setSwapModalVisible(false);
  };
  
  const openSettings = () => {
    router.push('/settings' as any);
  };

  const handleClearDataPress = () => {
    Alert.alert(
      "Reset Game Data?",
      "Are you sure you want to delete all your pets and packs? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Everything", style: "destructive", onPress: clearAllData }
      ]
    );
  };

  const clearAllData = async () => {
    await clearStorage();
    setPackCount(0);
    setFeaturedPetInstance(null);
    setUserCollection([]);
  };

    // 👇 NEW: Helper to rename pet logic
  const onRenameBtnPress = () => {
    if (!featuredPetInstance) return;
    setNewName(featuredPetInstance.name); // Pre-fill current name
    setRenameModalVisible(true);
  };

  const saveNewName = async () => {
    if (!featuredPetInstance || !newName.trim()) return;

    // 1. Update Collection in Storage
    const updatedCollection = userCollection.map(pet => {
      if (pet.instanceId === featuredPetInstance.instanceId) {
        return { ...pet, name: newName.trim() };
      }
      return pet;
    });

    await AsyncStorage.setItem('user_collection_v2', JSON.stringify(updatedCollection));
    
    // 2. Update Local State
    setFeaturedPetInstance(prev => prev ? ({ ...prev, name: newName.trim() }) : null);
    setUserCollection(updatedCollection);
    setRenameModalVisible(false);
  };

  const baseStats = featuredPetInstance ? getBaseStats(featuredPetInstance.animalId) : null;
  const rarityColor = (baseStats && RARITY_COLORS[baseStats.rarity]) || '#ccc';

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('@/assets/backgrounds/background1.png')}
        style={{ flex: 3 }}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container}>

          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.statPill}>
              <Text style={styles.statEmoji}>📦</Text>
              <Text style={styles.statText}>{packCount}</Text>
            </View>
            <View style={[styles.statPill, { flex: 1, flexDirection: 'column', alignItems: 'center', marginHorizontal: 20 }]}>
              <Text style={styles.hintText}>
                {featuredPetInstance
                  ? isHungry ? "(Shake phone to feed!)" : "(Tap to Love • Hold to Swap)"
                  : "(Go earn some packs!)"}
              </Text>
            </View>

            <View style={styles.statPill}>
              <TouchableOpacity onPress={openSettings}>
                <Ionicons name="settings-sharp" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* STAGE */}
          <View style={styles.stageContainer}>

            {/* 👇 NEW: Wrapper View for Movement (Translate X/Y) */}
            <Animated.View
              style={{
                alignItems: 'center',
                transform: featuredPetInstance ? [
                  { translateX: positionAnim.x },
                  { translateY: positionAnim.y }
                ] : [] // <--- If Egg (no pet), force position to 0,0
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={handlePetPress}
                onLongPress={() => setSwapModalVisible(true)}
              >
                {/* Pet Circle handles Scale Animation */}
                <Animated.View style={[
                  styles.petCircle,
                  { transform: [{ scale: scaleAnim }] }
                ]}>
                  {featuredPetInstance && baseStats ? (
                    <>
                      {particles.map(p => (
                        <FloatingEmoji key={p.id} id={p.id} emoji={p.emoji} onComplete={removeParticle} />
                      ))}
                      {baseStats && (
                        <Text style={styles.petRarity}>{'⭐'.repeat(baseStats.rarity)}</Text>
                      )}
                      <Text style={styles.petName}>{featuredPetInstance.name}</Text>
                      <Text style={styles.petAnimalName}>the {baseStats.name}</Text>

                      <View style={[styles.cardImageContainer, { borderColor: rarityColor }]}>
                        {baseStats.image ? (
                          <Image source={baseStats.image} style={styles.cardImage} resizeMode="contain" />
                        ) : (
                          <Text style={styles.cardEmoji}>{baseStats.emoji}</Text>
                        )}
                      </View>
                      <View style={styles.speechBubble}>
                        <Text style={styles.speechText}>
                          {isHungry ? "Feed me! 🍖 (Shake)" : "Tap me!"}
                        </Text>
                        <View style={styles.speechTail} />
                      </View>
                    </>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.emptyText}>No pets yet...</Text>
                      <Text style={{ fontSize: 50 }}>🥚</Text>
                    </View>
                  )}
                </Animated.View>
              </TouchableOpacity>

              {/* Shadow follows the pet */}
              <View style={styles.shadow} />

            </Animated.View>


          </View>


          {/* SWAP MODAL */}
          <Modal visible={swapModalVisible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Companions</Text>
                <TouchableOpacity onPress={() => setSwapModalVisible(false)}>
                  <Ionicons name="close-circle" size={30} color="#ccc" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={userCollection}
                keyExtractor={item => item.instanceId}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => {
                  const stats = getBaseStats(item.animalId);
                  const isSelected = featuredPetInstance?.instanceId === item.instanceId;
                  return (
                    <TouchableOpacity
                      style={[styles.swapCard, isSelected && styles.swapCardSelected]}
                      onPress={() => handleSwapPet(item)}
                    >
                      <Text style={{ fontSize: 30, marginRight: 15 }}>🐾</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.swapName}>{item.name}</Text>
                        <Text style={styles.swapSpecies}>{stats?.name}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={24} color="#4dff4d" />}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </Modal>

          {/* RENAME MODAL */}
          <Modal visible={renameModalVisible} transparent animationType="fade">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.renameOverlay}
            >
              <View style={styles.renameCard}>
                <Text style={styles.renameTitle}>Rename Pet</Text>
                <TextInput
                  style={styles.renameInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Enter new name"
                  placeholderTextColor="#999"
                  autoFocus
                />
                <View style={styles.renameBtnRow}>
                  <TouchableOpacity style={styles.renameCancel} onPress={() => setRenameModalVisible(false)}>
                    <Text style={{ color: '#999', fontWeight: 'bold' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.renameSave} onPress={saveNewName}>
                    <Text style={{ color: '#000', fontWeight: 'bold' }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

        </SafeAreaView>
      </ImageBackground>

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.largePlayBtn} onPress={startChallenge}>
          <View style={styles.playIconCircle}>
            <Ionicons name="play" size={32} color="#2D5A4A" style={{ marginLeft: 4 }} />
          </View>
          <View>
            <Text style={styles.playBtnText}>Play a Random Game!</Text>
            <Text style={styles.playBtnSub}>Earn Packs</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenPack}>
            <View style={[styles.iconBox, { backgroundColor: '#A8D8EA' }]}>
              <Text style={{ fontSize: 24 }}>📦</Text>
            </View>
            <Text style={styles.actionLabel}>Open Pack</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/collection')}>
            <View style={[styles.iconBox, { backgroundColor: '#D4C1EC' }]}>
              <Text style={{ fontSize: 24 }}>📖</Text>
            </View>
            <Text style={styles.actionLabel}>Collection</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onRenameBtnPress}>
            <View style={[styles.iconBox, { backgroundColor: '#FFD6BA' }]}>
              <Ionicons name="create-outline" size={28} color="#5D4037" />
            </View>
            <Text style={styles.actionLabel}>Rename Pet</Text>
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: { width: 100, marginHorizontal: 5, alignItems: 'center' },
  cardImageContainer: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center' },
  cardImage: { width: '80%', height: '80%' },
  cardEmoji: { fontSize: 40 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  appTitle: { fontSize: 18, fontWeight: '900', color: '#333', letterSpacing: 1, alignItems: 'center' },
  statPill: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, width: 70, height: 50, justifyContent: 'center', paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, alignItems: 'center', gap: 5 },
  statText: { fontWeight: 'bold', fontSize: 16 },
  statEmoji: { fontSize: 16 },
  stageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  petCircle: { justifyContent: 'center', alignItems: 'center', zIndex: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  petCircleHungry: { borderColor: '#ff9f43', borderWidth: 8 },
  shadow: { width: 20, height: 20, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 10, marginTop: -20, zIndex: 1, transform: [{ scaleX: 10 }] },
  petEmoji: { fontSize: 80, marginBottom: 10 },
  petName: { fontSize: 28, fontWeight: 'bold', color: '#FFF', shadowOpacity: 100 },
  petAnimalName: { fontSize: 16, fontWeight: 'bold', color: '#FFF', shadowOpacity: 100 },
  petRarity: { fontSize: 14, marginTop: 12, letterSpacing: 2 },
  emptyText: { color: '#fff', marginTop: 10, fontWeight: '600', shadowOpacity: 100 },
  hintText: { color: '#000', fontSize: 12, fontWeight: '600', },
  speechBubble: { position: 'absolute', top: -40, right: 0, backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 15 },
  speechText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  speechTail: { position: 'absolute', bottom: -6, left: 15, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#333' },
  bottomBar: { flex: 1, backgroundColor: '#FAF8F5', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, elevation: 10 },
  largePlayBtn: { backgroundColor: '#B8E0D2', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 25, shadowColor: '#7EC8A3', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  playIconCircle: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  playBtnText: { fontSize: 20, fontWeight: '900', color: '#2D5A4A' },
  playBtnSub: { fontSize: 12, color: '#3D7A6A', fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center' },
  iconBox: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8, shadowColor: '#8B9DC3', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  actionLabel: { fontWeight: '600', color: '#5D6D7E', fontSize: 12 },
  modalContainer: { flex: 2, backgroundColor: '#F9F9F9' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  swapCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  swapCardSelected: { borderColor: '#4dff4d', backgroundColor: '#f0fff0' },
  swapName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  swapSpecies: { fontSize: 12, color: '#888', marginTop: 2 },
  renameOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  renameCard: { width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 20, alignItems: 'center' },
  renameTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  renameInput: { width: '100%', padding: 10, borderColor: '#eee', borderWidth: 1, borderRadius: 10, marginBottom: 20, fontSize: 16, color: '#333' },
  renameBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  renameCancel: { flex: 1, padding: 12, alignItems: 'center', marginRight: 10, backgroundColor: '#f0f0f0', borderRadius: 10 },
  renameSave: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#4dff4d', borderRadius: 10 },
});