# p了个s 项目交接 Prompt(给接手模型的完整指令)

> 生成时间:2026-08-21(最新提交 e9ea876)
> 用途:本项目「p了个s」的后续开发、更新、维护将交由你(接手模型)完成。
> 请通读本文档后再动手,所有约定必须遵守。
> **全部约定已集中持久化至 `docs/CONVENTIONS.md`**(2026-08-21 建立,含约定变更记录),两文档同源同效。

---

## 一、项目概览

「p了个s」是一个**高考知识主题小游戏合集平台**,部署在 Cloudflare Pages + Functions + KV 上,生产域名 **ps.lingben.top**。当前共 3 款可玩小游戏 + 3 个「敬请期待」占位:

| 游戏 | 缩写 | 版本(2026-08-21) | 玩法一句话 |
|------|------|------|------|
| 化了个学 | hlgx(hualegexue) | **v2.3.9** | 羊了个羊式消除,覆盖高考化学 200+ 种物质 |
| 英了个语 | ylgy | **v1.4.9** | 交叉单词网格填词,课标词库 |
| 错了个字 | clgz(cuolegezi) | **v1.0.5** | 手写考察高中各科易写错的字 |
| 平台 | — | **v2.5.5** | 合集主界面/排行榜/后台管理/建议反馈 |

**核心铁律:三款游戏 + 平台各自独立版本号,互不继承,严禁混淆。** 版本号分布:
- 化了个学:`src/version.ts` 的 `APP_VERSION`
- 平台:`src/version.ts` 的 `PLATFORM_VERSION`
- 英了个语:`src/game2/version.ts` 的 `YLGY_VERSION`
- 错了个字:`src/game3/version.ts` 的 `CLGZ_VERSION`

英了个语缩写于 v1.4.9 由历史遗留的 `ws` 全量改名 `ylgy`(路由/KV/后台参数/文档同步;旧链接 `/ws`、旧参数 `?game=ws` 兼容)。**此后新建游戏的文件缩写必须先问用户**(见 CONVENTIONS.md)。

---

## 二、技术栈与目录结构

```
Vite + React 19 + TypeScript(strict)+ Tailwind CSS v4 + shadcn/ui + React Router 7
Cloudflare Pages Functions(JS)+ KV(binding=RANKINGS)+ wrangler
Vitest 测试(Windows 必须 --pool=forks)
```

```
src/
├── main.tsx / App.tsx        # 游戏 SPA 路由(/、/hlgx/hua、/hlgx/rank、/ylgy、/clgz;/ws 重定向到 /ylgy)
├── version.ts                # APP_VERSION + PLATFORM_VERSION
├── game/                     # 化了个学
│   ├── core.ts               # 棋盘/消除/胜负纯逻辑
│   ├── HuaPage.tsx / HubPage.tsx / RankPage.tsx
│   ├── GameRules.tsx         # 玩法介绍
│   ├── NameConfirmDialog.tsx # 三游戏共用的改名二次确认弹窗
│   ├── badwords.ts           # 违禁词表(双份同步, 见安全)
│   └── platform.ts           # 端游/手游检测
├── game2/                    # 英了个语
│   ├── core.ts               # 交叉网格生成/求解/挖空
│   ├── words.ts / meanings.ts / meanings5.ts   # 课标词库 + 释义
│   ├── YlgyPage.tsx / YlgyRules.tsx
│   └── version.ts            # YLGY_VERSION
├── game3/                    # 错了个字
│   ├── handwriting.ts        # 手写识别(归一化+膨胀+字形覆盖判定)
│   ├── HandwritingPad.tsx    # 手写画框组件(含 __clgzSnapshot 调试)
│   ├── chars.ts              # 6 科字库(165 字)
│   ├── ClgzPage.tsx / ClgzRules.tsx
│   ├── handwriting.test.ts
│   └── version.ts            # CLGZ_VERSION
└── admin/                    # 管理后台 SPA(独立入口 admin/index.html)
    ├── pages/                # Login/Dashboard/Ranks/Feedback/Logs/Sessions
    ├── api.ts / types.ts / AuthContext.tsx / AdminLayout.tsx
    └── App.tsx               # /admin/* 路由

functions/                    # Pages Functions(JS)
├── hlgx/api/rank.js          # 化了个学榜单(裸键)
├── ylgy/api/rank.js          # 英了个语榜单(KV 键 ylgy:)
├── clgz/api/rank.js          # 错了个字榜单(KV 键 clgz:)
├── api/feedback.js           # 建议反馈提交(公开 POST)
├── admin/api/                # 管理端(会话鉴权):auth/rank/feedback/logs/sessions
└── _lib/                     # ranklib/ratelimit/badwords/auth/audit 共享库

docs/                         # 日志与文档(md + docx 双份)
├── platform_log.md           # 平台总进度日志(历史表格 + 维护方法)
├── hlgx_summary_report.md    # 化了个学版本日志
├── ylgy_summary_report.md    # 英了个语版本日志
├── clgz_summary_report.md    # 错了个字版本日志
├── clgz_characters.md        # 错了个字考察字库清单(待审查)
└── HANDOFF.md                # 旧交接文档(可参考, 以本文档为准)

scripts/
├── make_docx.py              # md → docx 生成器
├── api_selftest.mjs          # API 契约自测(100 项, npm run test:api)
├── e2e_local.mjs / verify_prod.mjs / qa-extreme.mjs
└── fix_legacy_rank.mjs       # 旧记录修正(留档可复跑)
```

