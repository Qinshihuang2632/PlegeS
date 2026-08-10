# MIGRATION_AUDIT.md — 化了个学 · Cloudflare Pages 迁移审计

> 依据 `CLOUDFLARE_MIGRATION_PROMPT.md` 执行,将「化了个学」(Flask 应用)迁移至
> Cloudflare Pages + Pages Functions + KV。本文档为迁移对照、配置、变更、测试证据与自查清单。

## 1. 迁移对照表(Flask → Cloudflare Pages)

| 原 Flask 实现 | 迁移后实现 | 位置 |
|---|---|---|
| `hlgx_app.py` / `hlgx_hub.py` 路由 | 静态页面(直接托管) | `dist/index.html`、`dist/hlgx/hua.html`、`dist/hlgx/rank.html` |
| `templates/*.html` 用 `url_for(...)` 引用资源 | 静态路径 `/css/hlgx_style.css`、`/js/hlgx_hua.js`、`/js/hlgx_substances.js` | `dist/` 下模板产物 |
| `hualegexue/static/` | 静态资源 | `dist/css/`、`dist/js/` |
| `hlgx_rank.py`(Flask 排行榜 API) | Pages Functions | `functions/hlgx/api/rank.js`(GET/POST/DELETE) |
| 昵称查重 | Pages Function | `functions/hlgx/api/name/exists.js`(GET) |
| 昵称建议(X*001 规则) | Pages Function | `functions/hlgx/api/name/suggest.js`(GET) |
| 榜单逻辑(排序/校验/clamp) | 共享模块 | `functions/_lib/ranklib.js` |
| `rankings.json`(本地文件存储) | Cloudflare KV(命名空间 `RANKINGS`,key: easy/normal/challenge) | 线上,不入 git |
| 运行时(Flask 进程) | 无服务器(Cloudflare 边缘) | 无进程、无端口 |
| 路由匹配 | Pages Functions 路由 `_routes.json` 限定 `/hlgx/api/*` | `_routes.json` |
| 干净 URL(去 .html 后缀) | Pages 自动提供 `/hlgx/hua` → `hlgx/hua.html` | 平台内置 |
| 404 行为 | 顶层 `dist/404.html`(避免 SPA 回退到 index.html) | `dist/404.html` |

### API 契约(逐条复刻,未改变)

- `GET /hlgx/api/rank?mode=easy|normal|challenge` → `{"mode": X, "rank": [排序后条目]}`;mode 非法 → 回落 `normal`
- 排序规则: **hp 降序 → time 升序 → tools 升序**(与原 `cmp_key=(-hp, time, tools)` 一致)
- `POST /hlgx/api/rank` body `{mode, name, hp, time, tools}` →
  - 校验:name 去空格后为空 → 400;mode 非法 → 按 `normal` 处理
  - clamp:hp → `0..3`,time → `>=0`,tools → `0..9`
  - `surpassed` = 严格优于新成绩的既有条目数(按上述排序规则)
  - 条目附 `date`(Asia/Shanghai 时区,`YYYY-MM-DD HH:MM` 格式)
  - 响应 `{"ok": true, "surpassed": N, "rank": [排序后条目]}`
- `DELETE /hlgx/api/rank?mode=easy|normal|challenge|all` → 清空对应榜单,`{"ok": true, "msg": "已清空 X 榜单"}`;非法 mode → 400
- `GET /hlgx/api/name/exists?name=X` → `{"exists": true|false}`(空名恒 false)
- `GET /hlgx/api/name/suggest?name=X` → 首个未被占用的 `X*001..X*999`;全部占用回退 `X*999`;空名 → `{"name": ""}`

### 数据迁移

`rankings.json`(easy: 帅帅 hp3/time131/tools0/date 2026-08-09 12:37;normal/challenge 空)
→ KV key `easy`/`normal`/`challenge`(namespace id `b73f021c55e545eaa04874bb18d3cf95`),date 字段原样保留。

## 2. 配置清单

