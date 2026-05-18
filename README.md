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

5. **Build web assets and APK** (run all together every time you make changes):
  
   echo 'export JAVA_HOME="/c/Program Files/Java/jdk-21.0.10"' >> ~/.bashrc
   echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   
   npm run build
   npx cap sync android 
   cd android
   ./gradlew assembleDebug
   cd ..
   npx cap run android

   APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

   > **Important:** `npm run build` compiles your code, `cap sync` copies it into the Android project, and Gradle packages it into the `.apk`. All three steps are needed — skipping Gradle means the APK on your phone is still the old one.

### Wireless Debugging (Install APK
 on Phone)

> **One-time setup:** Add `adb` to your Git Bash PATH permanently:
> ```bash
> echo 'export PATH=$PATH:/c/Users/ThinkPad/android-sdk/platform-tools' >> ~/.bashrc
> source ~/.bashrc
> ```

1. **Enable Developer Options** on your Android phone (tap Build Number 7x)
2. **Enable Wireless Debugging**: Developer Options → Wireless Debugging → Enable
3. **Pair and connect**:
   ```bash
   adb pair <PHONE_IP>:<PAIRING_PORT>
   adb connect <PHONE_IP>:<CONNECTION_PORT>
   adb devices
   ```
4. **Install APK**:
   
   ```bash
   cd ..
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Alternative: Transfer APK Manually

If wireless debugging doesn't work, copy the APK to your phone via:
- USB cable
- Bluetooth
- Email/Google Drive
- WhatsApp/Telegram

Then tap the APK on your phone to install (enable "Install unknown apps" if prompted).