export type DiffLineType = 'same' | 'added' | 'removed'

export interface DiffLine {
  type: DiffLineType
  content: string
  oldIndex?: number
  newIndex?: number
}

export interface DiffOptions {
  /** 比较时忽略每行首尾空白 */
  ignoreTrimWhitespace?: boolean
  /** 忽略空行（比较与输出均跳过） */
  ignoreBlankLines?: boolean
}

export interface DiffStats {
  added: number
  removed: number
  unchanged: number
}

function normalizeLine(line: string, options: DiffOptions): string {
  if (options.ignoreTrimWhitespace) return line.trim()
  return line
}

function isBlank(line: string): boolean {
  return line.trim().length === 0
}

/**
 * 基于 LCS 的行级 diff。
 * 时间/空间复杂度 O(m*n)，适合工具页面对比的文本规模。
 */
export function diffLines(oldText: string, newText: string, options: DiffOptions = {}): DiffLine[] {
  const filter = (lines: string[]) =>
    lines.filter((l) => !(options.ignoreBlankLines && isBlank(l)))

  const a = filter(oldText.split('\n')).map((l) => normalizeLine(l, options))
  const b = filter(newText.split('\n')).map((l) => normalizeLine(l, options))

  const m = a.length
  const n = b.length

  // dp[i][j] = a[i:] 与 b[j:] 的最长公共子序列长度
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ type: 'same', content: a[i], oldIndex: i + 1, newIndex: j + 1 })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'removed', content: a[i], oldIndex: i + 1 })
      i++
    } else {
      result.push({ type: 'added', content: b[j], newIndex: j + 1 })
      j++
    }
  }
  while (i < m) {
    result.push({ type: 'removed', content: a[i], oldIndex: i + 1 })
    i++
  }
  while (j < n) {
    result.push({ type: 'added', content: b[j], newIndex: j + 1 })
    j++
  }
  return result
}

export function diffStats(lines: DiffLine[]): DiffStats {
  let added = 0
  let removed = 0
  let unchanged = 0
  for (const line of lines) {
    if (line.type === 'added') added++
    else if (line.type === 'removed') removed++
    else unchanged++
  }
  return { added, removed, unchanged }
}
