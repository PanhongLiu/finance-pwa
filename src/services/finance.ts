// 财务业务服务层：负责业务逻辑与数据持久化编排
// 所有余额变动都通过本层统一处理，保证「同一笔资金只计算一次」。
import type {
  Account,
  Deposit,
  DepositInput,
  ExpenseInput,
  IncomeInput,
  Investment,
  InvestmentInput,
  LocationRef,
  ReserveFund,
  ReserveInput,
  Settings,
  Transaction,
  TransferInput
} from '../types'
import { DB_VERSION, withTx, reqToPromise, clearStore, getAll } from '../db/database'
import { getSettings, saveSettings } from '../db/settings'
import { uid, nowISO } from '../utils/id'

export interface AllData {
  accounts: Account[]
  transactions: Transaction[]
  deposits: Deposit[]
  investments: Investment[]
  reserveFunds: ReserveFund[]
}

const SETTINGS_ID = 'settings'

// ----------------- 初始化/种子数据 -----------------

export async function seedIfEmpty(): Promise<void> {
  const settings = await getSettings()
  if (settings && settings.seeded) return
  await withTx(['accounts', 'settings'], 'readwrite', async (_, getStore) => {
    // 使用固定 ID 做 upsert，保证幂等，避免 StrictMode 双调用产生重复账户
    const account: Account = {
      id: 'default-current',
      name: '活期',
      type: 'current',
      balance: 0,
      currency: 'CNY',
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    getStore('accounts').put(account)
    const s: Settings = {
      id: SETTINGS_ID,
      dbVersion: DB_VERSION,
      seeded: true
    }
    getStore('settings').put(s)
  })
}

// ----------------- 数据读取 -----------------

export async function loadAll(): Promise<AllData> {
  const [accounts, transactions, deposits, investments, reserveFunds] = await Promise.all([
    getAll<Account>('accounts'),
    getAll<Transaction>('transactions'),
    getAll<Deposit>('deposits'),
    getAll<Investment>('investments'),
    getAll<ReserveFund>('reserveFunds')
  ])
  return { accounts, transactions, deposits, investments, reserveFunds }
}

// ----------------- 余额变动核心 -----------------

async function adjustWithin(
  getStore: (name: 'accounts' | 'reserveFunds' | 'investments' | 'deposits') => IDBObjectStore,
  loc: LocationRef,
  delta: number
): Promise<void> {
  if (delta === 0) return
  if (loc.kind === 'account') {
    const store = getStore('accounts')
    const a = await reqToPromise<Account | undefined>(store.get(loc.id) as IDBRequest<Account | undefined>)
    if (!a) throw new Error('账户不存在')
    a.balance += delta
    a.updatedAt = nowISO()
    store.put(a)
  } else if (loc.kind === 'reserve') {
    const store = getStore('reserveFunds')
    const r = await reqToPromise<ReserveFund | undefined>(store.get(loc.id) as IDBRequest<ReserveFund | undefined>)
    if (!r) throw new Error('备用金不存在')
    r.currentAmount += delta
    r.updatedAt = nowISO()
    store.put(r)
  } else if (loc.kind === 'investment') {
    const store = getStore('investments')
    const inv = await reqToPromise<Investment | undefined>(store.get(loc.id) as IDBRequest<Investment | undefined>)
    if (!inv) throw new Error('理财记录不存在')
    inv.currentValue += delta
    if (delta > 0) inv.investedAmount += delta // 追加投入同时增加累计投入
    inv.updatedAt = nowISO()
    store.put(inv)
  } else if (loc.kind === 'deposit') {
    const store = getStore('deposits')
    const d = await reqToPromise<Deposit | undefined>(store.get(loc.id) as IDBRequest<Deposit | undefined>)
    if (!d) throw new Error('存款不存在')
    d.principal += delta
    d.updatedAt = nowISO()
    store.put(d)
  }
}

function applyEffect(
  getStore: (name: 'accounts' | 'reserveFunds' | 'investments' | 'deposits') => IDBObjectStore,
  tx: Transaction
): Promise<void> {
  if (tx.type === 'income' && tx.accountId) {
    return adjustWithin(getStore, { kind: 'account', id: tx.accountId }, tx.amount)
  }
  if (tx.type === 'expense' && tx.accountId) {
    return adjustWithin(getStore, { kind: 'account', id: tx.accountId }, -tx.amount)
  }
  if (tx.type === 'transfer' && tx.from && tx.to) {
    return (async () => {
      await adjustWithin(getStore, tx.from as LocationRef, -tx.amount)
      await adjustWithin(getStore, tx.to as LocationRef, tx.amount)
    })()
  }
  return Promise.resolve()
}

function reverseEffect(
  getStore: (name: 'accounts' | 'reserveFunds' | 'investments' | 'deposits') => IDBObjectStore,
  tx: Transaction
): Promise<void> {
  if (tx.type === 'income' && tx.accountId) {
    return adjustWithin(getStore, { kind: 'account', id: tx.accountId }, -tx.amount)
  }
  if (tx.type === 'expense' && tx.accountId) {
    return adjustWithin(getStore, { kind: 'account', id: tx.accountId }, tx.amount)
  }
  if (tx.type === 'transfer' && tx.from && tx.to) {
    return (async () => {
      await adjustWithin(getStore, tx.from as LocationRef, tx.amount)
      await adjustWithin(getStore, tx.to as LocationRef, -tx.amount)
    })()
  }
  return Promise.resolve()
}

// ----------------- 记一笔：收入/支出/转账 -----------------

export async function addIncome(input: IncomeInput): Promise<void> {
  const tx: Transaction = {
    id: uid(),
    type: 'income',
    amount: input.amount,
    category: input.category,
    accountId: input.accountId,
    date: input.date,
    note: input.note,
    createdAt: nowISO(),
    updatedAt: nowISO()
  }
  await withTx(['accounts', 'transactions'], 'readwrite', async (_, getStore) => {
    await applyEffect(getStore, tx)
    getStore('transactions').put(tx)
  })
}

export async function addExpense(input: ExpenseInput): Promise<void> {
  const tx: Transaction = {
    id: uid(),
    type: 'expense',
    amount: input.amount,
    category: input.category,
    accountId: input.accountId,
    date: input.date,
    note: input.note,
    createdAt: nowISO(),
    updatedAt: nowISO()
  }
  await withTx(['accounts', 'transactions'], 'readwrite', async (_, getStore) => {
    await applyEffect(getStore, tx)
    getStore('transactions').put(tx)
  })
}

export async function addTransfer(input: TransferInput): Promise<void> {
  const tx: Transaction = {
    id: uid(),
    type: 'transfer',
    amount: input.amount,
    category: '转账',
    from: input.from,
    to: input.to,
    date: input.date,
    note: input.note,
    createdAt: nowISO(),
    updatedAt: nowISO()
  }
  await withTx(['accounts', 'reserveFunds', 'investments', 'deposits', 'transactions'], 'readwrite', async (_, getStore) => {
    await applyEffect(getStore, tx)
    getStore('transactions').put(tx)
  })
}

export async function updateTransaction(id: string, input: IncomeInput | ExpenseInput | TransferInput, type: Transaction['type']): Promise<void> {
  // 先读取旧记录用于回滚
  const old = (await getAll<Transaction>('transactions')).find((t) => t.id === id)
  if (!old) throw new Error('记录不存在')
  const updated: Transaction = {
    ...old,
    type,
    amount: input.amount,
    category: 'category' in input ? input.category : '转账',
    accountId: 'accountId' in input ? input.accountId : undefined,
    from: 'from' in input ? input.from : undefined,
    to: 'to' in input ? input.to : undefined,
    date: input.date,
    note: input.note,
    updatedAt: nowISO()
  }
  await withTx(['accounts', 'reserveFunds', 'investments', 'deposits', 'transactions'], 'readwrite', async (_, getStore) => {
    await reverseEffect(getStore, old)
    await applyEffect(getStore, updated)
    getStore('transactions').put(updated)
  })
}

export async function deleteTransaction(id: string): Promise<void> {
  const old = (await getAll<Transaction>('transactions')).find((t) => t.id === id)
  if (!old) return
  await withTx(['accounts', 'reserveFunds', 'investments', 'deposits', 'transactions'], 'readwrite', async (_, getStore) => {
    await reverseEffect(getStore, old)
    getStore('transactions').delete(id)
  })
}

// ----------------- 存款 -----------------

export async function addDeposit(input: DepositInput): Promise<void> {
  const deposit: Deposit = {
    id: uid(),
    bank: input.bank,
    name: input.name,
    type: input.type,
    principal: input.principal,
    annualRate: input.annualRate,
    startDate: input.startDate,
    endDate: input.endDate,
    currentAmount: input.currentAmount ?? input.principal,
    note: input.note,
    createdAt: nowISO(),
    updatedAt: nowISO()
  }
  await withTx(['deposits'], 'readwrite', async (_, getStore) => {
    getStore('deposits').put(deposit)
  })
}

export async function updateDeposit(id: string, input: DepositInput): Promise<void> {
  const existing = (await getAll<Deposit>('deposits')).find((d) => d.id === id)
  if (!existing) throw new Error('存款不存在')
  const updated: Deposit = {
    ...existing,
    bank: input.bank,
    name: input.name,
    type: input.type,
    principal: input.principal,
    annualRate: input.annualRate,
    startDate: input.startDate,
    endDate: input.endDate,
    currentAmount: input.currentAmount ?? existing.currentAmount,
    note: input.note,
    updatedAt: nowISO()
  }
  await withTx(['deposits'], 'readwrite', async (_, getStore) => {
    getStore('deposits').put(updated)
  })
}

export async function deleteDeposit(id: string): Promise<void> {
  await withTx(['deposits'], 'readwrite', async (_, getStore) => {
    getStore('deposits').delete(id)
  })
}

// ----------------- 理财 -----------------

export async function addInvestment(input: InvestmentInput): Promise<void> {
  const inv: Investment = {
    id: uid(),
    name: input.name,
    code: input.code,
    type: input.type,
    investedAmount: input.investedAmount,
    currentValue: input.currentValue,
    realizedProfit: input.realizedProfit,
    unrealizedProfit: input.unrealizedProfit,
    fee: input.fee,
    annualRate: input.annualRate ?? 0,
    purchaseDate: input.purchaseDate,
    note: input.note,
    createdAt: nowISO(),
    updatedAt: nowISO()
  }
  await withTx(['investments'], 'readwrite', async (_, getStore) => {
    getStore('investments').put(inv)
  })
}

export async function updateInvestment(id: string, input: InvestmentInput): Promise<void> {
  const existing = (await getAll<Investment>('investments')).find((i) => i.id === id)
  if (!existing) throw new Error('理财记录不存在')
  const updated: Investment = {
    ...existing,
    name: input.name,
    code: input.code,
    type: input.type,
    investedAmount: input.investedAmount,
    currentValue: input.currentValue,
    realizedProfit: input.realizedProfit,
    unrealizedProfit: input.unrealizedProfit,
    fee: input.fee,
    annualRate: input.annualRate ?? existing.annualRate,
    purchaseDate: input.purchaseDate,
    note: input.note,
    updatedAt: nowISO()
  }
  await withTx(['investments'], 'readwrite', async (_, getStore) => {
    getStore('investments').put(updated)
  })
}

export async function deleteInvestment(id: string): Promise<void> {
  await withTx(['investments'], 'readwrite', async (_, getStore) => {
    getStore('investments').delete(id)
  })
}

// ----------------- 备用金 -----------------

export async function addReserve(input: ReserveInput): Promise<void> {
  const r: ReserveFund = {
    id: uid(),
    name: input.name,
    targetAmount: input.targetAmount,
    currentAmount: input.currentAmount,
    accountId: input.accountId,
    note: input.note,
    createdAt: nowISO(),
    updatedAt: nowISO()
  }
  await withTx(['reserveFunds'], 'readwrite', async (_, getStore) => {
    getStore('reserveFunds').put(r)
  })
}

export async function updateReserve(id: string, input: ReserveInput): Promise<void> {
  const existing = (await getAll<ReserveFund>('reserveFunds')).find((r) => r.id === id)
  if (!existing) throw new Error('备用金不存在')
  const updated: ReserveFund = {
    ...existing,
    name: input.name,
    targetAmount: input.targetAmount,
    currentAmount: input.currentAmount,
    accountId: input.accountId,
    note: input.note,
    updatedAt: nowISO()
  }
  await withTx(['reserveFunds'], 'readwrite', async (_, getStore) => {
    getStore('reserveFunds').put(updated)
  })
}

export async function deleteReserve(id: string): Promise<void> {
  await withTx(['reserveFunds'], 'readwrite', async (_, getStore) => {
    getStore('reserveFunds').delete(id)
  })
}

/** 转入：从某来源（账户/理财/存款）划入备用金 */
export async function reserveTransferIn(
  reserveId: string,
  from: LocationRef,
  amount: number,
  date: string,
  note = ''
): Promise<void> {
  await withTx(['accounts', 'reserveFunds', 'investments', 'deposits', 'transactions'], 'readwrite', async (_, getStore) => {
    await adjustWithin(getStore, from, -amount)
    await adjustWithin(getStore, { kind: 'reserve', id: reserveId }, amount)
    const tx: Transaction = {
      id: uid(),
      type: 'transfer',
      amount,
      category: '转入备用金',
      from,
      to: { kind: 'reserve', id: reserveId },
      date,
      note,
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    getStore('transactions').put(tx)
  })
}

/** 转出：从备用金划出到某目标 */
export async function reserveTransferOut(
  reserveId: string,
  to: LocationRef,
  amount: number,
  date: string,
  note = ''
): Promise<void> {
  await withTx(['accounts', 'reserveFunds', 'investments', 'deposits', 'transactions'], 'readwrite', async (_, getStore) => {
    await adjustWithin(getStore, { kind: 'reserve', id: reserveId }, -amount)
    await adjustWithin(getStore, to, amount)
    const tx: Transaction = {
      id: uid(),
      type: 'transfer',
      amount,
      category: '转出备用金',
      from: { kind: 'reserve', id: reserveId },
      to,
      date,
      note,
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    getStore('transactions').put(tx)
  })
}

/** 手动调整余额 */
export async function reserveAdjust(reserveId: string, newAmount: number, date: string, note: string): Promise<void> {
  await withTx(['reserveFunds', 'transactions'], 'readwrite', async (_, getStore) => {
    const store = getStore('reserveFunds')
    const r = await reqToPromise<ReserveFund | undefined>(store.get(reserveId) as IDBRequest<ReserveFund | undefined>)
    if (!r) throw new Error('备用金不存在')
    const diff = newAmount - r.currentAmount
    r.currentAmount = newAmount
    r.updatedAt = nowISO()
    store.put(r)
    const tx: Transaction = {
      id: uid(),
      type: 'transfer',
      amount: Math.abs(diff),
      category: '备用金调整',
      from: diff < 0 ? { kind: 'reserve', id: reserveId } : undefined,
      to: diff >= 0 ? { kind: 'reserve', id: reserveId } : undefined,
      date,
      note,
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    getStore('transactions').put(tx)
  })
}

// ----------------- 数据备份/恢复/清空 -----------------

export interface BackupFile {
  app: 'personal-finance-pwa'
  version: number
  exportedAt: string
  data: AllData
}

export async function exportAll(): Promise<BackupFile> {
  const data = await loadAll()
  return {
    app: 'personal-finance-pwa',
    version: DB_VERSION,
    exportedAt: nowISO(),
    data
  }
}

export async function importAll(file: BackupFile): Promise<void> {
  if (file.app !== 'personal-finance-pwa' || !file.data) {
    throw new Error('文件格式不正确，不是本应用的备份')
  }
  const stores: Array<'accounts' | 'transactions' | 'deposits' | 'investments' | 'reserveFunds'> = [
    'accounts',
    'transactions',
    'deposits',
    'investments',
    'reserveFunds'
  ]
  await withTx(stores, 'readwrite', async (_, getStore) => {
    for (const s of stores) getStore(s).clear()
    const map: Record<string, unknown[]> = {
      accounts: file.data.accounts,
      transactions: file.data.transactions,
      deposits: file.data.deposits,
      investments: file.data.investments,
      reserveFunds: file.data.reserveFunds
    }
    for (const s of stores) {
      for (const item of map[s] ?? []) getStore(s).put(item)
    }
  })
  // 确保种子标记存在
  const settings = await getSettings()
  if (!settings || !settings.seeded) {
    await saveSettings({ id: SETTINGS_ID, dbVersion: DB_VERSION, seeded: true })
  }
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    clearStore('accounts'),
    clearStore('transactions'),
    clearStore('deposits'),
    clearStore('investments'),
    clearStore('reserveFunds'),
    clearStore('settings')
  ])
}
