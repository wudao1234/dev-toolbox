<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NButton,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  useMessage,
} from 'naive-ui'
import {
  AddOutline,
  ClipboardOutline,
  CloudUploadOutline,
  CopyOutline,
  DiceOutline,
  DownloadOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { copyText } from '@/utils/clipboard'
import {
  cutoffDate,
  mergeTags,
  parseDishes,
  pickDishes,
  recentDishIds,
  serializeDishes,
  todayString,
  type Dish,
  type PickRecord,
} from './menu'

const message = useMessage()

const DISHES_KEY = 'random-menu:dishes'
const HISTORY_KEY = 'random-menu:history'
const TAGS_KEY = 'random-menu:tags'

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

/** 标签池：用户维护的可选标签，菜品用过的标签也会自动并入 */
const tagPool = ref<string[]>(load(TAGS_KEY, ['荤', '素', '汤']))
watch(tagPool, (v) => save(TAGS_KEY, v), { deep: true })

function addTagsToPool(tags: readonly string[]) {
  for (const t of tags) {
    if (!tagPool.value.includes(t)) tagPool.value.push(t)
  }
}

const newName = ref('')
const selectedTags = ref<string[]>([])

function toggleTag(tag: string) {
  const i = selectedTags.value.indexOf(tag)
  if (i >= 0) selectedTags.value.splice(i, 1)
  else selectedTags.value.push(tag)
}

const showNewTagInput = ref(false)
const newTagName = ref('')

function createTag() {
  const tag = newTagName.value.trim()
  if (!tag) return
  addTagsToPool([tag])
  if (!selectedTags.value.includes(tag)) selectedTags.value.push(tag)
  newTagName.value = ''
  showNewTagInput.value = false
}

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
  dishes.value.push({ id: newId(), name, tags: [...selectedTags.value] })
  newName.value = ''
  selectedTags.value = []
}

function removeDish(id: string) {
  dishes.value = dishes.value.filter((x) => x.id !== id)
}

function resetSample() {
  dishes.value = SAMPLE_DISHES.map((x) => ({ ...x, id: newId() }))
  tagPool.value = ['荤', '素', '汤']
  message.success('已恢复示例菜谱')
}

// ---- 导入 / 导出 ----
const fileInput = ref<HTMLInputElement>()

function doImport(text: string) {
  const existing = new Set(dishes.value.map((x) => x.name))
  const { dishes: imported, skipped } = parseDishes(text, existing, newId)
  if (!imported.length) {
    message.warning(skipped ? `没有新菜：${skipped} 道与现有菜谱重名` : '没有解析到有效内容')
    return
  }
  dishes.value.push(...imported)
  addTagsToPool(imported.flatMap((x) => x.tags))
  message.success(`已导入 ${imported.length} 道菜${skipped ? `，跳过 ${skipped} 道重名` : ''}`)
}

