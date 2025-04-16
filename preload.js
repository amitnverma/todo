const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  queryDb: (sql, params) => ipcRenderer.invoke('query-db', sql, params),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  inventoryDb: {
    getAllItems: () => ipcRenderer.invoke('query-inventory-db', 'getAllItems'),
    addItem: (item) => ipcRenderer.invoke('query-inventory-db', 'addItem', item),
    updateItem: (item) => ipcRenderer.invoke('query-inventory-db', 'updateItem', item),
    deleteItem: (ecs_name) => ipcRenderer.invoke('query-inventory-db', 'deleteItem', ecs_name)
  }
});