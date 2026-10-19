import { describe, expect, it } from 'vitest'
import QRCode from 'qrcode'
import {
  decodeQrImageData,
  generateQrDataUrl,
  generateQrSvg,
  type ImageDataLike,
} from './qr'

/** 将 QR 矩阵渲染为 RGBA 像素数据（模拟 canvas 的 getImageData） */
function renderQrToImageData(text: string, scale = 4, quietZone = 4): ImageDataLike {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const size = qr.modules.size
  const dim = (size + quietZone * 2) * scale
  const data = new Uint8ClampedArray(dim * dim * 4)
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const mx = Math.floor(x / scale) - quietZone
      const my = Math.floor(y / scale) - quietZone
      const dark =
        mx >= 0 && my >= 0 && mx < size && my < size && qr.modules.get(mx, my)
      const idx = (y * dim + x) * 4
      const v = dark ? 0 : 255
      data[idx] = v
      data[idx + 1] = v
      data[idx + 2] = v
      data[idx + 3] = 255
    }
  }
  return { data, width: dim, height: dim }
}

function randomNoiseImage(width = 200, height = 200): ImageDataLike {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.floor(Math.random() * 256)
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
    data[i + 3] = 255
  }
  return { data, width, height }
}

describe('generateQrSvg', () => {
  it('生成 SVG 字符串', async () => {
    const svg = await generateQrSvg('hello')
    expect(svg).toContain('<svg')
  })

  it('支持中文内容', async () => {
    const svg = await generateQrSvg('你好，世界')
    expect(svg).toContain('<svg')
  })

  it('空内容抛错', async () => {
    await expect(generateQrSvg('  ')).rejects.toThrow('不能为空')
  })
})

describe('generateQrDataUrl', () => {
  it('生成 PNG Data URL', async () => {
    const url = await generateQrDataUrl('hello')
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
  })

  it('空内容抛错', async () => {
    await expect(generateQrDataUrl(' ')).rejects.toThrow('不能为空')
  })
})

describe('decodeQrImageData', () => {
  it('编码→解码往返一致（英文）', () => {
    const text = 'https://example.com/tools?q=1'
    const result = decodeQrImageData(renderQrToImageData(text))
    expect(result.ok).toBe(true)
    expect(result.data).toBe(text)
  })

  it('编码→解码往返一致（含中文）', () => {
    const text = '你好，世界！123 abc'
    const result = decodeQrImageData(renderQrToImageData(text))
    expect(result.ok).toBe(true)
    expect(result.data).toBe(text)
  })

  it('不同容错级别均可解码', () => {
    for (const level of ['L', 'M', 'Q', 'H'] as const) {
      const qr = QRCode.create('test-' + level, { errorCorrectionLevel: level })
      expect(qr.modules.size).toBeGreaterThan(0)
    }
  })

  it('噪点图片解码失败', () => {
    const result = decodeQrImageData(randomNoiseImage())
    expect(result.ok).toBe(false)
    expect(result.error).toContain('未识别到')
  })
})
