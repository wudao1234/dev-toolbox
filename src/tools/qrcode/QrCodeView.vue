<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { NAlert, NButton, NColorPicker, NIcon, NSelect, useMessage } from 'naive-ui'
import { CopyOutline, DownloadOutline } from '@vicons/ionicons5'
import { copyText } from '@/utils/clipboard'
import {
  decodeQrFile,
  ERROR_CORRECTION_LABELS,
  generateQrDataUrl,
  type ErrorCorrectionLevel,
} from './qr'

const message = useMessage()

// ---- 生成 ----
const content = ref('https://example.com')
const size = ref(256)
const ecLevel = ref<ErrorCorrectionLevel>('M')
const darkColor = ref('#000000FF')
const lightColor = ref('#FFFFFFFF')
const dataUrl = ref('')
const generating = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function regenerate() {
  if (!content.value.trim()) {
    dataUrl.value = ''
    return
  }
  generating.value = true
  try {
    dataUrl.value = await generateQrDataUrl(content.value, {
      width: size.value,
      errorCorrectionLevel: ecLevel.value,
      dark: darkColor.value,
      light: lightColor.value,
    })
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
  } finally {
    generating.value = false
  }
}

watch([content, size, ecLevel, darkColor, lightColor], () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(regenerate, 300)
})

function download() {
  if (!dataUrl.value) return
  const a = document.createElement('a')
  a.href = dataUrl.value
  a.download = `qrcode-${size.value}px.png`
  a.click()
}

regenerate()

// ---- 解码 ----
const fileInput = ref<HTMLInputElement | null>(null)
const imagePreview = ref('')
const decodedText = ref('')
const decodeError = ref('')
const decoding = ref(false)

function pickFile() {
  fileInput.value?.click()
}

async function handleFile(file: File | undefined | null) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    message.error('请选择图片文件')
    return
  }
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = URL.createObjectURL(file)
  await runDecode(file)
}

async function runDecode(file?: File) {
  const target = file ?? lastFile
  if (!target) return
  decoding.value = true
  decodeError.value = ''
  decodedText.value = ''
  const result = await decodeQrFile(target)
  decoding.value = false
  if (result.ok && result.data !== undefined) {
    decodedText.value = result.data
  } else {
    decodeError.value = result.error ?? '解码失败'
  }
}

let lastFile: File | null = null

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    lastFile = file
    handleFile(file)
  }
  input.value = ''
}

function onPaste(e: ClipboardEvent) {
  const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'))
  if (file) {
    lastFile = file
    handleFile(file)
  }
}

async function copyResult() {
  const ok = await copyText(decodedText.value)
  message[ok ? 'success' : 'error'](ok ? '已复制解码结果' : '复制失败')
}

onBeforeUnmount(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
})
</script>

<template>
  <n-tabs type="segment" animated>
    <!-- 生成 -->
    <n-tab-pane name="generate" tab="生成">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="flex flex-col gap-3">
          <span class="text-sm font-medium">内容</span>
          <textarea
            v-model="content"
            class="mono h-40 w-full resize-none rounded-lg border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
            placeholder="输入文本或 URL，支持中文"
            spellcheck="false"
          />
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2 text-sm">
              <span>尺寸</span>
              <n-select
                v-model:value="size"
                :options="[128, 256, 384, 512].map((v) => ({ label: `${v} px`, value: v }))"
                class="w-28"
              />
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span>容错级别</span>
              <n-select
                v-model:value="ecLevel"
                :options="(Object.keys(ERROR_CORRECTION_LABELS) as ErrorCorrectionLevel[]).map((k) => ({
                  label: ERROR_CORRECTION_LABELS[k],
                  value: k,
                }))"
                class="w-36"
              />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-4 text-sm">
            <div class="flex items-center gap-2">
              <span>前景色</span>
              <n-color-picker v-model:value="darkColor" :swatches="['#000000', '#1d4ed8', '#047857', '#b91c1c']" style="width: 90px" />
            </div>
            <div class="flex items-center gap-2">
              <span>背景色</span>
              <n-color-picker v-model:value="lightColor" :swatches="['#FFFFFF', '#FEF3C7', '#DBEAFE', '#FEE2E2']" style="width: 90px" />
            </div>
          </div>
        </div>

        <div class="flex flex-col items-center gap-3">
          <div class="flex h-64 w-64 items-center justify-center rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700">
            <img v-if="dataUrl" :src="dataUrl" :width="size" :height="size" alt="二维码" class="max-h-full max-w-full" />
            <span v-else class="text-sm text-neutral-400">输入内容后自动生成</span>
          </div>
          <n-button secondary :disabled="!dataUrl || generating" @click="download">
            <template #icon><n-icon><DownloadOutline /></n-icon></template>
            下载 PNG
          </n-button>
        </div>
      </div>
    </n-tab-pane>

    <!-- 解码 -->
    <n-tab-pane name="decode" tab="解码">
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          class="flex h-64 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 text-sm text-neutral-400 transition-colors hover:border-blue-400 hover:text-blue-500 dark:border-neutral-700"
          tabindex="0"
          @click="pickFile"
          @paste="onPaste"
        >
          <img v-if="imagePreview" :src="imagePreview" alt="待解码图片" class="max-h-56 max-w-full object-contain" />
          <template v-else>
            <span>点击选择二维码图片</span>
            <span class="text-xs">或直接在框内 Ctrl+V 粘贴截图</span>
          </template>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">解码结果</span>
            <n-button size="small" secondary :disabled="!decodedText" @click="copyResult">
              <template #icon><n-icon><CopyOutline /></n-icon></template>
              复制
            </n-button>
          </div>
          <textarea
            v-model="decodedText"
            class="mono h-40 w-full resize-none rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="解码结果将显示在这里"
            readonly
            spellcheck="false"
          />
          <n-alert v-if="decodeError" type="error" :title="decodeError" />
          <n-alert v-else-if="decoding" type="info" title="解码中…" />
          <n-alert v-else-if="decodedText" type="success" title="解码成功" />
        </div>
      </div>
    </n-tab-pane>
  </n-tabs>
</template>
