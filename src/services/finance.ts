// 财务业务服务层：统一「持仓 / 备用金目标 / 流水」模型
// 逻辑对齐单文件工作台：记一笔写入持仓 + 流水；更新金额按「当前金额 − 新存入 − 原金额」算收益。
import type {
  Deposit,
  DepositRecord,
  GoalInput,
  Investment,
  Position,
  PositionCategory,
  RecordInput,
  ReserveFund,
  ReserveGoal,
  Settings
} from '../types'
import { withTx, getAll, reqToPromise } from '../db/database'
import { getSettings, saveSettings } from '../db/settings'
import { uid, nowISO } from '../utils/id'
import { todayISO } from '../utils/date'

export interface AllData {
  positions: Position[]
  goals: ReserveGoal[]
  records: DepositRecord[]
}

const SETTINGS_ID = 'settings'

// ----------------- 读取 -----------------

export async function loadAll(): Promise<AllData> {
  const [positions, goals, records] = await Promise.all([
    getAll<Position>('positions'),
    getAll<ReserveGoal>('goals'),
    getAll<DepositRecord>('records')
  ])
  return { positions, goals, records }
}

// ----------------- 初始化 / 迁移 / 种子 -----------------

function categoryOfDeposit(type: string): PositionCategory {
  if (type.includes('理财')) return '理财'
  if (type === '活期存款' || type === '其他存款') return '其他'
  return '定期存款' // 定期存款 / 大额存单 等
}

/** 将旧版 deposits / investments / reserveFunds 迁移为统一模型，保留用户既有数据 */
export async function migrateLegacy(): Promise<void> {
  const settings = await getSettings()
  if (settings && settings.migratedV2 === true) return
  const [deps, invs, res] = await Promise.all([
    getAll<Deposit>('deposits'),
    getAll<Investment>('investments'),
    getAll<ReserveFund>('reserveFunds')
  ])
  const existing = await getAll<Position>('positions')
  // 若新模型已有数据，仅标记迁移完成，避免覆盖
  if (existing.length > 0 || (deps.length === 0 && invs.length === 0 && res.length === 0)) {
    await markMigrated()
    return
  }

  const positions: Position[] = []
  const records: DepositRecord[] = []
  const goals: ReserveGoal[] = []
  const now = Date.now()

  for (const d of deps) {
    const category = categoryOfDeposit(d.type)
    const amount = typeof d.currentAmount === 'number' ? d.currentAmount : d.principal
    const gain = amount - d.principal
    positions.push({
      id: d.id || uid(),
      project: d.name || '未命名',
      category,
      app: d.bank || '',
      amount,
      prevAmount: d.principal,
      lastGain: gain > 0 ? gain : 0,
      gainType: gain > 0 ? 'market' : 'base',
      date: d.startDate || todayISO(),
      prevDate: d.startDate || todayISO(),
      note: d.note || '',
      expiry: d.endDate || '',
      ts: now,
      lastDeposit: 0
    })
    records.push({
      id: uid(),
      date: d.startDate || todayISO(),
      category,
      project: d.name || '未命名',
      app: d.bank || '',
      amount: d.principal,
      note: d.note || '',
      ts: now
    })
  }

  for (const i of invs) {
    const amount = i.currentValue
    const gain = amount - i.investedAmount
    positions.push({
      id: i.id || uid(),
      project: i.name || '未命名',
      category: '理财',
      app: i.code || i.type || '',
      amount,
      prevAmount: i.investedAmount,
      lastGain: gain,
      gainType: 'market',
      date: i.purchaseDate || todayISO(),
      prevDate: i.purchaseDate || todayISO(),
      note: i.note || '',
      expiry: '',
      ts: now,
      lastDeposit: 0
    })
    records.push({
      id: uid(),
      date: i.purchaseDate || todayISO(),
      category: '理财',
      project: i.name || '未命名',
      app: i.code || i.type || '',
      amount: i.investedAmount,
      note: i.note || '',
      ts: now
    })
  }

  for (const r of res) {
    goals.push({
      id: r.id || uid(),
      name: r.name || '未命名目标',
      target: r.targetAmount,
      deadline: '',
      log: [{ date: todayISO(), amount: r.currentAmount }],
      ts: now
    })
  }

  await withTx(['positions', 'goals', 'records'], 'readwrite', async (_, getStore) => {
    positions.forEach((p) => getStore('positions').put(p))
    goals.forEach((g) => getStore('goals').put(g))
    records.forEach((rec) => getStore('records').put(rec))
  })
  await markMigrated()
}

