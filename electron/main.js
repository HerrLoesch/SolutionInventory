const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE_NAME = 'solution-inventory-data.json';

function getConfigPath() {
  return path.join(app.getPath('userData'), 'app-config.json');
}

function readConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  return {};
}

function writeConfig(config) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Error writing config:', e);
  }
}

let mainWindow;
let splashWindow;

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

let applicationMenu = null;

function send(action) {
  return () => mainWindow?.webContents.send('menu-action', action);
}

function createMenu() {
  const template = [
    // ── 1. File ───────────────────────────────────────────────────────────
    {
      label: 'File',
      submenu: [
        { label: 'New Workspace',         accelerator: 'CmdOrCtrl+Shift+N', click: send('new-workspace') },
        { label: 'Open Workspace...',     accelerator: 'CmdOrCtrl+Shift+O', click: send('open-workspace') },
        { type: 'separator' },
        { label: 'Save Workspace',        accelerator: 'CmdOrCtrl+S',       click: send('save-workspace') },
        { label: 'Toggle Autosave',                                          click: send('toggle-autosave') },
        { label: 'Save Workspace As...',                                     click: send('save-workspace-as') },
        { label: 'Duplicate Workspace...', click: send('duplicate-workspace') },
        { type: 'separator' },
        { label: 'Close Workspace',        click: send('close-workspace') },
        { type: 'separator' },
        { label: 'Save',                  accelerator: 'CmdOrCtrl+Alt+S',   click: send('save') },
        { label: 'Save All',              accelerator: 'CmdOrCtrl+Alt+Shift+S', click: send('save-all') },
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
        { type: 'separator' },
        { label: 'Duplicate Project',    click: send('projects-duplicate') },
        { label: 'Export Project As...', click: send('projects-save-as') },
        { type: 'separator' },
        { label: 'Project Settings',     click: send('projects-settings') }
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
        { type: 'separator' },
        { label: 'Duplicate Questionnaire',  click: send('questionnaires-duplicate') },
        { label: 'Export Questionnaire As...', click: send('questionnaires-save-as') },
        { type: 'separator' },
        { label: 'Delete Questionnaire',  click: send('questionnaires-delete') },
        { type: 'separator' },
        { label: 'Questionnaire Settings', click: send('questionnaires-settings') }
      ]
    },
    // ── 4. Radar (enabled when a project is selected) ─────────────────────
    {
      id: 'menu-radar',
      label: 'Radar',
      enabled: false,
      submenu: [
        { label: 'Open Tech Radar',          click: send('radar-open') },
        { type: 'separator' },
        { label: 'Export as ThoughtWorks JSON', click: send('radar-export-json') },
        { label: 'Download as PNG',          click: send('radar-export-png') },
        { type: 'separator' },
        { label: 'Radar Settings',           click: send('radar-settings') }
      ]
    },
    // ── 5. View ───────────────────────────────────────────────────────────
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
    // ── 6. Help ───────────────────────────────────────────────────────────
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

function updateMenuState({ hasWorkspace = false, hasProjects = false, hasActiveProject = false, hasActiveQuestionnaire = false } = {}) {
  if (!applicationMenu) return;
  const projectsItem = applicationMenu.items.find((i) => i.label === 'Projects');
  const questItem    = applicationMenu.items.find((i) => i.label === 'Questionnaires');
  const radarItem    = applicationMenu.items.find((i) => i.label === 'Radar');
  if (projectsItem)  projectsItem.enabled = hasWorkspace;
  if (questItem)     questItem.enabled    = hasProjects;
  if (radarItem)     radarItem.enabled    = hasActiveProject;

  // Disable specific Projects submenu items if no project is selected
  if (projectsItem?.submenu) {
    projectsItem.submenu.forEach((item) => {
      if (['Duplicate Project', 'Export Project As...', 'Project Settings'].includes(item.label)) {
        item.enabled = hasActiveProject;
      }
    });
  }

  // Disable specific Questionnaires submenu items if no questionnaire is selected
  if (questItem?.submenu) {
    questItem.submenu.forEach((item) => {
      if (['Duplicate Questionnaire', 'Export Questionnaire As...', 'Delete Questionnaire', 'Questionnaire Settings'].includes(item.label)) {
        item.enabled = hasActiveQuestionnaire;
      }
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: process.platform === 'win32' ? getLogoPath('icon') : getLogoPath('large')
  });

  // In production, load the built files
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.once('did-finish-load', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  const menu = createMenu();
  Menu.setApplicationMenu(menu);
  createSplashWindow();
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for workspace directory management
ipcMain.handle('get-workspace-dir', async () => {
  const config = readConfig();
  return config.workspaceDir || null;
});

ipcMain.handle('set-workspace-dir', async (event, dirPath) => {
  const config = readConfig();
  config.workspaceDir = dirPath;
  writeConfig(config);
  return { success: true };
});

ipcMain.handle('select-workspace-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Workspace Directory',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use as Workspace'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// IPC handlers for data file I/O in the workspace directory
ipcMain.handle('read-data-file', async () => {
  try {
    const config = readConfig();
    if (!config.workspaceDir) return { success: false, error: 'No workspace dir configured' };
    const filePath = path.join(config.workspaceDir, DATA_FILE_NAME);
    if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    console.error('Error reading data file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-data-file', async (event, jsonString) => {
  try {
    const config = readConfig();
    if (!config.workspaceDir) return { success: false, error: 'No workspace dir configured' };
    const filePath = path.join(config.workspaceDir, DATA_FILE_NAME);
    fs.writeFileSync(filePath, jsonString);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error writing data file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-workspace-as-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Save Workspace As',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Save Here'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('write-data-file-to', async (event, dirPath, jsonString) => {
  try {
    const filePath = path.join(dirPath, DATA_FILE_NAME);
    fs.writeFileSync(filePath, jsonString);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error writing data file to path:', error);
    return { success: false, error: error.message };
  }
});

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
    console.error('Error reading workspace file:', error);
    return { error: error.message };
  }
});

ipcMain.on('update-menu-state', (event, state) => {
  updateMenuState(state);
});
