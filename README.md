# 化了个学 🧪

化学主题消除小游戏,部署于 Cloudflare Pages + Pages Functions + KV。

- 游戏入口:https://hua-liao-ge-xue.pages.dev
- 管理后台:https://hua-liao-ge-xue.pages.dev/admin(需管理员令牌登录)

## 技术栈

- **前端**:React 19 + TypeScript + Vite(多页构建)+ Tailwind CSS v4 + shadcn/ui + React Router 7
- **后端**:Cloudflare Pages Functions(无服务器)+ Cloudflare KV(`RANKINGS` 命名空间)
- **测试**:Vitest(游戏核心)/ Node 契约与 E2E 脚本

## 目录结构

```
├── index.html              游戏 SPA 入口(Vite MPA)
├── admin/index.html        管理后台 SPA 入口(basename=/admin)
├── src/
│   ├── game/               游戏: substances 物质库 / core 纯逻辑引擎 /
│   │                       useGame hook / 三页面(大厅·游戏·榜单) / 新手引导
│   ├── admin/              管理后台: 登录/看板/榜单管理/审计日志/会话管理
│   ├── components/ui/      shadcn/ui 组件
│   └── index.css           全局主题(游戏暖色调)
├── functions/
│   ├── _lib/               ranklib(共享)/ auth(会话鉴权)/ audit(审计日志)/ ratelimit(限频)
│   ├── hlgx/api/           用户 API: rank(GET/POST)/ name/exists / name/suggest
│   ├── admin/api/          管理 API: auth / rank / logs / sessions
│   └── [[path]].js         SPA 回退(静态资源优先, 未知 API 404)
├── public/                 _routes.json(Functions 路由白名单)/ 404.html
├── scripts/                api_selftest(契约 61 项)/ e2e_local(E2E 31 项)/ verify_prod(线上)/ make_docx
├── docs/                   版本日志/迁移审计/汇总报告(platform_log、MIGRATION_AUDIT、hlgx_summary_report)
├── legacy/                 ❄️ 冻结的旧 Flask 版源码(仅参考, 不再参与构建)
│   ├── hlgx_app.py         旧入口(注册 hlgx_hub / hlgx_rank / hualegexue.hlgx_hua 三个蓝图)
│   ├── hualegexue/         hua 蓝图(含其模板与静态资源)
│   └── templates/ + static/ 大厅/排行榜模板与样式
└── wrangler.toml           Pages 部署配置(KV binding)
```

## 本地开发

```bash
npm install
npm run dev          # Vite 开发服务器(纯前端热更新)
npm run build        # tsc 类型检查 + 构建到 dist/
npm run dev:pages    # 本地全栈(wrangler pages dev, 端口 8799; 需先 build)
```

**开发模式元素定位**:`npm run dev` 下每个 JSX 元素都会注入
`data-code-path="src\game\HuaPage.tsx:131:11"` 属性(文件:行:列,由
`plugins/vite-code-path.ts` 自动注入)。浏览器 DevTools 中右键任意元素即可看到
其源码位置,报 bug 时把该属性贴给开发者即可。生产构建零注入。

## 测试

```bash
npm test             # Vitest: 游戏核心逻辑(28 项, 含通关率模拟与过关判定)
npm run test:api     # 契约测试(61 项, 内存 KV mock, 无需启动服务)
npm run test:e2e     # 本地 E2E(31 项, 需先 npm run dev:pages)
ADMIN_TOKEN=<令牌> npm run test:prod   # 生产验证(见下方部署)
```

## 部署

```bash
npm run deploy       # = npm run build && wrangler pages deploy dist --branch=main
```

**密钥管理(绝不入 git)**:
- 生产:`npx wrangler pages secret put ADMIN_TOKEN --project-name hua-liao-ge-xue`
- 本地:`.dev.vars`(已被 .gitignore 排除,wrangler pages dev 自动加载)
- 禁止写入 `wrangler.toml [vars]`(官方文档明确禁止存放敏感信息)

## 路由说明

| 路径 | 处理方式 |
|---|---|
| `/`、`/hlgx/hua`、`/hlgx/rank` | 游戏 SPA(React Router;深层链接由 `functions/[[path]].js` 回退) |
| `/admin/*` | 管理后台 SPA(登录保护) |
| `/hlgx/api/*`、`/admin/api/*` | Pages Functions(见 `public/_routes.json`) |
| 未知 API 路径 | 404(不落入 SPA) |
| 其他未知路径 | 404 页 |

`public/_routes.json` 只把 `/hlgx/api/*`、`/hlgx/hua`、`/hlgx/rank`、`/admin/*` 交给 Functions,
静态资源零函数开销。

## 管理后台

- 登录:`/admin`,输入管理员令牌(`ADMIN_TOKEN` secret)
- 安全:会话 Cookie(HttpOnly/SameSite=Lax/生产 Secure,24h 过期,存 KV);
  登录每 IP 连错 5 次锁 15 分钟;令牌比对使用 sha256 + 恒定时间比较
- 功能:数据看板 / 榜单管理(搜索·单条删除·清榜)/ 审计日志(筛选·分页)/
  会话管理(在线列表·强制下线);所有管理操作全程审计(最多保留 500 条)
- 用户界面不提供任何管理功能(清榜/删除仅存在于管理后台)

## 游戏机制(行为锁定)

- 核心逻辑在 `src/game/core.ts`,胜负判定/消除/道具行为与旧版逐字一致,
  由 `src/game/core.test.ts` 锁定(28 项断言,含 3 策略通关率模拟 ≥80%)
- 物质库 190+ 种、7 大类别,卡牌按位置配色(同层相邻不同色)
- 用户 API 加固:提交限频(同 IP 60s 一次)/ 昵称清洗(1-12 字,去控制字符)/ 榜单上限 200 条

## 遗留说明

- `legacy/` 为冻结的旧 Flask 版(入口 `legacy/hlgx_app.py` + `legacy/hualegexue/` 包),
  仅作历史参考,不再双写、不参与构建;其逻辑断言已全部迁移至 `src/game/core.test.ts`
- 历史文档与版本日志集中在 `docs/`(`platform_log.md`、`MIGRATION_AUDIT.md`、`hlgx_summary_report.md`)
- `dist/` 为构建产物(已 gitignore),部署前执行 `npm run build`
