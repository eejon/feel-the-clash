import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function GameVisuals({ mode, debugValue }) {
  return (
    <View style={styles.container}>
      {/* SHAKE UI */}
      {mode === 'shake' && (
        <>
          <Text style={styles.emoji}>🥤</Text>
          <Text style={styles.title}>SHAKE IT!</Text>
          <Text style={styles.subtitle}>Shake aggressively</Text>
        </>
      )}

      {/* SLAP UI */}
      {mode === 'slap' && (
        <>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>SLAP IT!</Text>
          <Text style={styles.subtitle}>Swing like a racket</Text>
          <View style={styles.debugBox}>
            <Text style={styles.debugText}>Rotation: {debugValue?.rot || 0}</Text>
            <Text style={styles.debugText}>Force: {debugValue?.force || 0}</Text>
          </View>
        </>
      )}

      {/* BLOW UI */}
      {mode === 'blow' && (
        <>
          <View style={styles.candleContainer}>
            <View style={styles.wick} />
            <View style={styles.flame} />
          </View>
          <Text style={styles.title}>BLOW IT OUT!</Text>
          <Text style={styles.subtitle}>Blow into microphone</Text>
          <Text style={styles.debugText}>Vol: {debugValue?.vol || -160} dB</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  emoji: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#aaa', marginBottom: 30 },
  debugBox: { backgroundColor: '#333', padding: 15, borderRadius: 10, marginTop: 20 },
  debugText: { color: '#4dff4d', fontFamily: 'monospace', fontSize: 14, marginVertical: 2 },
  candleContainer: { height: 150, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 30 },
  wick: { width: 4, height: 15, backgroundColor: '#888' },
  flame: { width: 40, height: 60, backgroundColor: 'orange', borderRadius: 20, borderTopLeftRadius: 0, transform: [{ rotate: '45deg' }] },
});