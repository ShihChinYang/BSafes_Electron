const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopAPI', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // we can also expose variables, not just functions
  ping: () => ipcRenderer.invoke('ping'),
  addAnItemVersion: (memberId, key, itemVersion) => ipcRenderer.invoke('addAnItemVersion', memberId, key, itemVersion),
  addItemKeys: (itemList) => ipcRenderer.invoke('addItemKeys', itemList),
  finishedDownloadingObjectsForAnItem: (id, version) => ipcRenderer.invoke('finishedDownloadingObjectsForAnItem', id, version),
  getAnItemForDownloadingObjects: (workspace)=> ipcRenderer.invoke('getAnItemForDownloadingObjects', workspace),
  getAnItemKeyForDwonload: (memberId)=> ipcRenderer.invoke('getAnItemKeyForDwonload', memberId),
  getLastItemKey: (memberId) => ipcRenderer.invoke('getLastItemKey', memberId),
  getPageItem: (payload) => ipcRenderer.invoke('getPageItem', payload),
  getS3Object: (s3Key) => ipcRenderer.invoke('getS3Object', s3Key),
  isS3ObjectExisted: (s3Key) => ipcRenderer.invoke('isS3ObjectExisted', s3Key),
  listItems: (body) => ipcRenderer.invoke('listItems', body),
  putS3Object: (s3Key, data) => ipcRenderer.invoke('putS3Object', s3Key, data),
})