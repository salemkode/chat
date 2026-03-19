import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useEffect, useState, useCallback } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export function useStoreUserEffect() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const profile = useQuery(api.users.getProfile)
  const [userId, setUserId] = useState<Id<'users'> | null>(null)
  const [isStoring, setIsStoring] = useState(false)
  const storeUser = useMutation(api.users.ensureCurrentUser)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    async function createUser() {
      if (isStoring) return

      setIsStoring(true)
      try {
        const id = await storeUser()
        setUserId(id)
      } catch (error) {
        console.error('Failed to store user:', error)
      } finally {
        setIsStoring(false)
      }
    }

    createUser()
    return () => setUserId(null)
  }, [isAuthenticated, storeUser, isStoring, profile])

  return {
    isLoading: isLoading || (isAuthenticated && userId === null && !isStoring),
    isStoring,
    isAuthenticated: isAuthenticated && userId !== null,
    userId,
  }
}

export function useProfile() {
  const profile = useQuery(api.users.getProfile)
  const getOrCreate = useMutation(api.users.getOrCreateProfile)
  const [isCreating, setIsCreating] = useState(false)

  const ensureProfile = useCallback(async () => {
    if (!profile && !isCreating) {
      setIsCreating(true)
      try {
        await getOrCreate()
      } catch (error) {
        console.error('Failed to ensure profile:', error)
      } finally {
        setIsCreating(false)
      }
    }
  }, [profile, isCreating, getOrCreate])

  return {
    profile,
    isLoading: profile === undefined || isCreating,
    isCreating,
    ensureProfile,
  }
}
