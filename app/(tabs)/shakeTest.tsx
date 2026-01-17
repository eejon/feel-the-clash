import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Vibration } from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GestureTest() {
  const [data, setData] = useState({});
  const [status, setStatus] = useState("Waiting for action...");
  const [lastEventTime, setLastEventTime] = useState(0);
  const [totalForce, setTotalForce] = useState(0);

  // Constants for tuning sensitivity
  const SHAKE_THRESHOLD = 30; // Acceleration > 30G OK


  // SLAP: Needs BOTH rotation AND movement force
  const SLAP_ROTATION_THRESHOLD = 300.0;  // Lowered slightly (from 8.0) to catch the start of the arc
  const SLAP_MOVEMENT_THRESHOLD = 30.0;  // User-generated force (approx 30.0G)


  const COOLDOWN = 1000; // 1 second between detections

  useEffect(() => {
    _subscribe();
    return () => _unsubscribe();
  }, [totalForce]);

  const _subscribe = () => {
    // Faster interval needed for slap detection (20ms)
    DeviceMotion.setUpdateInterval(20);

    DeviceMotion.addListener((motionData) => {
      setData(motionData);
      detectGestures(motionData);
    });
  };

  const _unsubscribe = () => {
    DeviceMotion.removeAllListeners();
  };

const detectGestures = (motionData) => {
    const now = Date.now();
    if (now - lastEventTime < COOLDOWN) return;

    const { acceleration, rotationRate } = motionData;

    // 1. Calculate the Forces
    // "acceleration" in DeviceMotion is usually User Acceleration (Gravity removed)
    // This is perfect because we don't care about Earth's gravity, only the user's swing.
    const movementForce = Math.sqrt(
      Math.pow(acceleration?.x || 0, 2) + 
      Math.pow(acceleration?.y || 0, 2) + 
      Math.pow(acceleration?.z || 0, 2)
    );

    const rotationSpeed = Math.sqrt(
      Math.pow(rotationRate?.alpha || 0, 2) + 
      Math.pow(rotationRate?.beta || 0, 2) + 
      Math.pow(rotationRate?.gamma || 0, 2)
    );

    // 2. DETECTION LOGIC

    // A. SLAP / SWING DETECTION (Combined Check)
    // We require high rotation AND significant movement force.
    // A wrist twist has high rotation but low movement force (< 0.5).
    if (rotationSpeed > SLAP_ROTATION_THRESHOLD && movementForce > SLAP_MOVEMENT_THRESHOLD) {
      // triggerAction("👋 SLAP DETECTED!", now);
      return;
    }

    // B. SHAKE DETECTION
    // Shakes are chaotic. Often high force, but lower sustained rotation than a swing.
    // We prioritize Slap detection above. If it wasn't a slap, check for shake.
    if (movementForce > SHAKE_THRESHOLD) {
      triggerAction("🥤 SHAKE DETECTED!", now);
      return;
    }
  };

  const triggerAction = (message, time) => {

    setStatus(message);
    setLastEventTime(time);
    Vibration.vibrate(100); // Haptic feedback

    // Reset text after 1 second
    setTimeout(() => setStatus("Waiting for action..."), 1000);
  };

  // Safe accessors for display
  const acc = data.acceleration || { x: 0, y: 0, z: 0 };
  const rot = data.rotationRate || { alpha: 0, beta: 0, gamma: 0 };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.status}>{status}</Text>

      <View style={styles.debugBox}>
        <Text style={styles.label}>DEBUG DATA</Text>

        {/* Force Visualization */}
        <Text style={styles.dataValue}>
          {totalForce}
        </Text>
        <View style={styles.row}>


          <Text style={styles.dataLabel}>Acceleration (Shake):</Text>

          <Text style={styles.dataValue}>
            {Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2).toFixed(2)} Gs
          </Text>
        </View>
        <View style={styles.barContainer}>
          <View style={[styles.bar, { width: Math.min(Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2) * 20, 100) + '%' }]} />
        </View>

        {/* Rotation Visualization */}
        <View style={styles.row}>
          <Text style={styles.dataLabel}>Rot Speed (Slap):</Text>
          <Text style={styles.dataValue}>
            {Math.sqrt(rot.alpha ** 2 + rot.beta ** 2 + rot.gamma ** 2).toFixed(2)} rad/s
          </Text>
        </View>
        <View style={styles.barContainer}>
          <View style={[styles.bar, { backgroundColor: '#ff9f43', width: Math.min(Math.sqrt(rot.alpha ** 2 + rot.beta ** 2 + rot.gamma ** 2) * 10, 100) + '%' }]} />
        </View>
      </View>

      <Text style={styles.instruction}>
        Shake = Quick back & forth{'\n'}
        Slap = Fast swing like hitting a tennis ball
      </Text>

      <View style={{marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#555'}}>
            <Text style={styles.label}>SLAP CRITERIA (Must match both)</Text>
            
            <View style={styles.row}>
                <Text style={{color: '#fff'}}>1. Spinning?</Text>
                <Text style={{
                    color: Math.sqrt(rot.alpha**2 + rot.beta**2 + rot.gamma**2) > 300.0 ? '#4dff4d' : '#ff4d4d', 
                    fontWeight: 'bold'
                }}>
                    {Math.sqrt(rot.alpha**2 + rot.beta**2 + rot.gamma**2) > 300.0 ? "YES" : "NO"}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={{color: '#fff'}}>2. Moving?</Text>
                <Text style={{
                    color: Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2) > 30.0 ? '#4dff4d' : '#ff4d4d', 
                    fontWeight: 'bold'
                }}>
                    {Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2) > 30.0 ? "YES" : "NO"}
                </Text>
            </View>
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  status: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4dff4d',
    marginBottom: 40,
    textAlign: 'center',
    height: 80, // reserve height so layout doesn't jump
  },
  debugBox: {
    width: '100%',
    padding: 20,
    backgroundColor: '#333',
    borderRadius: 12,
  },
  label: {
    color: '#888',
    marginBottom: 10,
    fontSize: 12,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dataLabel: {
    color: '#fff',
    fontSize: 16,
  },
  dataValue: {
    color: '#4dff4d',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  barContainer: {
    height: 10,
    backgroundColor: '#444',
    borderRadius: 5,
    marginBottom: 20,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#ff4d4d',
  },
  instruction: {
    marginTop: 30,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
  },
});