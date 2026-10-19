# 开发工具箱

基于 Vue 3 + Vite + TypeScript + Naive UI + Tailwind CSS 的常用开发小工具集合。所有数据处理均在浏览器本地完成，不上传任何服务器。

## 快速开始

```bash
npm install
npm run dev        # 启动开发服务器
npm test           # 运行单元测试（vitest）
npm run typecheck  # 类型检查（vue-tsc）
npm run build      # 生产构建
```

## 现有工具

| 工具 | 路径 | 说明 |
| --- | --- | --- |
| 文本对比 | `/tools/text-diff` | 基于 LCS 的逐行 diff，支持忽略空白/空行 |
| JSON 工具 | `/tools/json-tool` | 格式化、校验（含行列定位）、压缩、语义对比 |
| 随机数据生成器 | `/tools/mock-data` | 生成姓名/身份证/手机号/地址，身份证校验位符合 GB 11643 算法 |
| 二维码工具 | `/tools/qrcode` | 生成（中文/容错级别/颜色）与图片解码（qrcode + jsQR） |

## 新增一个工具

1. 在 `src/tools/<tool-name>/` 下新建 `XxxView.vue` 页面，纯逻辑抽成同目录的 `.ts` 文件并配测试（参考 `mock-data/generators.ts`）；
2. 在 `src/tools/registry.ts` 的 `tools` 数组中登记一条（路径、标题、描述、图标、关键词）；
3. 路由、首页导航、搜索自动生效，无需改其他文件。

## 目录结构

```
src/
├── tools/            # 各工具页面 + 纯逻辑模块（含 *.test.ts）
│   ├── registry.ts   # 工具注册表（扩展点）
│   ├── text-diff/
│   ├── json-tool/
│   └── mock-data/
├── views/HomeView.vue
├── router/index.ts   # 由注册表生成路由
├── App.vue           # 布局 + 暗色模式
└── utils/            # 剪贴板等通用工具
```
