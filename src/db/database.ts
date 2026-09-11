// Lightweight IndexedDB wrapper — a small hand-rolled layer instead of the
// `dexie` package (registry unreachable in the build environment). Provides
// the same essential shape: typed object stores, indexes, and promise-based CRUD.

const DB_NAME = "mnemonic";
const DB_VERSION = 1;

export const STORES = {
  memories: "memories",
  reviewLog: "reviewLog",
  collections: "collections",
  settings: "settings",
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORES.memories)) {
        const store = db.createObjectStore(STORES.memories, { keyPath: "id" });
        store.createIndex("collection", "collection", { unique: false });
        store.createIndex("due", "card.due", { unique: false });
        store.createIndex("state", "card.state", { unique: false });
        store.createIndex("learnedAt", "learnedAt", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("parentId", "parentId", { unique: false });
        store.createIndex("archived", "archived", { unique: false });
        store.createIndex("deleted", "deleted", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.reviewLog)) {
        const store = db.createObjectStore(STORES.reviewLog, { keyPath: "id" });
        store.createIndex("memoryId", "memoryId", { unique: false });
        store.createIndex("reviewedAt", "reviewedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.collections)) {
        db.createObjectStore(STORES.collections, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => console.warn("[db] upgrade blocked by another tab");
  });
  return dbPromise;
}

function tx<T>(
  db: IDBDatabase,
  storeNames: string | string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T> | T
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeNames, mode);
    let result: T;
    Promise.resolve(fn(t))
      .then((r) => (result = r))
      .catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error("transaction aborted"));
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut<T>(store: string, value: T): Promise<void> {
  const db = await openDatabase();
  await tx(db, store, "readwrite", (t) => reqToPromise(t.objectStore(store).put(value)));
}

export async function dbPutMany<T>(store: string, values: T[]): Promise<void> {
  const db = await openDatabase();
  await tx(db, store, "readwrite", (t) => {
    const os = t.objectStore(store);
    for (const v of values) os.put(v);
    return Promise.resolve();
  });
}

export async function dbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase();
  return tx(db, store, "readonly", (t) =>
    reqToPromise(t.objectStore(store).get(key))
  );
}

export async function dbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDatabase();
  return tx(db, store, "readonly", (t) =>
    reqToPromise(t.objectStore(store).getAll())
  );
}

export async function dbDelete(store: string, key: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  await tx(db, store, "readwrite", (t) =>
    reqToPromise(t.objectStore(store).delete(key))
  );
}

export async function dbGetAllByIndex<T>(
  store: string,
  index: string,
  query?: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const db = await openDatabase();
  return tx(db, store, "readonly", (t) =>
    reqToPromise(t.objectStore(store).index(index).getAll(query))
  );
}

export async function dbClearAll(): Promise<void> {
  const db = await openDatabase();
  await tx(db, Object.values(STORES), "readwrite", (t) => {
    for (const s of Object.values(STORES)) t.objectStore(s).clear();
    return Promise.resolve();
  });
}
