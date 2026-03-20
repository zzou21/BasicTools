/* ============================================================
   fileFinder.js — File Finder tool renderer logic
============================================================ */

window.addEventListener('DOMContentLoaded', () => {

  // ── Element references ──────────────────────────────────
  const selectDirBtn   = document.getElementById('selectDirBtn')
  const selectedDir    = document.getElementById('selectedDir')
  const searchInput    = document.getElementById('searchInput')
  const searchBtn      = document.getElementById('searchBtn')
  const resultsSection = document.getElementById('resultsSection')
  const resultsCount   = document.getElementById('resultsCount')
  const resultsList    = document.getElementById('resultsList')
  const actionsRow     = document.getElementById('actionsRow')
  const openAllBtn     = document.getElementById('openAllBtn')
  const newSearchBtn   = document.getElementById('newSearchBtn')
  const changeDirBtn   = document.getElementById('changeDirBtn')

  let currentResults = []

  // helper functions:
  // help to print out just the file name and not full file path in the search results:
  function getFileName(filePath) {
    return filePath.split("/").pop()
  }

  // ── Select directory ────────────────────────────────────
  async function selectDirectory() {
    const dirPath = await window.api.selectDirectory()
    if (!dirPath) return

    selectedDir.textContent = dirPath
    searchInput.disabled = false
    searchBtn.disabled = false
    searchInput.focus()

    // clear previous results
    resetResults()
  }

  // ── Perform search ──────────────────────────────────────
  async function performSearch() {
    const term = searchInput.value.trim()
    if (!term) return

    const dirPath = selectedDir.textContent
    resultsCount.textContent = 'Searching...'
    resultsSection.style.display = 'block'
    resultsList.innerHTML = ''
    actionsRow.style.display = 'none'

    currentResults = await window.api.searchFiles(dirPath, term)

    resultsCount.textContent = `${currentResults.length} result${currentResults.length !== 1 ? 's' : ''} found`

    if (currentResults.length === 0) {
      actionsRow.style.display = 'flex'
      return
    }

    // Render result items
    currentResults.forEach((filePath, index) => {
      const li = document.createElement('li')
      li.className = 'result-item'
      li.innerHTML = `
        <span class="result-item__path" title="${filePath}">${getFileName(filePath)}</span>
        <button class="result-item__open" data-index="${index}">Open</button>
      `
      resultsList.appendChild(li)
    })

    // Wire up individual open buttons
    resultsList.querySelectorAll('.result-item__open').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'))
        window.api.openFile(currentResults[index])
      })
    })

    actionsRow.style.display = 'flex'
  }

  // ── Reset results UI ────────────────────────────────────
  function resetResults() {
    currentResults = []
    resultsList.innerHTML = ''
    resultsCount.textContent = ''
    resultsSection.style.display = 'none'
    actionsRow.style.display = 'none'
    searchInput.value = ''
  }

  // ── Button listeners ────────────────────────────────────
  selectDirBtn.addEventListener('click', selectDirectory)
  changeDirBtn.addEventListener('click', selectDirectory)
  newSearchBtn.addEventListener('click', () => {
    resetResults()
    searchInput.focus()
  })
  openAllBtn.addEventListener('click', () => {
    currentResults.forEach(filePath => window.api.openFile(filePath))
  })
  searchBtn.addEventListener('click', performSearch)
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch()
  })

  // ── Back button ─────────────────────────────────────────
  document.querySelectorAll('.tool-btn[data-tool]').forEach(button => {
    button.addEventListener('click', () => {
      window.api.openTool(button.getAttribute('data-tool'))
    })
  })

})