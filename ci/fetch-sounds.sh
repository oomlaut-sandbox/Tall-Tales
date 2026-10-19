#!/usr/bin/env bash
# Downloads the sounds listed in ci/sound-sources.json from BigSoundBank (CC0), and saves its search pages so new
# candidates can be picked. Output: sounds-out/<name>.mp3 and sounds-out/search-<q>.html
set -u
mkdir -p sounds-out
node -e '
const s=require("./ci/sound-sources.json");
for (const [n,id] of Object.entries(s.sounds)) console.log("S "+n+" "+id);
for (const q of s.searches) console.log("Q "+q);
for (const [n,u] of Object.entries(s.urls||{})) console.log("U "+n+" "+u);
' | while read kind a b; do
  if [ "$kind" = S ]; then
    curl -sfL --connect-timeout 20 --max-time 120 -A "Mozilla/5.0" -o "sounds-out/$a.mp3" "https://bigsoundbank.com/UPLOAD/mp3/$(printf '%04d' "$b").mp3" \
      || curl -sfL --connect-timeout 20 --max-time 120 -A "Mozilla/5.0" -o "sounds-out/$a.mp3" "https://bigsoundbank.com/UPLOAD/mp3/$b.mp3" \
      || echo "failed $a"
  elif [ "$kind" = U ]; then
    curl -sfL --connect-timeout 20 --max-time 120 -A "Mozilla/5.0" -o "sounds-out/$a.mp3" "$b" || echo "failed $a"
  else
    curl -sfL --connect-timeout 20 --max-time 120 -A "Mozilla/5.0" -o "sounds-out/search-$a.html" "https://bigsoundbank.com/search?q=$a" || echo "search failed $a"
  fi
done
ls -la sounds-out
