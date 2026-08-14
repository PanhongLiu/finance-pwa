import type { LocationRef, Transaction } from '../types'
import { useFinance } from '../store/FinanceContext'
import { categoryIcon } from '../utils/categoryIcon'
import { formatCNY } from '../utils/money'
import { fmtMonthDay } from '../utils/date'

function useRefLabel() {
  const { accounts, reserveFunds, investments, deposits } = useFinance()
  return (ref?: LocationRef): string => {
    if (!ref) return ''
    if (ref.kind === 'account') return accounts.find((a) => a.id === ref.id)?.name ?? '账户'
    if (ref.kind === 'reserve') return reserveFunds.find((r) => r.id === ref.id)?.name ?? '备用金'
    if (ref.kind === 'investment') return investments.find((i) => i.id === ref.id)?.name ?? '理财'
    if (ref.kind === 'deposit') return deposits.find((d) => d.id === ref.id)?.name ?? '存款'
    return ''
  }
}

export function TransactionItem({ tx, onClick }: { tx: Transaction; onClick?: (t: Transaction) => void }) {
  const labelOf = useRefLabel()
  const { accounts } = useFinance()

  let icon = categoryIcon(tx.category)
  let cat = tx.category
  let sub = ''
  let amountClass = 'amount--neutral'
  let amountText = ''

  if (tx.type === 'income') {
    const acc = accounts.find((a) => a.id === tx.accountId)?.name ?? ''
    sub = `${fmtMonthDay(tx.date)} · ${acc}`
    amountClass = 'amount--income'
    amountText = `+${formatCNY(tx.amount)}`
  } else if (tx.type === 'expense') {
    const acc = accounts.find((a) => a.id === tx.accountId)?.name ?? ''
    sub = `${fmtMonthDay(tx.date)} · ${acc}`
    amountClass = 'amount--expense'
    amountText = `-${formatCNY(tx.amount)}`
  } else {
    // transfer
    const from = labelOf(tx.from)
    const to = labelOf(tx.to)
    sub = `${fmtMonthDay(tx.date)} · ${from || '?'} → ${to || '?'}`
    amountClass = 'amount--transfer'
    amountText = formatCNY(tx.amount)
  }

  return (
    <div className="tx-item" onClick={() => onClick?.(tx)}>
      <div className="tx-item__icon">{icon}</div>
      <div className="tx-item__body">
        <div className="tx-item__cat">{cat}</div>
        <div className="tx-item__sub">{sub}</div>
      </div>
      <div className={`tx-item__amount ${amountClass}`}>{amountText}</div>
    </div>
  )
}
