import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '@clerk/tanstack-react-start'

export function TestUserStore() {
  const { isSignedIn } = useAuth()
  const profile = useQuery(api.users.getProfile)
  const storeUser = useMutation(api.users.ensureCurrentUser)

  if (!isSignedIn) {
    return (
      <div style={{ padding: '20px', border: '2px solid red', margin: '20px' }}>
        <h2>⚠️ Please Sign In</h2>
        <p>You need to sign in to test user storage.</p>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '20px',
        border: '2px solid blue',
        margin: '20px',
        backgroundColor: '#f0f0ff',
      }}
    >
      <h2>🐛 Debug: User Storage Test</h2>

      {/* Profile Status */}
      <div style={{ marginBottom: '20px' }}>
        <strong>Profile Status:</strong>
        <div
          style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: 'white',
            borderRadius: '4px',
          }}
        >
          {profile === undefined && (
            <div style={{ color: 'orange' }}>
              ⏳ Loading profile from Convex...
            </div>
          )}
          {profile === null && (
            <div style={{ color: 'red' }}>
              ❌ User NOT found in Convex
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <strong>Expected:</strong> Store mutation should be called
                automatically
              </div>
            </div>
          )}
          {profile !== undefined && profile !== null && (
            <div style={{ color: 'green' }}>
              ✅ User found in Convex
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <strong>User ID:</strong> {profile._id}
                <br />
                <strong>Name:</strong> {profile.name || 'Not set'}
                <br />
                <strong>Email:</strong> {profile.email || 'Not set'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Test Button */}
      <div style={{ marginBottom: '20px' }}>
        <strong>Manual Test:</strong>
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => {
              console.log('🔧 Manual store triggered')
              storeUser()
                .then((id) => {
                  console.log('✅ User stored successfully:', id)
                  alert(`Success! User stored with ID: ${id}`)
                })
                .catch((err) => {
                  console.error('❌ Failed to store user:', err)
                  alert(
                    `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
                  )
                })
            }}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
            disabled={profile !== null}
          >
            {profile === null
              ? 'Manual Store User (Expected to auto-run)'
              : 'Update User Profile'}
          </button>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            {profile === null && 'Click if automatic storage fails'}
            {profile !== null && 'Updates existing user'}
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div>
        <strong>Debug Information:</strong>
        <pre
          style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
          }}
        >
          {JSON.stringify(
            {
              isSignedIn,
              profile:
                profile === undefined
                  ? 'undefined'
                  : profile === null
                    ? 'null'
                    : { exists: true, id: profile._id },
            },
            null,
            2,
          )}
        </pre>
      </div>

      {/* Instructions */}
      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fffbeb',
          borderRadius: '4px',
        }}
      >
        <strong>📋 Instructions:</strong>
        <ol style={{ marginTop: '10px', marginLeft: '20px' }}>
          <li>Check if "Profile Status" shows user NOT found</li>
          <li>If yes, the automatic store should trigger</li>
          <li>If not, click "Manual Store User" button</li>
          <li>Check browser console (F12) for detailed logs</li>
          <li>Check Convex dashboard for users table</li>
        </ol>
      </div>
    </div>
  )
}
