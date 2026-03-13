const { contextBridge, ipcRenderer } = require('electron');

// ═══════════════════════════════════════════════════════════════════════════
// Preload Script - Secure Bridge between Main and Renderer Processes
// ═══════════════════════════════════════════════════════════════════════════
//
// This script runs in a privileged context with access to Node.js APIs while
// also having access to the renderer's DOM. It exposes a minimal, sanitized
// API surface to the renderer through contextBridge.
//
// Security principle: Keep this bridge minimal and specific. Never expose
// raw IPC channels or Node.js modules directly to the renderer.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Expose Electron-specific APIs to the renderer process via window.electronAPI
 * 
 * All communication with the main process happens through these controlled
 * channels. The renderer has NO direct access to Node.js or Electron APIs.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ─────────────────────────────────────────────────────────────────────────
  // Environment Detection
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Flag indicating the app is running in Electron (not web browser) */
  isElectron: true,

  // ─────────────────────────────────────────────────────────────────────────
  // Workspace Directory Management
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Get the currently configured workspace directory path
   * @returns {Promise<string|null>} Directory path or null if not set
   */
  getWorkspaceDir: () => ipcRenderer.invoke('get-workspace-dir'),

  /**
   * Set the workspace directory path
   * @param {string} dirPath - Full path to workspace directory
   * @returns {Promise<{success: boolean}>} Result object
   */
  setWorkspaceDir: (dirPath) => ipcRenderer.invoke('set-workspace-dir', dirPath),

  /**
   * Show native directory picker dialog for workspace selection
   * @returns {Promise<string|null>} Selected directory path or null if canceled
   */
  selectWorkspaceDir: () => ipcRenderer.invoke('select-workspace-dir'),

  // ─────────────────────────────────────────────────────────────────────────
  // Data File I/O (replaces localStorage in Electron mode)
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Read workspace data from the configured workspace directory
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  readDataFile: () => ipcRenderer.invoke('read-data-file'),

  /**
   * Write workspace data to the configured workspace directory
   * @param {string} jsonString - Serialized JSON data to write
   * @returns {Promise<{success: boolean, path?: string, error?: string}>}
   */
  writeDataFile: (jsonString) => ipcRenderer.invoke('write-data-file', jsonString),

  // ─────────────────────────────────────────────────────────────────────────
  // Save/Duplicate Workspace
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Show directory picker for "Save Workspace As" operation
   * @returns {Promise<string|null>} Selected directory or null if canceled
   */
  saveWorkspaceAsDialog: () => ipcRenderer.invoke('save-workspace-as-dialog'),

  /**
   * Write workspace data to a specific directory
   * @param {string} dirPath - Target directory path
   * @param {string} jsonString - Serialized JSON data to write
   * @returns {Promise<{success: boolean, path?: string, error?: string}>}
   */
  writeDataFileTo: (dirPath, jsonString) => 
    ipcRenderer.invoke('write-data-file-to', dirPath, jsonString),

  /**
   * Show file open dialog and read workspace JSON file
   * @returns {Promise<{filePath: string, dirPath: string, data: Object}|null>}
   */
  openWorkspaceFile: () => ipcRenderer.invoke('open-workspace-file'),

  // ─────────────────────────────────────────────────────────────────────────
  // Menu Integration
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Register a callback for menu action events from the main process
   * @param {Function} callback - Callback function that receives action string
   */
  onMenuAction: (callback) => 
    ipcRenderer.on('menu-action', (_event, action) => callback(action)),

  /**
   * Send current application state to main process for menu updates
   * @param {Object} state - State object with hasWorkspace, hasProjects flags
   */
  updateMenuState: (state) => ipcRenderer.send('update-menu-state', state),
});
