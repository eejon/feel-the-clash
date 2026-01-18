# Booster Pets
Team: feel-the-clash

> A sensory gacha pet collection game that uses your phone's accelerometer and microphone to create an immersive pack-opening experience.

## What is it?

**Booster Pets** transforms the digital gacha experience into something physical and satisfying. Instead of just tapping buttons, you actually *shake* your phone to rattle the capsule and *blow* into the microphone to frost it open. Every interaction has weight, haptic feedback, and beautiful animations.

## Features

### Gacha Ball Capsule
- **Physics-based movement** - The capsule bounces around realistically as you shake
- **Shake detection** - Use your phone's accelerometer to rattle the capsule
- **Blow detection** - Blow into the microphone to create frost effects
- **Dust & glitter particles** - Visual feedback as you interact
- **Progress system** - Build up to 100% to crack it open

### Premium Pack Opening
- **Tear-to-open gesture** - Swipe down to physically tear the pack
- **Card cascade animation** - Cards fly in with satisfying spring physics
- **Tap-to-reveal mechanic** - Each card flips with anticipation
- **Rarity effects** - Legendary pulls trigger screen shake, glow, and sparkles
- **Horizontal gallery** - Review all your pulls in a sleek scrollable view

### Sensory Feedback
- **Haptic patterns** - Different vibrations for common vs legendary reveals
- **Sound design** - Audio cues for every interaction
- **Screen flash** - Epic visual feedback for rare pulls
- **Particle systems** - Ambient golden particles and card sparkles

## Tech Stack

- **React Native** with **Expo**
- **React Native Reanimated** - 60fps animations and physics
- **Expo Sensors** - Accelerometer for shake detection
- **Expo AV** - Microphone metering for blow detection
- **Expo Haptics** - Tactile feedback
- **React Native Gesture Handler** - Smooth touch interactions

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- Physical device recommended (shake/blow features require real sensors)

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running on Device

1. Install **Expo Go** on your phone
2. Scan the QR code from the terminal
3. Shake and blow to your heart's content!

## How to Play

1. **Earn Packs** - Complete shake or blow challenges with the gacha capsule
2. **Open Packs** - Tear open your packs and reveal 5 cards each
3. **Collect Pets** - Build your collection of adorable pets
4. **Chase Rarities** - Hunt for legendary 5-star pets with epic reveal animations

## Project Structure

```
app/
  (tabs)/           # Tab navigation screens
  gachaBall.tsx     # Shake/blow capsule mini-game
  packOpening.tsx   # Card pack opening experience
  game.tsx          # Additional game modes

components/
  gacha-ball/       # Capsule, dust, frost, progress ring
  pack-opening/     # Cards, effects, animations

constants/
  GameData.ts       # Pet definitions and rarity weights
  GachaBallConfig.ts
  PackOpeningConfig.ts

utils/
  storage.ts        # AsyncStorage for collection persistence
  sounds.ts         # Audio management
```

## Credits

Built with caffeine and determination for **Hack&Roll 2025**.

---

*Feel the anticipation. Feel the reveal. Feel The Clash.*
