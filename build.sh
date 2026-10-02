#!/usr/bin/env bash
# Rebuilds the single-file game from src/
#   index.html  → PC / desktop edition (keyboard + mouse)
#   mobile.html → mobile edition (touch joystick, swipe throttle, on-screen buttons)
set -e
cd "$(dirname "$0")"

CORE="src/js1-data.js src/js2-ui.js src/js3-flight.js src/js4-render.js src/js5-campaign.js"
CLOSE=$(printf '\n</script>\n</body>\n</html>\n')

# ---------- PC edition ----------
cat src/head.html $CORE > index.html
printf '%s' "$CLOSE" >> index.html

# ---------- MOBILE edition: inject touch UI before <script>, append mobile JS --
python3 - <<'PY'
head = open('src/head.html').read()
mob  = open('src/mobile-ui.html').read()
assert '<script>' in head, 'head.html: no <script> tag to inject before'
open('mobile.html','w').write(head.replace('<script>', mob + '\n<script>', 1))
PY
cat $CORE src/js6-mobile.js >> mobile.html
printf '%s' "$CLOSE" >> mobile.html

mkdir -p app
cp index.html app/game.html
echo "built index.html ($(wc -c < index.html) bytes) + mobile.html ($(wc -c < mobile.html) bytes) + app/game.html"
