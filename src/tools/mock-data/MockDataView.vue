<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NIcon, NInputNumber, useMessage } from 'naive-ui'
import { CopyOutline, RefreshOutline } from '@vicons/ionicons5'
import { copyText } from '@/utils/clipboard'
import { generatePeople, type PersonInfo } from './generators'

const message = useMessage()

const count = ref(10)
const people = ref<PersonInfo[]>([])
const generated = ref(false)

function generate() {
  try {
    people.value = generatePeople(count.value)
    generated.value = true
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
  }
}

async function copy(text: string, label: string) {
  const ok = await copyText(text)
  message[ok ? 'success' : 'error'](ok ? `已复制${label}` : '复制失败')
}

const columns: { key: keyof PersonInfo; label: string }[] = [
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别' },
  { key: 'idCard', label: '身份证号' },
  { key: 'phone', label: '手机号' },
  { key: 'address', label: '地址' },
]

function rowData(p: PersonInfo) {
  return JSON.stringify(p, null, 2)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <span class="text-sm">生成数量</span>
      <n-input-number v-model:value="count" :min="1" :max="100" class="w-28" />
      <n-button type="primary" @click="generate">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>
        {{ generated ? '重新生成' : '生成' }}
      </n-button>
      <template v-if="people.length">
        <n-button secondary @click="copy(people.map((p) => rowData(p)).join('\n'), '全部数据')">
          <template #icon><n-icon><CopyOutline /></n-icon></template>
          复制全部（JSON）
        </n-button>
        <n-button secondary @click="copy(people.map((p) => columns.map((c) => p[c.key]).join('\t')).join('\n'), '表格数据')">
          <template #icon><n-icon><CopyOutline /></n-icon></template>
          复制全部（表格）
        </n-button>
      </template>
    </div>

    <p class="text-xs text-neutral-400">
      提示：生成的身份证、手机号均为随机虚构数据，仅用于开发测试，校验位符合真实算法。
    </p>

    <div v-if="people.length" class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-neutral-50 text-left dark:bg-neutral-800">
            <th class="border-b border-neutral-200 px-3 py-2 font-medium dark:border-neutral-700">#</th>
            <th v-for="col in columns" :key="col.key" class="border-b border-neutral-200 px-3 py-2 font-medium dark:border-neutral-700">
              {{ col.label }}
            </th>
            <th class="border-b border-neutral-200 px-3 py-2 font-medium dark:border-neutral-700"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(p, i) in people"
            :key="i"
            class="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
          >
            <td class="border-b border-neutral-100 px-3 py-2 text-neutral-400 dark:border-neutral-800">{{ i + 1 }}</td>
            <td v-for="col in columns" :key="col.key" class="mono border-b border-neutral-100 px-3 py-2 whitespace-nowrap dark:border-neutral-800">
              {{ p[col.key] }}
            </td>
            <td class="border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
              <n-button size="tiny" quaternary @click="copy(rowData(p), '该行')">
                <template #icon><n-icon><CopyOutline /></n-icon></template>
              </n-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-400 dark:border-neutral-700">
      设置数量后点击「生成」，将随机生成姓名、身份证号、手机号、地址
    </div>
  </div>
</template>
