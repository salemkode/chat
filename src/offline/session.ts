import { offlineDb } from './db'
import type { OfflineSessionSnapshot } from './schema'

const SESSION_ID = 'current'

export async function storeTrustedSession(
  session: Omit<OfflineSessionSnapshot, 'id'>,
) {
  await offlineDb.session.put({
    id: SESSION_ID,
    ...session,
  })
}
