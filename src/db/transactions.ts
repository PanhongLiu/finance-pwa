import type { Transaction } from '../types'
import { getAll, getOne, putOne, deleteOne } from './database'

export const getTransactions = () => getAll<Transaction>('transactions')
export const getTransaction = (id: string) => getOne<Transaction>('transactions', id)
export const saveTransaction = (t: Transaction) => putOne('transactions', t)
export const removeTransaction = (id: string) => deleteOne('transactions', id)
