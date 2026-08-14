import type { ReserveFund } from '../types'
import { getAll, getOne, putOne, deleteOne } from './database'

export const getReserveFunds = () => getAll<ReserveFund>('reserveFunds')
export const getReserveFund = (id: string) => getOne<ReserveFund>('reserveFunds', id)
export const saveReserveFund = (r: ReserveFund) => putOne('reserveFunds', r)
export const removeReserveFund = (id: string) => deleteOne('reserveFunds', id)
