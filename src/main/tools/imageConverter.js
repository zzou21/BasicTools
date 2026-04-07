const { ipcMain, dialog, shell } = require('electron/main')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { execFile } = require('node:child_process')

const SIPS_FORMAT_MAP = {
  jpeg:      'jpeg',
  png:       'png',
  tiff:      'tiff',
  gif:       'gif',
  bmp:       'bmp',
  pdf:       'pdf',
  jpeg2000:  'jpeg2000',
}

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tiff', '.heic', '.heif']

function sips(args) {
  return new Promise((resolve, reject) => {
    execFile('sips', args, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve()
    })
  })
}

ipcMain.handle('converter-select-files', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Images to Convert',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tiff', 'heic', 'heif'] }]
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('converter-select-output-dir', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Output Directory',
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('converter-convert', async (event, { files, format, outputDir, renames }) => {
  const results = { successful: [], failed: [] }

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    const originalName = path.basename(filePath, path.extname(filePath))
    const outputName = renames[filePath] || originalName
    const outputFileName = `${outputName}.${format === 'jpeg' ? 'jpg' : format}`
    const targetDir = outputDir || path.dirname(filePath)
    const outputPath = path.join(targetDir, outputFileName)

    try {
      await sips(['-s', 'format', SIPS_FORMAT_MAP[format], filePath, '--out', outputPath])
      results.successful.push(outputFileName)
    } catch (err) {
      results.failed.push({ file: path.basename(filePath), error: err.message })
    }

    event.sender.send('converter-progress', {
      current: i + 1,
      total: files.length,
      percent: Math.round(((i + 1) / files.length) * 100)
    })
  }

  return results
})

ipcMain.handle('converter-get-preview', async (event, filePath) => {
  const tempPath = path.join(os.tmpdir(), `preview_${Date.now()}.jpg`)
  try {
    await sips(['-s', 'format', 'jpeg', '-Z', '400', filePath, '--out', tempPath])
    const buffer = fs.readFileSync(tempPath)
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  } catch (err) {
    return null
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
  }
})

ipcMain.on('converter-open-output-dir', (event, dirPath) => {
  shell.openPath(dirPath)
})