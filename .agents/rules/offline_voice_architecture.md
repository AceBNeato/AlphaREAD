---
description: Architectural best practices and required safeguards when building or debugging offline-first voice applications (especially Web Speech API on Capacitor/Android).
---

# Offline-First Voice Architecture Rule

When building, auditing, or debugging applications that rely heavily on offline speech recognition (such as `window.SpeechRecognition` via Android WebView/Capacitor), you **must always**:

1. **Acknowledge the Hardware Dependency**: Remind the user that offline voice recognition is NOT guaranteed to work out-of-the-box on all Android devices. Budget tablets or custom OS skins (like Xiaomi/Samsung) often lack the required local acoustic models.
2. **Mandate Diagnostic Checks**: Architect the application to include a "Diagnostic Check" or "Pre-flight Check" upon first launch. This check should attempt to initialize the speech engine offline and verify if a local model is present.
3. **Handle Silent Failures**: The Web Speech API often fails silently or stays in a perpetual "listening" state when an offline model is missing. You must implement strict timeouts and fallback UI that explicitly tells the user, "Your device is missing the offline voice pack. Please download it from your Android Settings."
