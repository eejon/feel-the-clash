import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { CARD_WIDTH, CARD_HEIGHT } from '@/constants/PackOpeningConfig';

export function CardBack() {
  return (
    <View style={styles.container}>
      {/* Outer border */}
      <View style={styles.border}>
        {/* Inner pattern area */}
        <View style={styles.patternArea}>
          {/* Diamond pattern grid */}
          {Array.from({ length: 5 }).map((_, row) => (
            <View key={row} style={styles.patternRow}>
              {Array.from({ length: 4 }).map((_, col) => (
                <View
                  key={col}
                  style={[
                    styles.diamond,
                    (row + col) % 2 === 0 && styles.diamondAlt,
                  ]}
                />
              ))}
            </View>
          ))}

          {/* Center emblem */}
          <View style={styles.centerEmblem}>
            <Text style={styles.emblemText}>?</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
    padding: 8,
    // Card shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  border: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#ffd700',
    backgroundColor: '#16213e',
    overflow: 'hidden',
  },
  patternArea: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  diamond: {
    width: 24,
    height: 24,
    backgroundColor: '#0f3460',
    transform: [{ rotate: '45deg' }],
    borderRadius: 4,
  },
  diamondAlt: {
    backgroundColor: '#1a1a2e',
  },
  centerEmblem: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffd700',
    justifyContent: 'center',
    alignItems: 'center',
    // Emblem shadow
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  emblemText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1a1a2e',
  },
});
