// 分类 → 图标 emoji 映射
const ICON_MAP: Record<string, string> = {
  工资: '💼',
  奖金: '🎁',
  利息: '🏦',
  投资收益: '📈',
  其他收入: '➕',
  餐饮: '🍜',
  交通: '🚌',
  购物: '🛍️',
  房租: '🏠',
  娱乐: '🎮',
  旅行: '✈️',
  医疗: '💊',
  日用品: '🧺',
  其他支出: '💸',
  转账: '🔄',
  新增存款: '🏦',
  新增理财: '📊',
  转入备用金: '⬇️',
  转出备用金: '⬆️',
  备用金调整: '✏️'
}

export function categoryIcon(category: string): string {
  return ICON_MAP[category] ?? '💱'
}
