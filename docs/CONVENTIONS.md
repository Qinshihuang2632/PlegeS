# p了个s 项目约定(持久化文档)

> 建立日期:2026-08-21
> 目的:将散落在 `HANDOFF_PROMPT.md`(交接 Prompt)与 `platform_log.md`(维护方法)中的全部既有约定集中成一份独立文档,持久化保存,供任何接手者/模型随时查阅执行。
> 权威性:本文档与 `HANDOFF_PROMPT.md` 同源同效;若两者出现出入,以最新一次 git 提交中的表述为准并在本文档「约定变更记录」补记。
> 使用方式:动手改任何代码/文档前先通读本文档;每条约定都源自实际教训,不是建议,是硬性要求。

---

## 一、版本号约定(核心铁律)

1. **五线独立**:化了个学 / 英了个语 / 错了个字 / 分了个类 / 平台各自维护独立版本号,互不继承,严禁混淆。
2. **改哪个游戏,只递增哪个游戏的版本号**;平台层面的改动才递增平台版本号。
3. 版本号唯一来源(界面显示必须与其一致):

| 对象 | 版本号位置 | 常量 |
|------|-----------|------|
| 化了个学 | `src/version.ts` | `APP_VERSION` |
| 平台 | `src/version.ts` | `PLATFORM_VERSION` |
| 英了个语 | `src/game2/version.ts` | `YLGY_VERSION` |
| 错了个字 | `src/game3/version.ts` | `CLGZ_VERSION` |
| 分了个类 | `src/game4/version.ts` | `FLGL_VERSION` |

4. **版本号显示约定**(v2.3.8/v2.4.3 确立):任意游戏任意界面下方都显示**该游戏自己**的版本号(排行榜、玩法介绍弹窗底部、局内 footer 均按当前游戏显示,不得误显其他游戏版本)。
5. 缩写固定:化了个学=hlgx、英了个语=**ylgy**(v1.4.9 起,由历史遗留的 `ws` 改名;旧链接 `/ws`、旧参数 `?game=ws` 重定向兼容)、错了个字=clgz、分了个类=flgl。
6. **新建游戏的文件缩写必须先问用户**(v2.5.5 起):命名前弹窗让用户给出缩写,用户确认后才建 `src/gameN/`、`functions/<缩写>/`、路由、KV 键——不得自行拟定。

## 二、开发 / 测试 / 构建 / 部署流程

```bash
npm run dev          # 本地 Vite 开发
npm run dev:pages    # wrangler pages dev dist --kv=RANKINGS(本地模拟线上)
npm test             # Vitest(已内置 --pool=forks, Windows 勿用默认线程池!)
npm run test:api     # node scripts/api_selftest.mjs(API 契约自测)
npm run build        # tsc -b && vite build(产出 dist/)
npx wrangler pages deploy dist --project-name=hua-liao-ge-xue --branch=main   # 部署生产
```

**发布流程(六步固定顺序,不可跳过)**:

1. 改代码 → 跑 `vitest run --pool=forks` 全量测试通过;
2. `npm run build` 构建通过;
3. `npx wrangler pages deploy dist --project-name=hua-liao-ge-xue --branch=main` 部署;
4. **线上验证**:抓 https://ps.lingben.top 的 JS bundle 确认版本号/新功能生效(CDN 有缓存,用 `?t=时间戳` 破缓存);
5. 更新对应游戏日志 + 平台日志(见「文档与日志约定」),`python scripts/make_docx.py` 生成 docx;
6. 提交 git(**提交前必须按「Git 约定」弹窗询问用户**)。

## 三、Git 同步与提交约定

1. **每次更新必须 git 同步**(2026-08-16 起强制):任何改动(代码/文档/日志)完成后立即 `git add` + `git commit` + `git push`,禁止只存本地。——教训:曾因长期未同步导致日志被双重转码损坏且不可逆(f0510ff 修复)。
2. **提交前必须弹窗询问用户两件事**(2026-08-17 起强制):
   - ① 是否已开启临时代理(127.0.0.1:7890)。用户确认后配置 `git config http.proxy http://127.0.0.1:7890`(同时配 https.proxy),**推送完成后立即 unset 撤销**;
   - ② 用户是否已实际检查问题确实修改完成——防止版本号空转/未部署/未验证的无效版本更迭。
