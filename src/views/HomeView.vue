<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { NIcon, NInput } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import { tools } from '@/tools/registry'

const keyword = ref('')

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return tools
  return tools.filter((tool) =>
    [tool.title, tool.description, ...tool.keywords]
      .join(' ')
      .toLowerCase()
      .includes(kw),
  )
})
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-2 text-2xl font-bold">开发工具箱</h1>
    <p class="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
      常用开发小工具集合，数据均在浏览器本地处理，不会上传到任何服务器。
    </p>

    <n-input
      v-model:value="keyword"
      size="large"
      round
      clearable
      placeholder="搜索工具，如：json、身份证、diff"
      class="mb-6"
    >
      <template #prefix>
        <n-icon><SearchOutline /></n-icon>
      </template>
    </n-input>

    <div v-if="filtered.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="tool in filtered"
        :key="tool.path"
        :to="tool.path"
        class="group flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800"
      >
        <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
          <n-icon size="22"><component :is="tool.icon" /></n-icon>
        </div>
        <div class="min-w-0">
          <div class="font-medium text-neutral-900 group-hover:text-blue-600 dark:text-neutral-100 dark:group-hover:text-blue-300">
            {{ tool.title }}
          </div>
          <div class="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            {{ tool.description }}
          </div>
        </div>
      </RouterLink>
    </div>

    <div v-else class="py-16 text-center text-sm text-neutral-400">
      没有找到匹配「{{ keyword }}」的工具
    </div>
  </div>
</template>
