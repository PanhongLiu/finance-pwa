import type { Settings } from '../types'
import { getAll, getOne, putOne } from './database'

export const getSettings = async (): Promise<Settings | undefined> => {
  // settings 只有一条固定记录
  const all = await getAll<Settings>('settings')
  return all[0]
}

export const saveSettings = (s: Settings) => putOne('settings', s)
export { getOne }
