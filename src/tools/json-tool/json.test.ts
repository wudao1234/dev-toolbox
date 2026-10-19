import { describe, expect, it } from 'vitest'
import { jsonDeepEqual, jsonDiffPaths, minifyJson, normalizeJson, parseJson } from './json'

describe('parseJson', () => {
  it('解析成功返回值', () => {
    const result = parseJson('{"a": 1}')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual({ a: 1 })
  })

  it('解析失败返回行列信息', () => {
    // 尾逗号错误：} 位于第 3 行第 1 列
    const text = '{\n  "a": 1,\n}'
    const result = parseJson(text)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.position).toBe(text.indexOf('}'))
      expect(result.line).toBe(3)
      expect(result.column).toBe(1)
    }
  })

  it('非法输入 position 为 null 时不崩溃', () => {
    const result = parseJson('')
    expect(result.ok).toBe(false)
  })
})

describe('normalizeJson / jsonDeepEqual', () => {
  it('键顺序不同视为相等', () => {
    expect(jsonDeepEqual({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true)
  })

  it('数组顺序不同视为不等', () => {
    expect(jsonDeepEqual([1, 2], [2, 1])).toBe(false)
  })

  it('嵌套 null 与对象区分', () => {
    expect(jsonDeepEqual({ a: null }, { a: {} })).toBe(false)
  })

  it('normalizeJson 排序键', () => {
    expect(JSON.stringify(normalizeJson({ b: 1, a: 2 }))).toBe('{"a":2,"b":1}')
  })
})

describe('jsonDiffPaths', () => {
  it('相等时无差异', () => {
    expect(jsonDiffPaths({ a: 1 }, { a: 1 })).toEqual([])
  })

  it('顶层值不同', () => {
    expect(jsonDiffPaths(1, 2)).toEqual(['$'])
  })

  it('指出嵌套路径', () => {
    expect(jsonDiffPaths({ a: { b: 1 } }, { a: { b: 2 } })).toEqual(['$.a.b'])
  })

  it('新增/删除键', () => {
    expect(jsonDiffPaths({ a: 1 }, { a: 1, b: 2 })).toEqual(['$.b（新增）'])
    expect(jsonDiffPaths({ a: 1, b: 2 }, { a: 1 })).toEqual(['$.b（删除）'])
  })

  it('数组元素差异带下标', () => {
    expect(jsonDiffPaths([1, 2], [1, 3])).toEqual(['$[1]'])
    expect(jsonDiffPaths([1], [1, 2])).toEqual(['$[1]（新增）'])
  })

  it('特殊键名使用下标语法', () => {
    expect(jsonDiffPaths({ 'a-b': 1 }, { 'a-b': 2 })).toEqual(['$["a-b"]'])
  })
})

describe('minifyJson', () => {
  it('去除空白', () => {
    expect(minifyJson({ a: 1, b: [1, 2] })).toBe('{"a":1,"b":[1,2]}')
  })
})
