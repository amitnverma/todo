const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database.js');
const inventoryDB = require('./inventoryDB.js');
require('@electron/remote/main').initialize();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Create the application menu
  const template = [
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'To-Do App',
          click: () => mainWindow.loadFile('index.html')
        },
        {
          label: 'Inventory App',
          click: () => mainWindow.loadFile('inventory.html')
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.loadFile('index.html');
  require('@electron/remote/main').enable(mainWindow.webContents);

  // Ensure the app quits when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

app.whenReady().then(createWindow);

// Handle database queries for todo
ipcMain.handle('query-db', async (event, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// Handle database queries for inventory
ipcMain.handle('query-inventory-db', async (event, operation, data) => {
  try {
    let result;
    switch (operation) {
      case 'getAllItems':
        result = await inventoryDB.getAllItems();
        break;
      case 'addItem':
        result = await inventoryDB.addItem(data);
        break;
      case 'updateItem':
        result = await inventoryDB.updateItem(data);
        break;
      case 'deleteItem':
        result = await inventoryDB.deleteItem(data);
        break;
      default:
        throw new Error('Invalid operation');
    }
    return result;
  } catch (error) {
    console.error('Inventory DB operation failed:', error);
    throw error;
  }
});

// Handle file save dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

// Handle file open dialog
ipcMain.handle('show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

// Handle file read
ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(filePath, 'utf8');
});

// Handle file write
ipcMain.handle('write-file', async (event, filePath, content) => {
  fs.writeFileSync(filePath, content);
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});