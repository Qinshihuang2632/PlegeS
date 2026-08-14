# p了个s 游戏平台 · 完整交接说明(供接手模型使用)

> 本说明用于将「p了个s」游戏平台(已上线两款游戏)的开发工作交接给其他平台模型。
> 接手前请先阅读 `docs/` 下三份版本日志了解完整历史:
> `platform_log.md`(平台总日志)、`hlgx_summary_report.md`(化了个学)、`ws_summary_report.md`(英了个语)。

---

## 一、项目概览

**平台名:p了个s**(高考知识主题小游戏合集,不限于化学)。
**已上线 2 款游戏**:
1. **化了个学** —— 化学消除类(羊了个羊式金字塔消除,高考化学知识)
2. **英了个语** —— 英语交叉单词网格填词(横竖词交叉,课标词汇)

**部署形态**:Cloudflare Pages(静态)+ Pages Functions(API)+ KV(排行榜存储)。
旧 Flask 版已冻结于 `legacy/`(不再维护,勿改)。

**生产地址**:https://hua-liao-ge-xue.pages.dev
**Git 仓库**:https://github.com/Qinshihuang2632/PlegeS.git(分支 main)

---

## 二、技术栈

- 前端:Vite + React 19 + TypeScript(strict)+ Tailwind CSS v4 + shadcn/ui + React Router 7(Vite MPA 双入口:index.html 游戏、admin/index.html 管理后台)
- 后端:Cloudflare Pages Functions(纯 JS,`functions/` 目录),KV binding 名为 `RANKINGS`
- 测试:Vitest(运行必须加 `--pool=forks`,默认线程池在 Windows 上会僵死)
- 脚本:`scripts/`(契约自测 / 本地端到端 / 生产验证 / docx 生成 / 数据修正)

---

## 三、目录结构

```
src/game/            化了个学(页面 + core.ts 核心逻辑 + substances.ts 物质库 218 种 + 音效/UI)
src/game2/           英了个语(core.ts 交叉网格逻辑 + words.ts 课标词库 + meanings*.ts 释义字典 + 页面)
src/admin/           管理后台(登录/看板/榜单管理/审计日志/会话)
functions/hlgx/api/  化了个学排行榜 API(rank.js)
functions/ws/api/    英了个语排行榜 API(rank.js, KV 键 ws: 前缀)
functions/_lib/      公共(ranklib 排序/badwords 违禁词/ratelimit 限频/audit 审计/auth 会话)
public/_routes.json  路由白名单
docs/                三份日志 .md + 对应 .docx(必须同步更新)
scripts/             api_selftest / e2e_local / verify_prod / make_docx / fix_legacy_rank / check_imports
legacy/              冻结的旧 Flask 镜像
qa-evidence/         QA 截图与回归脚本(非代码)
```

---

## 四、开发 / 构建 / 测试 / 部署流程

```bash
npm run dev            # 本地 Vite dev
npm run build          # tsc -b && vite build(先跑这个确认类型)
npm run deploy         # build + wrangler pages deploy dist --branch=main(生产)
# 本地模拟生产:
npx wrangler pages dev dist --kv=RANKINGS --persist-to .wrangler/state --port 8799
# 全量测试(必须 forks):
npx vitest run --pool=forks
# 契约自测(内存 KV,不依赖环境):
node scripts/api_selftest.mjs
# 本地端到端(需先启动上面的 dev):
node scripts/e2e_local.mjs
# 生产验证(非破坏!):
ADMIN_TOKEN=<生产令牌> node scripts/verify_prod.mjs
```

**发布流程(固定顺序,每版必做)**:
1. 改代码 → `npx vitest run --pool=forks` + `npm run build` 全绿
2. 更新版本号(见下)与三份日志(docs/ 下 md)
3. `python scripts/make_docx.py docs/platform_log.md` 与另外两份 md 生成 docx
4. `npm run deploy` → 等 8 秒 → `ADMIN_TOKEN=<令牌> node scripts/verify_prod.mjs`(33 项全过)
5. `git add -A -- src/ functions/ public/ docs/ && git commit`(提交信息含版本号)

---

## 五、版本号体系(各游戏独立,严禁互相继承)

