# 📤 Uploading the downloads (no token needed)

Both installable builds are already built and sitting in **`dist/`**:

```
dist/Rocket-Ascent-v1.0.0.apk                  90 KB   Android 7.0+ (API 24)
dist/Rocket-Ascent-Windows-x64-v1.0.0.zip      97 MB   Windows x64, unzip → Rocket Ascent.exe
```

## Put them on the Releases page (≈1 minute)

1. Open **https://github.com/ArhamAhmedworkspace/Rocket-Accent/releases/new**
2. **Choose a tag** → type `v1.0.0` → *Create new tag*
3. Release title: `Rocket Ascent v1.0.0`
4. In the big *Attach binaries* box, **drag both files** from `dist/` (the APK first, then the
   97 MB zip — GitHub accepts up to 2 GB per file, so the zip is fine)
5. Paste the notes below (optional), tick **Set as the latest release**, then **Publish release**

### Suggested release notes

```
## Rocket Ascent v1.0.0

Build rockets, launch, and fight through a 100-level campaign.

**Downloads**
- `Rocket-Ascent-v1.0.0.apk` — Android app (Android 7.0+, 90 KB!). Touch joystick + swipe throttle.
- `Rocket-Ascent-Windows-x64-v1.0.0.zip` — Windows desktop app. Unzip, run `Rocket Ascent.exe`.
- Nothing to install? Just play in the browser:
  https://arhamahmedworkspace.github.io/Rocket-Accent/

**Android note:** allow "install from unknown sources" when prompted — the APK is self-signed
(SHA-256 `5b5b1f72…`).

**What's inside**
- 8-part hangar, upgrade bench, stage bay, ammo lab, missile rack, 7 ship skins with their own staging
- Space-shuttle skin: two boosters + external tank, sequenced separation
- 100 campaign levels with gate bosses and trick mothership fights at levels 21-100
- Touch edition: analogue joystick, swipe throttle, auto-fire, engine switch, pause
- PC edition: keyboard (A/D, Shift/Ctrl, Space) — a genuinely separate build
```

## Rebuilding later

```bash
cd /home/user/nova-ascent
bash build.sh            # rebuilds index.html + mobile.html from src/
bash tools/apk-env.sh    # recreates the Android toolchain in /var/tmp (only needed once per sandbox)
bash tools/build-apk.sh  # repackages mobile.html → dist/Rocket-Ascent-v1.0.0.apk
```

The APK is a ~3 KB native WebView shell (`tools/apk-project/`) with `mobile.html` bundled as an
asset — bump `versionCode`/`versionName` in `tools/apk-project/AndroidManifest.xml` before
repackaging a new version.
