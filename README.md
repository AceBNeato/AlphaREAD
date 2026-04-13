# AlphabetGO

An interactive alphabet learning app for children, built with React and Capacitor. Features letter recognition games, voice practice, and syllable building exercises.

- **Live Demo**: [Figma Design](https://www.figma.com/design/8LRrB0HDdpdyAzJ8B5mIL1/Comms-for-Edu)

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | React 18, Vite 6, TypeScript |
| **Mobile** | Capacitor 8 (Android & iOS) |
| **UI** | Tailwind CSS 4, Radix UI, MUI |
| **Speech** | Capacitor Speech Recognition |
| **State** | React Context, React Router |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Java JDK 21 (for Android builds)
- Android SDK (for Android builds)

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## Android Build & Deploy

### 1. Configure Environment

```bash
export JAVA_HOME="C:/Program Files/Java/jdk-21.0.10"
export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

### 2. Pair Device (Wireless Debugging)

**On your Android phone:**
1. Enable **Developer Options → Wireless Debugging**
2. Tap **"Pair with pairing code"**
3. Note the **IP:Port** and **pairing code**

**On PC:**
```bash
# Pair (use IP:PORT from your phone)
adb pair 10.0.254.3:42073
# Enter pairing code when prompted

# Connect
adb connect 10.0.254.3:5555
```

### 3. Build APK

```bash
npm run build          # Build web assets
npx cap sync           # Sync to Android project
cd android
./gradlew clean        # Clean previous builds
./gradlew assembleDebug  # Build debug APK
```

### 4. Install to Device

```bash
# Check connected devices
adb devices

adb disconnect adb-13159704BC001106-QdgLN9._adb-tls-connect._tcp 

# Install to specific device
adb -s 10.0.254.3:34519 install android/app/build/outputs/apk/debug/app-debug.apk

# Or install to single connected device
cd ..
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## One-Command Deploy

Rebuild and reinstall in one step:

```bash
npm run build && npx cap sync && cd android && ./gradlew assembleDebug && cd .. && adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `adb: command not found` | Export environment variables first |
| `device not found` | Check `adb devices` and unlock phone screen |
| `more than one device` | Use `-s IP:PORT` to specify target device |
| Connection refused | Re-pair device (wireless session expired) |