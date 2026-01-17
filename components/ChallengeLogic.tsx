import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { Audio } from 'expo-av';
import { useFocusEffect } from 'expo-router'; // <--- THIS IS THE MAGIC IMPORT

// --- SHARED STYLES ---
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    text: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    subText: { color: '#aaa', fontSize: 16, textAlign: 'center', marginTop: 10, marginBottom: 30 },
    debugBox: { width: '100%', padding: 20, backgroundColor: '#222', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
    label: { color: '#888', marginBottom: 15, fontSize: 12, fontWeight: 'bold' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    explanation: { marginTop: 20, color: '#666', fontSize: 12, fontStyle: 'italic' },
    candleContainer: { height: 150, alignItems: 'center', justifyContent: 'flex-end', marginVertical: 30 },
    wick: { width: 4, height: 15, backgroundColor: '#888' },
    flame: { width: 40, height: 60, backgroundColor: 'orange', borderRadius: 20, borderTopLeftRadius: 0, transform: [{ rotate: '45deg' }] },
    debug: { color: '#555', fontSize: 12, marginTop: 20, fontFamily: 'monospace' },
});

// === 1. SHAKE CHALLENGE ===
export const ShakeChallenge = ({ onSuccess }) => {
    const SHAKE_THRESHOLD = 30;
    const hasWon = useRef(false);

    useFocusEffect(
        useCallback(() => {
            // === STARTUP (Runs when screen appears) ===
            hasWon.current = false;
            DeviceMotion.removeAllListeners(); // Safety clear
            DeviceMotion.setUpdateInterval(50);
            
            const subscription = DeviceMotion.addListener(({ acceleration }) => {
                if (hasWon.current) return;
                const totalForce = Math.sqrt((acceleration?.x || 0) ** 2 + (acceleration?.y || 0) ** 2 + (acceleration?.z || 0) ** 2);
                
                if (totalForce > SHAKE_THRESHOLD) {
                    hasWon.current = true;
                    onSuccess();
                }
            });

            // === CLEANUP (Runs immediately when you leave the screen) ===
            return () => {
                subscription.remove();
                DeviceMotion.removeAllListeners();
            };
        }, [])
    );

    return (
        <View style={styles.container}>
            <Text style={{ fontSize: 80 }}>🥤</Text>
            <Text style={styles.text}>SHAKE IT!</Text>
            <Text style={styles.subText}>Shake your phone aggressively.</Text>
        </View>
    );
};

// === 2. SLAP CHALLENGE ===
export const SlapChallenge = ({ onSuccess }) => {
    const [debugValues, setDebugValues] = useState({ rot: 0, force: 0 });
    
    // Logic Refs
    const history = useRef([]);
    const lastUiUpdate = useRef(0);
    const hasWon = useRef(false);

    const SLAP_FORCE_MIN = 12;
    const SLAP_ROTATION_MIN = 4.0;
    const REJECTION_WINDOW = 200;

    useFocusEffect(
        useCallback(() => {
            // === STARTUP ===
            hasWon.current = false;
            DeviceMotion.removeAllListeners();
            DeviceMotion.setUpdateInterval(16);
            
            const subscription = DeviceMotion.addListener(({ acceleration, rotationRate }) => {
                if (hasWon.current) return;

                const now = Date.now();
                const rot = rotationRate?.gamma || 0;
                const force = Math.sqrt((acceleration?.x || 0) ** 2 + (acceleration?.y || 0) ** 2 + (acceleration?.z || 0) ** 2);

                history.current.push({ t: now, r: rot });
                history.current = history.current.filter(h => now - h.t < REJECTION_WINDOW);

                if (Math.abs(rot) > SLAP_ROTATION_MIN && force > SLAP_FORCE_MIN) {
                    const isPositive = rot > 0;
                    const hasReversal = history.current.some(h => isPositive ? h.r < -2.0 : h.r > 2.0);

                    if (!hasReversal) {
                        hasWon.current = true;
                        onSuccess();
                        return;
                    }
                }

                if (now - lastUiUpdate.current > 100) {
                    lastUiUpdate.current = now;
                    setDebugValues({ rot, force });
                }
            });

            // === CLEANUP ===
            return () => {
                subscription.remove();
                DeviceMotion.removeAllListeners();
            };
        }, [])
    );

    return (
        <View style={styles.container}>
            <Text style={{ fontSize: 80 }}>👋</Text>
            <Text style={styles.text}>SLAP IT!</Text>
            <Text style={styles.subText}>Swing the phone like a tennis racket.</Text>

            <View style={styles.debugBox}>
                <Text style={styles.label}>LIVE METRICS</Text>
                <View style={styles.row}>
                    <Text style={{color:'#ccc'}}>Rotation Speed:</Text>
                    <Text style={{color:'#fff', fontWeight:'bold'}}>{debugValues.rot.toFixed(1)} / {SLAP_ROTATION_MIN}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={{color:'#ccc'}}>Force (Gs):</Text>
                    <Text style={{color:'#fff', fontWeight:'bold'}}>{debugValues.force.toFixed(1)} / {SLAP_FORCE_MIN}</Text>
                </View>
            </View>
        </View>
    );
};

