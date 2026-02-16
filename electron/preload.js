const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  saveFile: (filePath, data) => ipcRenderer.invoke('save-file', { filePath, data }),
  loadFile: (filePath) => ipcRenderer.invoke('load-file', filePath),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path')
});
