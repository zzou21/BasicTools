/* JS for the pdfMerger tool */

window.addEventListener('DOMContentLoaded', () => {

  const selectFilesBtn   = document.getElementById('selectFilesBtn')
  const clearFilesBtn    = document.getElementById('clearFilesBtn')
  const fileList         = document.getElementById('fileList')
  const selectOutputDirBtn = document.getElementById('selectOutputDirBtn')
  const outputDirLabel   = document.getElementById('outputDirLabel')
  const outputNameInput  = document.getElementById('outputNameInput')
  const mergeBtn         = document.getElementById('mergeBtn')
  const resultSection    = document.getElementById('resultSection')
  const resultLabel      = document.getElementById('resultLabel')
  const openOutputDirBtn = document.getElementById('openOutputDirBtn')

// State
let selectedFiles = []
  let outputDir     = null
  let lastOutputPath = null

  // helper functions
  function getFileName(filePath) {
    return filePath.split('/').pop()
  }

  function updateMergeBtn() {
    mergeBtn.disabled = selectedFiles.length < 2 || !outputDir
  }

  //render the files the 
  function renderFileList() {
    fileList.innerHTML = ''

    if (selectedFiles.length === 0) {
      const empty = document.createElement('li')
      empty.className = 'file-list__empty'
      empty.textContent = 'No files selected yet.'
      fileList.appendChild(empty)
      clearFilesBtn.disabled = true
      updateMergeBtn()
      return
    }

    clearFilesBtn.disabled = false

    selectedFiles.forEach((filePath, index) => {
      const li = document.createElement('li')
      li.className = 'file-item file-item--draggable'
      li.draggable = true
      li.dataset.index = index
      li.innerHTML = `
        <span class="file-item__handle">⠿</span>
        <span class="file-item__name" title="${filePath}">${getFileName(filePath)}</span>
        <button class="file-item__remove" data-index="${index}">✕</button>
      `
      fileList.appendChild(li)
    })

    // Wire up remove buttons
    fileList.querySelectorAll('.file-item__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'))
        selectedFiles.splice(index, 1)
        renderFileList()
        resultSection.classList.add('hidden')
      })
    })

    // drag and reorder
    let draggedIndex = null

    fileList.querySelectorAll('.file-item--draggable').forEach(item => {
      item.addEventListener('dragstart', () => {
        draggedIndex = parseInt(item.dataset.index)
        item.classList.add('dragging')
      })

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging')
        draggedIndex = null
        fileList.querySelectorAll('.file-item--draggable')
          .forEach(i => i.classList.remove('drag-over'))
      })

      item.addEventListener('dragover', (e) => {
        e.preventDefault()
        fileList.querySelectorAll('.file-item--draggable')
          .forEach(i => i.classList.remove('drag-over'))
        item.classList.add('drag-over')
      })

      item.addEventListener('drop', (e) => {
        e.preventDefault()
        const targetIndex = parseInt(item.dataset.index)
        if (draggedIndex === null || draggedIndex === targetIndex) return

        // Reorder the array
        const moved = selectedFiles.splice(draggedIndex, 1)[0]
        selectedFiles.splice(targetIndex, 0, moved)
        renderFileList()
      })
    })

    updateMergeBtn()
  }

  // pick a file
  selectFilesBtn.addEventListener('click', async () => {
    const files = await window.pdfMergerApi.selectFiles()
    if (files.length === 0) return
    // Append to existing selection rather than replacing
    selectedFiles = [...selectedFiles, ...files]
    renderFileList()
    resultSection.classList.add('hidden')
  })

  // 
  clearFilesBtn.addEventListener('click', () => {
    selectedFiles = []
    renderFileList()
    resultSection.classList.add('hidden')
  })

  //
  selectOutputDirBtn.addEventListener('click', async () => {
    const dir = await window.pdfMergerApi.selectOutputDir()
    if (!dir) return
    outputDir = dir
    outputDirLabel.textContent = dir
    updateMergeBtn()
  })

  //merge files
  mergeBtn.addEventListener('click', async () => {
    if (selectedFiles.length < 2 || !outputDir) return

    const outputName = outputNameInput.value.trim() || 'merged.pdf'

    mergeBtn.disabled = true
    mergeBtn.textContent = 'Merging...'

    const result = await window.pdfMergerApi.merge({
      files: selectedFiles,
      outputDir,
      outputName
    })

    mergeBtn.textContent = 'Merge PDFs'
    updateMergeBtn()

    if (result.success) {
      resultLabel.textContent = `Saved as: ${getFileName(result.outputPath)}`
      lastOutputPath = result.outputPath
    } else {
      resultLabel.textContent = `Error: ${result.error}`
    }

    resultSection.classList.remove('hidden')
  })


  openOutputDirBtn.addEventListener('click', () => {
    if (outputDir) window.pdfMergerApi.openOutputDir(outputDir)
  })

  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.api.openTool(btn.getAttribute('data-tool'))
    })
  })

})