| 项 | 值 |
|---|---|
| Pages 项目名 | `hua-liao-ge-xue`(production branch: `main`) |
| 线上域名 | https://hua-liao-ge-xue.pages.dev |
| KV 命名空间 | `RANKINGS`(binding),id `b73f021c55e545eaa04874bb18d3cf95` |
| KV keys | `easy`、`normal`、`challenge`(值为 JSON 数组字符串) |
| `wrangler.toml` | `compatibility_date = "2026-08-08"`(受本地 workerd 二进制上限约束,见已知差异)、`pages_build_output_dir = "dist"`、`[[kv_namespaces]] binding="RANKINGS"` |
| `_routes.json` | `{"version": 1, "include": ["/hlgx/api/*"], "exclude": []}` |
| 部署命令 | `npm run deploy` → `wrangler pages deploy dist --project-name=hua-liao-ge-xue` |
| 本地开发 | `npm run dev` → `wrangler pages dev dist --kv=RANKINGS --persist-to .wrangler/state`(端口 8799) |
| 本地测试 | `npm test`(契约 25 项)/ `npm run test:e2e`(HTTP 层 22 项)/ `npm run test:prod`(线上 33 项) |

## 3. 变更清单(按 git 提交)

| 提交 | 阶段 | 内容 |
|---|---|---|
| `6176552` | init 基线 | 迁移前快照(Flask 版) |
| `0e46819` | 静态页面迁移 | 模板/静态文件 → `dist/`;`url_for` → 静态路径;保留教育功能(物质简介、图鉴、难度分级) |
| `1609417` | Functions 后端 | `functions/_lib/ranklib.js` + rank / name/exists / name/suggest;`_routes.json`;`scripts/api_selftest.mjs`(25 契约测试) |
| `ebacc40` | 部署配置 + 本地验证 | `wrangler.toml`(compatibility_date 2026-08-08 修复)、`package.json`、`dist/404.html`、`scripts/e2e_local.mjs`(22 项 E2E)、`scripts/check_imports.mjs` |
| `64cddb1` | 部署配置 + KV 数据迁移 | `wrangler.toml` 写入真实 KV namespace id;KV 远程写入 `easy`/`normal`/`challenge`(`--remote`) |
| `c532d3b` | 线上测试 | `scripts/verify_prod.mjs`(线上 33 项验证,含数据恢复逻辑) |
| `df8fff2` | 交付 | `MIGRATION_AUDIT.md` + `platform_log.md` 平台日志 |
| `c775be9` | v2.0.1 | 弹窗/界面加返回键 + 过关判定修正(详见 4.5) |
| `f5426ea` | v2.0.2 | 排行榜 DELETE 需管理员密码(`X-Admin-Password` = `env.ADMIN_PASSWORD`,secret 不入 git)+ 点击响应提速(详见 4.6) |
| `3e02dcf` | v2.1.0 | 工程化重构:Vite + React 19 + TS + Tailwind v4 + shadcn/ui + Router 7(详见 4.7) |
| `0372c2b` | v2.1.0 | 游戏核心逻辑 TS 移植(行为 1:1)+ Vitest 测试迁移(旧 DOM-mock selftest 移除) |
| `d6a64fa` | v2.1.0 | 游戏三页面 React 重写 + 新手引导/玩法介绍/人性化文案 + 移动端适配 |
| `859379f` | v2.1.0 | 管理后台后端(会话/审计/限频/管理 API)+ 用户 API 加固(DELETE 移除,收归管理端) |
| `6943cd4` | v2.1.0 | 管理后台前端(登录/看板/榜单管理/审计日志/会话管理) |
| `848f283` | v2.1.0 | 测试体系扩展与全量验证(契约 61 项 / E2E 31 项 / GUI 实测) |

保留未动:本地工具 `make_docx.py`、`hualegexue/hlgx_selftest.js`、Flask 源码(`hlgx_app.py` 等)——
仅作本地参考/工具,不参与线上构建(线上只发布 `dist/` + `functions/`)。

## 4. 测试证据

### 4.1 本地契约测试 — `npm test`(scripts/api_selftest.mjs)✅ 25/25
内存 KV mock,覆盖:GET 默认/显式/非法 mode、POST 空昵称 400、clamp、负数→0、date 格式、
非法 mode 落 normal、排序(hp↓ time↑ tools↑)、surpassed 多组(严格优于才计数)、
exists 精确匹配跨模式、suggest X*001 占用→X*002/全占用→*999、DELETE easy/all/非法 mode。

