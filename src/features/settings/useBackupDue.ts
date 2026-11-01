import { useLiveQuery } from 'dexie-react-hooks'
import { isBackupDue, useLastBackupAt } from '../../backup/lastBackup'
import { db } from '../../db/schema'

/** True when there is data worth protecting and no recent export. */
export function useBackupDue(): boolean {
  const lastAt = useLastBackupAt()
  const hasData = useLiveQuery(async () => (await db.dogs.count()) > 0, [], false)
  return isBackupDue(lastAt, hasData)
}
