const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onPrintData: (callback) => ipcRenderer.on('print-data', (event, ...args) => callback(...args)),
  readyToPrint: () => ipcRenderer.invoke('ready-to-print'),
  printError: (error) => ipcRenderer.invoke('print-error', error)
});
