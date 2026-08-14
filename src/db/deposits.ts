import type { Deposit } from '../types'
import { getAll, getOne, putOne, deleteOne } from './database'

export const getDeposits = () => getAll<Deposit>('deposits')
export const getDeposit = (id: string) => getOne<Deposit>('deposits', id)
export const saveDeposit = (d: Deposit) => putOne('deposits', d)
export const removeDeposit = (id: string) => deleteOne('deposits', id)