- `src/version.ts`:`APP_VERSION` = 化了个学版本(当前 **v2.3.5**);`PLATFORM_VERSION` = 平台里程碑(当前 **v2.4.0**)
- `src/game2/version.ts`:`WS_VERSION` = 英了个语版本(当前 **v1.4.1**)
- 各游戏在各自页面/日志/榜单提交中用自己的版本号;平台版本仅在平台级变更时 +1
- 每次发布都必须让「界面显示版本号 = 日志版本号 = 提交版本号」

---

## 六、日志与文档约定(必须遵守)

- `docs/platform_log.md`:平台总日志,每版**一行简介**(表格行),头部维护约定含「未提及贡献者默认 ps」
- `docs/hlgx_summary_report.md` / `docs/ws_summary_report.md`:各游戏详细日志,版本条目须标注 `> 更新贡献人:xxx`(未提及默认 **ps**)
- **md 与 docx 必须同步**:改 md 后立即用 make_docx.py 重新生成对应 docx
- 版本号不丢失:任何版本发布都要有日志条目

---

## 七、git / 网络 / 安全

- 远程:origin → https://github.com/Qinshihuang2632/PlegeS.git,分支 main,已与远端同步
- **国内访问 GitHub 需代理**:`git config http.proxy http://127.0.0.1:7890`(或 https.proxy),**用完必须撤销**(`git config --unset http.proxy / https.proxy`),用户要求代理一律临时
- **敏感信息**:生产 ADMIN_TOKEN 只存在于 Cloudflare Pages secret(通过 `wrangler pages secret put` 设置),**绝不写入 git/wrangler.toml/对话明文**;`.dev.vars` 为本地开发密钥(已 gitignore,不入库)
- 违禁词表双份同步:`functions/_lib/badwords.js`(后端强制 400)与 `src/game/badwords.ts`(前端即时提示),增删词必须双端一致
- Agent Harness(本机命令审批工具):skill 在 `~/.zcode/skills/agent-harness/`;可执行文件在 `D:\program files\Linkbrain\Agent Harness\AgentHarness.exe`;删除/高危命令应经其载荷审批(`--payload payload.json` + file 回调);每次动手前 `git status`,完成一轮即提交
- 修改文件后若涉及 git push/pull,注意网络;不破坏任何生产数据

---

## 八、化了个学(第一款,当前 v2.3.5)

**玩法**:7 层金字塔堆叠,点击未被遮挡的卡牌入手牌槽,凑 3 张同类(按 8 大类别)消除;血量 3,误消扣血;胜负判定严格(全部拾取且无三消可能才通关)。

**难度**:简单(5 层 55 块)/ 标准(7 层 140)/ 困难(8 层 204,原「挑战」改名)/ 挑战(14 层 368,四角小金字塔+柱子+倒置金字塔,层间像素遮挡)。

**道具**(各 3 次):撤回(最后一张放回棋盘)、移出(**移除当前选中的至多 3 张,无伤消除**)、洗牌(打乱场上卡牌)。

**物质库**:218 种,8 类别(金属/非金属/氧化物/酸/碱/盐/有机物/混合物);有机酸(醋酸/甲酸/草酸/苯甲酸/甘氨酸)多类别消除;卡牌简介 ≤10 字且不暴露类别(有测试断言)。

**排行榜**:`/hlgx/api/rank`,KV 键 easy/normal/challenge/extreme;排序 `hp↓ → clears(成功消除组数)↓ → time↑ → tools↑`;**平台分榜**(手游 mobile/端游 desktop,仅同平台比较);榜单含「版本」列与「消除组数」;旧记录按日期推断版本(≤v2.0.2 / ≤v2.1.8 / v2.1.9)。

**界面**:爱心血量、层数角标(顶层=1)、悬停简介含层数、昵称永久记忆(首次输入后不再询问,结算可换名)。

---

## 九、英了个语(第二款,当前 v1.4.1)

**玩法**:交叉单词网格——若干水平词与垂直词交叉摆放(相交处共享同一字母),组成自由图形;未占用表格位为灰色不可点(不是单词成分);每个词填满时校验是否为词库单词,非法扣血标红;全部词完成即通关。**注意:玩法历经多次重构(全填 word square → 链式 → 现为交叉网格自由图形),以当前实现为准,历史细节见日志**。

