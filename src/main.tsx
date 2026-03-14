if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_REACT_SCAN === '1') {
  const { scan } = await import('react-scan')

  scan({
    enabled: true,
    showToolbar: true,
  })
}

await import('./bootstrap')
