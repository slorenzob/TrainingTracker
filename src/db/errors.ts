// Not named NotFoundError: Dexie would rewrap it as its own DexieError of that IndexedDB name.
export class EntityNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`)
    this.name = 'EntityNotFoundError'
  }
}

/** The exercise is referenced by at least one plan, so deleting it would break history. */
export class ExerciseInUseError extends Error {
  constructor(id: string) {
    super(`Exercise is used by a plan: ${id}`)
    this.name = 'ExerciseInUseError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
