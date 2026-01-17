

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Vibration, Dimensions } from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GestureTest() {
  const [status, setStatus] = useState("Waiting for action...");
  const [debugInfo, setDebugInfo] = useState({ rot: 0, force: 0, consistency: 'N/A' });
  
  // A "Ref" is perfect for storing sensor history without re-rendering the screen 60 times a second
  const history = useRef([]); 
  const lastTrigger = useRef(0);

  // === TUNING ===
  const SLAP_FORCE_MIN = 12;       // Movement force (G)
  const SLAP_ROTATION_MIN = 4.0;    // Rotation speed (rad/s)
  const SHAKE_REJECTION_WINDOW = 200; // Look back 250ms for reversals

  useEffect(() => {
    DeviceMotion.setUpdateInterval(16); // ~60fps for smooth history tracking
    const sub = DeviceMotion.addListener(processMotion);
    return () => sub.remove();
  }, []);

  const processMotion = (data) => {
    const now = Date.now();
    const { acceleration, rotationRate } = data;

    // 1. Calculate Raw Magnitudes
    // We use "Gamma" (twist) as the primary slap axis, but you can combine them
    const currentRotation = rotationRate?.gamma || 0; 
    const absRotation = Math.abs(currentRotation);
    
    const currentForce = Math.sqrt(
      (acceleration?.x || 0)**2 + 
      (acceleration?.y || 0)**2 + 
      (acceleration?.z || 0)**2
    );

    // 2. Add to History Buffer (Keep last 300ms of data)
    history.current.push({ t: now, r: currentRotation });
    // Remove old data to keep array small
    history.current = history.current.filter(h => now - h.t < SHAKE_REJECTION_WINDOW);

    // Update Debug View (slowed down slightly so you can read it)
    if (now % 150 < 20) {
      setDebugInfo({ rot: absRotation, force: currentForce });
    }

    // === THE LOGIC ===
    
    // Check Cooldown
    if (now - lastTrigger.current < 1500) return;

    // STEP A: Basic Threshold Check
    // "Is it moving fast enough to matter?"
    if (absRotation > SLAP_ROTATION_MIN && currentForce > SLAP_FORCE_MIN) {
      
      // STEP B: The "Anti-Shake" Check (Directional Integrity)
      // If we are rotating POSITIVE now, we must NOT have rotated NEGATIVE recently.
      const isRotatingPositive = currentRotation > 0;
      
      const hasReversal = history.current.some(h => {
        // If current is (+), look for (-). If current is (-), look for (+).
        // We use a threshold of 2.0 to ignore tiny jitters.
        return isRotatingPositive 
          ? h.r < -2.0 
          : h.r > 2.0;
      });

      if (hasReversal) {
        // We found a reversal! This is a SHAKE. Ignore it.
        // Optional: console.log("Shake rejected");
        return; 
      }

      // If we survived Step B, it's a clean, one-way Slap.
      // triggerSlap(now);
    }
  };

  const triggerSlap = (time) => {
    lastTrigger.current = time;
    setStatus("👋 SLAP DETECTED!");
    Vibration.vibrate(150);
    setTimeout(() => setStatus("Waiting..."), 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={[styles.status, { color: status.includes("SLAP") ? '#4dff4d' : '#fff' }]}>
        {status}
      </Text>

      <View style={styles.debugBox}>
        <Text style={styles.label}>LIVE METRICS</Text>
        
        <View style={styles.row}>
          <Text style={{color:'#ccc'}}>Rotation Speed:</Text>
          <Text style={{color:'#fff', fontWeight:'bold'}}>{debugInfo.rot.toFixed(1)} / {SLAP_ROTATION_MIN}</Text>
        </View>

        <View style={styles.row}>
          <Text style={{color:'#ccc'}}>Force (Gs):</Text>
          <Text style={{color:'#fff', fontWeight:'bold'}}>{debugInfo.force.toFixed(1)} / {SLAP_FORCE_MIN}</Text>
        </View>

        <Text style={styles.explanation}>
          Logic: To trigger, rotation must be HIGH, but must NOT have reversed direction in the last {SHAKE_REJECTION_WINDOW}ms.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  status: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 50 },
  debugBox: { padding: 20, backgroundColor: '#222', borderRadius: 10, width: '80%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: '#888', marginBottom: 15, fontSize: 12, fontWeight: 'bold' },
  explanation: { marginTop: 20, color: '#666', fontSize: 12, fontStyle: 'italic' }
});