### 4.2 本地 E2E — `npm run test:e2e`(scripts/e2e_local.mjs)✅ 22/22
对本地 workerd dev server(`wrangler pages dev`,端口 8799,真实 KV 模拟)HTTP 级验证:
页面 /、/hlgx/hua、/hlgx/rank 200;css/js 资源无 404;`/hlgx/hua.html` 可访问;
不存在页面 404(依赖 `dist/404.html`,否则 SPA 回退 → 已修复);API 契约含中文昵称 UTF-8;
未知 API 路径 404。

### 4.3 线上验证 — `npm run test:prod`(scripts/verify_prod.mjs)✅ 33/33
对 https://hua-liao-ge-xue.pages.dev:
- 页面 /、/hlgx/hua、/hlgx/rank、css/js、/hlgx/hua.html 全部 200;不存在页面 404
- 迁移数据可读:帅帅 hp3/time131/tools0,date 原样 `2026-08-09 12:37`;normal 空榜;非法 mode 回落
- exists/suggest:帅帅 → true,不存在 → false,空名 → false;suggest 帅帅 → `帅帅*001`
- POST 排序:丁(3,120,1) > 丙(3,120,5) > 甲(3,150,2) > 乙(2,100,0) > 氦氖氩氪氙氡(1,300,9);
  surpassed 0/0/2/3 与预期一致;中文昵称 UTF-8 正常;clamp(99→3, -5→0, -3→0);空昵称 400;非法 mode 落 normal
- 未知 API 路径 404
- 测试数据已清空,原 easy 榜(帅帅)经 `wrangler kv key put --remote` 恢复并复验

### 4.4 部署记录
- 首部署成功:`https://81c02f91.hua-liao-ge-xue.pages.dev`(7 文件 + Functions bundle,2.34s)
- 生产域名:https://hua-liao-ge-xue.pages.dev
- 中途修复:项目未创建 → `wrangler pages project create hua-liao-ge-xue --production-branch=main`;KV 写入默认落 local → 显式 `--remote`

### 4.5 v2.0.1 验证
- **GUI(浏览器实测)**:生产域名 `/hlgx/hua` 昵称弹窗含「← 返回大厅」,点击后回到 `/`(首页),无需设置昵称即可退出 ✅
- **GUI(DOM 确认)**:结算弹窗同样含「← 返回大厅」(`#hlgx-overlay .back-btn`);页面规则文案已更新为
  「全部卡牌拾取且手牌槽无三消组合时自动通关(最后一步消除也计入)」
- **行为测试 — `node scripts/checkwin_logic_test.mjs` ✅ 8/8**:从 `dist/js/hlgx_hua.js` 提取真实
  `canEliminate`/`checkWin` 源码在 node vm 沙箱中验证:
  - 全部拾取+无三消 → 通关;通关后手牌清空
  - **全部拾取+存在 3 张同类(三消可能)→ 不通关**,手牌保留等待消除
  - 棋盘未清空 → 不通关
  - **消除前不通关;完成最后一次消除后 → 通关**(最后一步消除纳入考察)
  - 全部拾取+仅剩 2 张同类(无三消)→ 通关
- 本地 E2E 22/22 回归通过;生产域名确认服务 v2.0.1(版本号、back-btn×2、checkWin 新逻辑、btn-row 样式)

### 4.6 v2.0.2 验证
- **契约测试 — `npm run test:api` ✅**(新增鉴权用例):DELETE 无密码 → 401 / 错误密码 → 401 /
  正确密码 easy → 200 清空 / 正确密码 all → 200 / 正确密码 + 非法 mode → 400 / 未配置 `ADMIN_PASSWORD` → 一律 401(排行榜保留)
- **本地 E2E — `npm run test:e2e` ✅**(新增鉴权用例):无密码 401、错误密码 401、正确密码清榜后榜单为空
- **性能优化(行为不变)**:`.hlgx-tile` transition 移除 `filter`(blocked 滤镜瞬时切换,消除 140 块过渡动画开销)、
  hover 用 transform 取代 filter;JS 坐标缓存 + 按层分组遮挡判定 + 遮挡状态增量刷新 + 手牌槽增量渲染 +
  `newGame()` DocumentFragment 批量挂载;`canEliminate`/`checkWin`/`checkLose`/`lose` 判定逻辑逐字未动,
  `node scripts/checkwin_logic_test.mjs` 8/8 依旧通过
