const { updateElectronApp } = require('update-electron-app')
updateElectronApp()

const { app, BrowserWindow, ipcMain, shell, dialog} = require('electron/main')
const path = require('node:path')
const fs = require('node:fs')
require('./tools/imageConverter')
require('./tools/pdfMerger')


// listener for different tools being called by buttons and provide file paths for destinations
ipcMain.on('open-tool', (event, toolName) => {
  const toolPaths = {
    home: path.join(__dirname, '../renderer/index.html'),
    about: path.join(__dirname, '../renderer/about/about.html'),
    fileFinder: path.join(__dirname, '../renderer/tools/fileFinder/fileFinder.html'),
    imageConverter: path.join(__dirname, '../renderer/tools/imageConverter/imageConverter.html'),
    pdfMerger: path.join(__dirname, '../renderer/tools/pdfMerger/pdfMerger.html'),
    // add more tool links below
  }

  if (toolPaths[toolName]) {
    BrowserWindow.getFocusedWindow().loadFile(toolPaths[toolName])
  }
})
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        preload: path.join(__dirname, "../preload/preload.js")
    }
  })

  // autoUpdater.checkForUpdatesAndNotify() //automatically checks for new updates

  win.loadFile(path.join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
    ipcMain.handle("ping", ()=> "pong")
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// This is to help the app open external links that are not linked to other pages in the app
ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url)
})


// ========
// Code below are for file finder tool
// Open a directory picker and return the chosen path
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select a directory to search'
  })
  return result.canceled ? null : result.filePaths[0]
})

// Recursively search for files matching a term
ipcMain.handle('search-files', async (event, startPath, searchTerm) => {
  searchTerm = searchTerm.toLowerCase()
  const results = []
  const stack = [path.resolve(startPath)]

  while (stack.length > 0) {
    const current = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue // skip directories we can't read
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue // skip hidden files

      const fullPath = path.join(current, entry.name)
      try {
        if (entry.isDirectory()) {
          stack.push(fullPath)
        } else if (entry.isFile()) {
          if (entry.name.toLowerCase().includes(searchTerm)) {
            results.push(fullPath)
          }
        }
      } catch {
        continue // skip entries we can't stat
      }
    }
  }

  return results
})

// Open a file with the system default app
ipcMain.on('open-file', (event, filePath) => {
  shell.openPath(filePath)
})

// ==========

// Code below are for image converter tool