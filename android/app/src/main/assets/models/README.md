# Vosk Model Setup Instructions

1. Download the Vosk English small model from: https://alphacephei.com/vosk/models
2. Look for: "vosk-model-small-en-us-0.15.zip" (approximately 40MB)
3. Extract the ZIP file
4. Copy the extracted folder contents to this directory (android/app/src/main/assets/models/)
5. The final structure should be:
   - android/app/src/main/assets/models/vosk-model-small-en-us-0.15/
     - am/
     - conf/
     - graph/
     - rescore/
     - README
     - model.tar.gz
     - ... (other model files)

6. After placing the model files, rebuild the Android app:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

The app will automatically detect and use the Vosk model for Level 1 speech recognition.