---

## 三、开发/构建/测试/部署流程

```bash
npm run dev          # 本地 Vite 开发
npm run dev:pages    # wrangler pages dev dist --kv=RANKINGS(本地模拟线上)
npm test             # Vitest(vitest run --pool=forks, 勿用默认线程池!)
npm run test:api     # node scripts/api_selftest.mjs(API 契约 100 项)
npm run build        # tsc -b && vite build(产出 dist/)
npx wrangler pages deploy dist --project-name=hua-liao-ge-xue --branch=main   # 部署生产
```

**发布流程(固定, 按此顺序, 不可跳过)**:
1. 改代码 → 跑 `vitest run --pool=forks` 全量测试通过
2. `npm run build` 构建通过
3. `npx wrangler pages deploy dist --project-name=hua-liao-ge-xue --branch=main` 部署
4. **线上验证**:抓 https://ps.lingben.top 的 JS bundle 确认版本号/新功能生效(注意 CDN 缓存, 用 `?t=时间戳` 破缓存)
5. 更新三份(或对应)游戏日志 + 平台日志(md),`python scripts/make_docx.py` 生成 docx
6. 提交 git(先弹窗问用户代理 + 实际检查, 见「约定」)

---

## 四、强制约定(每条都是血泪教训)

1. **版本号三线独立**:化了个学/英了个语/错了个字/平台各自递增,改动哪个游戏就只加哪个的版本号,绝不混淆。界面 footer 显示版本号必须与 `version.ts` 一致。
2. **每次更新必须 git 同步**:任何改动(代码/文档/日志)完成后立即 `git add`+`git commit`+`git push`,禁止只存本地——曾因长期未同步导致日志乱码事故(f0510ff 修复)。
3. **部署与验证先行**:涉及线上表现的功能,先部署并线上验证再提交 git。教训:2026-08-17 版本号先提交未部署,线上停留旧版,需重新部署。
4. **提交前确认**:每次 git 提交推送前,**必须弹窗询问用户两件事**:
   - ① 是否已开启临时代理(127.0.0.1:7890),用户确认后配置 `git config http.proxy http://127.0.0.1:7890`(含 https),推送后**立即撤销代理**(`git config --unset`)
   - ② 用户是否已实际检查问题确实修改完成——防止无效版本更迭
