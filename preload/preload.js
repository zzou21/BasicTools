const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  ping: () => ipcRenderer.invoke("ping")
  // we can also expose variables, not just functions
})

contextBridge.exposeInMainWorld('api', {
  openTool: (toolName) => ipcRenderer.send('open-tool', toolName),
  
  // These are for the file finder tool:
  selectDirectory: ()         => ipcRenderer.invoke('select-directory'),
  searchFiles:     (dir, term)=> ipcRenderer.invoke('search-files', dir, term),
  openFile:        (filePath) => ipcRenderer.send('open-file', filePath)

  // I will add more tool functions below this.
})

// This is for image converter tool:
contextBridge.exposeInMainWorld('converterApi', {
  selectFiles:    ()           => ipcRenderer.invoke('converter-select-files'),
  selectOutputDir:()           => ipcRenderer.invoke('converter-select-output-dir'),
  convert:        (options)    => ipcRenderer.invoke('converter-convert', options),
  openOutputDir:  (dirPath)    => ipcRenderer.send('converter-open-output-dir', dirPath),
  onProgress:     (callback)   => ipcRenderer.on('converter-progress', (event, data) => callback(data)),
  getPreview: (filePath) => ipcRenderer.invoke('converter-get-preview', filePath),
})