**生成与唯一解**:`buildCross`(词两两不同、全图连通、每词与已放词交叉 ≥1 格、边界框受 maxDim 约束:简单 7/标准 9/困难 10);挖空采用「全填 → 逐步挖空,每步 `solveCross`(MRV 回溯)验证恰 1 个解」,唯一解严格保证。

**难度**:
- 简单:4 词(4 字母),挖 40%,hintWords=1(首词全提示),**额外保证:至少 1 个交叉格被挖 + 总空格 ≥4**
- 标准:6 词(5 字母),挖 55%,hintWords=2(前 2 词全提示)
- 困难:8 词(5 字母课标难词),挖 70%,hintWords=1

**词库**(课标及衍生,生成只用有释义词):4 字母 453 / 5 字母 573 / 6 字母 502;难词表 478(课标 5 字母子集);释义字典 `meanings.ts`(452 条)+ `meanings5.ts`(370 条)。

**道具**:
- 填空提示:每局 2 次,向随机空位填正确字母
- 含义提示:每局 1 次,随机选一个未填完词,**蓝圈圈出整词**(不显示拼写),表格下方显示随机一条释义(词性+中文,text-sm),**7 秒后或任意按键(不含上下滑动)自动消除**

**结算**:公布成绩 + **完整正确答案网格** + **逐词释义**(词性与中文,多词性全部列出),玩家自行查看后再操作。

**排行榜**:`/ws/api/rank`,KV 键 ws:easy/ws:normal/ws:hard;排序与防刷同化了个学;tools 字段 = 两道具剩余总次数。

**空格样式**:待填空格外框 2px 深色(border-2 border-muted-foreground/60)+ 背景加深(bg-muted/50);未占用格浅色无边框(bg-muted/30);预填格 bg-muted;完成绿/错误红。

**界面**:爱心血量、字母条(A-Z+退格,触屏)+ 物理键盘、难度 tabs、昵称复用平台昵称(hlgx_name)。

---

## 十、排行榜 API 通用规则(两游戏一致)

- 校验顺序:mode → 平台解析(显式或 UA 兜底)→ 60s/IP 限频 → 昵称清洗(trim/去控制字符/≤10 字/违禁词/`<>` 过滤)→ 数值 clamp → 用时 ≥10 秒 → 单难度上限 200 条
- **同名昵称放开**(v2.1.6 起,不再查重/加序列号,靠上榜时间区分)
- 排序:血量↓ → 消除组数(clears)↓ → 用时↑ → 道具余量(tools)↑
- `scripts/verify_prod.mjs` 为**非破坏**验证:只提交 1 条测试成绩并**按名单条删除自己那条**,绝不调用清榜接口;生产榜单有真实玩家数据,任何操作不得清空

---

## 十一、已知注意事项与坑

1. **Vitest 必须 `--pool=forks`**(默认线程池 Windows 会僵死/卡死)
2. 本地 dev server 端口 8799 易留僵尸进程(wrangler/workerd),启动前 `netstat` 检查并清理;`taskkill //F //PID` 杀进程树(npx→wrangler→workerd 整条链)
3. Windows 下 git-bash 的 curl POST 中文会 GBK 乱码,测试用 Node fetch
4. 管理后台在 `/admin`(令牌登录、审计日志、会话管理),管理功能绝不放用户界面
5. `public/_routes.json` 路由白名单(游戏 API/页面/管理后台),新增路径需同步
6. 修改物质库/词库/释义后,运行对应 Vitest(简介防泄漏、课标性、释义覆盖等断言)
7. 生产令牌与密钥:绝不写进代码/日志/对话;需要时向项目所有者索取
8. 文件路径注意:日志在 `docs/`(不是根目录);docx 生成脚本在 `scripts/make_docx.py`(用法 `python scripts/make_docx.py docs/<file>.md`)

---

## 十二、给接手模型的最后指示

1. 先读 `docs/` 三份日志 + 本说明,再动代码
2. 每次改动遵循:测试 → 构建 → 版本号 → 日志(md+docx)→ 部署 → verify_prod → 提交
3. 版本号各游戏独立递增;界面版本号必须跟随发布
4. 高危操作(删除/覆盖/推送外部)先确认或经 Agent Harness 审批
5. 有疑问时以代码与日志为准,不臆测;改动不可逆时先备份/先问
