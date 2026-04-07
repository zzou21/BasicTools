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

  //determine where dragged item should go
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.file-item--draggable:not(.dragging)')]

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect()
      const offset = y - box.top - box.height / 2

      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child }
      } else {
        return closest
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element
  }

  // render the files
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

    // remove buttons
    fileList.querySelectorAll('.file-item__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'))
        selectedFiles.splice(index, 1)
        renderFileList()
        resultSection.classList.add('hidden')
      })
    })

    // drag elements around to reorder pdf
    let draggedElement = null

    fileList.querySelectorAll('.file-item--draggable').forEach(item => {
      item.addEventListener('dragstart', () => {
        draggedElement = item
        item.classList.add('dragging')
      })

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging')
        draggedElement = null

        // rebuild selectedFiles based on DOM order
        const newOrder = [...fileList.querySelectorAll('.file-item--draggable')]
          .map(el => selectedFiles[parseInt(el.dataset.index)])

        selectedFiles = newOrder
        renderFileList()
      })
    })

    // Container-level drag handling
    fileList.addEventListener('dragover', (e) => {
      e.preventDefault()

      const afterElement = getDragAfterElement(fileList, e.clientY)

      if (!draggedElement) return

      if (afterElement == null) {
        fileList.appendChild(draggedElement)
      } else {
        fileList.insertBefore(draggedElement, afterElement)
      }
    })

    updateMergeBtn()
  }

  // pick files
  selectFilesBtn.addEventListener('click', async () => {
    const files = await window.pdfMergerApi.selectFiles()
    if (files.length === 0) return
    selectedFiles = [...selectedFiles, ...files]
    renderFileList()
    resultSection.classList.add('hidden')
  })

  // clear
  clearFilesBtn.addEventListener('click', () => {
    selectedFiles = []
    renderFileList()
    resultSection.classList.add('hidden')
  })

  // select output dir
  selectOutputDirBtn.addEventListener('click', async () => {
    const dir = await window.pdfMergerApi.selectOutputDir()
    if (!dir) return
    outputDir = dir
    outputDirLabel.textContent = dir
    updateMergeBtn()
  })

  // merge
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