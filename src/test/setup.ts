import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { db } from '../db/schema'
import { createMemoryMediaStore, opfsMediaStore, setMediaStore } from '../media/mediaStore'
import '../i18n'

export let memoryMedia = createMemoryMediaStore()

beforeEach(async () => {
  memoryMedia = createMemoryMediaStore()
  setMediaStore(memoryMedia)
  await Promise.all(db.tables.map((table) => table.clear()))
})

afterEach(() => {
  setMediaStore(opfsMediaStore)
})
