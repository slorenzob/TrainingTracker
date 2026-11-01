export interface StorageStatus {
  usage: number
  quota: number
  persisted: boolean
}

/** Asks the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const estimate = (await navigator.storage?.estimate?.()) ?? {}
  const persisted = (await navigator.storage?.persisted?.()) ?? false
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted }
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1
  return `${value.toLocaleString('es-ES', { maximumFractionDigits: digits })} ${units[unit]}`
}