- **GUI(浏览器实测)**:排行榜「清空当前榜单」弹出密码框,错误密码提示、正确密码清榜成功并刷新
- **密钥管理**:生产 `ADMIN_PASSWORD` 通过 `wrangler pages secret put` 设置(不入 git);
  本地 `.dev.vars`(gitignore)供 `wrangler pages dev` 加载;绝不写入 `wrangler.toml [vars]`

### 4.7 v2.1.0 工程化重构 + 管理后台验证
- **架构**:Vite 多页构建(游戏 SPA `/` + 管理 SPA `/admin`,basename=/admin)→ `dist/`;`dist/` 转为构建产物(入 .gitignore);
  `hualegexue/` 旧 Flask 版冻结为 v2.0.2 遗留(逻辑断言全部迁移至 `src/game/core.test.ts`)
- **路由实测**(wrangler pages dev):新版 Pages 引擎拒绝 `_redirects` 的 `/*` 与 404 规则(无限循环检测),
  改用 `functions/[[path]].js` 兜底 + `public/_routes.json` 白名单(`/hlgx/api/*`、`/hlgx/hua`、`/hlgx/rank`、`/admin/*`);
  静态资源优先、未知 API 404、SPA 深层链接 200(注意:Pages 会对 `/index.html` 返回 308 规范化,兜底须取 `/` 与 `/admin/`)
- **契约测试 — `npm run test:api` ✅ 61/61**(内存 KV mock):原有 29 项全部保留,新增提交限频 429、
  昵称清洗(控制字符/12 字截断)、榜单上限 200、用户 API 无 DELETE、管理登录(缺令牌 400/错令牌 401/连错 5 次锁 429/未配置 500)、
  会话 Cookie(HttpOnly/Lax/Path)、me 鉴权、榜单管理(列表含 key/搜索/单删/清空/404)、审计(动作覆盖/过滤/分页/倒序/环形 500 上限)、会话(列表/强制下线/下线后失效)
- **Vitest — `npm test` ✅ 28/28**:物质库/布局分布/初始遮挡/同层配色/过关判定 5 场景(checkwin 迁移)/道具行为/三策略通关率(贪心平衡≥80%、谨慎≥70%)
- **本地 E2E — `npm run test:e2e` ✅ 31/31**(wrangler pages dev 真实 HTTP):SPA 路由 200、构建资源无 404、
  用户 API 契约、限频 429、管理全流程(登录→榜单→审计→会话→下线→登出)、404 行为、中文 UTF-8
- **GUI 实测**:游戏页(新手引导三步/昵称弹窗/拾取入槽/选中/三张异类扣血提示/道具/难度切换/失败结算自动提交成绩/榜单落库/✕ 关闭)、
  管理后台(登录错误提示与锁定/看板统计/榜单管理搜索与删除/确认弹窗 ✕/审计联动/会话列表/移动端底部导航)
- **本地 KV 发现**:miniflare 与生产 KV 的 `expirationTtl` 下限为 60s(30s 限频窗口会 500,已改 60s)
- **密钥**:`ADMIN_PASSWORD` 废弃(用户 API 已无 DELETE,生产 secret 已删除);
  新增 `ADMIN_TOKEN`(生产 secret / 本地 `.dev.vars`),管理登录令牌比对用 sha256 + 恒定时间比较

## 5. 已知差异 / 风险

1. **compatibility_date 固定 2026-08-08**:本地 workerd 二进制最高支持 2026-08-08,线上若提示需更新
   日期,直接改为更新的日期后重新部署即可(当前所用 API 无版本依赖风险)。
2. **KV 写入不保证立即可见**:KV 是最终一致,极端情况下新成绩几秒后才全局可见;原 Flask 文件读写为
   强一致。对单人小游戏可接受。
3. **榜单无并发锁**:同一榜单高并发写入可能互相覆盖(读-改-写非原子)。原 Flask 版同样如此,未改变契约。
4. **`templates/hlgx_hub.html`、`templates/hlgx_rank.html` 为 Flask 残留**:线上实际渲染以 `dist/` 为准,
   残留文件仅供本地 Flask 复现参考,不影响线上。
5. **`rankings.json` 仅作迁移源**:已按要求不入 git(见 .gitignore),线上数据一律以 KV 为准。
6. **时间来源**:date 以服务器(边缘)Asia/Shanghai 时区生成,与用户本地时钟无关,与原 Flask 服务器时区一致。

