# 🖥 ROCKET ASCENT — Desktop App (offline)

A thin **Electron** shell around the same single-file game. It loads `game.html`
straight from disk over `file://` — **no network, no server, no browser needed** at runtime.
The window is sandboxed (`nodeIntegration: false`, `contextIsolation: true`); the page only gets a
tiny bridge for native fullscreen.

## Run it

```bash
cd app
npm install        # ONE time, needs internet to fetch Electron itself
npm start          # after this: fully offline, forever
```

- **Fullscreen:** the ⛶ button on the title / hangar / pause screens, or `F11` / `F` in game,
  or the window menu. It uses the *native* window fullscreen (not the browser API).
- Save data persists between launches (Electron's local storage).
- `npm run shot` boots the app headlessly, screenshots it to `../docs/40-desktop-app.png`
  and prints how many external network requests were made (should be `0`).

## Ship a real .exe / portable app

A ready-made Windows build is already in the repo root:
**`../Nova-Ascent-Windows-x64.zip`** (≈97 MB). Unzip anywhere and double-click
**`Nova Ascent.exe`** — no install, no internet, runs from a USB stick if you like.
(First run on Windows may show a SmartScreen "unknown publisher" notice because the exe is
unsigned — click *More info → Run anyway*.)

To rebuild it (from this folder, works on Linux/macOS/Windows):

```bash
npm run dist:win     # @electron/packager → dist-win/Nova Ascent-win32-x64/Nova Ascent.exe
```

then zip the folder. The exe carries the game icon (`assets/icon.ico`) and version metadata;
the window icon comes from `assets/icon.png`.

Other targets:

```bash
npx @electron/packager@19 . "Nova Ascent" --overwrite \
    --platform=darwin --arch=universal --icon=assets/icon.png   # macOS
npx @electron/packager@19 . "Nova Ascent" --overwrite \
    --platform=linux  --arch=x64                               # Linux
```

The output folder is self-contained — copy it to any machine and run it with **no internet**.

## No-Node fallback

`../index.html` is the entire game in one file: double-clicking it in any browser also works
completely offline (save data falls back to memory if storage is blocked).
