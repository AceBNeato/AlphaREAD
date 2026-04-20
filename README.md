# Comms for Edu

This is a code bundle for Comms for Edu. The original project is available at https://www.figma.com/design/8LRrB0HDdpdyAzJ8B5mIL1/Comms-for-Edu.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Building Mobile App (Android APK)

This project uses Capacitor to build Android APKs.

### Prerequisites

- Android SDK (automatically installed by setup script)
- JDK 17+ (included with Android Studio or standalone)

### Quick Setup

1. **Install Capacitor dependencies**:
   ```bash
npm install @capacitor/core @capacitor/cli @capacitor/android --save-exact
```

2. **Initialize Capacitor** (one-time):
   ```bash
npx cap init "Alphabet GO" com.commsforedu.alphabetgo --web-dir dist
```

3. **Setup Android SDK** (one-time):
   ```bash
bash setup-android-sdk.sh
```
   This downloads the Android SDK to `~/android-sdk`.

4. **Add Android platform**:
   ```bash
npx cap add android
```

5. **Build web assets**:
   ```bash
npm run build
npx cap sync android
```

6. **Build APK**:
   ```bash
cd android
bash gradlew assembleDebug
```
   APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Wireless Debugging (Install APK on Phone)

1. **Enable Developer Options** on your Android phone (tap Build Number 7x)
2. **Enable Wireless Debugging**: Developer Options → Wireless Debugging → Enable
3. **Pair and connect**:
   ```bash
export ANDROID_HOME=/c/Users/ThinkPad/android-sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Get pairing code from phone screen
adb pair <PHONE_IP>:<PAIRING_PORT>

# Connect to device
adb connect <PHONE_IP>:<CONNECTION_PORT>

# Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Alternative: Transfer APK Manually

If wireless debugging doesn't work, copy the APK to your phone via:
- USB cable
- Bluetooth
- Email/Google Drive
- WhatsApp/Telegram

Then tap the APK on your phone to install (enable "Install unknown apps" if prompted).