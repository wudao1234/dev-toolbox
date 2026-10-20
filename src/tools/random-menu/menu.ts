/**
 * 随机菜单核心逻辑：菜谱抽取、荤素配额、近期不重复。
 * 纯函数模块，UI 与持久化不放在这里。
 */

export interface Dish {
  id: string
  name: string
  tags: string[]
}

/** 一次抽取记录，date 为本地日期字符串 YYYY-MM-DD */
export interface PickRecord {
  dishId: string
  date: string
}

export interface Quota {
  tag: string
  count: number
}

/** 本地日期字符串 YYYY-MM-DD（按本地时区） */
export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 无放回随机抽样：从 items 中随机取 count 个（count 大于池大小时取全部） */
export function sample<T>(items: readonly T[], count: number, rng: () => number = Math.random): T[] {
  const pool = [...items]
  const n = Math.max(0, Math.min(count, pool.length))
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n)
}

/** 距今 days 天前的日期字符串（含当天，即 days=3 表示最近 3 天都不抽；days<=0 表示不排除） */
export function cutoffDate(today: string, days: number): string {
  const date = new Date(`${today}T00:00:00`)
  date.setDate(date.getDate() - days + 1)
  return todayString(date)
}

/** 抽取历史中，date >= cutoff 的菜 id（这些菜在冷却期内） */
export function recentDishIds(history: readonly PickRecord[], cutoff: string): Set<string> {
  return new Set(history.filter((r) => r.date >= cutoff).map((r) => r.dishId))
}

/**
 * 按配额抽取菜单：
 * 1. 先依次满足每个分类配额（从带该标签且未被抽中的菜中抽样）；
 * 2. 剩余名额从全部未抽中的菜中补齐；
 * 3. 候选不足时不重复抽取，能抽多少抽多少。
 */
export function pickDishes(
  dishes: readonly Dish[],
  total: number,
  quotas: readonly Quota[],
  excludeIds: ReadonlySet<string> = new Set(),
  rng: () => number = Math.random,
): Dish[] {
  const pool = dishes.filter((d) => !excludeIds.has(d.id))
  const picked: Dish[] = []
  const pickedIds = new Set<string>()

  const take = (candidates: Dish[], count: number) => {
    for (const d of sample(candidates, count, rng)) {
      picked.push(d)
      pickedIds.add(d.id)
    }
  }

  for (const q of quotas) {
    if (q.count <= 0 || picked.length >= total) continue
    const candidates = pool.filter((d) => !pickedIds.has(d.id) && d.tags.includes(q.tag))
    take(candidates, Math.min(q.count, total - picked.length))
  }

  const rest = pool.filter((d) => !pickedIds.has(d.id))
  take(rest, total - picked.length)

  return picked
}
