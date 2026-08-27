# p了个s · 任务进度存档

> 生成时间:2026-08-23;更新:2026-08-27(git pull 并入 v2.8.0 安全加固后同步)
> 用途:记录当前进行中任务与未完成内容,便于任何接手会话快速接续。项目长期约定见 `docs/CONVENTIONS.md`。

## 一、当前进行中任务:第六款游戏「诗了个句」(slgj, 开发中)

> 用户原话需求:第六个游戏;简单模式=选择题(给上句选下句),标准/困难=飞花令形式;游戏界面补充提示「**记得注意字的写法**」,提高古诗文默写解答能力;选择题题库=必考古诗词文,飞花令注明以课标必考古诗词为主。
> 已确认决策(用户拍板):缩写 **slgj**(路由 /slgj、KV slgj:*、functions/slgj/);飞花令限时 **标准 40s / 困难 30s**;选择题方向 **双向混合**(上→下 / 下→上 随机);题库以课标必背古诗词文为主。

### 已完成(本会话, 均已过测试)

- [x] `src/game6/bank.ts` —— 对句库 **96 联**(192 句)课标必背古诗词文(静夜思/春晓/望岳/将进酒/岳阳楼记/陋室铭…),含 5 类覆盖补充(马/雪/云/舟/酒);`normalizeLine` 去标点逐字比对;`ALL_LINES` 去重全集 = 飞花令合法答案域;令字池 `FLOWER_COMMON_POOL`(12 字,≥5 句)与 `FLOWER_HARD_POOL`(14 字,≥2 句),运行时按库内命中过滤
- [x] `src/game6/core.ts` —— 纯逻辑:简单模式 MC 生成(双向、4 选项含唯一正解、干扰项从全库抽取不重复);标准/困难飞花令(令字互异 8 题、每局已用句去重、提交判定:不含令字 notcontain / 库外句子 unknown(错字别字) / 重复 used / 正确得分);`flowTimeout` 超时判错;`useHint` 提示显示可接受答案出处作者(tools 计数);状态机 tick/answerMc/submitFlow/advance
- [x] `src/game6/core.test.ts` —— 11 项(题库规模/字段/去重/令字池覆盖锁定;MC 双向与唯一正解;飞花令各判定分支;超时;提示;完整通关)
- [x] TS 构建修复(2026-08-27):移除未用 `DIFF_OF`、测试断言类型化、清理未用导入 —— `npm run build` 通过
- [x] 全量测试 **116 项通过**(105 + slgj 11);selftest **133 项**(v2.8.0 并入后)全过

### 未完成(接续清单, 按顺序执行)

