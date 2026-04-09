/* ui. Helps with file interactions on the main page. */

// helpful notes (from Claude)

/**
 * openTool(toolName)
 *
 * Called by each tool button's onclick handler.
 * Replace the stub body with your real navigation / IPC logic.
 *
 * Common Electron patterns:
 *
 *   // 1. Via contextBridge (recommended – works with contextIsolation: true)
 *   window.api.openTool(toolName);
 *
 *   // 2. Direct ipcRenderer (only if contextIsolation is false)
 *   require('electron').ipcRenderer.send('open-tool', toolName);
 *
 *   // 3. Multi-page approach (each tool is its own HTML file)
 *   window.location.href = `${toolName}.html`;
 *
 * TODO: replace the console.log below with whichever pattern fits your setup.
 */
window.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.tool-btn[data-tool]').forEach(button => {
    button.addEventListener('click', () => {
      const toolName = button.getAttribute('data-tool')
      window.api.openTool(toolName)
    })
  })

  document.querySelectorAll('.menubar__item[data-action]').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action')
      if (action === 'about') {
        window.api.openTool('about')
      }
      // TODO: add more actions here as you add menu items
    })
  })

})

// function openTool(toolName) {
//   window.parseInt.openTool(toolName)
  
//   // TODO: replace with actual navigation / IPC call
// }

/* ============================================================
   TODO: add any other landing-page UI logic below.
   Examples:
     - Keyboard shortcut listeners (e.g. 1–4 to launch tools)
     - Dynamic "recently used" highlighting
     - Theme toggle (light / dark)
============================================================ */

document.querySelectorAll('a[href^="https"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault()
    window.api.openExternal(link.href)
  })
})
