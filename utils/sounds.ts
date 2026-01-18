import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';

// Sound file imports (mp3 preferred for faster loading)
const SOUND_FILES = {
  packOpen: require('@/assets/sound-effects/pack-open.m4a'),
  legendary: require('@/assets/sound-effects/legendary.mp3'),
  epic: require('@/assets/sound-effects/epic.mp3'),
  rare: require('@/assets/sound-effects/rare.mp3'),
  gacha: require('@/assets/sound-effects/gacha.mp3'),
  default: require('@/assets/sound-effects/default.mp3'),
};

// Cache for loaded sounds
const soundCache: Map<string, Sound> = new Map();

// Initialize audio mode
let audioInitialized = false;

async function initAudio() {
  if (audioInitialized) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    audioInitialized = true;
  } catch (error) {
    console.warn('Failed to initialize audio:', error);
  }
}

// Preload a sound
async function preloadSound(key: keyof typeof SOUND_FILES): Promise<Sound | null> {
  try {
    await initAudio();

    if (soundCache.has(key)) {
      return soundCache.get(key)!;
    }

    const { sound } = await Audio.Sound.createAsync(SOUND_FILES[key], {
      shouldPlay: false,
    });

    soundCache.set(key, sound);
    return sound;
  } catch (error) {
    console.warn(`Failed to preload sound ${key}:`, error);
    return null;
  }
}

// Play a sound
async function playSound(key: keyof typeof SOUND_FILES, volume: number = 1.0): Promise<void> {
  try {
    await initAudio();

    let sound = soundCache.get(key);

    if (!sound) {
      const loaded = await preloadSound(key);
      if (loaded) {
        sound = loaded;
      }
    }

    if (sound) {
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(volume);
      await sound.playAsync();
    }
  } catch (error) {
    console.warn(`Failed to play sound ${key}:`, error);
  }
}

// Preload all gacha ball sound
export async function preloadGachaBallSound(): Promise<void> {
  await Promise.all([
    preloadSound('gacha'),
  ]);
}
// Play gacha ball sound
export async function playGachaBallSound(): Promise<void> {
  await playSound('gacha', 1.0);
}

// Preload all pack opening sounds
export async function preloadPackOpeningSounds(): Promise<void> {
  await Promise.all([
    preloadSound('packOpen'),
    preloadSound('legendary'),
    preloadSound('epic'),
    preloadSound('rare'),
    preloadSound('default'),
  ]);
}

// Play pack opening sound
export async function playPackOpenSound(): Promise<void> {
  await playSound('packOpen', 0.8);
}

// Play card reveal sound based on rarity
export async function playRevealSound(rarity: number): Promise<void> {
  switch (rarity) {
    case 5:
      await playSound('legendary', 1.0);
      break;
    case 4:
      await playSound('epic', 0.9);
      break;
    case 3:
      await playSound('rare', 0.8);
      break;
    default:
      // Default sound for common/uncommon cards (rarity 1-2)
      await playSound('default', 0.6);
      break;
  }
}

// Cleanup sounds (call when leaving screen)
export async function unloadSounds(): Promise<void> {
  for (const sound of soundCache.values()) {
    try {
      await sound.unloadAsync();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  soundCache.clear();
}