3. **部署与验证先行**(2026-08-17 起强制):涉及线上表现的功能,先部署并线上验证(确认 bundle 版本号)再提交 git。——教训:2026-08-17 版本号先提交未部署,线上停留旧版。
4. **贡献人认定**:版本更新未提及贡献者时,一律默认只有 **ps**(项目所有者);有他人参与必须在日志中注明。

## 四、文档与日志约定

1. **日志双份同步**:每个版本更新都要写两处:
   - 对应游戏 `docs/xxx_summary_report.md`——版本历史**正序追加在文件末尾**(最早的版本在最前);
   - 平台 `docs/platform_log.md`——「历史进程」表格末尾**追加一行**(日期、小游戏、版本、概要、**贡献人**;平台行一律 ps,游戏行未提及他人默认 ps,有人参与照实列全如「ps、在下雨」)。
2. 每次更新 md 日志后运行 `python scripts/make_docx.py docs/xxx.md` 同步生成 .docx(md + docx 双份)。
3. docs/ 下文档编码一律 UTF-8;不要用会触发编码转换的工具反复另存(历史乱码事故根源)。
4. **接手模型纪律**:接手后先读 `docs/platform_log.md`(历史+约定)与本文档再动手;高风险操作(清榜/删数据/改密钥/重部署)必须先向用户确认,宁可多确认,不擅自推线上或改数据。

## 五、安全约定(绝不违反)

1. **生产 `ADMIN_TOKEN` 绝不以明文出现在对话/代码/日志/commit 中**。写入方式:`wrangler pages secret put ADMIN_TOKEN`(生产);本地用 `.dev.vars`(已 gitignore)。
2. **违禁词表双份必须同步**:`src/game/badwords.ts`(前端)与 `functions/_lib/badwords.js`(后端),任何一侧增删词都要同步另一侧。
3. **`scripts/verify_prod.mjs` 保持非破坏性**:绝不清榜,收尾仅按唯一测试昵称自删测试痕迹并断言真实数据原样保留(可连续重跑)。
4. 排行榜删除/清空等破坏性操作仅限管理后台(令牌登录)执行,且全程写审计日志。

## 六、排行榜 API 通用约定(三游戏一致)

1. 防刷与校验:60s/IP 限频(超限 429);昵称清洗(trim / 去控制字符 / ≤10 字 / 含违禁词 400 / 过滤 `< >`);成绩用时 ≥10s(失败局 hp=0 放宽);同名放开(靠上榜时间区分);单榜上限 200 条。
2. KV 键分布(勿改):
   - 化了个学:裸键 `easy` / `normal` / `challenge` / `extreme`
   - 英了个语:`ylgy:easy` / `ylgy:normal` / `ylgy:hard`(v1.4.9 由 `ws:` 改名,线上旧键 `ws:*` 已复制迁移、保留未删)
   - 错了个字:`clgz:all`
   - 分了个类:`flgl:easy` / `flgl:normal` / `flgl:hard`
   - 建议反馈:`feedback`(上限 500 条,超出丢最旧)
3. 平台分离:mobile / desktop 榜单分开,排名仅同平台比较。
4. 排序规则:
   - 化了个学:hp↓ → 消除组数(clears)↓ → 用时↑ → 技能使用次数(tools)↑;0 心无组数旧记录按用时降序;
   - 英了个语:hp↓ → 填写字母数(clears)↓ → 用时↑ → 技能使用次数↑;
   - 错了个字:得分(score)↓ → 用时↑;
   - 分了个类:正确数(score)↓ → 用时↑(score 上限 clamp 20)。

## 七、后台管理与审计约定

