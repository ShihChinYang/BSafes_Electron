const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopAPI', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // we can also expose variables, not just functions
  ping: () => ipcRenderer.invoke('ping'),
  addAMemberIfNotExists: (authId, member) => ipcRenderer.invoke('addAMemberIfNotExists', authId, member),
  addAnItemVersion: (memberId, key, itemVersion) => ipcRenderer.invoke('addAnItemVersion', memberId, key, itemVersion),
  addItemKeys: (itemList) => ipcRenderer.invoke('addItemKeys', itemList),
  failedDownloadingObjectsForAnItem: (id, version) => ipcRenderer.invoke('failedDownloadingObjectsForAnItem', id, version),
  finishedDownloadingObjectsForAnItem: (id, version) => ipcRenderer.invoke('finishedDownloadingObjectsForAnItem', id, version),
  getAMmberByAuthId: (authId) => ipcRenderer.invoke('getAMmberByAuthId', authId),
  getAnItemForDownloadingObjects: (workspace)=> ipcRenderer.invoke('getAnItemForDownloadingObjects', workspace),
  getAnItemKeyForDwonload: (memberId)=> ipcRenderer.invoke('getAnItemKeyForDwonload', memberId),
  getItemKeysForDownload: (memberId) => ipcRenderer.invoke('getItemKeysForDownload', memberId),
  getLastItemKey: (memberId) => ipcRenderer.invoke('getLastItemKey', memberId),
  getPageItem: (payload) => ipcRenderer.invoke('getPageItem', payload),
  getS3Object: (s3Key) => ipcRenderer.invoke('getS3Object', s3Key),
  isS3ObjectExisted: (s3Key) => ipcRenderer.invoke('isS3ObjectExisted', s3Key),
  listItems: (body) => ipcRenderer.invoke('listItems', body),
  putS3Object: (s3Key, data) => ipcRenderer.invoke('putS3Object', s3Key, data),
  updateMemberLastUpdatedTime: (authId, lastUpdatedTime) => ipcRenderer.invoke('updateMemberLastUpdatedTime', authId, lastUpdatedTime),
})