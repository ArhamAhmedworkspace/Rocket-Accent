# 📦 Publishing to GitHub (2 minutes)

The repository here is already prepared and committed locally — `README.md`,
`LICENSE` (MIT), `.gitignore`, the Pages workflow and both game builds are in place.
Git is initialised and everything is committed on `main`.

I can't push for you: pushing needs **your** GitHub login, and I have no credentials
or browser session here. Run these three commands and it's live.

## 1 — Create the repo on GitHub

Go to **https://github.com/new**

- Repository name: `rocket-ascent` (or anything you like)
- Visibility: **Public**
- **Leave every checkbox unticked** (no README, no .gitignore, no license — they're already here)

Click **Create repository**. GitHub then shows a URL like:

```
https://github.com/YOUR-USERNAME/rocket-ascent.git
```

## 2 — Push from this workspace

```bash
cd /home/user/nova-ascent
git remote add origin https://github.com/YOUR-USERNAME/rocket-ascent.git
git branch -M main
git push -u origin main
```

If GitHub asks for a password, use a **Personal Access Token**
(GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic),
tick `repo`), not your account password.

## 3 — Turn on GitHub Pages (optional, plays in the browser)

Repo → **Settings** → **Pages** → Source: **GitHub Actions**.
The workflow in `.github/workflows/pages.yml` rebuilds both editions on every push and
publishes them at:

```
https://YOUR-USERNAME.github.io/rocket-ascent/          ← PC edition
https://YOUR-USERNAME.github.io/rocket-ascent/mobile.html   ← touch edition
```

Phones that open the root URL are bounced to the touch edition automatically.

## What gets uploaded

- `index.html` — PC edition (230 KB, single file)
- `mobile.html` — mobile edition (241 KB, single file)
- `src/` — the modular sources both editions are built from
- `app/` — Electron shell for the offline desktop build
- `docs/` — screenshots
- Not uploaded: the 97 MB Windows zip and `node_modules` (see `.gitignore`).
  Attach the zip to a **Release** instead: Repo → Releases → Create a new release →
  drag `Rocket-Ascent-Windows-x64.zip` in.
