const { ipcMain, dialog, shell } = require('electron/main')
const path = require('node:path')
const fs = require('node:fs')
const heicConvert = require('heic-convert')
const { Jimp } = require('jimp')
const PDFDocument = require('pdfkit')

const HEIC_EXTENSIONS = new Set(['.heic', '.heif'])

const FORMAT_MAP = {
  jpeg: { ext: 'jpg',  mime: 'image/jpeg' },
  png:  { ext: 'png',  mime: 'image/png'  },
  tiff: { ext: 'tiff', mime: 'image/tiff' },
  gif:  { ext: 'gif',  mime: 'image/gif'  },
  bmp:  { ext: 'bmp',  mime: 'image/bmp'  },
  pdf:  { ext: 'pdf',  mime: null         },
}

async function toJimpReadableBuffer(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const inputBuffer = fs.readFileSync(filePath)

  if (HEIC_EXTENSIONS.has(ext)) {
    const outputBuffer = await heicConvert({
      buffer: inputBuffer,
      format: 'PNG',
    })
    return Buffer.from(outputBuffer)
  }

  return inputBuffer
}

async function imageToPdf(filePath, outputPath) {
  const buffer = await toJimpReadableBuffer(filePath)
  const image = await Jimp.read(buffer)
  const { width, height } = image.bitmap
  const jpegBuffer = await image.getBuffer('image/jpeg')

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [width, height], margin: 0 })
    const stream = fs.createWriteStream(outputPath)
    doc.pipe(stream)
    doc.image(jpegBuffer, 0, 0, { width, height })
    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

ipcMain.handle('converter-select-files', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Images to Convert',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tiff', 'gif', 'bmp', 'heic', 'heif'] }]
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
  const { ext, mime } = FORMAT_MAP[format]

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    const originalName = path.basename(filePath, path.extname(filePath))
    const outputName = renames[filePath] || originalName
    const outputFileName = `${outputName}.${ext}`
    const targetDir = outputDir || path.dirname(filePath)
    const outputPath = path.join(targetDir, outputFileName)

    try {
      if (format === 'pdf') {
        await imageToPdf(filePath, outputPath)
      } else {
        const buffer = await toJimpReadableBuffer(filePath)
        const image = await Jimp.read(buffer)
        await image.write(outputPath, { mime })
      }
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

// preview handler
ipcMain.handle('converter-get-preview', async (event, filePath) => {
  try {
    const buffer = await toJimpReadableBuffer(filePath)
    const image = await Jimp.read(buffer)
    image.resize({ w: 400 })
    const previewBuffer = await image.getBuffer('image/jpeg')
    return `data:image/jpeg;base64,${previewBuffer.toString('base64')}`
  } catch (err) {
    console.error('Preview error:', err)
    return null
  }
})


ipcMain.on('converter-open-output-dir', (event, dirPath) => {
  shell.openPath(dirPath)
})