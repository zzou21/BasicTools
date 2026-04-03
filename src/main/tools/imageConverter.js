/* imageConverter.js. This JavaScript contains the algorithm and filesystem access. Contains process IPC handlers. Handles file selection, conversion, and saving.*/

const { ipcMain, dialog, shell } = require('electron/main')
const path = require('node:path')
const fs = require('node:fs')
const sharp = require('sharp')

// Maps display name to sharp-compatible format string
const FORMAT_MAP = {
  jpeg: 'jpeg',
  png:  'png',
  webp: 'webp',
  tiff: 'tiff',
  avif: 'avif',
  // add more formats that's supported by sharp 
}

// Supported input extensions
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.heic', '.heif', '.avif']

// select image files
ipcMain.handle('converter-select-files', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Images to Convert',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'heic', 'heif', 'avif'] }]
  })
  return result.canceled ? [] : result.filePaths
})

// pick output directory
ipcMain.handle('converter-select-output-dir', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Output Directory',
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

// ── Convert images ───────────────────────────────────────────
ipcMain.handle('converter-convert', async (event, { files, format, outputDir, renames }) => {
  const results = { successful: [], failed: [] }

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    const originalName = path.basename(filePath, path.extname(filePath))

    // Use renamed name if provided, otherwise use original
    const outputName = renames[filePath] || originalName
    const outputFileName = `${outputName}.${format}`

    // Use provided output dir, or same folder as input file
    const targetDir = outputDir || path.dirname(filePath)
    const outputPath = path.join(targetDir, outputFileName)

    try {
      await sharp(filePath)
        .toFormat(FORMAT_MAP[format])
        .toFile(outputPath)

      results.successful.push(outputFileName)
    } catch (err) {
      results.failed.push({ file: path.basename(filePath), error: err.message })
    }

    // Send progress back to renderer
    event.sender.send('converter-progress', {
      current: i + 1,
      total: files.length,
      percent: Math.round(((i + 1) / files.length) * 100)
    })
  }

  return results
})

// Display image to the user when renaming the photos
ipcMain.handle('converter-get-preview', async (event, filePath) => {
  try {
    const previewBuffer = await sharp(filePath)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    return `data:image/jpeg;base64,${previewBuffer.toString('base64')}`
  } catch (err) {
    return null
  }
})


// ── Open output directory in Finder/Explorer ─────────────────
ipcMain.on('converter-open-output-dir', (event, dirPath) => {
  shell.openPath(dirPath)
})