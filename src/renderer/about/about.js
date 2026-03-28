window.addEventListener('DOMContentLoaded', () => {
  // Back button 
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.api.openTool(btn.getAttribute('data-tool'))
    })
  })

  // opens external links in browser
  document.querySelectorAll('a[href^="https"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      window.api.openExternal(link.href)
    })
  })


  // could add any other about page interactions here

})
