;(function () {
  const theme = localStorage.getItem('theme-preference') || 'system'
  let resolved = theme
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  document.documentElement.classList.add(resolved)
})()
