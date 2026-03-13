const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const DATA_FILE_NAME = 'solution-inventory-data.json';

// ═══════════════════════════════════════════════════════════════════════════
// Configuration Management
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the path to the application configuration file
 * @returns {string} Full path to app-config.json in userData directory
 */
function getConfigPath() {
  return path.join(app.getPath('userData'), 'app-config.json');
}

/**
 * Read configuration from persistent storage
 * @returns {Object} Configuration object (empty object if not found or error)
 */
function readConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (error) {
    console.error('[Config] Error reading config:', error.message);
  }
  return {};
}

/**
 * Write configuration to persistent storage
 * @param {Object} config - Configuration object to save
 */
function writeConfig(config) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('[Config] Error writing config:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Window Management
// ═══════════════════════════════════════════════════════════════════════════

let mainWindow;
let splashWindow;

/**
 * Get the path to application logo/icon based on size and package state
 * @param {string} size - Size variant: 'icon', 'small', or 'large'
 * @returns {string} Full path to logo file
 */
function getLogoPath(size) {
  if (size === 'icon') {
    return app.isPackaged
      ? path.join(__dirname, '../dist/icon.ico')
      : path.join(__dirname, '../public/icon.ico');
  }
  const name = size === 'small' ? 'Logo-small.png' : 'Logo-Large.png';
  return app.isPackaged
    ? path.join(__dirname, '../dist', name)
    : path.join(__dirname, '../public', name);
}

/**
 * Create and display splash screen during initial load
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 360,
    height: 320,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    skipTaskbar: true,
    icon: process.platform === 'win32' ? getLogoPath('icon') : getLogoPath('large')
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'), {
    query: { logo: getLogoPath('large') }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Application Menu
// ═══════════════════════════════════════════════════════════════════════════

let applicationMenu = null;

/**
 * Helper to send menu action to renderer process
 * @param {string} action - Action name to send
 * @returns {Function} Click handler that sends the action
 */
function send(action) {
  return () => mainWindow?.webContents.send('menu-action', action);
}

/**
 * Create and configure the application menu
 * @returns {Menu} Electron menu instance
 */
function createMenu() {
  const template = [
    // ── 1. File ───────────────────────────────────────────────────────────
    {
      label: 'File',
      submenu: [
        { label: 'New Workspace',         accelerator: 'CmdOrCtrl+Shift+N', click: send('new-workspace') },
        { label: 'Open Workspace...',     accelerator: 'CmdOrCtrl+Shift+O', click: send('open-workspace') },
        { label: 'Duplicate Workspace...', click: send('duplicate-workspace') },
        { type: 'separator' },
        { label: 'Save Workspace',        accelerator: 'CmdOrCtrl+S',       click: send('save-workspace') },
        { label: 'Save Workspace As...',                                     click: send('save-workspace-as') },
        { label: 'Toggle Autosave',                                          click: send('toggle-autosave') },
        { label: 'Close Workspace',        click: send('close-workspace') },
        { type: 'separator' },
        { label: 'Exit', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() }
      ]
    },
    // ── 2. Projects (enabled when workspace loaded) ───────────────────────
    {
      id: 'menu-projects',
      label: 'Projects',
      enabled: false,
      submenu: [
        { label: 'New Project',          click: send('projects-new') },
        { label: 'Import Project...',    click: send('projects-import') },
      ]
    },
    // ── 3. Questionnaires (enabled when at least one project exists) ──────
    {
      id: 'menu-questionnaires',
      label: 'Questionnaires',
      enabled: false,
      submenu: [
        { label: 'New Questionnaire',         click: send('questionnaires-new') },
        { label: 'Import Questionnaire...',   click: send('questionnaires-import') },
      ]
    },
    // ── 4. View ───────────────────────────────────────────────────────────
    {
      label: 'View',
      submenu: [
        { label: 'Reload',          accelerator: 'CmdOrCtrl+R',      click: () => mainWindow?.webContents.reload() },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11',            click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
        { label: 'Toggle Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow?.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: 'Zoom In',         accelerator: 'CmdOrCtrl+=',      click: () => { const wc = mainWindow?.webContents; if (wc) wc.setZoomLevel(wc.getZoomLevel() + 1) } },
        { label: 'Zoom Out',        accelerator: 'CmdOrCtrl+-',      click: () => { const wc = mainWindow?.webContents; if (wc) wc.setZoomLevel(wc.getZoomLevel() - 1) } },
        { label: 'Reset Zoom',      accelerator: 'CmdOrCtrl+0',      click: () => mainWindow?.webContents.setZoomLevel(0) },
        { type: 'separator' },
        { label: 'Toggle Sidebar',                                   click: send('view-toggle-sidebar') }
      ]
    },
    // ── 5. Help ───────────────────────────────────────────────────────────
    {
      label: 'Help',
      submenu: [
        { label: 'GitHub Repository', click: () => shell.openExternal('https://github.com/HerrLoesch/SolutionInventory') },
        { type: 'separator' },
        { label: 'About Solution Inventory', click: send('help-about') }
      ]
    }
  ];

  applicationMenu = Menu.buildFromTemplate(template);
  return applicationMenu;
}

/**
 * Update menu item enabled states based on application state
 * @param {Object} options - State flags
 * @param {boolean} options.hasWorkspace - Whether workspace is loaded
 * @param {boolean} options.hasProjects - Whether projects exist
 */
function updateMenuState({ hasWorkspace = false, hasProjects = false } = {}) {
  if (!applicationMenu) return;
  const projectsItem = applicationMenu.items.find((i) => i.label === 'Projects');
  const questItem    = applicationMenu.items.find((i) => i.label === 'Questionnaires');
  if (projectsItem)  projectsItem.enabled = hasWorkspace;
  if (questItem)     questItem.enabled    = hasProjects;
}

// ═══════════════════════════════════════════════════════════════════════════
// Application Lifecycle
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create the main application window with proper security settings
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,        // Security: Disable Node.js in renderer
      contextIsolation: true,         // Security: Isolate context
      preload: path.join(__dirname, 'preload.js')
    },
    icon: process.platform === 'win32' ? getLogoPath('icon') : getLogoPath('large')
  });

  // Load app content based on environment
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  // Handle window ready state
  mainWindow.webContents.once('did-finish-load', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  // Cleanup on window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize app when Electron is ready
 */
app.whenReady().then(() => {
  const menu = createMenu();
  Menu.setApplicationMenu(menu);
  createSplashWindow();
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// IPC Handlers - Workspace Directory Management
// ═══════════════════════════════════════════════════════════════════════════

/**
 * IPC: Get the current workspace directory path from config
 */
ipcMain.handle('get-workspace-dir', async () => {
  const config = readConfig();
  return config.workspaceDir || null;
});

/**
 * IPC: Set the workspace directory path in config
 */
ipcMain.handle('set-workspace-dir', async (event, dirPath) => {
  const config = readConfig();
  config.workspaceDir = dirPath;
  writeConfig(config);
  return { success: true };
});

/**
 * IPC: Show directory selection dialog for workspace
 */
ipcMain.handle('select-workspace-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Workspace Directory',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use as Workspace'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ═══════════════════════════════════════════════════════════════════════════
// IPC Handlers - Data File I/O
// ═══════════════════════════════════════════════════════════════════════════

/**
 * IPC: Read workspace data file from configured workspace directory
 */
ipcMain.handle('read-data-file', async () => {
  try {
    const config = readConfig();
    if (!config.workspaceDir) {
      return { success: false, error: 'No workspace directory configured' };
    }
    
    const filePath = path.join(config.workspaceDir, DATA_FILE_NAME);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Workspace data file not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    console.error('[IPC] Error reading data file:', error.message);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Write workspace data to configured workspace directory
 */
ipcMain.handle('write-data-file', async (event, jsonString) => {
  try {
    const config = readConfig();
    if (!config.workspaceDir) {
      return { success: false, error: 'No workspace directory configured' };
    }
    
    const filePath = path.join(config.workspaceDir, DATA_FILE_NAME);
    fs.writeFileSync(filePath, jsonString);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('[IPC] Error writing data file:', error.message);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Show directory selection dialog for "Save Workspace As"
 */
ipcMain.handle('save-workspace-as-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Save Workspace As',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Save Here'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

/**
 * IPC: Write workspace data to a specific directory path
 */
ipcMain.handle('write-data-file-to', async (event, dirPath, jsonString) => {
  try {
    const filePath = path.join(dirPath, DATA_FILE_NAME);
    fs.writeFileSync(filePath, jsonString);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('[IPC] Error writing data file to path:', error.message);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Show file open dialog and read workspace JSON file
 */
ipcMain.handle('open-workspace-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Workspace',
    filters: [{ name: 'Workspace JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  
  if (result.canceled || result.filePaths.length === 0) return null;
  
  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return { filePath, dirPath: path.dirname(filePath), data };
  } catch (error) {
    console.error('[IPC] Error reading workspace file:', error.message);
    return { error: error.message };
  }
});

/**
 * IPC: Receive menu state updates from renderer process
 */
ipcMain.on('update-menu-state', (event, state) => {
  updateMenuState(state);
});
