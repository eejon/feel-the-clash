import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { clearStorage, addPack, getPackCount } from '@/utils/storage';

export default function SettingsScreen() {
  const router = useRouter();
  const [packCount, setPackCount] = useState(0);

  useEffect(() => {
    loadPackCount();
  }, []);

  const loadPackCount = async () => {
    const count = await getPackCount();
    setPackCount(count);
  };

  const handleClearInventory = () => {
    Alert.alert(
      'Reset Game?',
      'This will delete ALL your pets and packs. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearStorage();
            Alert.alert('Done', 'Game has been reset.');
            router.back();
          },
        },
      ]
    );
  };

  const handleAddPacks = (amount: number) => {
    Alert.alert(
      'Add Packs',
      `Add ${amount} pack${amount > 1 ? 's' : ''} to your inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            for (let i = 0; i < amount; i++) {
              await addPack();
            }
            await loadPackCount();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Reset Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleClearInventory}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
            <Text style={styles.dangerButtonText}>Clear Inventory & Reset</Text>
          </TouchableOpacity>
          <Text style={styles.sectionHint}>
            Deletes all pets and packs. Cannot be undone.
          </Text>
        </View>

        {/* Developer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer Tools</Text>
          <Text style={styles.packCountText}>Current packs: {packCount}</Text>

          <View style={styles.devButtonRow}>
            <TouchableOpacity
              style={styles.devButton}
              onPress={() => handleAddPacks(1)}
            >
              <Text style={styles.devButtonText}>+1 Pack</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.devButton}
              onPress={() => handleAddPacks(5)}
            >
              <Text style={styles.devButtonText}>+5 Packs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.devButton}
              onPress={() => handleAddPacks(10)}
            >
              <Text style={styles.devButtonText}>+10 Packs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2E8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 12,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  packCountText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '600',
  },
  devButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  devButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  devButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