## 6. 最终自查清单

- [x] 全部路由/API 契约复刻,前端 fetch 路径 `/hlgx/api/...` 未改动,前端零改动上线
- [x] `rankings.json` 数据已迁移至 KV,date 字段原样保留;不入 git
- [x] 排行榜排序 hp↓ → time↑ → tools↑ 与 Flask 一致(三层测试覆盖)
- [x] 昵称查重、X*001 建议、surpassed 计数与 Flask 语义一致
- [x] 教育功能(物质简介、图鉴、难度分级)随静态页面完整保留
- [x] 本地工具(docx 生成、Node selftest、Flask 源码)保留,不参与线上构建
- [x] 部署公开访问,无需登录
- [x] `_routes.json` 将 Functions 限定 `/hlgx/api/*`,静态资源零函数开销
- [x] 404 行为正确(非 SPA 回退)
- [x] 每个阶段独立 git 提交(消息格式 `v2.0.0-cloudflare: <阶段>`)
- [x] 线上 33 项验证通过,测试数据已清理,生产数据已恢复
- [x] v2.0.1:所有弹窗/界面(除首页)均有返回键,昵称弹窗可不设昵称直接退出(GUI 实测)
- [x] v2.0.1:过关判定 = 全部卡牌拾取 且 手牌槽无 3 张同类可消(最后一步消除也计入),8 项行为测试通过
- [x] v2.0.2:DELETE 鉴权:未配置/错误密码一律 401,正确密码方可清榜;密码经 secret 存储,不入 git
- [x] v2.0.2:点击响应提速:滤镜过渡移除 + 坐标缓存 + 遮挡增量刷新 + 手牌槽增量渲染,判定逻辑零改动
- [x] v2.1.0:工程化重构完成,`dist/` 为构建产物;游戏核心逻辑 TS 移植且全部旧断言迁移至 Vitest(28 项)
- [x] v2.1.0:管理后台 /admin 令牌登录(ADMIN_TOKEN secret,恒定时间比较,登录锁定),四模块功能齐全
- [x] v2.1.0:所有弹窗带 ✕ 关闭;用户界面无任何管理功能(清榜/删除仅存在于管理后台)
- [x] v2.1.0:管理操作全程审计(环形 500 条);用户 API 加固(限频/昵称清洗/榜单上限/无 DELETE)
- [x] v2.1.0:契约 61 项 / Vitest 28 项 / 本地 E2E 31 项全部通过;GUI 实测游戏与后台全流程
- [x] v2.1.0:游戏新手引导/玩法介绍/道具提示人性化;全站移动端适配(棋盘与手牌槽自适应缩放)

### 4.8 v2.1.1 安全事件与处置(2026-08-10)
- **事件**:审计日志发现攻击者(IP `36.102.35.6` / `36.102.35.40`)于 02:19、02:31 两次
  `login_success` 登录管理后台,执行多次 `rank_delete_one` 删除,并刷入 `漏/洞/百/出 hp=3 time=2`、
  `your dad`、`彭帅之父ff<>`、`<script>aler` 等虚假记录(1~2 秒假成绩 + XSS/提示词注入试探)
- **根因**:生产 `ADMIN_TOKEN` 曾在会话总结中明文展示,经分享/截图泄露;登录锁定(每 IP 5 次)
  无法阻止"已知令牌"者(只错 1 次即成功)
- **处置**:
  1. 轮换 `ADMIN_TOKEN`(Pages secret 更新**需重新部署才生效**,已实测确认)
  2. 删除全部管理会话(KV `admin:sess:*`),攻击者会话立即失效
  3. 清空被污染的三个榜单,恢复原始数据(帅帅 3/131/0)
  4. 提交 API 加固:成绩用时 <10 秒 → 400 拒绝(防 1~2 秒假成绩);昵称含 `<`/`>` → 400
     (防脚本/提示词注入数据污染);同一昵称 24h 内最多 3 次提交 → 429
  5. 测试扩展:契约 67 项(新增 6 项防刷用例)、E2E 33 项全过;线上复测攻击手法全部被拒
- **教训**:生产令牌只能在**加密渠道**告知,禁止写入任何可分享的文本/对话;发现泄露立即轮换并踢会话
