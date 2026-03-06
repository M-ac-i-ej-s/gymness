# React Native GymProgress App - Setup Guide

A complete **React Native** port of the Android GymProgress app with a modern **iOS-style UI**.

## ✨ Features

- ✅ **Metoda Podwójnej Progresji** - Automatic weight progression
- ✅ **Inteligentne Rekomendacje** - Smart suggestions based on RIR
- ✅ **Real-time Firebase Sync** - Cloud sync across devices
- ✅ **Modern iOS Design** - Clean, spacious, native-looking UI
- ✅ **5 Tab Screens** - Exercise List, Details, Workouts, Progress, History
- ✅ **RIR Tracking** - Track Reps In Reserve for optimal intensity

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd gymness-rn
npm install
```

### 2. Configure Firebase

1. Get your Firebase config from [Firebase Console](https://console.firebase.google.com/)
2. Copy `.env.example` to `.env`
3. Fill in your Firebase credentials:
   ```
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
   ...
   ```

### 3. Run the App

```bash
npm start
```

Then press:

- `i` for iOS
- `a` for Android
- `w` for Web

For detailed testing instructions, **see [TESTING.md](./TESTING.md)** 👈

## 🧪 Quick Test

1. Start dev server: `npm start`
2. Scan QR code with **Expo Go** app (phone)
3. Create exercise → Log workout → Check progress

---

## 🏗️ Project Structure

```
src/
├── components/       # Reusable UI components
├── screens/         # 5 main app screens
├── services/        # Firebase & repository layer
├── store/           # State management (Context API)
├── theme/           # Colors and styling
├── types/           # TypeScript models
├── utils/           # Helpers (formatting, progression logic)
└── navigation/      # React Navigation setup
```

## 📱 Screens

| Screen        | Features                                      |
| ------------- | --------------------------------------------- |
| **Ćwiczenia** | List exercises, add new, start workout        |
| **Historia**  | View all past workouts grouped by date        |
| **Progres**   | Track weight progression with charts (future) |

## 🎨 Design System

Modern iOS aesthetic with:

- Clean typography (SF Pro Display style)
- Subtle shadows and borders
- Blue primary accent color
- Light gray backgrounds
- Proper spacing and padding

## 🔑 Key Differences from Android

| Android (Kotlin) | React Native |
| ---------------- | ------------ |

| Material 3 | iOS Human Interface Guidelines |
| Jetpack Compose | React Native + Expo |
| Firestore | Firebase JS SDK |
| MVVM ViewModel | Context API |

## 📝 Models

Same data models as Android version:

- `Exercise` - Individual exercises with current weight
- `WorkoutSet` - Single set with reps, weight, RIR
- `WorkoutSession` - Complete workout for an exercise
- `Workout` - Workout plan grouping multiple exercises

## 🔐 Firebase Setup

### Firestore Collections

```
exercises/
├── id: string (auto)
├── name: string
├── type: 'COMPOUND' | 'ISOLATION'
├── goal: 'HYPERTROPHY' | 'MAX_STRENGTH' | 'ENDURANCE'
├── currentWeight: number
├── targetSets: number
└── ...

workoutSessions/
├── id: string (auto)
├── exerciseId: string
├── date: Timestamp
├── sets: WorkoutSet[]
├── weight: number
└── ...

workouts/
├── id: string (auto)
├── name: string
├── exerciseIds: string[]
└── ...
```

### Firestore Rules (Test Mode)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // For development only!
    }
  }
}
```

## 🛠️ Tech Stack

- **React Native** 0.83+
- **Expo** 55+
- **React Navigation** 7+
- **Firebase** 12+
- **TypeScript** 5.9+

## 📚 Progression Logic

Same algorithm as Android:

- Detect when all sets hit **upper rep range limit**
- Check **RIR (Reps In Reserve)** - must be ≤1
- Auto-increase weight by:
  - **+2.5 kg** for Compound exercises
  - **+1.0 kg** for Isolation exercises

## 🎯 Next Steps

- [ ] Implement progress charts with react-native-svg
- [ ] Add Firebase Authentication (login/signup)
- [ ] Implement workout templates
- [ ] Add push notifications
- [ ] Build Android APK
- [ ] Build iOS Archive

## 📖 Documentation

See [android-app/README.md](../android-app/README.md) for full feature documentation.

## ❓ Troubleshooting

### Firebase Connection Failed

- Check `.env` file has correct credentials
- Verify Firestore Database is enabled
- Check Firebase rules allow test mode access

### App Crashes on Startup

- Run `npm install` to ensure all dependencies installed
- Delete `node_modules` and `npm install` again
- Check TypeScript compilation: `npx tsc --noEmit`

### Emulator Issues

- iOS: Make sure Xcode is installed (`xcode-select --install`)
- Android: Check Android SDK path and gradle version

## 📧 Notes

This is a faithful port of the Android app with:

- Same data models and progression logic
- Modern iOS visual style
- Full Firebase backend compatibility
- Drop-in replacement for the Kotlin version

Both apps write to the same Firestore database!
