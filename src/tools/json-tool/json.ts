export interface JsonParseSuccess {
  ok: true
  value: unknown
}

export interface JsonParseFailure {
  ok: false
  message: string
  /** 出错位置（字符偏移），无法解析出时为 null */
  position: number | null
  line: number | null
  column: number | null
}

export type JsonParseResult = JsonParseSuccess | JsonParseFailure

/**
 * 轻量 JSON 语法扫描器：返回第一个语法错误的字符偏移；语法合法返回 null。
 * 新版 V8 的 JSON.parse 错误信息不再附带 position，因此自行扫描定位。
 */
export function findJsonErrorPosition(text: string): number | null {
  let i = 0
  const n = text.length

  const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9'

  function skipWs(): void {
    while (i < n) {
      const c = text[i]
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') i++
      else break
    }
  }

  function parseString(): boolean {
    i++ // 跳过起始引号
    while (i < n) {
      const c = text[i]
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === '"') {
        i++
        return true
      }
      if (c < ' ') return false
      i++
    }
    return false
  }

  function parseNumber(): boolean {
    const start = i
    if (text[i] === '-') i++
    if (text[i] === '0') {
      i++
    } else {
      if (!(text[i] >= '1' && text[i] <= '9')) return false
      while (isDigit(text[i])) i++
    }
    if (text[i] === '.') {
      i++
      if (!isDigit(text[i])) return false
      while (isDigit(text[i])) i++
    }
    if (text[i] === 'e' || text[i] === 'E') {
      i++
      if (text[i] === '+' || text[i] === '-') i++
      if (!isDigit(text[i])) return false
      while (isDigit(text[i])) i++
    }
    return i > start
  }

  function parseArray(): boolean {
    i++ // [
    skipWs()
    if (text[i] === ']') {
      i++
      return true
    }
    while (true) {
      if (!parseValue()) return false
      skipWs()
      if (text[i] === ',') {
        i++
        skipWs()
        continue
      }
      if (text[i] === ']') {
        i++
        return true
      }
      return false
    }
  }

  function parseObject(): boolean {
    i++ // {
    skipWs()
    if (text[i] === '}') {
      i++
      return true
    }
    while (true) {
      skipWs()
      if (text[i] !== '"') return false
      if (!parseString()) return false
      skipWs()
      if (text[i] !== ':') return false
      i++
      if (!parseValue()) return false
      skipWs()
      if (text[i] === ',') {
        i++
        continue
      }
      if (text[i] === '}') {
        i++
        return true
      }
      return false
    }
  }

  function parseValue(): boolean {
    skipWs()
    if (i >= n) return false
    const c = text[i]
    if (c === '{') return parseObject()
    if (c === '[') return parseArray()
    if (c === '"') return parseString()
    if (c === '-' || isDigit(c)) return parseNumber()
    if (text.startsWith('true', i)) {
      i += 4
      return true
    }
    if (text.startsWith('false', i)) {
      i += 5
      return true
    }
    if (text.startsWith('null', i)) {
      i += 4
      return true
    }
    return false
  }

  skipWs()
  if (!parseValue()) return Math.min(i, n)
  skipWs()
  if (i < n) return i
  return null
}

export function parseJson(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const position = findJsonErrorPosition(text)
    let line: number | null = null
    let column: number | null = null
    if (position !== null) {
      const before = text.slice(0, position)
      line = before.split('\n').length
      const lastNewline = before.lastIndexOf('\n')
      column = position - lastNewline
    }
    return { ok: false, message, position, line, column }
  }
}

export function formatJson(value: unknown, indent: number): string {
  return JSON.stringify(value, null, indent)
}

export function minifyJson(value: unknown): string {
  return JSON.stringify(value)
}

/**
 * 递归排序对象键，使得语义相同（键顺序不同）的 JSON 序列化结果一致。
 */
export function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJson)
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) {
      result[key] = normalizeJson(source[key])
    }
    return result
  }
  return value
}

/** 深度比较两个已解析的 JSON 值（忽略对象键顺序） */
export function jsonDeepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizeJson(a)) === JSON.stringify(normalizeJson(b))
}

/** 找出两个 JSON 值不一致的路径（B 相对 A 的差异描述） */
export function jsonDiffPaths(a: unknown, b: unknown, path = '$'): string[] {
  if (jsonDeepEqual(a, b)) return []
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return [path]
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return [path]
  }
  const diffs: string[] = []
  if (Array.isArray(a) && Array.isArray(b)) {
    const max = Math.max(a.length, b.length)
    for (let i = 0; i < max; i++) {
      if (i >= a.length) diffs.push(`${path}[${i}]（新增）`)
      else if (i >= b.length) diffs.push(`${path}[${i}]（删除）`)
      else diffs.push(...jsonDiffPaths(a[i], b[i], `${path}[${i}]`))
    }
    return diffs
  }
  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)])
  for (const key of keys) {
    const childPath = /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`
    if (!(key in aObj)) diffs.push(`${childPath}（新增）`)
    else if (!(key in bObj)) diffs.push(`${childPath}（删除）`)
    else diffs.push(...jsonDiffPaths(aObj[key], bObj[key], childPath))
  }
  return diffs
}
