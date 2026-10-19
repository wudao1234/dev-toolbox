<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import {
  NButton,
  NConfigProvider,
  NIcon,
  NMessageProvider,
  darkTheme,
} from 'naive-ui'
import { HomeOutline, MoonOutline, SunnyOutline } from '@vicons/ionicons5'
import { tools } from '@/tools/registry'

const route = useRoute()
const isDark = ref(false)

onMounted(() => {
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = saved ? saved === 'dark' : prefersDark
})

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}
</script>

<template>
  <n-config-provider :theme="isDark ? darkTheme : null">
    <n-message-provider>
      <div class="flex h-full flex-col bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        <!-- 顶栏 -->
        <header class="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
          <RouterLink to="/" class="flex items-center gap-2 text-base font-bold no-underline text-inherit">
            开发工具箱
          </RouterLink>
          <n-button quaternary circle @click="toggleTheme" :title="isDark ? '切换浅色' : '切换深色'">
            <template #icon>
              <n-icon><MoonOutline v-if="!isDark" /><SunnyOutline v-else /></n-icon>
            </template>
          </n-button>
        </header>

        <div class="flex min-h-0 flex-1">
          <!-- 侧边导航 -->
          <aside class="hidden w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-neutral-200 p-3 md:flex dark:border-neutral-800">
            <RouterLink
              to="/"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline transition-colors"
              :class="route.path === '/'
                ? 'bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800'"
            >
              <n-icon><HomeOutline /></n-icon>
              首页
            </RouterLink>
            <RouterLink
              v-for="tool in tools"
              :key="tool.path"
              :to="tool.path"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline transition-colors"
              :class="route.path === tool.path
                ? 'bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800'"
            >
              <n-icon><component :is="tool.icon" /></n-icon>
              {{ tool.title }}
            </RouterLink>
          </aside>

          <!-- 主内容 -->
          <main class="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
            <RouterView />
          </main>
        </div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>
