import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Card dimensions
export const CARD_WIDTH = SCREEN_WIDTH * 0.75;
export const CARD_HEIGHT = CARD_WIDTH * 1.45;

// Animation timings (ms)
export const TIMING = {
  FLIP_DURATION: 500,
  CASCADE_DELAY: 100,
  CASCADE_DURATION: 400,
  DISMISS_DURATION: 300,
  GLOW_PULSE_DURATION: 1000,
};

// Spring configs for Reanimated
export const SPRING = {
  DEFAULT: { damping: 15, stiffness: 100 },
  BOUNCY: { damping: 10, stiffness: 80, mass: 0.8 },
  STIFF: { damping: 20, stiffness: 200 },
};

// Gesture thresholds
export const THRESHOLDS = {
  DISMISS_DISTANCE: 80,
  DISMISS_VELOCITY: 400,
};

// Visual stack configuration
export const STACK = {
  PERSPECTIVE: 1200,
  OFFSET_Y: 6,
  OFFSET_X: 3,
  SCALE_DECREMENT: 0.03,
  ROTATION_INCREMENT: 2,
};

// Rarity colors
export const RARITY_COLORS: Record<number, string> = {
  1: '#9ca3af', // Common - Gray
  2: '#9ca3af', // Common - Gray
  3: '#22c55e', // Uncommon - Green
  4: '#eab308', // Rare - Gold/Yellow
  5: '#a855f7', // Legendary - Purple
};

// Rarity effects configuration
export const RARITY_EFFECTS: Record<number, { glow: boolean; particles: boolean; shake: boolean }> = {
  1: { glow: false, particles: false, shake: false },
  2: { glow: false, particles: false, shake: false },
  3: { glow: true, particles: false, shake: false },
  4: { glow: true, particles: true, shake: false },
  5: { glow: true, particles: true, shake: true },
};

// State machine types
export type PackOpeningPhase = 'IDLE' | 'TEARING' | 'CASCADE' | 'REVEALING' | 'COMPLETE';

export const CARD_COUNT = 5;
