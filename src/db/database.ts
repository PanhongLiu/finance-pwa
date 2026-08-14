// IndexedDB 统一访问层
// 数据库名：personal_finance_db
// 数据库包含：accounts / transactions / deposits / investments / reserveFunds / settings
// 所有 UI 只能通过本文件及 db/*.ts 暴露的函数访问 IndexedDB，禁止直接操作底层。

export const DB_NAME = 'personal_finance_db'
// 升到 2：旧库（v1）升级时触发 onupgradeneeded，补齐 positions/goals/records 三个新对象仓库，
// 否则 migrateLegacy 读取缺失的 store 会抛错、导致首页永远「加载中」。
export const DB_VERSION = 2

const STORE_NAMES = [
  'accounts',
  'transactions',
  'deposits',
  'investments',
  'reserveFunds',
  'settings',
  'positions',
  'goals',
  'records'
] as const

export type StoreName = (typeof STORE_NAMES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * 数据库迁移入口。未来升级 Schema 时在此按版本号递增处理，
 * 既能新增对象仓库/索引，又不会删除已有数据。
 */
function migrate(db: IDBDatabase, oldVersion: number, newVersion: number): void {
  // 示例（未来升级到 v2 时启用）：
  // if (oldVersion < 2) {
  //   if (!db.objectStoreNames.contains('someNewStore')) {
  //     db.createObjectStore('someNewStore', { keyPath: 'id' })
  //   }
  // }
  void newVersion
  void oldVersion
}

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持 IndexedDB'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = req.result
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion
      // 首次创建或升级：补齐所有对象仓库（旧库也据此新增 positions/goals/records）
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' })
        }
      }
      migrate(db, oldVersion, DB_VERSION)
    }
    req.onsuccess = () => {
      const db = req.result
      // 版本落后时触发升级（例如代码更新但浏览器仍为旧库）
      if (db.version < DB_VERSION) {
        db.close()
        dbPromise = null
        void openDB().then(resolve).catch(reject)
        return
      }
      resolve(db)
    }
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('数据库升级被其他标签页阻塞，请关闭其他页面后重试'))
  })
  return dbPromise
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * 在单个事务中操作多个对象仓库，保证业务操作的原子性。
 * fn 内对 store 的读写都发生在同一事务中，事务在所有请求完成后自动提交。
 */
export async function withTx(
  stores: StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction, getStore: (name: StoreName) => IDBObjectStore) => Promise<void> | void
): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(stores, mode)
    const map: Partial<Record<StoreName, IDBObjectStore>> = {}
    const getStore = (name: StoreName) => {
      const s = tx.objectStore(name)
      map[name] = s
      return s
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('事务已中止'))
    try {
      const r = fn(tx, getStore)
      if (r && typeof (r as Promise<void>).then === 'function') {
        ;(r as Promise<void>).catch((err) => {
          try {
            tx.abort()
          } catch {
            /* noop */
          }
          reject(err)
        })
      }
    } catch (err) {
      try {
        tx.abort()
      } catch {
        /* noop */
      }
      reject(err)
    }
  })
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB()
  return new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll() as IDBRequest<T[]>
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getOne<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(id) as IDBRequest<T | undefined>
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putOne<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value as unknown as Record<string, unknown>)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function deleteOne(store: StoreName, id: string): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

// 便捷导出 reqToPromise 供其它仓库在自定义事务中使用
export { reqToPromise }
