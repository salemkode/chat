import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'

export function UserProfileExample() {
  const { isAuthenticated } = useConvexAuth()
  const profile = useQuery(api.users.getProfile)
  const storeUser = useMutation(api.users.store)
  const getOrCreate = useMutation(api.users.getOrCreateProfile)
  const [isStoring, setIsStoring] = useState(false)

  const handleStore = async () => {
    setIsStoring(true)
    try {
      const userId = await storeUser()
      console.log('Stored user ID:', userId)
    } catch (error) {
      console.error('Failed to store user:', error)
    } finally {
      setIsStoring(false)
    }
  }

  const handleGetOrCreate = async () => {
    try {
      const userId = await getOrCreate()
      console.log('User ID:', userId)
    } catch (error) {
      console.error('Failed to get or create user:', error)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please sign in to view your profile
          </p>
          <SignInButton mode="modal" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">User Profile</h1>

        {/* Profile Display */}
        {profile === undefined ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2 w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded mb-4 w-1/4"></div>
          </div>
        ) : profile === null ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">No profile found in Convex yet</p>
            <p className="text-yellow-700 text-sm mt-2">
              Click the button below to store your profile
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {profile.image && (
              <img
                src={profile.image}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
              />
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-lg">{profile.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-lg">{profile.email || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-lg">{profile.phone || 'Not set'}</p>
            </div>
            <div className="bg-gray-50 rounded p-3 text-sm">
              <p className="text-gray-600">
                <strong>User ID:</strong> {profile._id}
              </p>
              <p className="text-gray-600">
                <strong>Token:</strong> {profile.tokenIdentifier}
              </p>
              <p className="text-gray-600">
                <strong>Email Verified:</strong>{' '}
                {profile.emailVerificationTime
                  ? new Date(profile.emailVerificationTime).toLocaleString()
                  : 'No'}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleStore}
            disabled={isStoring}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStoring ? 'Storing...' : 'Store Profile'}
          </button>
          <button
            onClick={handleGetOrCreate}
            disabled={isStoring}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Get or Create Profile
          </button>
        </div>

        {/* Debug Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              {
                profileExists: profile !== null,
                profileLoaded: profile !== undefined,
                isAuthenticated,
                profile: profile
                  ? {
                      _id: profile._id,
                      name: profile.name,
                      email: profile.email,
                      tokenIdentifier:
                        profile.tokenIdentifier?.substring(0, 30) + '...',
                    }
                  : null,
              },
              null,
              2,
            )}
          </pre>
        </div>
      </div>
    </div>
  )
}

// Import this from your Clerk integration
function SignInButton({ mode: _mode }: { mode?: 'modal' | 'redirect' }) {
  return <button>Sign In (Clerk)</button>
}
