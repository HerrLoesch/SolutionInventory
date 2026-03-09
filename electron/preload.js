const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  // Workspace directory management
  getWorkspaceDir: () => ipcRenderer.invoke('get-workspace-dir'),
  setWorkspaceDir: (dirPath) => ipcRenderer.invoke('set-workspace-dir', dirPath),
  selectWorkspaceDir: () => ipcRenderer.invoke('select-workspace-dir'),
  // Data file I/O (replaces localStorage in Electron mode)
  readDataFile: () => ipcRenderer.invoke('read-data-file'),
  writeDataFile: (jsonString) => ipcRenderer.invoke('write-data-file', jsonString),
});