function exportDishes() {
  if (!dishes.value.length) {
    message.warning('菜谱为空，无可导出')
    return
  }
  const blob = new Blob([serializeDishes(dishes.value)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `菜谱-${todayString()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function importFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  doImport(await file.text())
}

const showPasteModal = ref(false)
const pasteText = ref('')

function confirmPasteImport() {
  doImport(pasteText.value)
  showPasteModal.value = false
  pasteText.value = ''
}

// ---- 标签配色（按标签名哈希取固定颜色） ----
const TAG_STYLES = [
  'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300',
]

function tagStyle(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0
  return TAG_STYLES[h % TAG_STYLES.length]
}

/** 可选标签：标签池 + 菜品实际使用的标签（保持出现顺序去重） */
const allTags = computed(() => mergeTags(tagPool.value, dishes.value))

// ---- 抽取设置 ----
const totalCount = ref(2)
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
  <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-5">
    <!-- 左栏：抽菜 -->
    <div class="flex flex-col gap-4 lg:col-span-3">
      <section class="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm dark:border-amber-900/60 dark:from-amber-950/30 dark:to-stone-900">
        <div class="p-5">
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <span class="text-neutral-600 dark:text-neutral-300">抽</span>
            <n-input-number v-model:value="totalCount" :min="1" :max="30" class="w-24" />
            <span class="text-neutral-600 dark:text-neutral-300">道菜</span>
            <span class="text-neutral-300 dark:text-neutral-600">|</span>
            <span class="text-neutral-600 dark:text-neutral-300">最近</span>
            <n-input-number v-model:value="cooldownDays" :min="0" :max="30" class="w-24" />
            <span class="text-neutral-600 dark:text-neutral-300">天吃过的不再抽（0 为不限制）</span>
          </div>
          <div v-if="allTags.length" class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span class="text-neutral-500 dark:text-neutral-400">分类配额（0 为不限）：</span>
            <label v-for="tag in allTags" :key="tag" class="flex items-center gap-1.5">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="tagStyle(tag)">{{ tag }}</span>
              <n-input-number v-model:value="quotas[tag]" :min="0" :max="20" class="w-20" size="small" />
            </label>
          </div>
          <div class="mt-5 flex items-center gap-3">
            <n-button type="primary" size="large" @click="pick">
              <template #icon><n-icon><DiceOutline /></n-icon></template>
              开始抽菜
            </n-button>
            <n-button v-if="picked.length" secondary @click="copyPicked">
              <template #icon><n-icon><CopyOutline /></n-icon></template>
              复制菜名
            </n-button>
          </div>
        </div>

        <!-- 抽菜结果 -->
        <div v-if="picked.length" class="border-t border-amber-200/70 p-5 dark:border-amber-900/50">
          <p class="mb-3 text-xs text-neutral-500 dark:text-neutral-400">{{ pickedDate }} 的菜单</p>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="(dish, i) in picked"
              :key="dish.id"
              class="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/80 px-3 py-2.5 shadow-sm transition-transform hover:-translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-800/80"
            >
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white dark:bg-amber-600">
                {{ i + 1 }}
              </span>
              <span class="font-medium">{{ dish.name }}</span>
              <span v-for="t in dish.tags" :key="t" class="ml-auto rounded-full px-2 py-0.5 text-xs font-medium" :class="tagStyle(t)">{{ t }}</span>
            </div>
          </div>
        </div>
        <p v-else class="border-t border-dashed border-amber-200/70 p-6 text-center text-sm text-neutral-400 dark:border-amber-900/50">
          设置数量和分类配额后点击「开始抽菜」，今天吃什么不再纠结
        </p>
      </section>

      <!-- 最近记录 -->
      <section v-if="recentHistory.length" class="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
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

    <!-- 右栏：菜谱管理 -->
    <section class="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <h2 class="font-medium">菜谱维护</h2>
        <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {{ dishes.length }} 道菜
        </span>
        <div class="ml-auto flex items-center gap-1">
          <n-button size="tiny" quaternary @click="fileInput?.click()">
            <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
            导入
          </n-button>
          <n-button size="tiny" quaternary @click="showPasteModal = true">
            <template #icon><n-icon><ClipboardOutline /></n-icon></template>
            粘贴导入
          </n-button>
          <n-button size="tiny" quaternary @click="exportDishes">
            <template #icon><n-icon><DownloadOutline /></n-icon></template>
            导出
          </n-button>
          <n-button size="tiny" quaternary @click="resetSample">示例</n-button>
        </div>
      </div>
      <input ref="fileInput" type="file" accept=".json,.txt" class="hidden" @change="importFile" />

      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <n-input v-model:value="newName" placeholder="菜名，如：鱼香肉丝" @keyup.enter="addDish" />
          <n-button secondary @click="addDish">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            添加
          </n-button>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs text-neutral-400">标签：</span>
          <button
            v-for="tag in allTags"
            :key="tag"
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
            :class="selectedTags.includes(tag)
              ? `${tagStyle(tag)} border-transparent shadow-sm`
              : 'border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:text-neutral-300'"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
          <n-input
            v-if="showNewTagInput"
            v-model:value="newTagName"
            size="tiny"
            class="!w-24"
            placeholder="新标签"
            @keyup.enter="createTag"
            @blur="createTag"
          />
          <n-button v-else size="tiny" quaternary @click="showNewTagInput = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            新标签
          </n-button>
        </div>
      </div>

      <div v-if="dishes.length" class="mt-3 grid max-h-96 grid-cols-1 gap-1.5 overflow-y-auto pr-1">
        <div
          v-for="dish in dishes"
          :key="dish.id"
          class="group flex items-center gap-2 rounded-lg border border-neutral-100 px-3 py-1.5 text-sm transition-colors hover:border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60"
        >
          <span class="truncate">{{ dish.name }}</span>
          <span v-for="t in dish.tags" :key="t" class="rounded-full px-2 py-0.5 text-xs font-medium" :class="tagStyle(t)">{{ t }}</span>
          <n-button class="ml-auto opacity-0 transition-opacity group-hover:opacity-100" size="tiny" quaternary @click="removeDish(dish.id)">
            <template #icon><n-icon><TrashOutline /></n-icon></template>
          </n-button>
        </div>
      </div>
      <p v-else class="mt-3 rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400 dark:border-neutral-700">
        菜谱为空，添加几道菜或从文件 / 粘贴导入
      </p>
      <p class="mt-3 text-xs leading-relaxed text-neutral-400">
        数据保存在浏览器本地。导入支持 JSON 文件或文本（每行一道：<span class="mono">菜名,标签</span>），重名自动跳过。
      </p>
    </section>

    <!-- 粘贴导入弹窗 -->
    <n-modal v-model:show="showPasteModal" preset="card" title="粘贴导入菜谱" class="w-[90vw] max-w-lg">
      <p class="mb-2 text-xs text-neutral-400">
        每行一道菜，格式：<span class="mono">菜名,标签1,标签2</span>；也支持粘贴 serializeDishes 导出的 JSON。
      </p>
      <n-input
        v-model:value="pasteText"
        type="textarea"
        placeholder="红烧肉,荤&#10;蒜蓉炒青菜,素&#10;紫菜蛋花汤,汤"
        :rows="8"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showPasteModal = false">取消</n-button>
          <n-button type="primary" :disabled="!pasteText.trim()" @click="confirmPasteImport">导入</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>
