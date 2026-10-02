/* ROCKET ASCENT — desktop shell.
   Loads the game from disk (file://) — zero network at runtime.           */
const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

const SHOT = process.env.NOVA_SHOT;          // dev/self-test: capture & quit
let win = null;
let externalRequests = 0;

if (!app.requestSingleInstanceLock()) { app.quit(); }

/* Keep saves stable across app renames: reuse whichever save folder already exists
   (old "Nova Ascent" builds wrote to a different userData dir than this one).   */
{
  const appData = app.getPath('appData');
  const cands = ['Rocket Ascent', 'ROCKET ASCENT - Rocket Works', 'nova-ascent', 'NOVA ASCENT - Rocket Works'];
  let chosen = null;
  for (const c of cands) {
    const ls = path.join(appData, c, 'Local Storage');
    if (fs.existsSync(ls)) { chosen = path.join(appData, c); break; }
  }
  app.setPath('userData', chosen || path.join(appData, cands[0]));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 940, minHeight: 580,
    title: 'ROCKET ASCENT — Rocket Works',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#05070f',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  /* prove offline-ness: count anything that is not a local file */
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => {
    if (!/^(file|devtools|chrome-extension):/.test(d.url)) { externalRequests++; console.log('[net] BLOCKED-OR-COUNTED:', d.url); }
    cb({});
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'game.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));   // no pop-ups, no navigation away
  win.on('enter-full-screen', () => win.webContents.send('fs', true));
  win.on('leave-full-screen', () => win.webContents.send('fs', false));

  if (SHOT) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const img = await win.webContents.capturePage();
          const out = process.env.NOVA_SHOT_OUT || path.join(__dirname, '..', 'docs', '40-desktop-app.png');
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, img.toPNG());
          console.log('[shot] wrote', out);
        } catch (e) { console.log('[shot] failed', e.message); }
        console.log('[net] external requests during run:', externalRequests);
        app.quit();
      }, 3000);
    });
  }
}

ipcMain.handle('fs-toggle', () => {
  if (!win) return false;
  win.setFullScreen(!win.isFullScreen());
  return win.isFullScreen();
});

app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate([
    { label: 'Game', submenu: [
        { label: 'Toggle Fullscreen', accelerator: 'F11', click: () => win && win.setFullScreen(!win.isFullScreen()) },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => win && win.reload() },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Rocket Ascent' }
    ]},
    { label: 'View', submenu: [
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
        { role: 'togglefullscreen', label: 'Fullscreen' }
    ]}
  ]);
  Menu.setApplicationMenu(menu);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => app.quit());