> **重要(v2.8.0 并入后)**:2026-08-27 合并了「安全加固 v2.8.0」(PR #2, 在下雨 提交)——排行榜提交新增**一次性会话令牌**机制,新游戏必须照此实现,详见下方「四、v2.8.0 安全加固(已并入, 新游戏必须遵循)」。

1. `src/game6/version.ts` —— `SLGJ_VERSION = "v1.0.0"`
2. `src/game6/SlgjRules.tsx` —— 玩法介绍(含「记得注意字的写法」提示、课标必背来源说明、飞花令限时 40s/30s、排行规则)
3. `src/game6/SlgjPage.tsx` —— 游戏页:
   - 通用骨架同 plgp:返回/标题/⟳、难度三档+玩法、昵称行+RankPartToggle、状态栏(血量/用时/题号/得分)、结算窗(星级按失误 0/1/≥2 → ★★★/★★/★)
   - 简单:题面诗句大字展示 + 4 个选项按钮(长句可换行),提示按钮显示《篇名》·作者
   - 标准/困难:大字令字 + 倒计时(40s/30s,读秒,到 0 调 `flowTimeout`)+ 单行输入框 + 提交 + 提示按钮;输入区上方常驻醒目提示「⚠ 记得注意字的写法——错字、别字视为答错」;反馈文案区分 notcontain/unknown(「没有这句——检查错字、别字,或是否不含令字『X』」)/used/timeout
   - 提交 POST `/slgj/api/rank` {mode,name,score,time,tools,version,platform,**token**};skipRank 逻辑同其它游戏;**token 走 v2.8.0 规范**:开局 `refreshRankToken("slgj", mode)` 申领存 ref,提交时携带、缺失补领(参照 HuaPage v2.3.12 写法);结算窗保留「重试提交」
4. `functions/slgj/api/session.js` —— 复制 hlgx/api/session.js 模板改 game="slgj"
5. `functions/slgj/api/rank.js` —— 复制 plgp 模板改键:KV `slgj:`、rl `slgj:rl:`、score clamp ≤8、排序 score↓→time↑→tools↑;**并加 v2.8.0 令牌校验**(peekGameSession 存在/IP 一致/难度匹配/serverSecs+10 ≥ secs,通过后 burnGameSession 再落库,参照 hlgx rank.js)
6. 前端接入:`public/_routes.json` 加 `/slgj/api/*`、`/slgj`(api 通配同时覆盖 rank 与 session);`App.tsx` 加 `/slgj` 路由;**HubPage 用 slgj 卡片替换最后一个「敬请期待」占位(占位归零,主界面 6 卡:5 可玩 + 错了个字维护中)**;玩法介绍弹窗加第六子页;RankPage 加第六 tab(PLGP 同款模式/得分+技能列/footer SLGJ_VERSION)
7. 后台:`functions/admin/api/rank.js` GAMES 加 slgj(复用 score/time/tools 排序);admin RanksPage、DashboardPage 加 slgj
8. `scripts/api_selftest.mjs` —— 12.58 段:slgj 会话申领→提交→排序→一次性销毁(复用 token 再提交应 400)/时限 400/clamp/后台可见;注意 selftest 的内存 KV mock 已支持 expirationTtl(忽略)与 delete
9. 版本:`src/version.ts` PLATFORM_VERSION **v2.8.0 → v2.9.0**(v2.8.0 已被安全加固占用)
10. 全量测试 + `npm run test:api` + build + 部署 + 线上验证(bundle 版本号/新卡片文案「诗了个句」/`/slgj` 200/`/slgj/api/session` 发 token/`/slgj/api/rank` 空榜/后台 slgj 键)
11. 文档:`docs/slgj_summary_report.md`(新建,正序)+ `platform_log.md` 两行(slgj v1.0.0、平台 v2.9.0)+ 当前状态更新 + CONVENTIONS(六线→**七线**版本表/缩写加 slgj/KV 加 slgj:*/路由白名单加 /slgj/排序加 slgj)+ HANDOFF_PROMPT(概览表加行/目录加 game6+functions/slgj+docs 两份/新章节「诗了个句」并重编号后续章节/KV 行/路由行/待办更新)+ roadmap #10 标记已上线 + docx 全部重生成
12. 弹窗确认(代理+实际检查)后 git 提交推送

## 二、其他待办(非进行中)

- **错了个字 · 识别 ML 计划**(`docs/clgz_ml_plan.md`):M0 三项待用户确认(①采集来源是否先只管理员、玩家自愿贡献是否纳入二期;②五分类标签体系;③首版模型 Phase 1 经典 ML vs Phase 2 CNN),确认后从 M1(管理员笔迹采集页)开工
- **错了个字重开**:游戏本体 v1.0.6(含排行开关)已就绪,恢复只需还原 HubPage 卡片与 App.tsx 路由
- **最后一个占位槽**(slgj 上线后归零):roadmap 候选——元素连连看/数学速算/史语连连看/物理公式/政区连连看/时间轴排序/飞花令已落地,由用户拍板
- **配了个平题库增补**(可选):`docs/plgp_equations.md` 定稿 v0.2 111 条,后续可扩;改题库必须过 `src/game5/core.test.ts` 守恒校验

## 三、最近发布(便于核对版本)

| 提交 | 内容 | 版本 |
|------|------|------|
| 33475ef(拉取) | v2.8.0 安全加固(PR #2, 在下雨): 5 游戏会话令牌防刷 / 反馈 XSS+IP 脱敏 / 管理端 CSRF+会话脱敏 / 成绩物理上限; selftest 133 项 | 平台 v2.8.0; hlgx v2.3.12 / ylgy v1.5.1 / clgz v1.0.7 / flgl v1.1.1 / plgp v1.0.1 |
| 90d07f7 | 修复重复占位卡 | 平台 v2.7.1 |
| a037c19 | 配了个平上线 | plgp v1.0.0 / 平台 v2.7.0 |
| 43370ec | 配了个平题库 v0.2 存档 | — |
| 3192a5c | flgl 节奏调优 + 排行开关 + ML 计划 | flgl v1.1.0 等 |

> 接续提示:当前工作区含 `src/game6/`(未接入路由,不影响线上);下一次会话从「未完成清单」第 1 步继续即可。

## 四、v2.8.0 安全加固(2026-08-27 并入, 新游戏必须遵循)

- **一次性会话令牌(防刷榜核心)**:`functions/_lib/gamesess.js` 提供 `issueGameSession`(签发,限频 10 次/分/IP,TTL 3h)/ `peekGameSession`(校验:存在+IP 一致)/ `burnGameSession`(一次性销毁);每游戏新增 `functions/<game>/api/session.js`(POST {mode} → {token});前端 `src/lib/rankToken.ts` 的 `fetchRankToken(game, mode)` 开局申领
- **提交校验链**:token 格式 48 hex → 存在且属于该游戏 → 难度匹配 → IP 一致 → **服务端实际经过时长 +10s ≥ 上报用时** → 全部通过才 `burnGameSession` 并落库;任何失败返回 400 中文提示,结算窗可「重试提交」
- **其它加固**:反馈内容/昵称过滤 `< >`(防存储型 XSS);反馈存储 IP 改 SHA-256 截断哈希;管理端 POST/DELETE 校验 Sec-Fetch-Site/Origin(CSRF);管理会话列表脱敏;成绩字段物理上限(score/tools/clears 按游戏 clamp)
- **对诗了个句的要求**:slgj 的 session.js + rank.js 令牌校验 + 页面 token 携带必须齐套(见未完成清单第 3/4/5 步);selftest mock 的 KV 已支持 delete 与忽略 expirationTtl
