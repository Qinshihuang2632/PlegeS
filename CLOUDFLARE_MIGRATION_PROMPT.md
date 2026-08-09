# 化了个学游戏平台 · Cloudflare Pages 迁移任务书

> 你是负责迁移的开发 AI。请严格按本任务书执行,**每完成一个阶段都要提交 Git、记录审计日志**。
> 任务书任何一步不理解,先查阅 Cloudflare 官方文档再动手,不要凭猜测。

---

## 〇、先回答三个问题(开始前必须说清楚)

在动手之前,先用你自己的话回答以下三点,确认理解无误后再编码:

1. **这个项目是干什么的?** —— 一个化学主题小游戏平台,核心理念"寓教于乐":游戏好玩的同时有学习价值(每张卡牌悬停显示 ≤10 字物质性质简介、图鉴按类分组)。
2. **当前做到哪一步?** —— 基于 Flask + 原生 JS + Web Audio 的单机可玩版(v2.0.0),已实现:三层难度、血量机制、昵称+排行榜、正计时、结算窗、自动化自检。**现需整体迁移到 Cloudflare Pages。**
3. **迁移目标是什么?** —— 前端静态化部署到 Cloudflare Pages,后端 Flask 路由改写为 Cloudflare Pages Functions(`functions/` 目录),数据存储改用 Cloudflare KV(或 D1),并在部署后自行测试、完成上线。

---

## 一、项目现状(迁移起点)

