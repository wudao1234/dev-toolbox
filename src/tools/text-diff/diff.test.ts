import { describe, expect, it } from 'vitest'
import { diffLines, diffStats } from './diff'

describe('diffLines', () => {
  it('相同时全部为 same', () => {
    const result = diffLines('a\nb\nc', 'a\nb\nc')
    expect(result.every((l) => l.type === 'same')).toBe(true)
    expect(result).toHaveLength(3)
  })

  it('检测新增行', () => {
    const result = diffLines('a\nc', 'a\nb\nc')
    expect(result.map((l) => l.type)).toEqual(['same', 'added', 'same'])
    expect(result[1].content).toBe('b')
    expect(result[1].newIndex).toBe(2)
  })

  it('检测删除行', () => {
    const result = diffLines('a\nb\nc', 'a\nc')
    expect(result.map((l) => l.type)).toEqual(['same', 'removed', 'same'])
    expect(result[1].content).toBe('b')
    expect(result[1].oldIndex).toBe(2)
  })

  it('检测修改行为删除+新增', () => {
    const result = diffLines('hello', 'world')
    expect(result.map((l) => l.type)).toEqual(['removed', 'added'])
  })

  it('空文本对比', () => {
    expect(diffLines('', '')).toEqual([{ type: 'same', content: '', oldIndex: 1, newIndex: 1 }])
    const added = diffLines('', 'x\ny')
    expect(added.filter((l) => l.type === 'added')).toHaveLength(2)
  })

  it('ignoreTrimWhitespace 忽略首尾空白', () => {
    const result = diffLines('a  ', 'a', { ignoreTrimWhitespace: true })
    expect(result.every((l) => l.type === 'same')).toBe(true)
  })

  it('ignoreBlankLines 忽略空行', () => {
    const result = diffLines('a\n\nb', 'a\nb', { ignoreBlankLines: true })
    expect(result.every((l) => l.type === 'same')).toBe(true)
  })
})

describe('diffStats', () => {
  it('统计正确', () => {
    const stats = diffStats(diffLines('a\nb\nc', 'a\nx\nc\ny'))
    expect(stats.added).toBe(2)
    expect(stats.removed).toBe(1)
    expect(stats.unchanged).toBe(2)
  })
})
