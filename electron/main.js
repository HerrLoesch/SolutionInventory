const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
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

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Workspace',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => mainWindow?.webContents.send('menu-action', 'new-workspace')
        },
        {
          label: 'Open Workspace...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow?.webContents.send('menu-action', 'open-workspace')
        },
        { type: 'separator' },
        {
          label: 'Save Workspace',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save-workspace')
        },
        {
          label: 'Toggle Autosave',
          click: () => mainWindow?.webContents.send('menu-action', 'toggle-autosave')
        },
        {
          label: 'Save Workspace As...',
          click: () => mainWindow?.webContents.send('menu-action', 'save-workspace-as')
        },
        {
          label: 'Duplicate Workspace...',
          click: () => mainWindow?.webContents.send('menu-action', 'duplicate-workspace')
        },
        { type: 'separator' },
        {
          label: 'Close Workspace',
          click: () => mainWindow?.webContents.send('menu-action', 'close-workspace')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+Alt+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save')
        },
        {
          label: 'Save All',
          accelerator: 'CmdOrCtrl+Alt+Shift+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save-all')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit()
        }
      ]
    }
  ];
  return Menu.buildFromTemplate(template);
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