async function markMigrated(): Promise<void> {
  const s = (await getSettings()) ?? ({ id: SETTINGS_ID, dbVersion: 1, seeded: true } as Settings)
  await saveSettings({ ...s, id: SETTINGS_ID, migratedV2: true, seeded: true })
}

/** 全新用户：写入示例数据，便于直接体验 */
export async function seedIfEmpty(): Promise<void> {
  const settings = await getSettings()
  if (settings && settings.migratedV2 === true) return
  const [positions, goals, records] = await Promise.all([
    getAll<Position>('positions'),
    getAll<ReserveGoal>('goals'),
    getAll<DepositRecord>('records')
  ])
  if (positions.length > 0 || goals.length > 0) {
    await markMigrated()
    return
  }
  const now = Date.now()
  const seedPositions: Position[] = [
    {
      id: uid(), project: '旅游基金', category: '定期存款', app: '工商银行',
      amount: 800000, prevAmount: 0, lastGain: 0, gainType: 'base',
      date: '2026-08-05', prevDate: '2026-08-05', note: '', expiry: '', ts: now, lastDeposit: 0
    },
    {
      id: uid(), project: '应急金', category: '其他', app: '现金',
      amount: 500000, prevAmount: 0, lastGain: 0, gainType: 'base',
      date: '2026-07-20', prevDate: '2026-07-20', note: '', expiry: '', ts: now, lastDeposit: 0
    },
    {
      id: uid(), project: '稳健理财A', category: '理财', app: '支付宝',
      amount: 1035000, prevAmount: 1018000, lastGain: 17000, gainType: 'market',
      date: '2026-08-01', prevDate: '2026-07-01', note: '', expiry: '', ts: now, lastDeposit: 0
    },
    {
      id: uid(), project: '基金定投', category: '理财', app: '天天基金',
      amount: 526000, prevAmount: 478000, lastGain: 48000, gainType: 'market',
      date: '2026-08-05', prevDate: '2026-07-15', note: '', expiry: '', ts: now, lastDeposit: 0
    }
  ]
  const seedRecords: DepositRecord[] = [
    { id: uid(), date: '2026-06-01', category: '理财', project: '稳健理财A', app: '支付宝', amount: 1000000, note: '', ts: now },
    { id: uid(), date: '2026-06-15', category: '理财', project: '基金定投', app: '天天基金', amount: 500000, note: '', ts: now },
    { id: uid(), date: '2026-07-20', category: '其他', project: '应急金', app: '现金', amount: 500000, note: '', ts: now },
    { id: uid(), date: '2026-08-05', category: '定期存款', project: '旅游基金', app: '工商银行', amount: 800000, note: '', ts: now }
  ]
  const seedGoals: ReserveGoal[] = [
    { id: uid(), name: '旅游基金', target: 2000000, deadline: '2026-08-20', log: [{ date: '2026-08-05', amount: 800000 }], ts: now },
    { id: uid(), name: '应急金', target: 3000000, deadline: '2026-09-30', log: [{ date: '2026-07-20', amount: 500000 }], ts: now }
  ]
  await withTx(['positions', 'goals', 'records', 'settings'], 'readwrite', async (_, getStore) => {
    seedPositions.forEach((p) => getStore('positions').put(p))
    seedGoals.forEach((g) => getStore('goals').put(g))
    seedRecords.forEach((r) => getStore('records').put(r))
    getStore('settings').put({ id: SETTINGS_ID, dbVersion: 1, seeded: true, migratedV2: true } as Settings)
  })
}

// ----------------- 记一笔：写入持仓 + 流水 -----------------

