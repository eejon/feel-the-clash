import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Capsule dimensions
export const CAPSULE = {
  WIDTH: 120,
  HEIGHT: 160,
};

// Physics constants for ball movement
export const PHYSICS = {
  FRICTION: 0.92,
  ACCELERATION_SCALE: 2.5,
  BOUNCE_FACTOR: 0.6,
  BOUNDS: {
    minX: -SCREEN_WIDTH * 0.3,
    maxX: SCREEN_WIDTH * 0.3,
    minY: -SCREEN_HEIGHT * 0.12,
    maxY: SCREEN_HEIGHT * 0.12,
  },
};

// Interaction detection thresholds
export const THRESHOLDS = {
  SHAKE_FORCE: 15,        // Gs - lower for easier detection
  BLOW_METERING: -25,     // dB - more forgiving blow detection (typical blow is -30 to -10)
  COMPLETION: 100,        // Progress needed to open
};

// Progress mechanics (tuned for easier opening)
export const PROGRESS = {
  SHAKE_INCREMENT: 15,    // Per valid shake (was 8)
  BLOW_INCREMENT: 8,      // Per 100ms of blowing (was 3)
  DECAY_RATE: 1,          // Per 100ms of inactivity (was 2)
  DECAY_DELAY: 2000,      // ms before decay starts (was 1500)
};

// Animation timings
export const TIMING = {
  DUST_BURST_DURATION: 800,
  FROST_FADE_DURATION: 300,
  OPENING_DURATION: 1500,
  SENSOR_UPDATE_INTERVAL: 50,
};

// Colors
export const COLORS = {
  CAPSULE_TOP: '#FF6B6B',
  CAPSULE_BOTTOM: '#F5F5F5',
  CAPSULE_BAND: '#E0E0E0',
  DUST_GOLD: '#FFD700',
  DUST_SILVER: '#C0C0C0',
  FROST: 'rgba(200, 230, 255, 0.5)',
  PROGRESS_FILL: '#FFD700',
  PROGRESS_BG: 'rgba(255, 255, 255, 0.2)',
  GLOW: '#FFD700',
};

// State machine types
export type GachaBallPhase =
  | 'IDLE'
  | 'INTERACTING'
  | 'READY'
  | 'OPENING'
  | 'REVEALED'
  | 'COMPLETE';

// Gacha mode - which interaction is enabled
export type GachaMode = 'shake' | 'blow' | 'both';
