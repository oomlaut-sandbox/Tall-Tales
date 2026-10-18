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
  step install-new npx expo install expo-file-system expo-image-picker expo-print expo-sharing expo-asset @expo-google-fonts/dancing-script react-native-reanimated react-native-worklets expo-screen-orientation expo-apple-authentication @supabase/supabase-js react-native-url-polyfill expo-image-manipulator expo-splash-screen expo-system-ui expo-blur expo-linear-gradient @expo-google-fonts/special-elite react-native-purchases
else
  step install-expo npm install --no-audit --no-fund expo@latest
  step install-deps npx --yes expo install react react-dom react-native react-native-web @expo/metro-runtime \
    expo-status-bar expo-speech expo-audio expo-font react-native-safe-area-context \
    @shopify/react-native-skia @expo-google-fonts/eb-garamond
fi
step fix-versions npx expo install --fix
step doctor-versions npx expo install --check

# Expo account link (needs the EXPO_TOKEN secret). Never prints the token.
if [ -n "${EXPO_TOKEN:-}" ]; then
  if npx --yes eas-cli@latest whoami > out/expo-account.txt 2>&1; then echo "PASS expo-login" >> "$summary"; else echo "FAIL expo-login" >> "$summary"; fi
  if ! grep -q '"projectId"' app.json; then
    step expo-init npx --yes eas-cli@latest init --non-interactive --force
  fi
  cp app.json out/app.json
else
  echo "SKIP expo-login (no EXPO_TOKEN secret)" >> "$summary"
fi
# catches names used but never defined (a launch crash the bundler doesn't notice)
step undefined-names npx --yes eslint@8.57.0 --no-eslintrc --parser-options=ecmaVersion:2022 --parser-options=sourceType:module --parser-options=ecmaFeatures:{jsx:true} --env browser,es2022,node --global __DEV__ --rule 'no-undef:error' App.js src
step bundle-ios npx expo export --platform ios --output-dir build-ios
step bundle-android npx expo export --platform android --output-dir build-android
step bundle-web npx expo export --platform web --output-dir out/web

# reference: Skia's drawing component settings (used by the page curl)
grep -rn -A12 "interface VerticesProps\|interface ImageShaderProps" node_modules/@shopify/react-native-skia/lib/typescript/src/dom/types/ > out/skia-props.txt 2>&1 || true
grep -rn "matrix?:\|type InputMatrix\|type Matrix4 \|export type Transforms3d" node_modules/@shopify/react-native-skia/lib/typescript/src/ >> out/skia-props.txt 2>&1 || true
cp package.json out/package.json
[ -f package-lock.json ] && cp package-lock.json out/package-lock.json
npm ls --depth=0 > out/packages.txt 2>&1 || true
echo "commit ${GITHUB_SHA:-local} at $(date -u)" >> "$summary"
exit 0
