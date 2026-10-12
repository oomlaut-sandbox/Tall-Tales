#!/usr/bin/env bash
# Runs on GitHub Actions. Installs packages, bundles the app for iOS, Android and web,
# and writes logs to out/ so the results can be read from the ci-output branch.
set -u
mkdir -p out
summary=out/summary.txt
: > "$summary"
step() { # step <name> <command...>
  local name="$1"; shift
  echo "== $name" | tee -a out/log.txt
  if "$@" >> out/log.txt 2>&1; then echo "PASS $name" >> "$summary"; else echo "FAIL $name" >> "$summary"; fi
}

if [ -f package-lock.json ]; then
  step install npm ci --no-audit --no-fund
  step install-new npx expo install expo-file-system expo-image-picker
else
  step install-expo npm install --no-audit --no-fund expo@latest
  step install-deps npx --yes expo install react react-dom react-native react-native-web @expo/metro-runtime \
    expo-status-bar expo-speech expo-audio expo-font react-native-safe-area-context \
    @shopify/react-native-skia @expo-google-fonts/eb-garamond
fi
step doctor-versions npx expo install --check
step bundle-ios npx expo export --platform ios --output-dir build-ios
step bundle-android npx expo export --platform android --output-dir build-android
step bundle-web npx expo export --platform web --output-dir out/web

cp package.json out/package.json
[ -f package-lock.json ] && cp package-lock.json out/package-lock.json
npm ls --depth=0 > out/packages.txt 2>&1 || true
echo "commit ${GITHUB_SHA:-local} at $(date -u)" >> "$summary"
exit 0
