import { createRouter, createWebHistory } from 'vue-router'
import { tools } from '@/tools/registry'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    ...tools.map((tool) => ({
      path: tool.path,
      name: tool.path,
      component: tool.component,
      meta: { title: tool.title },
    })),
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 开发工具箱` : '开发工具箱'
})

export default router
