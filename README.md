# 🚀 ROCKET ASCENT — Rocket Works

> A rocket work game for mobile and PC — one repo, two editions.

A single-file, offline rocket-building arcade game. Buy parts, bolt on boosters,
launch, steer past enemies and bosses, and climb a **100-level campaign** from the
pad to the Void Tyrant.

**Play it now (no install):**
[https://arhamahmedworkspace.github.io/Rocket-Accent/](https://arhamahmedworkspace.github.io/Rocket-Accent/) — PC ·
[https://arhamahmedworkspace.github.io/Rocket-Accent/mobile.html](https://arhamahmedworkspace.github.io/Rocket-Accent/mobile.html) — mobile
(phones are redirected to the touch edition automatically)

Two editions ship from the same source:

| File | For | Controls |
|---|---|---|
| **`index.html`** | PC / desktop | Keyboard (A/D, Shift/Ctrl, Space), mouse |
| **`mobile.html`** | Phones / tablets | Touch joystick, swipe throttle, on-screen buttons |

Open either file in a browser — no install, no network, no build step.
On the web, phones are routed to `mobile.html` automatically.

---

## 📥 Downloads (installable builds)

| Platform | File | Size | Notes |
|---|---|---|---|
| **Android** | `Rocket-Ascent-v1.0.0.apk` | 90 KB | Real installable app. Android 7.0+ (API 24), target SDK 34, forces landscape, immersive fullscreen, screen stays awake, saves to `localStorage`. Signed with the project key. |
| **Windows** | `Rocket-Ascent-Windows-x64-v1.0.0.zip` | 97 MB | Offline desktop app. Unzip the folder and run **Rocket Ascent.exe** — no install, no internet. |

Both live on the **[latest release](https://github.com/ArhamAhmedworkspace/Rocket-Accent/releases/latest)**.
On Android, the first install asks you to allow installs from unknown sources — that is normal for
a self-signed APK (SHA-256 `5b5b1f72…`).

Rebuild the APK any time with `bash tools/build-apk.sh` (see `tools/apk-env.sh` to recreate the
Android toolchain).

## 🎮 Controls

### PC (keyboard)
| Action | Keys |
|---|---|
| Steer | `A` / `D` or `←` / `→` |
| Throttle up / down | `Shift` / `Ctrl` |
| Fire | `Space` (hold) |
| Engine master switch | `E` |
| Pause | `Esc` or `P` |
| Mute | `M` |
| Fullscreen | `F` or `F11` |
| Dev console | `F1` |

### Mobile (touch)
- **Left joystick** — drag to steer (works like A/D)
- **Right throttle strip** — swipe up to add power, down to cut it; the bar shows %
- **🔥 FIRE** — hold to shoot
- **AUTO ✸** — auto-fire toggle (keeps the guns talking)
- **ENG ⏻** — engine master switch
- **⏸ PAUSE** — pause
- **Double-tap** the screen — dev console (phones have no F1 key)

---

## 🛰️ What's in the game

- **Hangar** — 8 racks: Nose, **Missile**, Tank, Engine, Fins, Weapon, Module, Hull
- **Depot** — Buy Parts · Upgrade Bench (Mk I–IV) · Stage Bay · Ammo Lab · Chutes · **Shipyard**
- **Missile rack** — five launcher types that home onto targets on their own cooldown
- **Ship skins** — 7 liveries, each with **its own staging** (e.g. *Space Shuttle*: SRB pair + external tank, orbiter left, tank right)
- **Stages** — strap-on boosters burn in order and separate when dry, shedding dead mass
- **100-level campaign** — every level has a gate boss; **levels 1–20** are bigger bosses with rockets + lasers, **levels 21–100** pull the mothership trick (bait boss → mothership launches escort waves → then it turns and fights)
- **Achievements, contracts, leaderboard, offline desktop app (Electron)**

---

## 🛠️ Dev console (F1 / double-tap)

All switches default to **OFF**.
- UNLOCK ALL PARTS · NO DAMAGE · INFINITE FUEL · INF ROCKET POINTS · INF ROCKET SCIENCE
- CLEAR ALL POINTS — zeroes currency only, never your progress
- UNLOCK ALL LEVELS — opens all 100
- RESET ALL LEVELS TO 1 — wipes campaign progress back to level 1 (two-click confirm)

---

## 📁 Repo layout

```
src/head.html        markup + CSS (shared by both editions)
src/js1-data.js      parts, missile rack, skins, stats, save/profile
src/js2-ui.js        hangar, depot, shipyard, rocket drawing
src/js3-flight.js    flight model, input, enemies, bosses
src/js4-render.js    world/HUD rendering, screens, wiring
src/js5-campaign.js  100 levels, gate bosses, mothership trick, save hygiene
src/js6-mobile.js    touch controls (mobile edition only)
src/mobile-ui.html   touch UI markup + styles (mobile edition only)
build.sh             builds index.html + mobile.html from src/
app/                 Electron shell (offline desktop build)
docs/                screenshots
```

## 🔨 Building

```bash
bash build.sh        # → index.html (PC) + mobile.html (touch) + app/game.html
```

Desktop app (optional):

```bash
cd app && npm install && npm run dist:win     # Windows x64 folder + exe
```

## 🌐 GitHub Pages

`.github/workflows/pages.yml` builds both editions on every push to `main` and
publishes them: the PC edition at the site root, the touch edition at `/mobile.html`.

## 📄 License

MIT — see [LICENSE](LICENSE).
