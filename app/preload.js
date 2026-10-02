/* Tiny, sandboxed bridge: exposes ONLY fullscreen control to the game page. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isApp: true,
  toggleFullscreen: () => ipcRenderer.invoke('fs-toggle'),
  onFullscreenChange: (cb) => ipcRenderer.on('fs', (_e, v) => cb(v))
});
