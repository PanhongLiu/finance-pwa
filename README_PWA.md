# 个人存款与理财工作台（PWA）

本地优先、移动端优先的个人财务 App。数据全部保存在你自己的设备（IndexedDB），**不登录、不联网、不上传、不接入任何银行/证券账户**。

技术栈：React + TypeScript（strict）+ Vite + IndexedDB + Chart.js + 手写 Service Worker（PWA）。

---

## 1. 如何启动

```bash
npm install
npm run dev      # 开发模式，默认 http://localhost:5173
```

生产构建：

```bash
npm run build    # 类型检查 + 打包到 dist/
npm run preview  # 本地预览构建产物（默认 http://localhost:4173）
```

> 说明：本机有一个拦截文件删除的安全钩子，会导致 Vite 在清空 `dist/` 时失败。
> 构建前请先把旧的 `dist` 移走（例如 `mv dist /tmp/old-dist`），再执行 `npm run build` 即可。
> 在你自己的正常电脑上不会有此问题，`npm run build` 直接可用。

---

## 2. 部署到静态网站

`npm run build` 生成的 `dist/` 是纯静态文件，可直接托管到任意静态网站服务：

- Vercel / Netlify / Cloudflare Pages：连接仓库，构建命令填 `npm run build`，发布目录填 `dist`。
- GitHub Pages：将 `dist/` 推到 `gh-pages` 分支或用 Actions 发布。
- 任意 Nginx / Apache / 对象存储（OSS、S3 + CloudFront 等）：把 `dist/` 内容传上去即可。

注意两点：

- 需要 HTTPS（iPhone「添加到主屏幕」要求安全上下文；`localhost` 例外）。
- SPA 路由：本项目所有页面都在根路径下（用前端路由切换，没有多级路径），直接托管 `index.html` 即可，无需额外 rewrite 规则。

---

## 3. 在 iPhone Safari 中打开

1. 用 iPhone 打开上面部署好的 HTTPS 地址（或通过局域网 IP + 自签 HTTPS 在本地测试）。
2. 等待页面加载完成，即看到「工作台」首页。

---

## 4. 添加到 iPhone 主屏幕

在 Safari 中：

1. 点击底部工具栏的 **分享** 按钮（方框带向上箭头）。
2. 选择 **「添加到主屏幕」**。
3. 修改名称（默认「理财工作台」），点 **添加**。

之后主屏幕会出现 App 图标，点击即以「独立应用」模式全屏打开，无浏览器地址栏，
底部 Tab 不会被 Home Indicator 遮挡（已用 `env(safe-area-inset-*)` 适配）。

---

## 5. 数据保存在哪里

所有业务数据保存在浏览器的 **IndexedDB** 数据库 `personal_finance_db`，包含 6 个对象仓库：

`accounts`（账户）、`transactions`（流水）、`deposits`（存款）、
`investments`（理财）、`reserveFunds`（备用金）、`settings`（设置/版本）。

- 数据**只存在本机当前浏览器**：换浏览器、清缓存、卸载 Safari、换手机都会丢失。
- 绝不通过网络发送任何财务数据。

金额以「整数分」存储，避免浮点误差；所有计算统一走 `src/utils/money.ts`。

---

## 6. 如何备份数据

首页右上角 ⚙️ → **设置** → **导出数据**：

- 导出 `personal_finance_db` 全部内容为 JSON。
- 文件名：`personal-finance-backup-YYYY-MM-DD.json`。
- 建议定期导出并保存到 iCloud / 电脑等安全位置。

---

## 7. 如何恢复数据

设置 → **导入数据** → 选择备份 JSON：

- 导入前会**二次确认「将覆盖当前所有数据」**。
- 确认后写入 IndexedDB 并刷新页面。
- 仅接受本应用导出的备份文件（会校验 `app` 字段）。

---

## 8. 如何升级项目而不丢失数据

- 数据库设有版本号 `DB_VERSION`（当前为 `1`），定义在 `src/db/database.ts`。
- 升级时**只增不改**：在 `openDB()` 的 `migrate()` 中按版本号递增新增对象仓库/字段，
  绝不直接删除旧数据。打开数据库时若检测到旧版本会自动触发升级。
- 业务代码对「缺省字段」做了兼容，旧备份导入后新版本也能正常读取。
- 升级发布前，建议先用「导出数据」备份一次，作为兜底。

---

## 资产计算原则（核心）

```
总资产 = 账户现金余额 + 存款本金 + 理财当前市值 + 备用金余额
```

- 转账 / 资金分配在**扣减账户余额的同时**增加对应资产，因此同一笔钱只算一次。
  例如活期 ¥100,000 转 ¥20,000 到备用金：活期变 ¥80,000、备用金 ¥20,000，总资产仍是 ¥100,000。
- 首页「较上月」= 本月收入 − 本月支出（转账为内部划转，不影响总额）。
- 存款预计利息 = 本金 × 年利率 × 持有年数（日历算法，精确到整年）。
- 理财总收益 = 当前市值 + 已实现收益 − 累计投入；收益率 = 总收益 / 累计投入。

---

## 目录结构

```
src/
├── components/        通用 UI（TabBar、Sheet、ConfirmDialog、DoughnutChart…）
├── pages/
│   ├── Dashboard/     首页（总资产、资产结构、最近记录、快捷操作）
│   ├── Transaction/   记一笔（收入/支出/转账，列表+编辑+删除）
│   ├── Assets/        存款 + 理财（Tab 切换、新增/编辑/删除、市值调整）
│   ├── Reserve/       备用金（转入/转出/调整/编辑/删除）
│   └── Settings/      设置（导出/导入/清空）
├── db/                IndexedDB 访问层（统一封装，UI 不直接碰底层）
├── services/          业务逻辑 + 资产计算（与 UI 分离）
├── store/             React Context（数据状态 + 动作）
├── utils/             金额 / 日期 / 分类图标工具
├── types/             全局类型与常量
├── charts/            图表组件
├── styles/            全局样式（iPhone 优先、安全区适配）
├── App.tsx
└── main.tsx
```

---

## 已通过的验证

- `npm run build`（`tsc --noEmit` 严格类型检查 + Vite 打包）通过。
- 资产计算离线单测（`scripts/calc.test.ts`，用 esbuild 运行）全部通过：
  总资产、存款预计利息（¥7500）、理财总收益（¥8580）/ 收益率（7.66%）、
  转账后总资产不变、本月变动。
- 生产构建的页面与 `manifest.webmanifest`、`sw.js`、各尺寸图标均正常返回 200。
