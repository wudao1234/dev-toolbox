<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NAlert,
  NButton,
  NIcon,
  NSelect,
  NSpace,
  NTabPane,
  NTabs,
  useMessage,
} from 'naive-ui'
import { CopyOutline } from '@vicons/ionicons5'
import { copyText } from '@/utils/clipboard'
import {
  formatJson,
  jsonDiffPaths,
  jsonDeepEqual,
  minifyJson,
  normalizeJson,
  parseJson,
} from './json'
import { diffLines } from '@/tools/text-diff/diff'

const message = useMessage()

const input = ref('')
const indent = ref(2)

const parseResult = computed(() => parseJson(input.value))

const formattedOutput = computed(() => {
  if (!input.value.trim()) return ''
  if (!parseResult.value.ok) return ''
  return formatJson(parseResult.value.value, indent.value)
})

const minifiedOutput = computed(() => {
  if (!input.value.trim()) return ''
  if (!parseResult.value.ok) return ''
  return minifyJson(parseResult.value.value)
})

const parseError = computed(() => {
  if (!input.value.trim()) return null
  const r = parseResult.value
  return r.ok ? null : r
})

// ---- 对比 ----
const compareA = ref('')
const compareB = ref('')
const showCompareResult = ref(false)

const compareSummary = computed(() => {
  if (!showCompareResult.value) return null
  const a = parseJson(compareA.value)
  const b = parseJson(compareB.value)
  if (!a.ok) return { error: `左侧 JSON 解析失败：${a.message}` }
  if (!b.ok) return { error: `右侧 JSON 解析失败：${b.message}` }
  if (jsonDeepEqual(a.value, b.value)) {
    return { equal: true as const }
  }
  return { equal: false as const, paths: jsonDiffPaths(a.value, b.value) }
})

const compareDiffLines = computed(() => {
  if (!compareSummary.value || compareSummary.value.equal) return []
  const a = parseJson(compareA.value)
  const b = parseJson(compareB.value)
  if (!a.ok || !b.ok) return []
  // 键排序后格式化，让差异行只反映真实的数据差异
  const textA = JSON.stringify(normalizeJson(a.value), null, 2)
  const textB = JSON.stringify(normalizeJson(b.value), null, 2)
  return diffLines(textA, textB)
})

function runCompare() {
  showCompareResult.value = true
}

async function copy(text: string, label: string) {
  if (!text) return
  const ok = await copyText(text)
  message[ok ? 'success' : 'error'](ok ? `已复制${label}` : '复制失败')
}

const rowClass: Record<string, string> = {
  same: '',
  added: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300',
  removed: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300',
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <n-tabs type="segment" animated>
      <!-- 格式化 -->
      <n-tab-pane name="format" tab="格式化 / 校验">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">输入</span>
              <n-select
                v-model:value="indent"
                :options="[
                  { label: '缩进 2 空格', value: 2 },
                  { label: '缩进 4 空格', value: 4 },
                ]"
                class="w-36"
                size="small"
              />
            </div>
            <textarea
              v-model="input"
              class="mono h-72 w-full resize-none rounded-lg border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
              placeholder='粘贴 JSON，如 {"a": 1}'
              spellcheck="false"
            />
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">输出</span>
              <n-button size="small" secondary :disabled="!formattedOutput" @click="copy(formattedOutput, '格式化结果')">
                <template #icon><n-icon><CopyOutline /></n-icon></template>
                复制
              </n-button>
            </div>
            <pre class="mono h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">{{ formattedOutput || '格式化结果将显示在这里' }}</pre>
          </div>
        </div>
        <n-alert v-if="parseError" type="error" class="mt-4" :title="'JSON 解析失败'">
          {{ parseError.message }}
          <template v-if="parseError.line !== null">
            （第 {{ parseError.line }} 行，第 {{ parseError.column }} 列）
          </template>
        </n-alert>
      </n-tab-pane>

      <!-- 压缩 -->
      <n-tab-pane name="minify" tab="压缩">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium">输入</span>
            <textarea
              v-model="input"
              class="mono h-72 w-full resize-none rounded-lg border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="粘贴需要压缩的 JSON"
              spellcheck="false"
            />
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">输出</span>
              <n-space>
                <n-button size="small" secondary :disabled="!minifiedOutput" @click="copy(minifiedOutput, '压缩结果')">
                  <template #icon><n-icon><CopyOutline /></n-icon></template>
                  复制
                </n-button>
              </n-space>
            </div>
            <pre class="mono h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">{{ minifiedOutput || '压缩结果将显示在这里' }}</pre>
          </div>
        </div>
        <n-alert v-if="parseError" type="error" class="mt-4" :title="'JSON 解析失败'">
          {{ parseError.message }}
        </n-alert>
      </n-tab-pane>

      <!-- 对比 -->
      <n-tab-pane name="compare" tab="对比">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium">JSON A</span>
            <textarea
              v-model="compareA"
              class="mono h-48 w-full resize-none rounded-lg border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
              spellcheck="false"
            />
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium">JSON B</span>
            <textarea
              v-model="compareB"
              class="mono h-48 w-full resize-none rounded-lg border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
              spellcheck="false"
            />
          </div>
        </div>
        <n-button type="primary" class="mt-4" @click="runCompare">对比</n-button>

        <div v-if="showCompareResult && compareSummary" class="mt-4">
          <n-alert v-if="'error' in compareSummary" type="error" :title="compareSummary.error" />
          <template v-else-if="compareSummary.equal">
            <n-alert type="success" title="两个 JSON 语义相等（忽略键顺序）" />
          </template>
          <template v-else>
            <n-alert type="warning" title="两个 JSON 存在差异" class="mb-4" />
            <div class="mb-2 text-sm font-medium">差异路径（共 {{ compareSummary.paths.length }} 处）：</div>
            <ul class="mono mb-4 max-h-40 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
              <li v-for="(path, i) in compareSummary.paths" :key="i">{{ path }}</li>
            </ul>
            <div class="overflow-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" style="max-height: 40vh">
              <div
                v-for="(line, i) in compareDiffLines"
                :key="i"
                class="mono flex text-sm leading-6"
                :class="rowClass[line.type]"
              >
                <span class="w-8 shrink-0 select-none text-right text-neutral-400">{{ line.oldIndex ?? '' }}</span>
                <span class="w-8 shrink-0 select-none border-r border-neutral-200 pr-1 text-right text-neutral-400 dark:border-neutral-800">{{ line.newIndex ?? '' }}</span>
                <span class="w-6 shrink-0 select-none text-center">
                  {{ line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' ' }}
                </span>
                <span class="whitespace-pre-wrap break-all">{{ line.content }}</span>
              </div>
            </div>
          </template>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
