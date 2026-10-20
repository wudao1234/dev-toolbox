# 开发工具箱 (Dev Toolbox)

基于 **Vue 3 + Vite + TypeScript + Naive UI + Tailwind CSS** 的常用开发小工具集合。

✅ 纯前端 SPA —— 所有数据处理均在浏览器本地完成，不上传任何服务器
✅ 工具插件化 —— 新增工具只需登记一条注册表，路由 / 导航 / 搜索自动生效
✅ 纯逻辑有测试 —— 核心算法独立为 `.ts` 模块，配套 vitest 单元测试
✅ 部署于 Cloudflare Pages（SPA 回退由 `wrangler.toml` 统一处理）

## 现有工具

| 工具 | 路径 | 说明 |
| --- | --- | --- |
| 文本对比 | `/tools/text-diff` | 基于 LCS 的逐行 diff，支持忽略空白 / 空行 |
| JSON 工具 | `/tools/json-tool` | 格式化、校验（含行列定位）、压缩、语义对比 |
| 随机数据生成器 | `/tools/mock-data` | 生成姓名 / 身份证 / 手机号 / 地址，身份证校验位符合 GB 11643 算法 |
| 二维码工具 | `/tools/qrcode` | 生成（中文 / 容错级别 / 颜色定制）与图片解码（qrcode + jsQR） |
| 随机菜单 | `/tools/random-menu` | 从可维护的菜谱随机抽菜，支持荤素配额与近期不重复，数据存 localStorage |

## 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器
npm test           # 运行单元测试（vitest）
npm run typecheck  # 类型检查（vue-tsc）
npm run build      # 生产构建（输出 dist/）
```

## 技术栈

- **框架**：Vue 3（`<script setup>`）+ Vue Router 4
- **UI**：Naive UI + Tailwind CSS（含暗色模式）
- **语言**：TypeScript（严格模式）
- **测试**：Vitest
- **构建 / 部署**：Vite → Cloudflare Pages（`wrangler.toml`）

## 新增一个工具

1. 在 `src/tools/<tool-name>/` 下新建 `XxxView.vue` 页面，纯逻辑抽成同目录的 `.ts` 文件并配测试（参考 `mock-data/generators.ts`）；
2. 在 `src/tools/registry.ts` 的 `tools` 数组中登记一条（路径、标题、描述、图标、关键词）；
3. 路由、首页导航、搜索自动生效，无需改其他文件。

## 目录结构

```
src/
├── tools/                # 各工具页面 + 纯逻辑模块（含 *.test.ts）
│   ├── registry.ts       # 工具注册表（唯一扩展点）
│   ├── text-diff/        # 文本对比
│   ├── json-tool/        # JSON 工具
│   ├── mock-data/        # 随机数据生成器
│   ├── qrcode/           # 二维码工具
│   └── random-menu/      # 随机菜单
├── views/HomeView.vue    # 首页（导航 + 搜索）
├── router/index.ts       # 由注册表自动生成路由
├── App.vue               # 整体布局 + 暗色模式
└── utils/                # 剪贴板等通用工具
```

## 部署

项目为纯静态站点，构建产物 `dist/` 直接部署到 Cloudflare Pages：

```bash
npm run build
npx wrangler pages deploy dist   # 或在 CI 中配置
```

SPA 路由回退（404 → index.html）已在 `wrangler.toml` 中通过 `not_found_handling = "single-page-application"` 声明，无需额外的 `_redirects` 文件。
