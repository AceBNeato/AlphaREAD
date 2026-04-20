---
description: Build Android APK with Capacitor and wireless debugging
---

# Capacitor Android Build & Wireless Debugging Workflow

## Prerequisites
- Android Studio installed
- Android SDK with API level 33+ 
- USB cable for initial setup (or existing ADB pairing)
- Phone and computer on same WiFi network

## Step 1: Add Android Platform

```bash
npm install @capacitor/android --save-exact
npx cap add android
```

## Step 2: Build Web App & Sync

```bash
npm run build
npx cap sync android
```

## Step 3: Wireless Debugging Setup

### Initial USB Setup (one-time):
1. Enable **Developer Options** on phone (tap Build Number 7x)
2. Enable **USB Debugging**
3. Connect phone via USB
4. In terminal run:
```bash
adb devices  # Verify phone connected
```

### Enable Wireless Debugging:
1. On phone: Developer Options → Wireless Debugging → Enable
2. Tap "Pair code with pairing code"
3. On computer:
```bash
adb pair <PHONE_IP>:<PORT>
# Enter the 6-digit pairing code from phone
```

### Connect Wirelessly:
```bash
adb connect <PHONE_IP>:<PORT>
adb devices  # Should show device wirelessly
```

## Step 4: Build APK

### Debug APK (quick install):
```bash
cd android
./gradlew assembleDebug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (signed):
1. Generate keystore (one-time):
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias alias_name -keyalg RSA -keysize 2048 -validity 10000
```

2. Create `android/app/my-release-key.keystore` and update `build.gradle`

3. Build:
```bash
./gradlew assembleRelease
```

## Step 5: Install on Phone

### Via ADB (wireless):
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Via file transfer:
1. Transfer APK to phone (Bluetooth, email, cloud)
2. On phone: Enable "Install unknown apps" for file manager
3. Tap APK to install

## Useful Commands

```bash
# Check connected devices
adb devices

# View logs
adb logcat

# Open Android Studio
code android  # or: npx cap open android

# Live reload during development
npm run dev
npx cap run android --livereload --external
```

## Troubleshooting

- **Device not found**: Same WiFi network, firewall blocking port 5555
- **Install fails**: Uninstall old app first, or use `adb install -r`
- **Build fails**: Check `npx cap sync` was run after web build
