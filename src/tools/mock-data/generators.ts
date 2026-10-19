import { AREAS, STREETS } from './areas'

/** GB 11643-1999 加权因子与校验码映射 */
const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const CHECK_CODES = '10X98765432'

const SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高',
  '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
  '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕', '苏', '卢', '蒋', '蔡', '贾',
]

const MALE_GIVEN = [
  '伟', '强', '军', '磊', '洋', '勇', '杰', '涛', '明', '超', '龙', '辉', '鹏', '华', '飞',
  '鑫', '波', '斌', '宇', '浩', '凯', '旭', '阳', '峰', '建国', '志远', '子轩', '浩然', '宇航', '天佑',
]

const FEMALE_GIVEN = [
  '芳', '娜', '敏', '静', '丽', '艳', '娟', '霞', '燕', '玲', '英', '慧', '美', '兰', '凤',
  '洁', '梅', '琳', '素', '云', '莲', '雪', '荣', '香', '月', '婷', '雅', '琪', '璐', '欣怡',
  '雨桐', '思琪', '梦洁', '晓彤', '诗涵', '梓萱',
]

/** 手机号前三位号段（中国大陆） */
const PHONE_PREFIXES = [
  '130', '131', '132', '133', '135', '136', '137', '138', '139',
  '150', '151', '152', '153', '155', '156', '157', '158', '159',
  '180', '181', '182', '183', '185', '186', '187', '188', '189',
  '133', '149', '173', '177', '180', '181', '189', '199',
]

export interface PersonInfo {
  name: string
  gender: '男' | '女'
  idCard: string
  phone: string
  address: string
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

/** 根据前 17 位计算身份证校验位 */
export function computeCheckDigit(first17: string): string {
  if (!/^\d{17}$/.test(first17)) {
    throw new Error('前 17 位必须为数字')
  }
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += Number(first17[i]) * WEIGHTS[i]
  }
  return CHECK_CODES[sum % 11]
}

/** 校验 18 位身份证号（含校验位） */
export function validateIdCard(id: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(id)) return false
  const birth = id.slice(6, 14)
  const y = Number(birth.slice(0, 4))
  const m = Number(birth.slice(4, 6))
  const d = Number(birth.slice(6, 8))
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return false
  return computeCheckDigit(id.slice(0, 17)) === id[17].toUpperCase()
}

export interface IdCardOptions {
  areaCode?: string
  gender?: 'male' | 'female'
  minAge?: number
  maxAge?: number
}

/** 随机生成身份证号（校验位符合 GB 11643 算法） */
export function generateIdCard(options: IdCardOptions = {}): string {
  const area = options.areaCode ?? pick(AREAS).code
  if (!/^\d{6}$/.test(area)) {
    throw new Error('地区代码必须为 6 位数字')
  }

  const minAge = options.minAge ?? 18
  const maxAge = options.maxAge ?? 65
  const now = new Date()
  const age = randomInt(minAge, maxAge)
  const year = now.getFullYear() - age
  const month = randomInt(1, 12)
  const day = randomInt(1, new Date(year, month, 0).getDate())
  const birth = `${year}${pad(month, 2)}${pad(day, 2)}`

  // 顺序码：第 17 位奇数为男、偶数为女
  let seq = randomInt(1, 499) * 2
  if (options.gender === 'male') seq -= 1
  if (options.gender === 'female') seq = seq - 1 + 1 // 保持偶数
  const seqStr = pad(seq, 3)

  const first17 = `${area}${birth}${seqStr}`
  return first17 + computeCheckDigit(first17)
}

export function generatePhone(): string {
  const prefix = pick(PHONE_PREFIXES)
  let rest = ''
  for (let i = 0; i < 8; i++) {
    rest += String(randomInt(0, 9))
  }
  return prefix + rest
}

export function generateName(gender: 'male' | 'female'): string {
  const given = gender === 'male' ? pick(MALE_GIVEN) : pick(FEMALE_GIVEN)
  return pick(SURNAMES) + given
}

export function generateAddress(area = pick(AREAS)): string {
  const street = pick(STREETS)
  const number = randomInt(1, 999)
  const village = randomInt(1, 30)
  return `${area.province}${area.city}${area.district}${street}${number}号${village}栋${randomInt(101, 2504)}室`
}

/** 生成一条完整的人员信息 */
export function generatePerson(): PersonInfo {
  const gender = Math.random() < 0.5 ? 'male' : 'female'
  const area = pick(AREAS)
  return {
    name: generateName(gender),
    gender: gender === 'male' ? '男' : '女',
    idCard: generateIdCard({ gender, areaCode: area.code }),
    phone: generatePhone(),
    address: generateAddress(area),
  }
}

export function generatePeople(count: number): PersonInfo[] {
  if (count < 1 || count > 500) {
    throw new Error('生成数量需在 1-500 之间')
  }
  return Array.from({ length: count }, () => generatePerson())
}