5. **日志双份同步**:每个版本更新都要写对应游戏的 `docs/xxx_summary_report.md`(版本历史**正序追加**在末尾,最早的版本在最前)+ 平台 `docs/platform_log.md`(历史表格追加一行,**含「贡献人」列**,并同步生成 .docx)。贡献人未提及时默认只有 **ps**;平台行一律 ps;如有他人参与需注明(见鸣谢)。
6. **新建游戏的缩写必须先问用户**(v2.5.5 起):命名前弹窗让用户给出缩写,用户确认后才建 `src/gameN/`、`functions/<缩写>/`、路由、KV 键,不得自行拟定。
7. **安全(绝不违反)**:
   - 生产 `ADMIN_TOKEN` 绝不以明文出现在对话/代码/日志/commit 中;用 `wrangler pages secret put ADMIN_TOKEN`(生产)+ `.dev.vars`(本地,已 gitignore)
   - 违禁词表 `src/game/badwords.ts` 与 `functions/_lib/badwords.js` **双份必须同步**
   - `scripts/verify_prod.mjs` 非破坏性,绝不清榜,仅自删测试痕迹
8. **接手模型纪律**:先读 `docs/platform_log.md`(历史+约定)再动手;高风险操作(清榜/删数据/改密钥/重部署)先向用户确认。

---

## 五、化了个学(hua-liao-ge-xue, hlgx, v2.3.9)

- **玩法**:羊了个羊式消除,棋盘卡牌点击入槽,3 张同类自动消除;难度简单/标准/困难/挑战;血量 3、道具(撤回/移出/洗牌 各 3 次)
- **关键文件**:`src/game/core.ts`(纯逻辑)、`HuaPage.tsx`、`RankPage.tsx`
- **排行榜排序**:hp↓ → 成功消除组数(clears)↓ → 用时↑ → 技能使用次数(tools)↑;0 心无组数旧记录按用时降序
- **难度参数**:简单 55 块/槽10,标准 140/槽10,困难 204/槽8,挑战 368/槽8(4 金字塔+柱+倒置金字塔)
- **物质库**:src/game/substances.ts 约 217 种 + 8 类别(金属/非金属/氧化物/酸/碱/盐/有机物/混合物),有机酸双类别(酸+有机物),简介 ≤10 字不暴露类别
- **改名流程(v2.3.9)**:顶栏昵称输入框编辑 → 点 ✓/回车 → NameConfirmDialog 二次确认 → 确认后保存并重启本局

## 六、英了个语(ylgy, v1.4.9)

- **玩法**:自由形状交叉单词网格(横竖词交叉共享字母),灰色格不可交互,逐词校验,唯一解保证
- **关键文件**:`src/game2/core.ts`、`words.ts`(课标 4/5 字母词库)、`meanings.ts`/`meanings5.ts`(释义)、`YlgyPage.tsx`
- **难度**:简单 4 词(4 字母,known=[4,2,2,2])/标准 6 词(5 字母,known=[5,5,3,3,2,2])/困难 8 词(课标难词,known=[5,3,3,2,2,2,2,2])
- **道具**:填空提示(每局 2 次,填正确字母)/含义提示(每局 1 次,蓝色环圈词+单条释义,7 秒或按键消除)
- **排行榜排序**:hp↓ → 填写字母数(clears)↓ → 用时↑ → 技能使用次数↑
- **改名流程**:同化了个学(顶栏编辑 → ✓ → 确认弹窗 → 重开本局)
- 注:缩写为 `ylgy`(v1.4.9 由历史遗留的 `ws` 全量改名:路由 `/ylgy`、KV 键 `ylgy:`、后台 `game=ylgy`;旧链接 `/ws`、旧参数 `?game=ws` 兼容)

## 七、错了个字(clgz, v1.0.5)

- **玩法**:局内选科目(可多选,6 科)→ 随机抽 8 字 → 玩家在画框内手写该字(不经过键盘)→ 字形匹配判定对错 → 写对 1 字得 1 分
- **关键文件**:`src/game3/handwriting.ts`(识别核心)、`HandwritingPad.tsx`(画框)、`chars.ts`(字库)、`ClgzPage.tsx`
- **识别算法(v1.0.5, 重要)**:
  - 墨迹包围盒**归一化**到 56×56 网格(写小/写偏容忍)
  - 墨迹膨胀 2px + 模板膨胀 3px(抹平笔画粗细)
  - **minCover ≥ 0.55**:残缺半字(只写部分)cover≈0.50 被拦;认真写 0.6~0.8 通过
  - **stray ≤ 0.55**(用等比缩放位图计算,保留画框位置):潦草涂鸦盖满画框被拦
  - **不要加面积比上限**(曾误伤认真写粗笔画,见 v1.0.5 日志)
  - 调阈值时用控制台 `__clgzSnapshot()` 看墨迹/字形 ASCII 快照 + cover/stray 详情
