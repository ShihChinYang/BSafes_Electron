const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopAPI', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // we can also expose variables, not just functions
  ping: () => ipcRenderer.invoke('ping'),
  addAnItemVersion: (key, itemVersion) => ipcRenderer.invoke('addAnItemVersion', key, itemVersion),
  addItemKeys: (itemList) => ipcRenderer.invoke('addItemKeys', itemList),
  getAnItemForDownloadingObjects: (workspace)=> ipcRenderer.invoke('getAnItemForDownloadingObjects', workspace),
  getAnItemKeyForDwonload: ()=> ipcRenderer.invoke('getAnItemKeyForDwonload'),
  getLastItemKey: () => ipcRenderer.invoke('getLastItemKey'),
})