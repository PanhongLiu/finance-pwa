import type { Investment } from '../types'
import { getAll, getOne, putOne, deleteOne } from './database'

export const getInvestments = () => getAll<Investment>('investments')
export const getInvestment = (id: string) => getOne<Investment>('investments', id)
export const saveInvestment = (i: Investment) => putOne('investments', i)
export const removeInvestment = (id: string) => deleteOne('investments', id)
