# 📦 Publish to https://github.com/ArhamAhmedworkspace/Rocket-Accent

The repo on GitHub is **public** and currently holds only GitHub's auto-generated
`README.md`. Everything below is already built, committed locally on branch `main`,
and waiting to go up:

```
index.html      PC edition        230 KB   keyboard + mouse
mobile.html     MOBILE edition    241 KB   joystick, swipe throttle, touch buttons
src/            shared sources both editions build from
app/            Electron shell (offline desktop build)
.github/        Pages workflow      docs/  screenshots
README.md  LICENSE (MIT)  .gitignore  build.sh
```

---

## ⚡ Fastest: paste a token, I push it (≈10 seconds)

GitHub stopped accepting account passwords for git — it needs a **token**.

1. Open **https://github.com/settings/tokens**
2. **Generate new token → Generate new token (classic)**
3. Note: `rocket-ascent`, tick **`repo`**, Generate
4. **Copy it** and paste it in the chat

I push everything (including the Pages setup) the moment it arrives. The token is
used once for that push and never written to any file.

If you'd rather run it yourself:

```bash
cd /home/user/nova-ascent
git remote add origin https://ArhamAhmedworkspace:YOUR_TOKEN@github.com/ArhamAhmedworkspace/Rocket-Accent.git
git push -u origin main
```

---

## 🖐️ No token: upload by hand (≈2 minutes, no credentials at all)

1. Download **`rocket-ascent-lean.zip`** (1.1 MB, 27 files — everything that matters,
   incl. 4 screenshots) or **`rocket-ascent-upload.zip`** (12 MB, 98 files — adds the
   full `docs/` gallery).
2. Extract it on your computer and open the extracted folder.
3. On GitHub, open **ArhamAhmedworkspace/Rocket-Accent → Add file → Upload files**
4. Drag **all** the extracted files and folders in (`src`, `.github`, `app`, `docs`,
   `index.html`, `mobile.html`, `README.md`, `LICENSE`, `.gitignore`, `build.sh`).
   GitHub keeps the folder structure and lets you rename/move `README.md` over theirs
   on the commit screen.
5. Commit directly to `main`.

---

## 🌐 GitHub Pages (play straight in the browser)

Repo → **Settings → Pages → Source: GitHub Actions**.
`.github/workflows/pages.yml` rebuilds both editions on every push and publishes:

```
https://arhamahmedworkspace.github.io/Rocket-Accent/           ← PC edition
https://arhamahmedworkspace.github.io/Rocket-Accent/mobile.html ← touch edition
```

Phones that open the root URL are bounced to the touch edition automatically.

## 🪟 Windows build

`Rocket-Ascent-Windows-x64.zip` (97 MB) is git-ignored — too big for a commit.
Attach it to a **Release** instead: Releases → Create a new release → drag the zip in.