当前目录结构(源码在 `D:\program\game one\`):

```
game one\
├── hlgx_app.py                 # Flask 主入口(注册三个蓝图)
├── hlgx_hub.py                 # 大厅蓝图(路由 /)
├── hlgx_rank.py                # 排行榜蓝图(API + /hlgx/rank 页面)
├── hualegexue\
│   ├── __init__.py
│   ├── hlgx_hua.py             # 化了个学蓝图(路由 /hlgx/hua, 独立 static)
│   ├── templates\hlgx_hua.html # 游戏页
│   ├── static\js\hlgx_hua.js   # 游戏逻辑(含 fetch 调后端 API)
│   ├── static\js\hlgx_substances.js  # 197 种物质 + 性质简介
│   └── hlgx_selftest.js        # Node 自动化自检(17 项)
├── templates\                  # hlgx_hub.html(大厅)/ hlgx_rank.html(排行榜)
├── static\css\hlgx_style.css   # 全站样式
├── rankings.json               # 排行榜数据(当前存储方式)
└── platform_log.md / hualegexue\hlgx_summary_report.md   # 版本日志(md+docx)
```

**当前后端路由清单(迁移时一一对应):**

| Flask 路由 | 方法 | 作用 |
|-----------|------|------|
| `/` | GET | 大厅页(静态) |
| `/hlgx/hua` | GET | 游戏页(静态) |
| `/hlgx/rank` | GET | 排行榜查看页(静态) |
| `/hlgx/api/rank?mode=X` | GET | 查询某难度榜单 |
| `/hlgx/api/rank` | POST | 提交成绩 |
| `/hlgx/api/rank?mode=X` | DELETE | 清空榜单(easy/normal/challenge/all) |
| `/hlgx/api/name/exists?name=X` | GET | 昵称查重 |
| `/hlgx/api/name/suggest?name=X` | GET | 获取去重昵称 X\*001 |

---

## 二、迁移目标架构(Cloudflare Pages)

1. **前端静态化**:`templates/*.html` 与 `static/**` 变为纯静态资源,放入 Pages 项目根(或构建产物目录)。
   - HTML 中的 Flask `{{ url_for(...) }}` **全部替换为静态路径**,如:
     - `url_for('static', filename='css/hlgx_style.css')` → `/css/hlgx_style.css`
     - `url_for('hlgx_hua.static', filename='js/hlgx_hua.js')` → `/js/hlgx_hua.js`(把物质库/游戏逻辑 JS 统一放到静态根)
2. **后端 Functions**:每个 API 路由写成 Pages Function,放在 `functions/` 目录,路径规则:
   - `functions/hlgx/api/rank.js` → 处理 `/hlgx/api/rank`(GET/POST/DELETE 一个文件内用 `export const onRequestGet/onRequestPost/onRequestDelete`)
   - `functions/hlgx/api/name/exists.js` → `/hlgx/api/name/exists`
   - `functions/hlgx/api/name/suggest.js` → `/hlgx/api/name/suggest`
   - **前端 JS 里的 fetch 路径(`/hlgx/api/...`)保持不变**,这样游戏逻辑 JS 可少改甚至不改。
3. **数据存储**:把 `rankings.json` 迁移到 **Cloudflare KV**(推荐,一个 namespace,key=mode,value=榜单数组 JSON)。若你判断 D1 更合适也可,但必须能覆盖原 JSON 的全部读写/排序逻辑。
   - KV / D1 的 namespace、binding 由你自行在 Cloudflare 控制台或 wrangler 创建并申请,绑定到 Pages 项目。

---

## 三、后端 API 契约(必须原样复刻,不许改格式)

所有响应 `Content-Type: application/json`,中文用 UTF-8。

**数据条目结构**:`{ "name": "昵称", "hp": 0-3, "time": 秒数整数, "tools": 0-9, "date": "YYYY-MM-DD HH:MM" }`

**排序规则(严格)**:先比 `hp` 从大到小;再比 `time` 从小到大;再比 `tools` 从小到大。三者都相同则并列(保持提交顺序即可)。

**① GET /hlgx/api/rank?mode=easy|normal|challenge**
- 响应:`{ "mode": "normal", "rank": [条目, 条目, ...] }`(rank 已按排序规则排好)

**② POST /hlgx/api/rank**(请求体 JSON:`{mode, name, hp, time, tools}`)
- 校验:mode ∈ {easy,normal,challenge};name 非空字符串;hp 夹到 [0,3];time ≥ 0;tools 夹到 [0,9]。
- 先计算 `surpassed` = 现有榜单里被本条成绩超越的条目数(用排序规则比较)。
- 追加该条目后保存。
- 响应:`{ "ok": true, "surpassed": N, "rank": [最新排序] }`

**③ DELETE /hlgx/api/rank?mode=easy|normal|challenge|all**
- 清空对应难度或全部。
- 响应:`{ "ok": true, "msg": "已清空 xxx 榜单" }`

**④ GET /hlgx/api/name/exists?name=X**
- 检查 X 是否出现在**任意难度**榜单中。
- 响应:`{ "exists": true|false }`

**⑤ GET /hlgx/api/name/suggest?name=X**
- 从 `X*001` 到 `X*999` 找**最小未被使用**的名字(任意难度),返回它。
- 响应:`{ "name": "X*001" }`

---

## 四、前端行为(迁移后必须保持)

1. **游戏页 `/hlgx/hua`**:
   - 打开先弹**昵称窗**:输入昵称(参与排行)或勾选「不参与排行榜」。
   - 重名时:首次点击"开始"只提示,不进入;再次点击才调 `name/suggest` 拿 `X\*001` 并进入。
   - 确认昵称后:计时开始、棋盘开局。
   - 右上角显示:血量(❤3 上限)/ 剩余卡牌 / 正计时。
   - 一次只消 3 张同类;选 3 张不同类扣 1 血;槽满且无 3 张同类 → 立即失败。
   - 结算窗(通关或失败都出):剩余卡牌 / 用时 / 技能次数 / 超越玩家数;参与排行则 POST 成绩。
2. **排行榜页 `/hlgx/rank`**:三个难度 tab,点 tab 拉取对应榜单渲染;「清空当前榜单」按钮调 DELETE(带 confirm)。
3. **大厅页 `/`**:侧边栏有「🏆 排名栏」入口,游戏卡片 + 2 个预留槽位。

---

## 五、界面设计规范(重要)

- 整体风格参考 **shadcn / OpenAI 官网**:极简、留白、干净、高级感。卡片圆角、柔和阴影、克制配色,不要花哨渐变与厚重边框。
- 中文界面,字体可沿用系统字体栈(如 PingFang SC / Microsoft YaHei)。
- 现有 `hlgx_style.css` 可作为底子,但**允许并鼓励重做**以对齐"高级简洁"风格——前提是**所有 class/id 与 HTML 结构保持一致**,不得破坏 JS 逻辑。
- 移动端需自适应(响应式),排行榜表格窄屏可横向滚动。

---

## 六、部署要求(自行完成,让我省心)

1. 在 Cloudflare 创建 Pages 项目(或沿用),把本项目 `git push` 或通过 wrangler 关联部署。
2. **KV(或 D1)由你自行创建 namespace 并申请绑定**到该项目;把绑定名写进审计日志,并确保 Functions 能读到。
3. Build 配置:纯静态 + Functions(无额外构建步骤也可;若需要则提供明确的 build command/output dir)。
4. 部署完成后,**把线上 URL 反馈给我**,并把部署产物、配置(如 `wrangler.toml`、`_routes.json`)一并说明。

---

## 七、测试要求(部署后自测)

部署上线后,自行用 curl/脚本逐项验证并**留存证据**(每个请求贴实际输出):

1. 五个 API 全部按第三节契约返回正确结果;中文昵称不出现乱码。
2. 排序正确(造 3 条以上数据验证 hp→time→tools 优先级)。
3. 昵称查重 / suggest 序列号(造重名验证 `X\*001`)。
4. 三条静态页面均可访问,资源(CSS/JS/图片)不 404。
5. 游戏页端到端:进入 → 输昵称 → 开始 → 消除 → 结算 → 排行榜能看到刚提交的成绩。
6. 失败(0 血)记录也能上榜。

> 若你无法自动化浏览器测试,至少用 curl 验证全部 API + 页面 200 + 资源路径。

---

## 八、Git 版本管理(必须)

1. 在 `game one\` 初始化 Git 仓库(若尚无)。
2. **每个阶段一个提交**,commit message 带版本号与本阶段描述,例如:
   - `v2.0.0-cloudflare: init repo + 项目基线`
   - `v2.0.0-cloudflare: 静态页面迁移(url_for→静态路径)`
   - `v2.0.0-cloudflare: Functions 后端(KV存储)`
   - `v2.0.0-cloudflare: 部署配置 + 部署`
   - `v2.0.0-cloudflare: 线上测试 + 修复`
3. 每次提交前自查:是否遗漏文件、`rankings.json` 是否已从版本库排除(数据不入库)。

---

## 九、审计机制(交付时必须提交)

在 `game one\` 生成 `MIGRATION_AUDIT.md`,至少包含:

1. **迁移对照表**:Flask 路由 → Cloudflare Function 文件 → 线上 URL。
2. **配置清单**:KV/D1 namespace、binding 名、`_routes.json`(如用到)、Build 命令与输出目录。
3. **改动清单**:哪些文件新增/修改/删除;对 JS 逻辑做了哪些改动及原因。
4. **测试证据**:每个 API 的 curl 实际返回、页面访问结果、端到端关键路径结果。
5. **已知差异/风险**:迁移后与原 Flask 版任何行为不一致处、未覆盖场景。
6. **最终自查清单**:
   - [ ] 五个 API 全部通过
   - [ ] 静态资源无 404
   - [ ] 昵称去重/序列号生效
   - [ ] 排行榜排序正确、可清空
   - [ ] 游戏页端到端可提交成绩
   - [ ] Git 已按阶段提交
   - [ ] 上线 URL 已提供

---

## 十、边界与提醒

- 这是**个人娱乐学习项目**,不需要登录/鉴权;排行榜数据对所有人开放。
- 保持"寓教于乐":物质性质简介、图鉴、难度分级等学习功能**不得删除**。
- 若某些能力(如 docx 报告生成、Node 自检脚本)在 Cloudflare 环境不便运行,可保留在仓库内作为本地工具,**但不得影响线上运行**。
- 不确定的地方:**先查 Cloudflare 官方文档,再动手**;不要臆造 API 或配置。
