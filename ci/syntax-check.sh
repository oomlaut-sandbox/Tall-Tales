#!/bin/bash
# A quick syntax check of every source file (esbuild, JSX). Prints "BAD <file>" with the error for any that fail.
# Usage: bash ci/syntax-check.sh   (from the repo root; needs esbuild: /opt/npm-tools or `npx esbuild`)
cd "$(dirname "$0")/.."
EB=/opt/npm-tools/node_modules/.bin/esbuild; [ -x "$EB" ] || EB="npx --yes esbuild"
ERR=$(mktemp)
for f in App.js src/*.js src/components/*.js src/screens/*.js; do $EB --loader:.js=jsx --log-level=error "$f" >/dev/null 2>"$ERR" || { echo "BAD $f"; head -8 "$ERR"; }; done
rm -f "$ERR"; echo checked