export async function addRecord(input: RecordInput): Promise<void> {
  await withTx(['positions', 'records'], 'readwrite', async (_, getStore) => {
    const posStore = getStore('positions')
    const all = (await reqToPromise<Position[]>(posStore.getAll() as IDBRequest<Position[]>)) ?? []
    const existing = all.find((p) => p.project === input.project && p.category === input.category)
    if (existing) {
      existing.prevAmount = existing.amount
      existing.prevDate = existing.date
      existing.amount += input.amount
      existing.lastGain = 0
      existing.gainType = 'deposit'
      existing.date = input.date
      if (input.app) existing.app = input.app
      if (input.note) existing.note = input.note
      if (input.expiry) existing.expiry = input.expiry
      posStore.put(existing)
    } else {
      const pos: Position = {
        id: uid(),
        project: input.project,
        category: input.category,
        app: input.app,
        amount: input.amount,
        prevAmount: 0,
        lastGain: 0,
        gainType: 'base',
        date: input.date,
        prevDate: input.date,
        note: input.note,
        expiry: input.expiry,
        ts: Date.now(),
        lastDeposit: 0
      }
      posStore.put(pos)
    }
    const rec: DepositRecord = {
      id: uid(),
      date: input.date,
      category: input.category,
      project: input.project,
      app: input.app,
      amount: input.amount,
      note: input.note,
      ts: Date.now()
    }
    getStore('records').put(rec)
  })
}

// ----------------- 更新金额：当前金额 + 新存入 → 收益 -----------------

export async function updatePositionAmount(
  id: string,
  newAmount: number,
  deposit: number,
  date: string
): Promise<void> {
  await withTx(['positions'], 'readwrite', async (_, getStore) => {
    const store = getStore('positions')
    const pos = await reqToPromise<Position | undefined>(store.get(id) as IDBRequest<Position | undefined>)
    if (!pos) throw new Error('持仓不存在')
    const gain = newAmount - deposit - pos.amount
    pos.prevAmount = pos.amount
    pos.prevDate = pos.date
    pos.amount = newAmount
    pos.lastGain = gain
    pos.lastDeposit = deposit
    pos.gainType = 'market'
    pos.date = date
    store.put(pos)
  })
}

export async function deletePosition(id: string): Promise<void> {
  await withTx(['positions'], 'readwrite', async (_, getStore) => {
    getStore('positions').delete(id)
  })
}

/** CSV 导入：按「项目 + 分类」整体替换持仓（用于从外部表格恢复） */
export async function bulkSavePositions(positions: Position[]): Promise<void> {
  await withTx(['positions'], 'readwrite', async (_, getStore) => {
    getStore('positions').clear()
    positions.forEach((p) => getStore('positions').put(p))
  })
}

// ----------------- 备用金目标 -----------------

export async function addGoal(input: GoalInput): Promise<void> {
  const g: ReserveGoal = {
    id: uid(),
    name: input.name.trim(),
    target: input.target,
    deadline: input.deadline,
    log: [],
    ts: Date.now()
  }
  await withTx(['goals'], 'readwrite', async (_, getStore) => {
    getStore('goals').put(g)
  })
}

export async function updateGoalProgress(id: string, amount: number, date: string): Promise<void> {
  await withTx(['goals'], 'readwrite', async (_, getStore) => {
    const store = getStore('goals')
    const g = await reqToPromise<ReserveGoal | undefined>(store.get(id) as IDBRequest<ReserveGoal | undefined>)
    if (!g) throw new Error('备用金目标不存在')
    g.log.push({ date, amount })
    store.put(g)
  })
}

export async function deleteGoal(id: string): Promise<void> {
  await withTx(['goals'], 'readwrite', async (_, getStore) => {
    getStore('goals').delete(id)
  })
}

// ----------------- 备份 / 恢复 / 清空 -----------------

export interface BackupFile {
  app: 'deposit-workbench'
  version: number
  exportedAt: string
  data: AllData
}

export async function exportAll(): Promise<BackupFile> {
  const data = await loadAll()
  return { app: 'deposit-workbench', version: 2, exportedAt: nowISO(), data }
}

export async function importAll(file: BackupFile): Promise<void> {
  if (file.app !== 'deposit-workbench' || !file.data) {
    throw new Error('文件格式不正确，不是本应用的备份')
  }
  await withTx(['positions', 'goals', 'records'], 'readwrite', async (_, getStore) => {
    getStore('positions').clear()
    getStore('goals').clear()
    getStore('records').clear()
    ;(file.data.positions ?? []).forEach((p) => getStore('positions').put(p))
    ;(file.data.goals ?? []).forEach((g) => getStore('goals').put(g))
    ;(file.data.records ?? []).forEach((r) => getStore('records').put(r))
  })
  await markMigrated()
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    clearStoreSafe('positions'),
    clearStoreSafe('goals'),
    clearStoreSafe('records')
  ])
  await markMigrated()
}

async function clearStoreSafe(store: 'positions' | 'goals' | 'records'): Promise<void> {
  await withTx([store], 'readwrite', async (_, getStore) => {
    getStore(store).clear()
  })
}