1. `/admin` 独立 SPA(入口 admin/index.html),ADMIN_TOKEN 令牌登录。
2. 模块:数据看板(三游戏统计)/ 榜单管理(三游戏独立 tab:查看/搜索/单条删除/清空)/ 审计日志 / 会话管理 / 建议反馈。
3. **所有删除/清空操作必须写审计日志**(rank_delete_one / rank_clear_mode / rank_clear_all / feedback_delete_one / feedback_clear 等)。
4. 审计日志环形上限 500 条。

## 八、已知坑与技术注意(操作前必读)

1. **Vitest 在 Windows 必须 `--pool=forks`**(默认线程池会挂起);偶有残留 node 进程,用 `taskkill //F //T //PID` 清整棵进程树(workerd 会不断重启)。
2. **本地验证**:`npx wrangler pages dev dist --kv=RANKINGS --persist-to .wrangler/state --port 8799`,用完必须杀掉进程树(端口 8799 常被占用)。
3. **CDN 缓存**:部署后线上可能延迟生效,验证用 `?t=时间戳` 破缓存;压缩后 JS 变量名/字符串会变(minCover 变 `.55`、函数名被内联),检测功能用**行为特征码**而非名称。
4. **curl 中文乱码**:git-bash 下 curl 中文输出乱码,线上验证用 Node fetch。
5. **路由白名单 `public/_routes.json`**:新增任何路径必须加进去(现有:/hlgx/api/*、/hlgx/hua、/hlgx/rank、/ylgy/api/*、/ylgy、/ws(旧链接,SPA 重定向兼容)、/clgz/api/*、/clgz、/flgl/api/*、/flgl、/api/feedback、/admin/*),漏加则线上 404。
6. **git 代理是临时的**:推完必须 `git config --unset http.proxy`(及 https.proxy),不留全局配置。
7. **日志日期时区**:fmtDate 固定 Asia/Shanghai。
8. 错了个字判定调参:用控制台 `__clgzSnapshot()` 查看墨迹/字形 ASCII 快照与 cover/stray 详情;**不要加面积比上限**(v1.0.5 教训,误伤认真写粗笔画的玩家)。

## 九、新增游戏标准模式(参考错了个字上线流程)

新增一款游戏需同步完成:

0. **先问用户要文件缩写**(v2.5.5 起,见「版本号约定」第 6 条),用户给出后再动手命名;
1. `src/gameN/` 游戏目录(含 `version.ts` 独立版本常量、core 纯逻辑、页面、玩法介绍组件);
2. `functions/xxx/api/rank.js` 独立榜单 API(复用 `_lib/` 的 ranklib/ratelimit/badwords/auth/audit);
3. `public/_routes.json` 白名单加新路径;
4. RankPage 的 GAMES 配置加 tab;HubPage 加卡片 + 玩法介绍子页;
5. `docs/xxx_summary_report.md` 独立日志(正序)+ platform_log.md 追加行 + make_docx 生成 docx;
6. 前端跳转/直链参数用该游戏缩写(如 `?game=clgz`)。

## 十、约定变更记录

| 日期 | 约定 | 说明 |
|------|------|------|
| 2026-08-16 | 每次更新必须 git 同步 | 日志双重转码损坏事故教训 |
| 2026-08-17 | 提交前弹窗问代理 + 实际检查;部署与验证先行 | v2.3.8 先提交未部署教训 |
| 2026-08-17 | 版本号显示约定(任意界面显示该游戏版本) | v2.3.8 / v2.4.3 确立 |
| 2026-08-21 | 本文档建立,全部约定集中持久化 | 整理自 HANDOFF_PROMPT.md + platform_log.md |
| 2026-08-21 | 英了个语缩写 ws→ylgy 全量改名;新建游戏缩写必须先问用户 | v1.4.9 / 平台 v2.5.5 |
| 2026-08-21 | 建议反馈新增「鸣谢意愿」问询,随建议提交后台展示 | 平台 v2.5.5 |
| 2026-08-21 | 平台日志历史进程表新增「贡献人」列(补全 64 行历史) | 平台 v2.5.5 |
