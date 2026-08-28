import type {
  PersistedRadioWriteOperation,
  RadioWriteStore,
} from "../../modules/cps-workspace/index.ts"

class InMemoryRadioWriteStore implements RadioWriteStore {
  value: PersistedRadioWriteOperation | null = null
  readonly savedPhases: string[] = []

  async load() {
    return this.value
  }

  async save(value: PersistedRadioWriteOperation) {
    this.value = value
    this.savedPhases.push(value.recovery.phase)
  }

  async clear() {
    this.value = null
  }
}

export { InMemoryRadioWriteStore }
