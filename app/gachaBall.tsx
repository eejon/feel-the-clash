import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeviceMotion } from 'expo-sensors';
import { Audio } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useFrameCallback,
  useAnimatedReaction,
  runOnJS,
  interpolate,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { GachaCapsule } from '@/components/gacha-ball/GachaCapsule';
import { DustParticles } from '@/components/gacha-ball/DustParticles';
import { FrostEffect } from '@/components/gacha-ball/FrostEffect';
import { ProgressRing } from '@/components/gacha-ball/ProgressRing';
import { CapsuleOpenReveal } from '@/components/gacha-ball/CapsuleOpenReveal';
import { AmbientParticles, ScreenFlash, ScreenFlashRef } from '@/components/pack-opening';
import { addPack } from '@/utils/storage';
import {
  GachaBallPhase,
  GachaMode,
  PHYSICS,
  THRESHOLDS,
  PROGRESS,
  TIMING,
  COLORS,
} from '@/constants/GachaBallConfig';

import {
  playGachaBallSound,
  preloadGachaBallSound,
  unloadSounds
} from '@/utils/sounds';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GachaBallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: GachaMode = (params.mode as GachaMode) || 'grab';
  const screenFlashRef = useRef<ScreenFlashRef>(null);

  // State
  const [phase, setPhase] = useState<GachaBallPhase>('IDLE');
  const [dustBursts, setDustBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Refs
  const isActive = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const lastInteractionTime = useRef(Date.now());
  const lastShakeTime = useRef(0);
  const lastBlowSoundTime = useRef(0);
  const phaseRef = useRef<GachaBallPhase>('IDLE');
  const historyRef = useRef<{ t: number; r: number }[]>([]);

  // Shared Values
  const hasTriggeredCompletion = useSharedValue(false);
  const positionX = useSharedValue(0);
  const positionY = useSharedValue(0);
  const velocityX = useSharedValue(0);
  const velocityY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const currentAccelX = useSharedValue(0);
  const currentAccelY = useSharedValue(0);
  const progress = useSharedValue(0);
  const blowIntensity = useSharedValue(0);
  const isShaking = useSharedValue(false);
  const grabScale = useSharedValue(1);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    preloadGachaBallSound();
    return () => {
      unloadSounds();
    };
  }, []);

  // Physics Loop
  useFrameCallback(() => {
    'worklet';
    velocityX.value += currentAccelX.value * PHYSICS.ACCELERATION_SCALE;
    velocityY.value += currentAccelY.value * PHYSICS.ACCELERATION_SCALE;
    velocityX.value *= PHYSICS.FRICTION;
    velocityY.value *= PHYSICS.FRICTION;
    positionX.value += velocityX.value;
    positionY.value += velocityY.value;

    if (positionX.value < PHYSICS.BOUNDS.minX) {
      positionX.value = PHYSICS.BOUNDS.minX;
      velocityX.value *= -PHYSICS.BOUNCE_FACTOR;
    }
    if (positionX.value > PHYSICS.BOUNDS.maxX) {
      positionX.value = PHYSICS.BOUNDS.maxX;
      velocityX.value *= -PHYSICS.BOUNCE_FACTOR;
    }
    if (positionY.value < PHYSICS.BOUNDS.minY) {
      positionY.value = PHYSICS.BOUNDS.minY;
      velocityY.value *= -PHYSICS.BOUNCE_FACTOR;
    }
    if (positionY.value > PHYSICS.BOUNDS.maxY) {
      positionY.value = PHYSICS.BOUNDS.maxY;
      velocityY.value *= -PHYSICS.BOUNCE_FACTOR;
    }

    rotation.value += (velocityX.value + velocityY.value) * 0.3;
  });

  // Progress Decay
  useEffect(() => {
    if (phase === 'IDLE' || phase === 'INTERACTING') {
      const decayInterval = setInterval(() => {
        const timeSinceInteraction = Date.now() - lastInteractionTime.current;
        if (timeSinceInteraction > PROGRESS.DECAY_DELAY && progress.value > 0) {
          progress.value = Math.max(0, progress.value - PROGRESS.DECAY_RATE);
        }
      }, 100);
      return () => clearInterval(decayInterval);
    }
  }, [phase]);

  // --- SENSOR CLEANUP (VOLUME FIX) ---
  const cleanupSensors = useCallback(async () => {
    DeviceMotion.removeAllListeners();
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (error) { }
      recordingRef.current = null;
    }
    // ✅ FIX: Reset Audio Mode to "Playback" to restore speaker volume
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (e) {
      console.warn("Error resetting audio mode", e);
    }
  }, []);

  // Completion Trigger
  const triggerCompletion = useCallback(() => {
    // ✅ FIX: Stop mic immediately so "Win" sounds play loudly
    cleanupSensors();

    setPhase('READY');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setPhase('OPENING');
    }, 500);
  }, [cleanupSensors]);

  useAnimatedReaction(
    () => progress.value,
    (currentProgress) => {
      'worklet';
      if (currentProgress >= THRESHOLDS.COMPLETION && !hasTriggeredCompletion.value) {
        hasTriggeredCompletion.value = true;
        runOnJS(triggerCompletion)();
      }
    }
  );

  useAnimatedReaction(
    () => Math.round(progress.value),
    (currentProgress, previousProgress) => {
      if (currentProgress !== previousProgress) {
        runOnJS(setDisplayProgress)(currentProgress);
      }
    }
  );

  // --- HANDLERS ---

  const handleShake = useCallback((force: number, posX: number, posY: number) => {
    const currentPhase = phaseRef.current;
    if (currentPhase === 'OPENING' || currentPhase === 'REVEALED' || currentPhase === 'COMPLETE' || currentPhase === 'READY') return;

    const now = Date.now();
    if (now - lastShakeTime.current < 500) return;
    lastShakeTime.current = now;

    lastInteractionTime.current = now;
    if (currentPhase === 'IDLE') setPhase('INTERACTING');

    playGachaBallSound();
    progress.value = Math.min(THRESHOLDS.COMPLETION, progress.value + PROGRESS.SHAKE_INCREMENT);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const burstId = Date.now();
    setDustBursts((prev) => [...prev, { id: burstId, x: posX, y: posY }]);
    setTimeout(() => {
      setDustBursts((prev) => prev.filter((b) => b.id !== burstId));
    }, TIMING.DUST_BURST_DURATION);
  }, []);

  const handleBlow = useCallback((metering: number) => {
    const currentPhase = phaseRef.current;
    if (currentPhase === 'OPENING' || currentPhase === 'REVEALED' || currentPhase === 'COMPLETE' || currentPhase === 'READY') return;

    const now = Date.now();
    lastInteractionTime.current = now;
    if (currentPhase === 'IDLE') setPhase('INTERACTING');

    // Throttled sound playback
    if (now - lastBlowSoundTime.current > 800) {
      playGachaBallSound();
      lastBlowSoundTime.current = now;
    }

    blowIntensity.value = interpolate(metering, [-40, THRESHOLDS.BLOW_METERING], [0, 1]);
    progress.value = Math.min(THRESHOLDS.COMPLETION, progress.value + PROGRESS.BLOW_INCREMENT);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleGrab = useCallback(() => {
    const currentPhase = phaseRef.current;
    if (currentPhase === 'OPENING' || currentPhase === 'REVEALED' || currentPhase === 'COMPLETE' || currentPhase === 'READY') return;

    const now = Date.now();
    if (now - lastInteractionTime.current < 500) return;
    lastInteractionTime.current = now;

    if (currentPhase === 'IDLE') setPhase('INTERACTING');

    playGachaBallSound();
    progress.value = Math.min(THRESHOLDS.COMPLETION, progress.value + 25);

    grabScale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withSpring(1, { damping: 8, stiffness: 150 })
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const burstId = Date.now();
    setDustBursts((prev) => [...prev, { id: burstId, x: 0, y: 0 }]);
    setTimeout(() => {
      setDustBursts((prev) => prev.filter((b) => b.id !== burstId));
    }, TIMING.DUST_BURST_DURATION);
  }, []);

  // --- SENSORS ---

  const startSensors = useCallback(async () => {
    const enableShake = mode === 'shake';
    const enableBlow = mode === 'blow';
    const enableGrab = mode === 'grab';

    DeviceMotion.setUpdateInterval(enableGrab ? 16 : TIMING.SENSOR_UPDATE_INTERVAL);
    if (enableGrab) historyRef.current = [];

    DeviceMotion.addListener(({ acceleration, rotationRate }) => {
      if (!isActive.current) return;

      currentAccelX.value = acceleration?.x || 0;
      currentAccelY.value = acceleration?.y || 0;

      // SHAKE
      if (enableShake) {
        const force = Math.sqrt(
          (acceleration?.x || 0) ** 2 +
          (acceleration?.y || 0) ** 2 +
          (acceleration?.z || 0) ** 2
        );

        if (force > THRESHOLDS.SHAKE_FORCE) {
          isShaking.value = true;
          handleShake(force, positionX.value, positionY.value);
        } else {
          isShaking.value = false;
        }
      }

      // GRAB
      if (enableGrab) {
        const now = Date.now();
        const rot = rotationRate?.gamma || 0;
        const force = Math.sqrt(
          (acceleration?.x || 0) ** 2 +
          (acceleration?.y || 0) ** 2 +
          (acceleration?.z || 0) ** 2
        );

        historyRef.current.push({ t: now, r: rot });
        historyRef.current = historyRef.current.filter(h => now - h.t < 200);

        if (Math.abs(rot) > 4.0 && force > 12) {
          const isPositive = rot > 0;
          const hasReversal = historyRef.current.some(h => isPositive ? h.r < -2.0 : h.r > 2.0);

          if (!hasReversal) {
            handleGrab();
            historyRef.current = [];
          }
        }
      }
    });

    // BLOW
    if (enableBlow) {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted' || !isActive.current) return;

        // Note: allowsRecordingIOS: true makes audio quiet on iPhone (Receiver mode)
        // We reset this in cleanupSensors() to fix volume later.
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          { ...Audio.RecordingOptionsPresets.LOW_QUALITY, isMeteringEnabled: true },
          (status) => {
            if (!isActive.current) return;
            const metering = status.metering || -160;

            if (metering > -50) {
              blowIntensity.value = withTiming(
                interpolate(metering, [-50, THRESHOLDS.BLOW_METERING], [0, 1]),
                { duration: 100 }
              );
            } else {
              blowIntensity.value = withTiming(0, { duration: TIMING.FROST_FADE_DURATION });
            }

            if (metering > THRESHOLDS.BLOW_METERING) {
              handleBlow(metering);
            }
          }
        );

        if (!isActive.current) {
          await recording.stopAndUnloadAsync();
          return;
        }
        recordingRef.current = recording;
      } catch (error) {
        console.warn('Failed to start microphone:', error);
      }
    }
  }, [handleShake, handleBlow, handleGrab, mode]);

  useFocusEffect(
    useCallback(() => {
      isActive.current = true;
      startSensors();
      return () => {
        isActive.current = false;
        cleanupSensors();
      };
    }, [startSensors, cleanupSensors])
  );

  const handleOpenComplete = async () => {
    await addPack(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    screenFlashRef.current?.flash(COLORS.GLOW);
    setPhase('REVEALED');
  };

  const handleCollect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  const grabAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: grabScale.value }]
    };
  });

  const getHeaderText = () => {
    switch (phase) {
      case 'IDLE':
        if (mode === 'shake') return 'Shake it!';
        if (mode === 'blow') return 'Blow on it!';
        if (mode === 'grab') return 'Grab it!';
        return 'Shake & Blow!';
      case 'INTERACTING':
        return 'Keep going!';
      case 'READY':
        return 'Almost there...';
      case 'OPENING':
        return 'Opening...';
      case 'REVEALED':
        return 'You got a pack!';
      default:
        return '';
    }
  };

  const getInstructionText = () => {
    if (mode === 'shake') return 'Shake your phone to open the capsule!';
    if (mode === 'blow') return 'Blow into the microphone to open!';
    if (mode === 'grab') return 'Flick your wrist to grab the capsule!';
    return 'Interact to open the capsule!';
  };

  return (
    <View style={styles.container}>
      {(phase === 'IDLE' || phase === 'INTERACTING') && (
        <AmbientParticles count={15} color="rgba(255, 215, 0, 0.4)" />
      )}
      <ScreenFlash ref={screenFlashRef} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{getHeaderText()}</Text>
          {phase === 'IDLE' && (
            <Text style={styles.instructionText}>{getInstructionText()}</Text>
          )}
          {(phase === 'IDLE' || phase === 'INTERACTING') && (
            <Text style={styles.subText}>
              {displayProgress}% complete
            </Text>
          )}
        </View>

        <View style={styles.content}>
          {phase !== 'OPENING' && phase !== 'REVEALED' && (
            <View style={styles.progressContainer}>
              <ProgressRing progress={progress} size={280} strokeWidth={8} />
            </View>
          )}

          {phase !== 'OPENING' && phase !== 'REVEALED' && (
            <Animated.View style={grabAnimatedStyle}>
              <GachaCapsule
                positionX={positionX}
                positionY={positionY}
                rotation={rotation}
                isShaking={isShaking}
              >
                {(mode === 'blow') && (
                  <FrostEffect intensity={blowIntensity} />
                )}
              </GachaCapsule>
            </Animated.View>
          )}

          {dustBursts.map((burst) => (
            <DustParticles key={burst.id} x={burst.x} y={burst.y} />
          ))}

          {phase === 'OPENING' && (
            <CapsuleOpenReveal onComplete={handleOpenComplete} />
          )}

          {phase === 'REVEALED' && (
            <View style={styles.revealedContainer}>
              <Text style={styles.packEmoji}>📦</Text>
              <Text style={styles.revealedText}>+1 Booster Pack!</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomButtons}>
          {phase === 'REVEALED' ? (
            <TouchableOpacity style={styles.collectBtn} onPress={handleCollect}>
              <Text style={styles.collectBtnText}>Collect</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  safeArea: { flex: 1 },
  header: { paddingVertical: 20, alignItems: 'center' },
  headerText: { color: '#ffd700', fontSize: 28, fontWeight: '800', textShadowColor: 'rgba(255, 215, 0, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  subText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 16, marginTop: 8 },
  instructionText: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, marginTop: 8, textAlign: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  revealedContainer: { alignItems: 'center' },
  packEmoji: { fontSize: 100, marginBottom: 20 },
  revealedText: { color: '#ffd700', fontSize: 28, fontWeight: '800' },
  bottomButtons: { paddingHorizontal: 40, paddingBottom: 40 },
  collectBtn: { backgroundColor: '#4dff4d', paddingVertical: 18, borderRadius: 30, alignItems: 'center', shadowColor: '#4dff4d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  collectBtnText: { color: '#000', fontSize: 20, fontWeight: '900' },
  cancelBtn: { backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  cancelBtnText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 16, fontWeight: '600' },
});