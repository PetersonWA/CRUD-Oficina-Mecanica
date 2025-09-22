const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readData: (file) => ipcRenderer.invoke('read-data', file),
  writeData: (file, data) => ipcRenderer.invoke('write-data', file, data),
  searchData: (file, searchTerm, field) => ipcRenderer.invoke('search-data', file, searchTerm, field),
  editData: (file, idField, idValue, newData) => ipcRenderer.invoke('edit-data', file, idField, idValue, newData),
  deleteData: (file, idField, idValue) => ipcRenderer.invoke('delete-data', file, idField, idValue),
  saveFile: (fileBuffer, destinationFilename) => ipcRenderer.invoke('save-file', fileBuffer, destinationFilename),
  Buffer: Buffer
});
