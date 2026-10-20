<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NIcon, NInput, NInputNumber, NTag, useMessage } from 'naive-ui'
import { AddOutline, CopyOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import { copyText } from '@/utils/clipboard'
import {
  cutoffDate,
  pickDishes,
  recentDishIds,
  todayString,
  type Dish,
  type PickRecord,
} from './menu'

const message = useMessage()

const DISHES_KEY = 'random-menu:dishes'
const HISTORY_KEY = 'random-menu:history'

const SAMPLE_DISHES: Dish[] = [
  { id: 'sample-1', name: '红烧肉', tags: ['荤'] },
  { id: 'sample-2', name: '清蒸鲈鱼', tags: ['荤'] },
  { id: 'sample-3', name: '宫保鸡丁', tags: ['荤'] },
  { id: 'sample-4', name: '番茄牛腩', tags: ['荤'] },
  { id: 'sample-5', name: '可乐鸡翅', tags: ['荤'] },
  { id: 'sample-6', name: '青椒肉丝', tags: ['荤'] },
  { id: 'sample-7', name: '蒜蓉炒青菜', tags: ['素'] },
  { id: 'sample-8', name: '麻婆豆腐', tags: ['素'] },
  { id: 'sample-9', name: '地三鲜', tags: ['素'] },
  { id: 'sample-10', name: '干煸豆角', tags: ['素'] },
  { id: 'sample-11', name: '凉拌黄瓜', tags: ['素'] },
  { id: 'sample-12', name: '西红柿蛋汤', tags: ['汤'] },
  { id: 'sample-13', name: '紫菜蛋花汤', tags: ['汤'] },
  { id: 'sample-14', name: '玉米排骨汤', tags: ['荤', '汤'] },
]

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ---- 菜谱维护 ----
const dishes = ref<Dish[]>(load(DISHES_KEY, SAMPLE_DISHES))
watch(dishes, (v) => save(DISHES_KEY, v), { deep: true })

const newName = ref('')
const newTags = ref('')

function addDish() {
  const name = newName.value.trim()
  if (!name) {
    message.warning('请输入菜名')
    return
  }
  if (dishes.value.some((x) => x.name === name)) {
    message.warning('这道菜已在菜谱中')
    return
  }
  const tags = newTags.value
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  dishes.value.push({ id: newId(), name, tags })
  newName.value = ''
  newTags.value = ''
}

function removeDish(id: string) {
  dishes.value = dishes.value.filter((x) => x.id !== id)
}

function resetSample() {
  dishes.value = SAMPLE_DISHES.map((x) => ({ ...x, id: newId() }))
  message.success('已恢复示例菜谱')
}

/** 菜谱中出现过的所有标签（保持出现顺序去重） */
const allTags = computed(() => {
  const seen: string[] = []
  for (const dish of dishes.value) {
    for (const t of dish.tags) {
      if (!seen.includes(t)) seen.push(t)
    }
  }
  return seen
})

// ---- 抽取设置 ----
const totalCount = ref(3)
const cooldownDays = ref(3)
const quotas = ref<Record<string, number>>({})

// 新标签出现时默认配额 0
watch(allTags, (tags) => {
  for (const t of tags) {
    if (!(t in quotas.value)) quotas.value[t] = 0
  }
}, { immediate: true })

// ---- 历史记录 ----
const history = ref<PickRecord[]>(load(HISTORY_KEY, []))
watch(history, (v) => save(HISTORY_KEY, v), { deep: true })

const picked = ref<Dish[]>([])
const pickedDate = ref('')

function pick() {
  if (!dishes.value.length) {
    message.warning('菜谱为空，请先添加菜品')
    return
  }
  if (totalCount.value < 1) {
    message.warning('抽取数量至少为 1')
    return
  }
  const today = todayString()
  const exclude = cooldownDays.value > 0
    ? recentDishIds(history.value, cutoffDate(today, cooldownDays.value))
    : new Set<string>()
  const quotaList = allTags.value
    .map((tag) => ({ tag, count: quotas.value[tag] ?? 0 }))
    .filter((q) => q.count > 0)
  picked.value = pickDishes(dishes.value, totalCount.value, quotaList, exclude)
  pickedDate.value = today
  if (!picked.value.length) {
    message.warning('没有可抽取的菜（可能被冷却期全部排除），试试缩短冷却天数')
    return
  }
  // 追加本次抽取到历史
  history.value = [...history.value, ...picked.value.map((d) => ({ dishId: d.id, date: today }))]
  if (picked.value.length < totalCount.value) {
    message.warning(`候选不足，只抽到 ${picked.value.length} 道（可补充菜谱或缩短冷却天数）`)
  }
}

async function copyPicked() {
  const text = picked.value.map((d) => d.name).join('、')
  const ok = await copyText(text)
  message[ok ? 'success' : 'error'](ok ? '已复制菜名' : '复制失败')
}

function clearHistory() {
  history.value = []
  message.success('已清空抽取历史')
}

/** 最近记录按日期合并展示（最近 7 天） */
const recentHistory = computed(() => {
  const byDate = new Map<string, string[]>()
  for (const rec of history.value) {
    const dish = dishes.value.find((x) => x.id === rec.dishId)
    const name = dish?.name ?? '（已删除的菜）'
    byDate.set(rec.date, [...(byDate.get(rec.date) ?? []), name])
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7)
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 随机抽菜 -->
    <section class="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 class="mb-3 font-medium">随机抽菜</h2>
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <span>抽</span>
        <n-input-number v-model:value="totalCount" :min="1" :max="30" class="w-24" />
        <span>道菜</span>
        <span class="text-neutral-400">|</span>
        <span>最近</span>
        <n-input-number v-model:value="cooldownDays" :min="0" :max="30" class="w-24" />
        <span>天吃过的不再抽（0 为不限制）</span>
      </div>
      <div v-if="allTags.length" class="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span class="text-neutral-500">分类配额（0 为不限）：</span>
        <label v-for="tag in allTags" :key="tag" class="flex items-center gap-1.5">
          <n-tag size="small">{{ tag }}</n-tag>
          <n-input-number v-model:value="quotas[tag]" :min="0" :max="20" class="w-20" size="small" />
        </label>
      </div>
      <div class="mt-4 flex items-center gap-3">
        <n-button type="primary" @click="pick">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          开始抽菜
        </n-button>
        <n-button v-if="picked.length" secondary @click="copyPicked">
          <template #icon><n-icon><CopyOutline /></n-icon></template>
          复制菜名
        </n-button>
      </div>

      <div v-if="picked.length" class="mt-4 flex flex-wrap gap-2">
        <div
          v-for="dish in picked"
          :key="dish.id"
          class="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700"
        >
          <span class="font-medium">{{ dish.name }}</span>
          <n-tag v-for="t in dish.tags" :key="t" size="tiny">{{ t }}</n-tag>
        </div>
      </div>
      <p v-else class="mt-4 rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400 dark:border-neutral-700">
        设置数量和分类配额后点击「开始抽菜」，今天吃什么不再纠结
      </p>
    </section>

    <!-- 菜谱维护 -->
    <section class="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <h2 class="font-medium">菜谱维护</h2>
        <span class="text-xs text-neutral-400">共 {{ dishes.length }} 道菜，数据保存在浏览器本地</span>
        <n-button size="tiny" quaternary @click="resetSample">恢复示例菜谱</n-button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <n-input v-model:value="newName" placeholder="菜名，如：鱼香肉丝" class="w-48" @keyup.enter="addDish" />
        <n-input v-model:value="newTags" placeholder="分类标签，如：荤（多个用逗号分隔）" class="w-64" @keyup.enter="addDish" />
        <n-button secondary @click="addDish">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          添加
        </n-button>
      </div>
      <div v-if="dishes.length" class="mt-3 flex flex-wrap gap-2">
        <div
          v-for="dish in dishes"
          :key="dish.id"
          class="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          <span>{{ dish.name }}</span>
          <n-tag v-for="t in dish.tags" :key="t" size="tiny">{{ t }}</n-tag>
          <n-button size="tiny" quaternary @click="removeDish(dish.id)">
            <template #icon><n-icon><TrashOutline /></n-icon></template>
          </n-button>
        </div>
      </div>
      <p v-else class="mt-3 text-sm text-neutral-400">菜谱为空，先添加几道菜吧</p>
    </section>

    <!-- 最近记录 -->
    <section v-if="recentHistory.length" class="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div class="mb-3 flex items-center gap-3">
        <h2 class="font-medium">最近抽取记录</h2>
        <n-button size="tiny" quaternary @click="clearHistory">清空记录</n-button>
      </div>
      <ul class="flex flex-col gap-1.5 text-sm">
        <li v-for="[date, names] in recentHistory" :key="date">
          <span class="text-neutral-400">{{ date }}</span>
          <span class="ml-2">{{ names.join('、') }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
