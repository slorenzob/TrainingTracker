import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { db } from '../db/schema'
import { createMemoryMediaStore, opfsMediaStore, setMediaStore } from '../media/mediaStore'
import '../i18n'

// Pages chain several IndexedDB live queries; in jsdom that can exceed the 1 s default.
configure({ asyncUtilTimeout: 5000 })

export let memoryMedia = createMemoryMediaStore()

beforeEach(async () => {
  memoryMedia = createMemoryMediaStore()
  setMediaStore(memoryMedia)
  await Promise.all(db.tables.map((table) => table.clear()))
})

afterEach(() => {
  setMediaStore(opfsMediaStore)
})
