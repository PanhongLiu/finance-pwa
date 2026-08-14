import type { Account } from '../types'
import { getAll, getOne, putOne, deleteOne } from './database'

export const getAccounts = () => getAll<Account>('accounts')
export const getAccount = (id: string) => getOne<Account>('accounts', id)
export const saveAccount = (a: Account) => putOne('accounts', a)
export const removeAccount = (id: string) => deleteOne('accounts', id)