- **排行榜排序**:得分(score)↓ → 用时↑
- **改名流程**:同其他游戏
- **字库待审查**:docs/clgz_characters.md 6 科 165 字为初版候选,用户尚未正式定稿;「考察形式」(限时/计分/错题回顾)待定

## 八、排行榜 API 通用规则(三游戏一致)

- 防刷:60s/IP 限频(429)、昵称清洗(trim/去控制字符/≤10 字/违禁词 400/`< >` 过滤)、成绩 ≥10s(失败局 hp=0 放宽)、同名放开、单榜上限 200 条
- KV 键:化了个学=裸键(easy/normal/challenge/extreme)、英了个语=`ylgy:easy/normal/hard`、错了个字=`clgz:all`
- 平台分离:mobile/desktop 榜单分开,排名仅同平台比较

## 九、后台管理(/admin)

- 登录令牌 ADMIN_TOKEN;四大模块:数据看板(三游戏统计)/榜单管理(三游戏独立 tab, 查看/搜索/删除/清空)/审计日志/会话管理 + **建议反馈**(v2.5.4)
- 所有删除/清空操作写审计日志(rank_delete_one/rank_clear_mode/rank_clear_all/feedback_delete_one/feedback_clear 等)
- 审计环形上限 500 条

## 十、建议反馈(v2.5.4)

- 玩家侧:主界面「建议反馈」按钮 → 弹窗(昵称 + 内容 ≤500 字)→ POST /api/feedback
- 后台:管理端「建议反馈」模块,列表(昵称/IP/时间/内容)/搜索/单条删除/清空,操作审计
- KV 键 `feedback`,上限 500 条(超出丢最旧)

## 十一、已知坑与注意

1. **Vitest 在 Windows 必须 `--pool=forks`**(默认线程池会挂起);偶有残留 node 进程,用 `taskkill //F //T //PID` 清进程树(workerd 会不断重启)
2. **wrangler pages dev 本地验证**:`npx wrangler pages dev dist --kv=RANKINGS --persist-to .wrangler/state --port 8799`,用完必须杀掉进程树(端口 8799 常被占用)
3. **CDN 缓存**:部署后线上可能延迟生效,验证时用 `?t=时间戳` 破缓存;压缩后 JS 变量名/字符串会变(如 minCover 变 `.55`、函数名被内联),检测功能用行为特征码而非名称
4. **curl 中文乱码**:git-bash 下 curl 中文输出乱码,用 Node fetch 验证
5. **路由白名单** `public/_routes.json`:新增路径必须加进去(/hlgx/api/*、/hlgx/hua、/hlgx/rank、/ylgy/api/*、/ylgy、/ws(旧链接,SPA 重定向到 /ylgy)、/clgz/api/*、/clgz、/api/feedback、/admin/*)
6. **git 代理**:临时用 `git config http.proxy http://127.0.0.1:7890`(含 https),推送后必须 unset
7. **logs 日期时区**:fmtDate 固定 Asia/Shanghai
8. 新增游戏参考模式:目录 src/gameN/ + functions/xxx/api/rank.js + _routes.json + RankPage GAMES + HubPage 卡片/玩法介绍 tab + version.ts + 独立日志

## 十二、当前待办/可做方向(与用户确认后实施)

- 错了个字:字库 165 字待用户审查定稿;「考察形式」待定
- 三个「敬请期待」占位游戏(下一批)
- 任何新需求以用户最新消息为准,先读本文档 + docs/platform_log.md 再动手

---

**最后提醒**:这是长期维护项目,每次改动都按「发布流程」六步走,提交前必弹窗问用户(代理 + 实际检查)。宁可多确认,不要擅自推线上或改数据。
