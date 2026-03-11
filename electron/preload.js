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
  // Save workspace as / duplicate
  saveWorkspaceAsDialog: () => ipcRenderer.invoke('save-workspace-as-dialog'),
  writeDataFileTo: (dirPath, jsonString) => ipcRenderer.invoke('write-data-file-to', dirPath, jsonString),
  // Open a workspace JSON file directly
  openWorkspaceFile: () => ipcRenderer.invoke('open-workspace-file'),
  // Menu action listener – calls callback(action) whenever a menu item is triggered
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_event, action) => callback(action)),
  // Send current app state to main process so it can enable/disable menu items
  updateMenuState: (state) => ipcRenderer.send('update-menu-state', state),
});
