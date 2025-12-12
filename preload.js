const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopAPI', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // we can also expose variables, not just functions
  ping: () => ipcRenderer.invoke('ping'),
  addAnItemVersion: (itemVersion) => ipcRenderer.invoke('addAnItemVersion', itemVersion),
  addItemKeys: (itemList) => ipcRenderer.invoke('addItemKeys', itemList),
  getAnItemKeyForDwonload: ()=> ipcRenderer.invoke('getAnItemKeyForDwonload'),
  getLastItemKey: () => ipcRenderer.invoke('getLastItemKey'),
})