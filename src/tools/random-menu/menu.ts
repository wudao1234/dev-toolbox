/**
 * 随机菜单核心逻辑：菜谱抽取、荤素配额、近期不重复、导入导出。
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

let idCounter = 0

function defaultNewId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${++idCounter}`
}

/**
 * 合并标签池与菜品实际使用的标签（保持出现顺序去重）。
 * 标签池在前，菜品中尚未入池的标签追加在后。
 */
export function mergeTags(pool: readonly string[], dishes: readonly Dish[]): string[] {
  const merged: string[] = []
  for (const t of pool) {
    if (t.trim() && !merged.includes(t)) merged.push(t)
  }
  for (const dish of dishes) {
    for (const t of dish.tags) {
      if (!merged.includes(t)) merged.push(t)
    }
  }
  return merged
}

/** 导出为 JSON 文本（不含 id，只保留菜名与标签） */
export function serializeDishes(dishes: readonly Dish[]): string {
  return JSON.stringify(
    dishes.map(({ name, tags }) => ({ name, tags })),
    null,
    2,
  )
}

export interface ImportResult {
  /** 解析出的新菜（已去重，id 已生成） */
  dishes: Dish[]
  /** 因重名或为空被跳过的条数 */
  skipped: number
}

/**
 * 解析导入文本，支持两种格式：
 * 1. JSON：serializeDishes 的产物，或 [{ "name": "...", "tags": [...] }] / ["菜名"] 数组；
 * 2. 文本行：每行一道菜，`菜名,标签1,标签2`（逗号 / 中文逗号 / 顿号 / Tab 分隔）。
 * 与 existingNames 重名的条目跳过。
 */
export function parseDishes(
  text: string,
  existingNames: ReadonlySet<string> = new Set(),
  newId: () => string = defaultNewId,
): ImportResult {
  const trimmed = text.trim()
  const rows: { name: string; tags: string[] }[] = []
  let parsedJson = false

  if (trimmed.startsWith('[')) {
    try {
      const arr: unknown = JSON.parse(trimmed)
      if (Array.isArray(arr)) {
        parsedJson = true
        for (const item of arr) {
          if (typeof item === 'string') {
            rows.push({ name: item, tags: [] })
          } else if (item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string') {
            const raw = item as { name: string; tags?: unknown }
            const tags = Array.isArray(raw.tags)
              ? raw.tags.filter((t): t is string => typeof t === 'string')
              : []
            rows.push({ name: raw.name, tags })
          }
        }
      }
    } catch {
      // 非法 JSON 时回退为文本行解析
    }
  }

  if (!parsedJson) {
    for (const line of trimmed.split(/\r?\n/)) {
      const parts = line.split(/[,，、\t]/).map((s) => s.trim())
      if (parts[0]) rows.push({ name: parts[0], tags: parts.slice(1).filter(Boolean) })
    }
  }

  const seen = new Set(existingNames)
  const dishes: Dish[] = []
  let skipped = 0
  for (const row of rows) {
    if (seen.has(row.name)) {
      skipped++
      continue
    }
    seen.add(row.name)
    dishes.push({ id: newId(), name: row.name, tags: row.tags })
  }
  return { dishes, skipped }
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