// === 3. BLOW CHALLENGE ===
export const BlowChallenge = ({ onSuccess }) => {
    const recordingRef = useRef(null); 
    const [dbValue, setDbValue] = useState(-160);
    const blowFrameCount = useRef(0);
    const hasWon = useRef(false);
    
    // This ref tracks if the screen is currently FOCUSED
    const isFocusedRef = useRef(true);

    useFocusEffect(
        useCallback(() => {
            // === STARTUP ===
            isFocusedRef.current = true;
            hasWon.current = false;
            
            const startMic = async () => {
                // Safety: Kill any zombies from previous screens
                if (recordingRef.current) {
                    try { await recordingRef.current.stopAndUnloadAsync(); } catch(e){}
                    recordingRef.current = null;
                }

                try {
                    const { status } = await Audio.requestPermissionsAsync();
                    if (status !== 'granted') return;

                    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
                    
                    const { recording } = await Audio.Recording.createAsync(
                        { ...Audio.RecordingOptionsPresets.LOW_QUALITY, isMeteringEnabled: true },
                        (status) => {
                            if (hasWon.current) return;
                            if (status.metering !== undefined) setDbValue(status.metering);

                            if (status.metering > -20) { 
                                blowFrameCount.current += 1;
                                if (blowFrameCount.current > 3) {
                                    hasWon.current = true;
                                    onSuccess();
                                }
                            } else {
                                blowFrameCount.current = 0;
                            }
                        }
                    );
                    
                    // If user navigated away while we were loading, kill it instantly
                    if (!isFocusedRef.current) {
                        await recording.stopAndUnloadAsync();
                        return;
                    }
                    recordingRef.current = recording;

                } catch (e) {
                    console.log("Mic Error:", e);
                }
            };

            startMic();

            // === CLEANUP (Runs immediately on Blur) ===
            return () => {
                isFocusedRef.current = false;
                if (recordingRef.current) {
                    // We don't await here because cleanup must be synchronous
                    // We fire-and-forget the stop command
                    recordingRef.current.stopAndUnloadAsync().catch(() => {});
                    recordingRef.current = null;
                }
            };
        }, [])
    );

    return (
        <View style={styles.container}>
            <View style={styles.candleContainer}>
                <View style={styles.wick} />
                <View style={styles.flame} />
            </View>
            <Text style={styles.text}>BLOW IT OUT!</Text>
            <Text style={styles.subText}>Blow directly into the microphone.</Text>
            <Text style={styles.debug}>
                Volume: {dbValue.toFixed(0)} dB
            </Text>
        </View>
    );
};