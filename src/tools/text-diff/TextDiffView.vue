<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NCheckbox, NIcon } from 'naive-ui'
import { TrashOutline } from '@vicons/ionicons5'
import { diffLines, diffStats, type DiffLine } from './diff'

const oldText = ref('')
const newText = ref('')
const ignoreTrimWhitespace = ref(false)
const ignoreBlankLines = ref(false)

/** null 表示尚未点击对比 */
const result = ref<DiffLine[] | null>(null)

const stats = computed(() => (result.value ? diffStats(result.value) : null))

function runDiff() {
  result.value = diffLines(oldText.value, newText.value, {
    ignoreTrimWhitespace: ignoreTrimWhitespace.value,
    ignoreBlankLines: ignoreBlankLines.value,
  })
}

watch([ignoreTrimWhitespace, ignoreBlankLines], () => {
  if (result.value !== null) runDiff()
})

function clear() {
  oldText.value = ''
  newText.value = ''
  result.value = null
}

const rowClass: Record<DiffLine['type'], string> = {
  same: '',
  added: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300',
  removed: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300',
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex flex-wrap items-center gap-4">
      <n-checkbox v-model:checked="ignoreTrimWhitespace">忽略行首尾空白</n-checkbox>
      <n-checkbox v-model:checked="ignoreBlankLines">忽略空行</n-checkbox>
      <div class="ml-auto flex items-center gap-3">
        <span v-if="stats" class="text-sm text-neutral-500 dark:text-neutral-400">
          <span class="text-green-600 dark:text-green-400">+{{ stats.added }}</span>
          &nbsp;
          <span class="text-red-600 dark:text-red-400">−{{ stats.removed }}</span>
          &nbsp;
          <span>未变 {{ stats.unchanged }}</span>
        </span>
        <n-button type="primary" @click="runDiff">对比</n-button>
        <n-button secondary @click="clear">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          清空
        </n-button>
      </div>
    </div>

    <div class="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2" style="min-height: 200px">
      <textarea
        v-model="oldText"
        class="mono w-full resize-none rounded-lg border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
        placeholder="原始文本（左）"
        spellcheck="false"
      />
      <textarea
        v-model="newText"
        class="mono w-full resize-none rounded-lg border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
        placeholder="修改后文本（右）"
        spellcheck="false"
      />
    </div>

    <div v-if="result" class="overflow-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" style="max-height: 45vh">
      <div
        v-for="(line, i) in result"
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
      <div v-if="!result.length" class="p-4 text-center text-sm text-neutral-400">
        两段文本内容为空
      </div>
    </div>
    <div v-else class="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400 dark:border-neutral-700">
      输入两段文本后点击「对比」，差异将显示在这里
    </div>
  </div>
</template>
