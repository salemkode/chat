const RECOVERY_KEY = 'salemkode-chat:deploy-recovery'

export function clearDeployRecoveryFlag() {
  sessionStorage.removeItem(RECOVERY_KEY)
}

export function hasAttemptedDeployRecovery() {
  return sessionStorage.getItem(RECOVERY_KEY) !== null
}

/** Reload once after deploy/cache mismatch; returns false if recovery was already attempted. */
export function attemptDeployRecovery(reason: string): boolean {
  if (sessionStorage.getItem(RECOVERY_KEY)) {
    return false
  }

  sessionStorage.setItem(RECOVERY_KEY, reason)
  window.location.reload()
  return true
}

export function installDeployRecoveryHandlers() {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    attemptDeployRecovery('chunk-preload')
  })
}
