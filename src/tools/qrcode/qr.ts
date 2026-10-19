import QRCode from 'qrcode'
import jsQR from 'jsqr'

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrEncodeOptions {
  /** 图片边长（像素） */
  width?: number
  /** 静默区（边距）大小 */
  margin?: number
  errorCorrectionLevel?: ErrorCorrectionLevel
  /** 前景色 */
  dark?: string
  /** 背景色 */
  light?: string
}

export const ERROR_CORRECTION_LABELS: Record<ErrorCorrectionLevel, string> = {
  L: 'L（约 7%）',
  M: 'M（约 15%）',
  Q: 'Q（约 25%）',
  H: 'H（约 30%）',
}

/** 生成二维码 PNG Data URL（浏览器端使用，依赖 canvas） */
export async function generateQrDataUrl(
  text: string,
  options: QrEncodeOptions = {},
): Promise<string> {
  if (!text.trim()) {
    throw new Error('二维码内容不能为空')
  }
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
    margin: options.margin ?? 2,
    width: options.width ?? 256,
    color: {
      dark: options.dark ?? '#000000ff',
      light: options.light ?? '#ffffffff',
    },
  })
}

/** 生成二维码 SVG 字符串（无 canvas 依赖，便于测试） */
export async function generateQrSvg(
  text: string,
  options: QrEncodeOptions = {},
): Promise<string> {
  if (!text.trim()) {
    throw new Error('二维码内容不能为空')
  }
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
    margin: options.margin ?? 2,
    color: {
      dark: options.dark ?? '#000000',
      light: options.light ?? '#ffffff',
    },
  })
}

export interface ImageDataLike {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface QrDecodeResult {
  ok: boolean
  data?: string
  error?: string
}

/** 从像素数据解码二维码（attemptBoth 同时尝试正色与反色） */
export function decodeQrImageData(imageData: ImageDataLike): QrDecodeResult {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  if (!result) {
    return { ok: false, error: '未识别到二维码，请换一张更清晰、完整的图片' }
  }
  return { ok: true, data: result.data }
}

/** 从图片文件解码二维码 */
export async function decodeQrFile(file: File): Promise<QrDecodeResult> {
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return { ok: false, error: '浏览器不支持 canvas，无法解码' }
    }
    ctx.drawImage(bitmap, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    bitmap.close()
    return decodeQrImageData(imageData)
  } catch {
    return { ok: false, error: '图片读取失败，请确认是有效的图片文件' }
  }
}
