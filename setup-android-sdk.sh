#!/bin/bash
# Android SDK Setup Script for Windows (Git Bash)

SDK_DIR="$HOME/android-sdk"
TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"

echo "=== Android SDK Setup ==="
echo "Installing to: $SDK_DIR"

# Create directory
mkdir -p "$SDK_DIR"
cd "$SDK_DIR"

# Download command line tools
echo "Downloading Android SDK Command Line Tools..."
curl -L -o cmdline-tools.zip "$TOOLS_URL"

# Extract
echo "Extracting..."
unzip -q cmdline-tools.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
rm cmdline-tools.zip

# Set environment variables
echo ""
echo "=== Add these to your ~/.bashrc ==="
echo "export ANDROID_HOME=$SDK_DIR"
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin'
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools'
echo ""

# Install platform-tools (adb, fastboot)
echo "Installing platform-tools..."
export ANDROID_HOME="$SDK_DIR"
export PATH="$PATH:$SDK_DIR/cmdline-tools/latest/bin"
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

echo ""
echo "=== Setup Complete ==="
echo "Restart your terminal or run: source ~/.bashrc"
echo "Then verify with: adb devices"
