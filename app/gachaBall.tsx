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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GachaBallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: GachaMode = (params.mode as GachaMode) || 'both';
  const screenFlashRef = useRef<ScreenFlashRef>(null);

  // State
  const [phase, setPhase] = useState<GachaBallPhase>('IDLE');
  const [dustBursts, setDustBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Refs for cleanup and avoiding stale closures
  const isActive = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const lastInteractionTime = useRef(Date.now());
  const lastShakeTime = useRef(0);
  const phaseRef = useRef<GachaBallPhase>('IDLE');

  // Shared value for completion tracking (used in worklets)
  const hasTriggeredCompletion = useSharedValue(false);

  // Keep phaseRef in sync with phase state
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Animated values for physics
  const positionX = useSharedValue(0);
  const positionY = useSharedValue(0);
  const velocityX = useSharedValue(0);
  const velocityY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const currentAccelX = useSharedValue(0);
  const currentAccelY = useSharedValue(0);

  // Progress and effects
  const progress = useSharedValue(0);
  const blowIntensity = useSharedValue(0);
  const isShaking = useSharedValue(false);

  // Physics loop
  useFrameCallback(() => {
    'worklet';
    // Apply acceleration from device motion
    velocityX.value += currentAccelX.value * PHYSICS.ACCELERATION_SCALE;
    velocityY.value += currentAccelY.value * PHYSICS.ACCELERATION_SCALE;

    // Apply friction
    velocityX.value *= PHYSICS.FRICTION;
    velocityY.value *= PHYSICS.FRICTION;

    // Update position
    positionX.value += velocityX.value;
    positionY.value += velocityY.value;

    // Boundary collision with bounce
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

    // Rotation based on velocity
    rotation.value += (velocityX.value + velocityY.value) * 0.3;
  });

  // Progress decay interval
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

  // Trigger completion when progress reaches 100% (called from worklet via runOnJS)
  const triggerCompletion = useCallback(() => {
    setPhase('READY');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-transition to opening after brief delay
    setTimeout(() => {
      setPhase('OPENING');
    }, 500);
  }, []);

  // Watch progress value for completion (useAnimatedReaction works with shared values)
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

  // Update display progress for UI (shared value -> React state)
  useAnimatedReaction(
    () => Math.round(progress.value),
    (currentProgress, previousProgress) => {
      if (currentProgress !== previousProgress) {
        runOnJS(setDisplayProgress)(currentProgress);
      }
    }
  );

  // Handle shake detected (use phaseRef to avoid stale closure)
  // posX and posY are passed from the sensor callback to avoid reading .value during state updates
  const handleShake = useCallback((force: number, posX: number, posY: number) => {
    const currentPhase = phaseRef.current;
    if (currentPhase === 'OPENING' || currentPhase === 'REVEALED' || currentPhase === 'COMPLETE' || currentPhase === 'READY') return;

    const now = Date.now();
    // Debounce shakes to every 100ms
    if (now - lastShakeTime.current < 100) return;
    lastShakeTime.current = now;

    lastInteractionTime.current = now;
    if (currentPhase === 'IDLE') setPhase('INTERACTING');

    // Increment progress
    progress.value = Math.min(THRESHOLDS.COMPLETION, progress.value + PROGRESS.SHAKE_INCREMENT);

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Spawn dust particles (use passed position values to avoid reading .value during setState)
    const burstId = Date.now();
    setDustBursts((prev) => [...prev, { id: burstId, x: posX, y: posY }]);

    // Remove burst after animation
    setTimeout(() => {
      setDustBursts((prev) => prev.filter((b) => b.id !== burstId));
    }, TIMING.DUST_BURST_DURATION);
  }, []);

  // Handle blow detected (use phaseRef to avoid stale closure)
  const handleBlow = useCallback((metering: number) => {
    const currentPhase = phaseRef.current;
    if (currentPhase === 'OPENING' || currentPhase === 'REVEALED' || currentPhase === 'COMPLETE' || currentPhase === 'READY') return;

    lastInteractionTime.current = Date.now();
    if (currentPhase === 'IDLE') setPhase('INTERACTING');

    // Update frost intensity based on blow strength
    blowIntensity.value = interpolate(metering, [-40, THRESHOLDS.BLOW_METERING], [0, 1]);

    // Increment progress
    progress.value = Math.min(THRESHOLDS.COMPLETION, progress.value + PROGRESS.BLOW_INCREMENT);

    // Haptic feedback for blow
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Start sensors based on mode
  const startSensors = useCallback(async () => {
    const enableShake = mode === 'shake' || mode === 'both';
    const enableBlow = mode === 'blow' || mode === 'both';

    // Shake detection via DeviceMotion (always listen for physics, but only trigger progress if enabled)
    DeviceMotion.setUpdateInterval(TIMING.SENSOR_UPDATE_INTERVAL);
    DeviceMotion.addListener(({ acceleration }) => {
      if (!isActive.current) return;

      // Update physics acceleration (always, for capsule movement)
      currentAccelX.value = acceleration?.x || 0;
      currentAccelY.value = acceleration?.y || 0;

      if (!enableShake) return;

      // Calculate total force
      const force = Math.sqrt(
        (acceleration?.x || 0) ** 2 +
        (acceleration?.y || 0) ** 2 +
        (acceleration?.z || 0) ** 2
      );

      // Check shake threshold
      if (force > THRESHOLDS.SHAKE_FORCE) {
        isShaking.value = true;
        // Read position values before calling handleShake to avoid reading during state updates
        const posX = positionX.value;
        const posY = positionY.value;
        handleShake(force, posX, posY);
      } else {
        isShaking.value = false;
      }
    });

    // Blow detection via microphone (only if enabled)
    if (enableBlow) {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted' || !isActive.current) return;

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          { ...Audio.RecordingOptionsPresets.LOW_QUALITY, isMeteringEnabled: true },
          (status) => {
            if (!isActive.current) return;
            const metering = status.metering || -160;

            // Update blow intensity for frost effect
            if (metering > -40) {
              blowIntensity.value = withTiming(
                interpolate(metering, [-40, THRESHOLDS.BLOW_METERING], [0, 1]),
                { duration: 100 }
              );
            } else {
              blowIntensity.value = withTiming(0, { duration: TIMING.FROST_FADE_DURATION });
            }

            // Check blow threshold
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
  }, [handleShake, handleBlow, mode]);

  // Cleanup sensors
  const cleanupSensors = useCallback(async () => {
    DeviceMotion.removeAllListeners();
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        // Ignore cleanup errors
      }
      recordingRef.current = null;
    }
  }, []);

  // Focus effect for sensor lifecycle
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

  // Handle capsule open complete
  const handleOpenComplete = async () => {
    await addPack(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    screenFlashRef.current?.flash(COLORS.GLOW);
    setPhase('REVEALED');
  };

  // Handle collect
  const handleCollect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  // Get header text based on mode
  const getHeaderText = () => {
    switch (phase) {
      case 'IDLE':
        if (mode === 'shake') return 'Shake it!';
        if (mode === 'blow') return 'Blow on it!';
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

  // Get instruction text based on mode
  const getInstructionText = () => {
    if (mode === 'shake') return 'Shake your phone to open the capsule!';
    if (mode === 'blow') return 'Blow into the microphone to open!';
    return 'Shake or blow to open the capsule!';
  };

  return (
    <View style={styles.container}>
      {/* Ambient particles */}
      {(phase === 'IDLE' || phase === 'INTERACTING') && (
        <AmbientParticles count={15} color="rgba(255, 215, 0, 0.4)" />
      )}

      {/* Screen flash */}
      <ScreenFlash ref={screenFlashRef} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
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

        {/* Main content */}
        <View style={styles.content}>
          {/* Progress ring */}
          {phase !== 'OPENING' && phase !== 'REVEALED' && (
            <View style={styles.progressContainer}>
              <ProgressRing progress={progress} size={280} strokeWidth={8} />
            </View>
          )}

          {/* Capsule */}
          {phase !== 'OPENING' && phase !== 'REVEALED' && (
            <GachaCapsule
              positionX={positionX}
              positionY={positionY}
              rotation={rotation}
              isShaking={isShaking}
            >
              {(mode === 'blow' || mode === 'both') && (
                <FrostEffect intensity={blowIntensity} />
              )}
            </GachaCapsule>
          )}

          {/* Dust particles */}
          {dustBursts.map((burst) => (
            <DustParticles key={burst.id} x={burst.x} y={burst.y} />
          ))}

          {/* Opening animation */}
          {phase === 'OPENING' && (
            <CapsuleOpenReveal onComplete={handleOpenComplete} />
          )}

          {/* Revealed state */}
          {phase === 'REVEALED' && (
            <View style={styles.revealedContainer}>
              <Text style={styles.packEmoji}>📦</Text>
              <Text style={styles.revealedText}>+1 Booster Pack!</Text>
            </View>
          )}
        </View>

        {/* Bottom buttons */}
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
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerText: {
    color: '#ffd700',
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 8,
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealedContainer: {
    alignItems: 'center',
  },
  packEmoji: {
    fontSize: 100,
    marginBottom: 20,
  },
  revealedText: {
    color: '#ffd700',
    fontSize: 28,
    fontWeight: '800',
  },
  bottomButtons: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  collectBtn: {
    backgroundColor: '#4dff4d',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#4dff4d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  collectBtnText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
});
