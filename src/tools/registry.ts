import type { Component } from 'vue'
import { CodeWorkingOutline, GitCompareOutline, PeopleOutline, QrCodeOutline } from '@vicons/ionicons5'

/**
 * 工具注册表：新增工具时在这里登记一条，
 * 路由、首页导航、搜索会自动生效。
 */
export interface ToolMeta {
  /** 路由路径，如 /tools/text-diff */
  path: string
  title: string
  description: string
  icon: Component
  /** 搜索关键词（标题/描述之外的补充词） */
  keywords: string[]
  component: () => Promise<Component>
}

export const tools: ToolMeta[] = [
  {
    path: '/tools/text-diff',
    title: '文本对比',
    description: '逐行对比两段文本差异，支持忽略空白与空行',
    icon: GitCompareOutline,
    keywords: ['diff', '比较', '差异', '对比'],
    component: () => import('@/tools/text-diff/TextDiffView.vue'),
  },
  {
    path: '/tools/json-tool',
    title: 'JSON 工具',
    description: 'JSON 格式化、校验、压缩与结构对比',
    icon: CodeWorkingOutline,
    keywords: ['json', '格式化', '校验', '压缩', '对比'],
    component: () => import('@/tools/json-tool/JsonToolView.vue'),
  },
  {
    path: '/tools/mock-data',
    title: '随机数据生成器',
    description: '随机生成姓名、身份证号、手机号、地址等模拟数据',
    icon: PeopleOutline,
    keywords: ['mock', '随机', '身份证', '手机号', '姓名', '地址', '测试数据'],
    component: () => import('@/tools/mock-data/MockDataView.vue'),
  },
  {
    path: '/tools/qrcode',
    title: '二维码工具',
    description: '二维码生成（支持中文、容错级别、颜色定制）与图片解码',
    icon: QrCodeOutline,
    keywords: ['qr', '二维码', '生成', '解码', '扫码', 'qrcode'],
    component: () => import('@/tools/qrcode/QrCodeView.vue'),
  },
]
