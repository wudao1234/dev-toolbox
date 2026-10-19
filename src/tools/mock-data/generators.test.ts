import { describe, expect, it } from 'vitest'
import {
  computeCheckDigit,
  generateAddress,
  generateIdCard,
  generateName,
  generatePeople,
  generatePhone,
  validateIdCard,
} from './generators'
import { AREAS } from './areas'

describe('computeCheckDigit', () => {
  it('已知样本的校验位正确（GB 11643 算法）', () => {
    // 测试向量：前 17 位 11010119900307755，加权和 238，238 % 11 = 7 → 校验位 '5'
    expect(computeCheckDigit('11010119900307755')).toBe('5')
  })

  it('非 17 位数字抛错', () => {
    expect(() => computeCheckDigit('123')).toThrow()
    expect(() => computeCheckDigit('abc')).toThrow()
  })
})

describe('validateIdCard', () => {
  it('合法身份证通过校验', () => {
    expect(validateIdCard('110101199003077555')).toBe(true)
  })

  it('长度/格式错误不通过', () => {
    expect(validateIdCard('11010119900307755')).toBe(false)
    expect(validateIdCard('11010119900307755X1')).toBe(false)
  })

  it('校验位错误不通过', () => {
    expect(validateIdCard('110101199003077554')).toBe(false)
  })

  it('出生日期非法不通过', () => {
    expect(validateIdCard('110101199013077551')).toBe(false)
  })
})

describe('generateIdCard', () => {
  it('生成 100 个全部通过校验', () => {
    for (let i = 0; i < 100; i++) {
      const id = generateIdCard()
      expect(validateIdCard(id)).toBe(true)
    }
  })

  it('性别位符合规则', () => {
    const male = generateIdCard({ gender: 'male' })
    expect(Number(male[16]) % 2).toBe(1)
    const female = generateIdCard({ gender: 'female' })
    expect(Number(female[16]) % 2).toBe(0)
  })

  it('地区代码使用传入值', () => {
    const id = generateIdCard({ areaCode: '330106' })
    expect(id.startsWith('330106')).toBe(true)
  })

  it('年龄范围约束生效', () => {
    const now = new Date()
    for (let i = 0; i < 20; i++) {
      const id = generateIdCard({ minAge: 30, maxAge: 40 })
      const year = Number(id.slice(6, 10))
      const age = now.getFullYear() - year
      expect(age).toBeGreaterThanOrEqual(30)
      expect(age).toBeLessThanOrEqual(41) // 允许当年生日未过的边界
    }
  })
})

describe('generatePhone', () => {
  it('符合手机号格式', () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePhone()).toMatch(/^1[3-9]\d{9}$/)
    }
  })
})

describe('generateName', () => {
  it('非空且为中文', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateName(Math.random() < 0.5 ? 'male' : 'female')).toMatch(/^[一-龥]{2,4}$/)
    }
  })
})

describe('generateAddress', () => {
  it('包含省市区与门牌号', () => {
    const area = AREAS[0]
    const addr = generateAddress(area)
    expect(addr).toContain(area.province)
    expect(addr).toContain(area.district)
    expect(addr).toMatch(/\d+号/)
  })
})

describe('generatePeople', () => {
  it('生成数量正确且字段齐全', () => {
    const people = generatePeople(10)
    expect(people).toHaveLength(10)
    for (const p of people) {
      expect(validateIdCard(p.idCard)).toBe(true)
      expect(p.phone).toMatch(/^1[3-9]\d{9}$/)
      expect(['男', '女']).toContain(p.gender)
      expect(p.name.length).toBeGreaterThanOrEqual(2)
      expect(p.address.length).toBeGreaterThan(0)
    }
  })

  it('数量越界抛错', () => {
    expect(() => generatePeople(0)).toThrow()
    expect(() => generatePeople(501)).toThrow()
  })
})
