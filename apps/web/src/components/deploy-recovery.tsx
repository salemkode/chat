import { useEffect } from 'react'
import { clearDeployRecoveryFlag } from '@/lib/deploy-recovery'

/** Clears one-shot deploy recovery after the app shell mounts successfully. */
export function DeployRecovery() {
  useEffect(() => {
    clearDeployRecoveryFlag()
  }, [])

  return null
}
