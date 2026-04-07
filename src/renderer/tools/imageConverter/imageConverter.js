/* renderer functions and logic for the image converter tool
 */

window.addEventListener('DOMContentLoaded', () => {

const selectFilesBtn    = document.getElementById('selectFilesBtn')
const clearFilesBtn     = document.getElementById('clearFilesBtn')
const fileList          = document.getElementById('fileList')
const formatSelect      = document.getElementById('formatSelect')
const selectOutputDirBtn= document.getElementById('selectOutputDirBtn')
const outputDirLabel    = document.getElementById('outputDirLabel')
const renameSection     = document.getElementById('renameSection')
const renameList        = document.getElementById('renameList')
const progressSection   = document.getElementById('progressSection')
const progressFill      = document.getElementById('progressFill')
const progressLabel     = document.getElementById('progressLabel')
const convertBtn        = document.getElementById('convertBtn')
const resultsSection    = document.getElementById('resultsSection')
const resultsLabel      = document.getElementById('resultsLabel')
const openOutputDirBtn  = document.getElementById('openOutputDirBtn')
const previewImg         = document.getElementById('previewImg')
const previewPlaceholder = document.getElementById('previewPlaceholder')
const previewName        = document.getElementById('previewName')


const extMap = {
  jpeg:     'jpg',
  png:      'png',
  tiff:     'tiff',
  gif:      'gif',
  bmp:      'bmp',
  pdf:      'pdf',
  jpeg2000: 'jp2',
}

  // states
  let selectedFiles = []
  let outputDir     = null
  let lastOutputDir = null

  // helper functions
  function getFileName(filePath) {
    return filePath.split('/').pop()
  }

  function getFileStem(filePath) {
    const name = getFileName(filePath)
    return name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name
  }

  function updateConvertBtn() {
    convertBtn.disabled = selectedFiles.length === 0
  }

  function renderRenameList() {
    renameList.innerHTML = ''

    if (selectedFiles.length === 0) {
      renameSection.classList.add('hidden')
      return
    }

    renameSection.classList.remove('hidden')

    selectedFiles.forEach((filePath) => {
      const li = document.createElement('li')
      li.className = 'rename-item'
      li.innerHTML = `
        <span class="rename-item__original" title="${filePath}">${getFileName(filePath)}</span>
        <span class="rename-item__arrow">→</span>
        <input
          class="rename-input"
          type="text"
          data-filepath="${filePath}"
          value="${getFileStem(filePath)}"
          placeholder="New name (no extension)"
        />
        <span class="rename-item__ext">.${extMap[formatSelect.value]}</span>
      `
      renameList.appendChild(li)
    })

    // generate preview of a photo when someone clicks on a photo's name
    renameList.querySelectorAll('.rename-input').forEach(input => {
      input.addEventListener('focus', () => {
        showPreview(input.getAttribute('data-filepath'))
      })
    })

    // Auto-show the first file's preview immediately
    if (selectedFiles.length > 0) {
      showPreview(selectedFiles[0])
    }
  }

  // render a list of files
  function renderFileList() {
    fileList.innerHTML = ''
    selectedFiles.forEach(filePath => {
      const li = document.createElement('li')
      li.className = 'file-item'
      li.textContent = getFileName(filePath)
      li.title = filePath
      fileList.appendChild(li)
    })
    clearFilesBtn.disabled = selectedFiles.length === 0
    updateConvertBtn()
    renderRenameList()
  }

// Update extension labels when format changes
  formatSelect.addEventListener('change', () => {
    renameList.querySelectorAll('.rename-item__ext').forEach(el => {
      el.textContent = `.${extMap[formatSelect.value]}`
    })
  })

  // select files
  selectFilesBtn.addEventListener('click', async () => {
    const files = await window.converterApi.selectFiles()
    if (files.length === 0) return
    selectedFiles = files
    renderFileList()
    resultsSection.style.display = 'none'
  })

  // clear files
  clearFilesBtn.addEventListener('click', () => {
    selectedFiles = []
    renderFileList()
    resultsSection.style.display = 'none'
    progressSection.style.display = 'none'
  })

  // select a directory to put the outputted files
  selectOutputDirBtn.addEventListener('click', async () => {
    const dir = await window.converterApi.selectOutputDir()
    if (!dir) return
    outputDir = dir
    outputDirLabel.textContent = dir
  })

  // ── Collect renames ──────────────────────────────────────
  function collectRenames() {
    const renames = {}
    renameList.querySelectorAll('.rename-input').forEach(input => {
      const filePath = input.getAttribute('data-filepath')
      const newName  = input.value.trim()
      const original = getFileStem(filePath)
      // Only record if name actually changed
      if (newName && newName !== original) {
        renames[filePath] = newName
      }
    })
    return renames
  }

  // ── Convert ──────────────────────────────────────────────
  convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return

    const format    = formatSelect.value
    const renames   = collectRenames()

    // Show progress
    progressSection.style.display = 'block'
    resultsSection.style.display  = 'none'
    progressFill.style.width      = '0%'
    progressLabel.textContent     = 'Starting...'
    convertBtn.disabled           = true

    // Track which dir was used for "Open Output Folder"
    lastOutputDir = outputDir || null

    const results = await window.converterApi.convert({
      files: selectedFiles,
      format,
      outputDir,
      renames
    })

    // Show results
    const total      = results.successful.length + results.failed.length
    const successful = results.successful.length
    const failed     = results.failed.length

    if (failed === 0) {
      resultsLabel.textContent = `Converted ${successful} of ${total} files successfully.`
    } else {
      const failedNames = results.failed.map(f => f.file).join(', ')
      resultsLabel.textContent = `Converted ${successful} of ${total}. Failed: ${failedNames}`
    }

    resultsSection.style.display = 'block'
    convertBtn.disabled = false
  })

  // ── Open output folder 
  openOutputDirBtn.addEventListener('click', () => {
    if (lastOutputDir) {
      window.converterApi.openOutputDir(lastOutputDir)
    } else if (selectedFiles.length > 0) {
      // Fall back to the input file's directory
      const inputDir = selectedFiles[0].split('/').slice(0, -1).join('/')
      window.converterApi.openOutputDir(inputDir)
    }
  })

    // image preview helper functions:
    async function showPreview(filePath) {
        previewName.textContent = getFileName(filePath)
        previewImg.classList.add('hidden')
        previewPlaceholder.classList.remove('hidden')
        previewPlaceholder.textContent = 'Loading...'

        const dataUrl = await window.converterApi.getPreview(filePath)
        console.log('dataUrl received:', dataUrl ? 'yes' : 'null')  // tells us if preview is coming back


        if (dataUrl) {
            previewImg.src = dataUrl
            previewImg.classList.remove('hidden')
            previewPlaceholder.classList.add('hidden')
        } else {
            previewPlaceholder.textContent = 'Preview unavailable'
        }
    }

  // ── Progress listener ────────────────────────────────────
  window.converterApi.onProgress(({ current, total, percent }) => {
    progressFill.style.width    = `${percent}%`
    progressLabel.textContent   = `Converting ${current} of ${total}...`
  })

  // back to home page
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.api.openTool(btn.getAttribute('data-tool'))
    })
  })

})
