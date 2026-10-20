import { describe, expect, it } from 'vitest'
import {
  cutoffDate,
  parseDishes,
  pickDishes,
  recentDishIds,
  sample,
  serializeDishes,
  todayString,
  type Dish,
  type PickRecord,
} from './menu'

const d = (id: string, tags: string[] = []): Dish => ({ id, name: id, tags })

/** 确定性 rng：返回固定序列，避免测试随机性 */
function seqRng(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

/** 递增 id，便于断言 */
let testId = 0
const nextId = () => `id-${++testId}`

describe('serializeDishes / parseDishes', () => {
  it('导出后可完整导入（往返一致）', () => {
    const dishes: Dish[] = [
      { id: '1', name: '红烧肉', tags: ['荤'] },
      { id: '2', name: '炒青菜', tags: ['素'] },
    ]
    const text = serializeDishes(dishes)
    expect(text).not.toContain('"id"')
    const result = parseDishes(text, new Set(), nextId)
    expect(result.skipped).toBe(0)
    expect(result.dishes.map((x) => [x.name, x.tags])).toEqual([
      ['红烧肉', ['荤']],
      ['炒青菜', ['素']],
    ])
  })

  it('支持纯菜名 JSON 数组', () => {
    const result = parseDishes('["麻婆豆腐", "地三鲜"]', new Set(), nextId)
    expect(result.dishes.map((x) => x.name)).toEqual(['麻婆豆腐', '地三鲜'])
    expect(result.dishes.every((x) => x.tags.length === 0)).toBe(true)
  })

  it('支持文本行格式，多种分隔符', () => {
    const text = '红烧肉，荤、下饭菜\n炒青菜,素\n紫菜蛋花汤、汤\n白米饭'
    const result = parseDishes(text, new Set(), nextId)
    expect(result.dishes).toHaveLength(4)
    expect(result.dishes[0]).toMatchObject({ name: '红烧肉', tags: ['荤', '下饭菜'] })
    expect(result.dishes[1]).toMatchObject({ name: '炒青菜', tags: ['素'] })
    expect(result.dishes[2]).toMatchObject({ name: '紫菜蛋花汤', tags: ['汤'] })
    expect(result.dishes[3]).toMatchObject({ name: '白米饭', tags: [] })
  })

  it('跳过空行', () => {
    const result = parseDishes('红烧肉\n\n  \n炒青菜\n', new Set(), nextId)
    expect(result.dishes.map((x) => x.name)).toEqual(['红烧肉', '炒青菜'])
  })

  it('与现有菜谱重名的条目跳过并计数', () => {
    const result = parseDishes('红烧肉\n炒青菜\n新菜', new Set(['红烧肉', '炒青菜']), nextId)
    expect(result.dishes.map((x) => x.name)).toEqual(['新菜'])
    expect(result.skipped).toBe(2)
  })

  it('导入内容自身重名时只保留第一条', () => {
    const result = parseDishes('红烧肉\n红烧肉', new Set(), nextId)
    expect(result.dishes).toHaveLength(1)
    expect(result.skipped).toBe(1)
  })

  it('以 [ 开头但不是合法 JSON 时回退为文本行解析', () => {
    const result = parseDishes('[红烧肉,荤\n[炒青菜,素', new Set(), nextId)
    expect(result.dishes.map((x) => x.name)).toEqual(['[红烧肉', '[炒青菜'])
  })

  it('空文本返回空结果', () => {
    const result = parseDishes('  \n  ', new Set(), nextId)
    expect(result.dishes).toHaveLength(0)
    expect(result.skipped).toBe(0)
  })
})

describe('todayString', () => {
  it('按本地时区格式化为 YYYY-MM-DD', () => {
    expect(todayString(new Date(2026, 9, 20, 15, 30))).toBe('2026-10-20')
  })

  it('月份与日期补零', () => {
    expect(todayString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('sample', () => {
  it('无放回：结果不重复且都来自原集合', () => {
    const items = Array.from({ length: 10 }, (_, i) => i)
    const result = sample(items, 5)
    expect(result).toHaveLength(5)
    expect(new Set(result).size).toBe(5)
    expect(result.every((x) => items.includes(x))).toBe(true)
  })

  it('count 超过池大小时返回全部', () => {
    expect(sample([1, 2, 3], 10)).toHaveLength(3)
  })

  it('count 为 0 时返回空', () => {
    expect(sample([1, 2, 3], 0)).toHaveLength(0)
  })

  it('不修改原数组', () => {
    const items = [1, 2, 3]
    sample(items, 3)
    expect(items).toEqual([1, 2, 3])
  })
})

describe('cutoffDate', () => {
  it('days=3 时覆盖最近 3 天（含今天）', () => {
    expect(cutoffDate('2026-10-20', 3)).toBe('2026-10-18')
  })

  it('days=1 时只排除今天', () => {
    expect(cutoffDate('2026-10-20', 1)).toBe('2026-10-20')
  })

  it('跨月计算正确', () => {
    expect(cutoffDate('2026-03-01', 3)).toBe('2026-02-27')
  })

  it('days=0 表示无冷却', () => {
    // cutoff 晚于任何历史日期，即没有菜被排除
    expect(cutoffDate('2026-10-20', 0)).toBe('2026-10-21')
  })
})

describe('recentDishIds', () => {
  const history: PickRecord[] = [
    { dishId: 'a', date: '2026-10-20' },
    { dishId: 'b', date: '2026-10-18' },
    { dishId: 'c', date: '2026-10-17' },
  ]

  it('只收集 cutoff 当天及之后的记录', () => {
    expect(recentDishIds(history, '2026-10-18')).toEqual(new Set(['a', 'b']))
  })

  it('cutoff 之前的记录不影响结果', () => {
    expect(recentDishIds(history, '2026-10-20')).toEqual(new Set(['a']))
  })
})

describe('pickDishes', () => {
  const dishes: Dish[] = [
    d('红烧肉', ['荤']),
    d('清蒸鱼', ['荤']),
    d('宫保鸡丁', ['荤']),
    d('炒青菜', ['素']),
    d('麻婆豆腐', ['素']),
    d('西红柿蛋汤', ['汤']),
  ]

  it('总数正确且不重复', () => {
    const picked = pickDishes(dishes, 3, [], new Set(), seqRng([0.1, 0.5, 0.9]))
    expect(picked).toHaveLength(3)
    expect(new Set(picked.map((x) => x.id)).size).toBe(3)
  })

  it('优先满足分类配额', () => {
    // 每次抽样都取第一个候选，配额应从对应标签的菜中选取
    const picked = pickDishes(dishes, 3, [{ tag: '素', count: 1 }], new Set(), seqRng([0]))
    expect(picked).toHaveLength(3)
    expect(picked.filter((x) => x.tags.includes('素'))).toHaveLength(1)
  })

  it('配额之和等于总数时全部按配额抽取', () => {
    const picked = pickDishes(
      dishes,
      2,
      [
        { tag: '荤', count: 1 },
        { tag: '汤', count: 1 },
      ],
      new Set(),
      seqRng([0]),
    )
    expect(picked).toHaveLength(2)
    expect(picked.some((x) => x.tags.includes('荤'))).toBe(true)
    expect(picked.some((x) => x.tags.includes('汤'))).toBe(true)
  })

  it('冷却期内的菜不会被抽中', () => {
    const picked = pickDishes(dishes, 6, [], new Set(['红烧肉', '清蒸鱼']), seqRng([0]))
    expect(picked.map((x) => x.id)).not.toContain('红烧肉')
    expect(picked.map((x) => x.id)).not.toContain('清蒸鱼')
  })

  it('候选不足时能抽多少抽多少，不重复', () => {
    const picked = pickDishes(dishes, 10, [], new Set(), seqRng([0]))
    expect(picked).toHaveLength(6)
    expect(new Set(picked.map((x) => x.id)).size).toBe(6)
  })

  it('全部排除时返回空', () => {
    const exclude = new Set(dishes.map((x) => x.id))
    expect(pickDishes(dishes, 3, [], exclude)).toHaveLength(0)
  })
})
