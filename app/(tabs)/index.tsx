import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Modal, FlatList, Animated, Easing } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceMotion } from 'expo-sensors'; 

// Data & Storage
import { getPackCount, getCollection, clearStorage, addPack, feedPet, PetInstance } from '@/utils/storage';
import { getAnimalById } from '@/constants/GameData';

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

  // --- ANIMATION & GAME STATE ---
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [particles, setParticles] = useState<any[]>([]); 
  const particleIdCounter = useRef(0);
  const [isHungry, setIsHungry] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      
      // === SHAKE DETECTION LISTENER ===
      DeviceMotion.setUpdateInterval(100);
      const subscription = DeviceMotion.addListener(({ acceleration }) => {
        const force = Math.sqrt(
          (acceleration?.x || 0) ** 2 + 
          (acceleration?.y || 0) ** 2 + 
          (acceleration?.z || 0) ** 2
        );

        if (force > 20) {
            handleFeed();
        }
      });

      return () => {
        subscription.remove();
      };
    }, [featuredPetInstance]) 
  );

  const loadData = async () => {
    const count = await getPackCount();
    setPackCount(count);

    const collection = await getCollection();
    setUserCollection(collection);
    
    // Load Featured Pet
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
    if (!pet.lastFed) {
        setIsHungry(true);
        return;
    }
    const hoursSinceFed = (Date.now() - pet.lastFed) / (1000 * 60 * 60);
    setIsHungry(hoursSinceFed > 4);
  };
  
  const getBaseStats = (animalId: number) => getAnimalById(animalId);

  // --- ACTIONS ---

  const spawnParticle = (emoji: string) => {
    const newId = particleIdCounter.current++;
    setParticles(prev => [...prev, { id: newId, emoji }]);
  };

  const removeParticle = (id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  };

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

  // 👇 UPDATED: Added 'smile' to the modes array!
  const startChallenge = () => {
    const modes = ['shake', 'slap', 'blow', 'smile']; 
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

  const handleSwapPet = async (pet: PetInstance) => {
    await AsyncStorage.setItem('user_featured_pet_id_v2', pet.instanceId);
    setFeaturedPetInstance(pet);
    checkHunger(pet);
    setSwapModalVisible(false);
  };
  
  const clearAllData = async () => {
      await clearStorage();
      setPackCount(0);
      setFeaturedPetInstance(null);
      setUserCollection([]);
  };

  const baseStats = featuredPetInstance ? getBaseStats(featuredPetInstance.animalId) : null;

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
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

      {/* STAGE */}
      <View style={styles.stageContainer}>
        <TouchableOpacity 
            activeOpacity={1} 
            onPress={handlePetPress}
            onLongPress={() => setSwapModalVisible(true)}
        >
            <Animated.View style={[
                styles.petCircle, 
                { transform: [{ scale: scaleAnim }] },
                isHungry && styles.petCircleHungry 
            ]}>
                {featuredPetInstance && baseStats ? (
                    <>
                        {particles.map(p => (
                            <FloatingEmoji key={p.id} id={p.id} emoji={p.emoji} onComplete={removeParticle} />
                        ))}

                        <Text style={[styles.petEmoji, isHungry && { opacity: 0.5 }]}>
                            {baseStats.id === 1 ? '🐶' : '🐾'}
                        </Text>
                        
                        <Text style={styles.petName}>{featuredPetInstance.name}</Text>
                        <Text style={styles.petAnimalName}>{baseStats.name}</Text>

                        <Text style={styles.petRarity}>{'⭐'.repeat(baseStats.rarity)}</Text>
                        
                        <View style={styles.speechBubble}>
                            <Text style={styles.speechText}>
                                {isHungry ? "Feed me! (Shake)" : "Tap me!"}
                            </Text>
                            <View style={styles.speechTail} />
                        </View>
                    </>
                ) : (
                    <View style={{alignItems:'center'}}>
                        <Text style={{fontSize: 50, opacity: 0.3}}>🥚</Text>
                        <Text style={styles.emptyText}>No pets yet...</Text>
                    </View>
                )}
            </Animated.View>
        </TouchableOpacity>
        
        <View style={styles.shadow} />
        
        <Text style={styles.hintText}>
            {featuredPetInstance 
                ? isHungry ? "(Shake phone to feed!)" : "(Tap to Love • Hold to Swap)" 
                : "(Go earn some packs!)"}
        </Text>
      </View>

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.largePlayBtn} onPress={startChallenge}>
          <View style={styles.playIconCircle}>
             <Ionicons name="play" size={32} color="#fff" style={{marginLeft: 4}}/>
          </View>
          <View>
            <Text style={styles.playBtnText}>Play a Random Game!</Text>
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
                                <Text style={styles.swapSpecies}>{stats?.name}</Text>
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={24} color="#4dff4d" />}
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  appTitle: { fontSize: 20, fontWeight: '900', color: '#333', letterSpacing: 1 },
  statPill: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, alignItems: 'center', gap: 5 },
  statText: { fontWeight: 'bold', fontSize: 16 },
  statEmoji: { fontSize: 16 },

  stageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 50 },
  petCircle: { width: 260, height: 260, borderRadius: 130, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 8, borderColor: '#e1e5eb', zIndex: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  petCircleHungry: { borderColor: '#ff9f43', borderWidth: 8 }, 
  
  shadow: { width: 20, height: 20, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 10, marginTop: -20, zIndex: 1, transform: [{ scaleX: 10 }] },
  petEmoji: { fontSize: 80, marginBottom: 10 },
  petName: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  petAnimalName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  petRarity: { fontSize: 14, marginTop: 4, letterSpacing: 2 },
  emptyText: { color: '#aaa', marginTop: 10, fontWeight: '600' },
  hintText: { marginTop: 30, color: '#aaa', fontSize: 12, fontWeight: '600' },

  speechBubble: { position: 'absolute', top: -40, right: 0, backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 15 },
  speechText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  speechTail: { position: 'absolute', bottom: -6, left: 15, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#333' },

  bottomBar: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  largePlayBtn: { backgroundColor: '#4dff4d', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 25, shadowColor: '#4dff4d', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: {width: 0, height: 4}, elevation: 5 },
  playIconCircle: { width: 50, height: 50, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  playBtnText: { fontSize: 20, fontWeight: '900', color: '#000' },
  playBtnSub: { fontSize: 12, color: '#004d00', fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center' },
  iconBox: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 5, elevation: 3 },
  actionLabel: { fontWeight: '600', color: '#555', fontSize: 12 },

  modalContainer: { flex: 1, backgroundColor: '#F9F9F9' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  swapCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  swapCardSelected: { borderColor: '#4dff4d', backgroundColor: '#f0fff0' },
  swapName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  swapSpecies: { fontSize: 12, color: '#888', marginTop: 2 }
});