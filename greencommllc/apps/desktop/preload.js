// preload.js — runs in a privileged context before the renderer page loads.
// Exposes a minimal safe API to the renderer via contextBridge.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version:  process.versions.electron,
  // Renderer can call this to open a native save dialog via IPC (future use)
  // savePdf: (data) => ipcRenderer.invoke('save-pdf', data),
});
