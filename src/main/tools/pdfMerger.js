/* for the pdfMerger tool */

const { ipcMain, dialog } = require('electron/main')
const path = require('node:path')
const fs = require('node:fs')
const { PDFDocument } = require('pdf-lib')

// select pdfs
ipcMain.handle('merger-select-files', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select PDF Files to Merge',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })
  return result.canceled ? [] : result.filePaths
})

// select output
ipcMain.handle('merger-select-output-dir', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Output Directory',
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

//merge
ipcMain.handle('merger-merge', async (event, { files, outputDir, outputName }) => {
  try {
    const mergedPdf = await PDFDocument.create()

    for (const filePath of files) {
      const pdfBytes = fs.readFileSync(filePath)
      const pdf = await PDFDocument.load(pdfBytes)
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      pages.forEach(page => mergedPdf.addPage(page))
    }

    const mergedBytes = await mergedPdf.save()

    //clean name
    const fileName = outputName.trim().endsWith('.pdf')
      ? outputName.trim()
      : `${outputName.trim()}.pdf`

    const outputPath = path.join(outputDir, fileName)
    fs.writeFileSync(outputPath, mergedBytes)

    return { success: true, outputPath }
  } catch (err) {
    return { success: false, error: err.message }
  }
})