import Dexie, { type Table } from 'dexie';

/** Lokale opslag op dit toestel (IndexedDB). Niets hiervan gaat naar de server. */
interface KvRow {
  key: string;
  value: unknown;
}

class LocalDb extends Dexie {
  kv!: Table<KvRow, string>;

  constructor() {
    super('aof-hub');
    this.version(1).stores({ kv: 'key' });
  }
}

export const localDb = new LocalDb();

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    return (await localDb.kv.get(key))?.value as T | undefined;
  } catch {
    return undefined; // privémodus of opslag geweigerd: app werkt verder zonder
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await localDb.kv.put({ key, value });
}

export async function kvDelete(key: string): Promise<void> {
  await localDb.kv.delete(key);
}
