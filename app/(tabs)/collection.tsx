import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCollection } from '@/utils/storage';
import { getAnimalById } from '@/constants/GameData';
import { Ionicons } from '@expo/vector-icons';

export default function CollectionScreen() {
  const router = useRouter();
  const [inventory, setInventory] = useState<{id: number, count: number}[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadCollection();
    }, [])
  );

  const loadCollection = async () => {
    const ids = await getCollection();
    
    // Aggregate duplicates (e.g., 3 Dogs)
    const counts: Record<number, number> = {};
    ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

    const formatted = Object.keys(counts).map(id => ({
      id: parseInt(id),
      count: counts[parseInt(id)]
    }));

    setInventory(formatted);
  };

  const renderItem = ({ item }) => {
    const animal = getAnimalById(item.id);
    if (!animal) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.emoji}>🐾</Text>
        <Text style={styles.name}>{animal.name}</Text>
        <Text style={styles.rarity}>{'⭐'.repeat(animal.rarity)}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>x{item.count}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
           <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>My Collection</Text>
      </View>

      <FlatList
        data={inventory}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
            <Text style={styles.empty}>No animals found! Go play games to earn packs.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { marginRight: 15, padding: 5 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  list: { padding: 10 },
  empty: { color: '#666', textAlign: 'center', marginTop: 50, fontSize: 16 },
  card: { 
    flex: 1, 
    margin: 8, 
    backgroundColor: '#1a1a1a', 
    borderRadius: 15, 
    padding: 15, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  emoji: { fontSize: 40, marginBottom: 10 },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  rarity: { fontSize: 12 },
  badge: { 
    position: 'absolute', 
    top: 10, 
    right: 10, 
    backgroundColor: '#3498db', 
    borderRadius: 10, 
    paddingHorizontal: 8, 
    paddingVertical: 2 
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});