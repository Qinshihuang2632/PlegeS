# 「化了个学」QA 证据审计报告

> 审计范围：`qa-evidence/` 主批次、`qa-evidence/prod/` 生产批次、`qa-evidence/_stale/` 旧批次。
> 审计方法：全量 PNG 进行 MD5 比对 + 关键帧目视抽样检查；JSON/日志做结构核对与重复检测。
> 判定原则：本报告**只审阅建议，不实际删除**。

## 总体发现

- 全量 PNG **159 张**，其中存在 **44 组 MD5 重复**，涉及 **98 张图**。
- 绝大多数重复是**同一运行内的顺序帧**（如 `R05-点击后-Fe₂(SO₄)₃-成功` 的棋盘状态 = `R06-点击前-C₂H₄`），属于正常的连续截图产物，**不是无效证据**。
- 缺陷复现帧 `R15 == R16` 也是预期同帧，证明“点击无反应”，**判定为有效缺陷证据**。
- 真正的冗余帧：`E1-干净特写` 与同一运行的 `R13-after/R15/R16` 像素完全一致；`dom-evidence.json` 与 `shots.log` 内容完全一致；`qa-report.html` 与 `qa-report.md` 内容一致。
- 跨文件夹（main / prod / _stale）**未发现任何字节级相同的图片**，三个批次互为独立证据。
- `_stale/` 整批为历史尝试/弃用帧，内容被主批次和生产批次覆盖，建议整体作废。

---

## 文件总表

| 文件路径 | 类型 | 内容摘要 | 判定 | 价值 | 重复·备注 |
|---|---|---|---|---|---|
| D:\program\game one\qa-evidence\01-进入页面-新手引导.png | 截图 | 新手引导页 | 🕓已过时(被R01-R03取代) | B | - |
| D:\program\game one\qa-evidence\02-昵称窗.png | 截图 | 昵称输入窗 | 🕓已过时(被R01-R03取代) | B | - |
| D:\program\game one\qa-evidence\03-开局棋盘.png | 截图 | 开局棋盘全景 | 🕓已过时(被R01-R03取代) | B | - |
| D:\program\game one\qa-evidence\04-步骤1-点击前.png | 截图 | 顶层牌点击前 | 🕓已过时(被R01-R03取代) | B | - |
| D:\program\game one\qa-evidence\05-步骤1-点击后.png | 截图 | 顶层牌点击后/首步结果 | 🕓已过时(被R01-R03取代) | B | - |
| D:\program\game one\qa-evidence\06-点击前-Al₂O₃.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\06-点击前-HClO₄.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\06-点击前-NH₄NO₃.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\07-点击后-Al₂O₃-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\07-点击后-HClO₄-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\07-点击后-NH₄NO₃-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | 同md5: D:\program\game one\qa-evidence\08-点击前-NaNO₃.png |
| D:\program\game one\qa-evidence\08-点击前-C₆H₆.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\08-点击前-HCl.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\08-点击前-NaNO₃.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | 同md5: D:\program\game one\qa-evidence\07-点击后-NH₄NO₃-成功.png |
| D:\program\game one\qa-evidence\09-点击后-C₆H₆-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\09-点击后-HCl-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\09-点击后-NaNO₃-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | 同md5: D:\program\game one\qa-evidence\10-点击前-C₆H₅OH.png |
| D:\program\game one\qa-evidence\10-点击前-CrO₂.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\10-点击前-C₆H₅OH.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | 同md5: D:\program\game one\qa-evidence\09-点击后-NaNO₃-成功.png |
| D:\program\game one\qa-evidence\10-点击前-KBr.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\11-点击后-CrO₂-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\11-点击后-C₆H₅OH-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | 同md5: D:\program\game one\qa-evidence\12-点击前-NaClO₃.png |
| D:\program\game one\qa-evidence\11-点击后-KBr-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | 同md5: D:\program\game one\qa-evidence\12-点击前-K₂CrO₄.png |
| D:\program\game one\qa-evidence\12-点击前-KBr.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\12-点击前-K₂CrO₄.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | 同md5: D:\program\game one\qa-evidence\11-点击后-KBr-成功.png |
| D:\program\game one\qa-evidence\12-点击前-NaClO₃.png | 截图 | 某卡牌点击前 | 🕓已过时(被R06-R13取代) | B | 同md5: D:\program\game one\qa-evidence\11-点击后-C₆H₅OH-成功.png |
| D:\program\game one\qa-evidence\13-点击后-KBr-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\13-点击后-K₂CrO₄-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\13-点击后-NaClO₃-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被R06-R13取代) | B | - |
| D:\program\game one\qa-evidence\dom-evidence.json | JSON | 幽灵容器DOM证据 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\E1-被拦截牌-C₆H₁₂O₆-干净特写.png | 截图 | 被拦截牌干净特写 | 🔁重复(与R13-after/R15/R16同帧) | B | 同md5: D:\program\game one\qa-evidence\R13-点击后-第1层-右下-Br₂-成功入槽.png; D:\program\game one\qa-evidence\R15-点击前-被拦截牌-C₆H₁₂O₆.png; D:\program\game one\qa-evidence\R16-点击后-被拦截牌-C₆H₁₂O₆-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\E2-被拦截牌-C₆H₁₂O₆-覆盖标注.png | 截图 | 覆盖标注 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\E3-DevTools-Elements-两层结构.png | 截图 | DevTools Elements两层结构 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\E4-DevTools-Computed-pointer-events.png | 截图 | DevTools Computed pointer-events | ✅有效 | A | - |
| D:\program\game one\qa-evidence\E5-Console-elementFromPoint.png | 截图 | Console elementFromPoint | ✅有效 | A | - |
| D:\program\game one\qa-evidence\evidence.json | JSON | 旧格式QA记录 | 🕓已过时(旧格式,被evidence2取代) | B | - |
| D:\program\game one\qa-evidence\evidence2.json | JSON | 回归轮结构化点击记录 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\prod\evidence2.json | JSON | 回归轮结构化点击记录 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\prod\R01-新手引导.png | 截图 | 新手引导页 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\prod\R02-昵称窗.png | 截图 | 昵称输入窗 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\prod\R03-开局棋盘.png | 截图 | 开局棋盘全景 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\prod\R04-点击前-顶层牌(第0层)-K₂O₂.png | 截图 | 顶层牌点击前 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\prod\R05-点击后-顶层牌(第0层)-K₂O₂-成功入槽.png | 截图 | 顶层牌点击后/首步结果 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R06-点击前-第1层-左上-ZnSO₄.png |
| D:\program\game one\qa-evidence\prod\R06-点击前-第1层-左上-ZnSO₄.png | 截图 | 第1层某角点击前 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R05-点击后-顶层牌(第0层)-K₂O₂-成功入槽.png |
| D:\program\game one\qa-evidence\prod\R07-点击后-第1层-左上-ZnSO₄-成功入槽.png | 截图 | 第1层某角点击后成功 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R08-点击前-第1层-右上-CH₃CHO.png |
| D:\program\game one\qa-evidence\prod\R08-点击前-第1层-右上-CH₃CHO.png | 截图 | 第1层某角点击前 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R07-点击后-第1层-左上-ZnSO₄-成功入槽.png |
| D:\program\game one\qa-evidence\prod\R09-点击后-第1层-右上-CH₃CHO-成功入槽.png | 截图 | 第1层某角点击后成功 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R10-点击前-第1层-左下-C₆H₁₂O₆.png |
| D:\program\game one\qa-evidence\prod\R10-点击前-第1层-左下-C₆H₁₂O₆.png | 截图 | 第1层某角点击前 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R09-点击后-第1层-右上-CH₃CHO-成功入槽.png |
| D:\program\game one\qa-evidence\prod\R11-点击后-第1层-左下-C₆H₁₂O₆-成功入槽.png | 截图 | 第1层某角点击后成功 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R12-点击前-第1层-右下-C₂H₆.png |
| D:\program\game one\qa-evidence\prod\R12-点击前-第1层-右下-C₂H₆.png | 截图 | 第1层某角点击前 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R11-点击后-第1层-左下-C₆H₁₂O₆-成功入槽.png |
| D:\program\game one\qa-evidence\prod\R13-点击后-第1层-右下-C₂H₆-成功入槽.png | 截图 | 第1层某角点击后成功 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R15-点击前-被拦截牌-[Cu(NH₃)₄]SO₄.png; D:\program\game one\qa-evidence\prod\R16-点击后-被拦截牌-[Cu(NH₃)₄]SO₄-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\prod\R14-五张移除后-全局.png | 截图 | 五张移除后全局 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\prod\R15-点击前-被拦截牌-[Cu(NH₃)₄]SO₄.png | 截图 | 被拦截牌点击前 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R13-点击后-第1层-右下-C₂H₆-成功入槽.png; D:\program\game one\qa-evidence\prod\R16-点击后-被拦截牌-[Cu(NH₃)₄]SO₄-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\prod\R16-点击后-被拦截牌-[Cu(NH₃)₄]SO₄-无反应(缺陷复现).png | 截图 | 被拦截牌点击后无反应 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\prod\R13-点击后-第1层-右下-C₂H₆-成功入槽.png; D:\program\game one\qa-evidence\prod\R15-点击前-被拦截牌-[Cu(NH₃)₄]SO₄.png |
| D:\program\game one\qa-evidence\prod\run.log | 日志 | 运行日志 | 🗑可删除(纯日志) | C | - |
| D:\program\game one\qa-evidence\qa-report.html | 报告 | 缺陷报告(HTML) | 🔁重复(同qa-report.md) | B | - |
| D:\program\game one\qa-evidence\qa-report.md | 报告 | 缺陷报告(Markdown) | ✅有效 | A | - |
| D:\program\game one\qa-evidence\qa-repro.mjs | 脚本 | 缺陷复现脚本 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\R01-新手引导.png | 截图 | 新手引导页 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\R02-昵称窗.png | 截图 | 昵称输入窗 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\R03-开局棋盘.png | 截图 | 开局棋盘全景 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\R04-点击前-顶层牌(第0层)-Fe₂(SO₄)₃.png | 截图 | 顶层牌点击前 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\R05-点击后-顶层牌(第0层)-Fe₂(SO₄)₃-成功入槽.png | 截图 | 顶层牌点击后/首步结果 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\R06-点击前-第1层-左上-C₂H₄.png |
| D:\program\game one\qa-evidence\R06-点击前-第1层-左上-C₂H₄.png | 截图 | 第1层某角点击前 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\R05-点击后-顶层牌(第0层)-Fe₂(SO₄)₃-成功入槽.png |
| D:\program\game one\qa-evidence\R07-点击后-第1层-左上-C₂H₄-成功入槽.png | 截图 | 第1层某角点击后成功 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\R08-点击前-第1层-右上-NiSO₄.png |
| D:\program\game one\qa-evidence\R08-点击前-第1层-右上-NiSO₄.png | 截图 | 第1层某角点击前 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\R07-点击后-第1层-左上-C₂H₄-成功入槽.png |
| D:\program\game one\qa-evidence\R09-点击后-第1层-右上-NiSO₄-成功入槽.png | 截图 | 第1层某角点击后成功 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\R10-点击前-第1层-左下-I₂.png |
| D:\program\game one\qa-evidence\R10-点击前-第1层-左下-I₂.png | 截图 | 第1层某角点击前 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\R09-点击后-第1层-右上-NiSO₄-成功入槽.png |
| D:\program\game one\qa-evidence\R11-点击后-第1层-左下-I₂-成功入槽.png | 截图 | 第1层某角点击后成功 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\R12-点击前-第1层-右下-Br₂.png | 截图 | 第1层某角点击前 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\R13-点击后-第1层-右下-Br₂-成功入槽.png | 截图 | 第1层某角点击后成功 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\E1-被拦截牌-C₆H₁₂O₆-干净特写.png; D:\program\game one\qa-evidence\R15-点击前-被拦截牌-C₆H₁₂O₆.png; D:\program\game one\qa-evidence\R16-点击后-被拦截牌-C₆H₁₂O₆-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\R14-五张移除后-全局.png | 截图 | 五张移除后全局 | ✅有效 | A | - |
| D:\program\game one\qa-evidence\R15-点击前-被拦截牌-C₆H₁₂O₆.png | 截图 | 被拦截牌点击前 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\E1-被拦截牌-C₆H₁₂O₆-干净特写.png; D:\program\game one\qa-evidence\R13-点击后-第1层-右下-Br₂-成功入槽.png; D:\program\game one\qa-evidence\R16-点击后-被拦截牌-C₆H₁₂O₆-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\R16-点击后-被拦截牌-C₆H₁₂O₆-无反应(缺陷复现).png | 截图 | 被拦截牌点击后无反应 | ✅有效 | A | 同md5: D:\program\game one\qa-evidence\E1-被拦截牌-C₆H₁₂O₆-干净特写.png; D:\program\game one\qa-evidence\R13-点击后-第1层-右下-Br₂-成功入槽.png; D:\program\game one\qa-evidence\R15-点击前-被拦截牌-C₆H₁₂O₆.png |
| D:\program\game one\qa-evidence\run.log | 日志 | 运行日志 | 🗑可删除(纯日志) | C | - |
| D:\program\game one\qa-evidence\shots.log | 日志 | 面板脚本日志(同dom-evidence) | 🔁重复(同dom-evidence.json) | B | - |
| D:\program\game one\qa-evidence\_stale\01-进入页面-新手引导.png | 截图 | 新手引导页 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\02-昵称窗.png | 截图 | 昵称输入窗 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\03-开局棋盘.png | 截图 | 开局棋盘全景 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\04-步骤1-点击前.png | 截图 | 顶层牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\05-步骤1-点击后.png | 截图 | 顶层牌点击后/首步结果 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\06-点击前-C₆₀.png | 截图 | 某卡牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\07-点击后-C₆₀-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\08-点击前-NO₂.png | 截图 | 某卡牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\09-点击后-NO₂-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\10-点击前-K₂O₂.png |
| D:\program\game one\qa-evidence\_stale\10-点击前-K₂O₂.png | 截图 | 某卡牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\09-点击后-NO₂-成功.png |
| D:\program\game one\qa-evidence\_stale\11-点击后-K₂O₂-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\12-点击前-HNO₂.png |
| D:\program\game one\qa-evidence\_stale\12-点击前-HNO₂.png | 截图 | 某卡牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\11-点击后-K₂O₂-成功.png |
| D:\program\game one\qa-evidence\_stale\13-点击后-HNO₂-成功.png | 截图 | 某卡牌点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\E1-缺陷状态-中心牌特写.png | 截图 | 被拦截牌干净特写 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\E1-被拦截牌-Al₂(SO₄)₃-干净特写.png | 截图 | 被拦截牌干净特写 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CuSO₄·5H₂O-成功入槽.png; D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-Al₂(SO₄)₃.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-Al₂(SO₄)₃-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\E1-被拦截牌-K₂O₂-干净特写.png | 截图 | 被拦截牌干净特写 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-H₂O-成功入槽.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-K₂O₂-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\E2-标注-幽灵容器覆盖目标牌.png | 截图 | 覆盖标注 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\E2-被拦截牌-Al₂(SO₄)₃-覆盖标注.png | 截图 | 覆盖标注 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\E2-被拦截牌-K₂O₂-覆盖标注.png | 截图 | 覆盖标注 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\E3-DevTools-Elements-两层结构.png | 截图 | DevTools Elements两层结构 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\E4-DevTools-Computed-pointer-events.png | 截图 | DevTools Computed pointer-events | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\E5-Console-elementFromPoint.png | 截图 | Console elementFromPoint | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\evidence2.json | JSON | 回归轮结构化点击记录 | 🕓已过时(被主批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\R04-点击前-顶层牌(第0层)-C₂H₂.png | 截图 | 顶层牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\R04-点击前-顶层牌(第0层)-FeSO₄.png | 截图 | 顶层牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\R04-点击前-顶层牌(第0层)-N₂O₄.png | 截图 | 顶层牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\R04-点击前-顶层牌(第0层)-SeO.png | 截图 | 顶层牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-Cr(OH)₃-成功入槽.png | 截图 | 顶层牌点击后/首步结果 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-NaCl.png |
| D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-C₂H₂-成功入槽.png | 截图 | 顶层牌点击后/首步结果 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-K₂CrO₄.png |
| D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-FeSO₄-成功入槽.png | 截图 | 顶层牌点击后/首步结果 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-KAl(SO₄)₂.png |
| D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-HNO₃-成功入槽.png | 截图 | 顶层牌点击后/首步结果 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-As.png |
| D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-N₂O₄-成功入槽.png | 截图 | 顶层牌点击后/首步结果 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-Li.png |
| D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-SeO-成功入槽.png | 截图 | 顶层牌点击后/首步结果 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-Fe(OH)₃.png |
| D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-As.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-HNO₃-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-Fe(OH)₃.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-SeO-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-KAl(SO₄)₂.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-FeSO₄-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-K₂CrO₄.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-C₂H₂-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-Li.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-N₂O₄-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-NaCl.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-Cr(OH)₃-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-As-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-NiSO₄.png |
| D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-Fe(OH)₃-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-AgCl.png |
| D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-KAl(SO₄)₂-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-CH₃Cl.png |
| D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-K₂CrO₄-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-S.png |
| D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-Li-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-Na₂B₄O₇.png |
| D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-NaCl-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-Rb.png |
| D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-AgCl.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-Fe(OH)₃-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-CH₃Cl.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-KAl(SO₄)₂-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-Na₂B₄O₇.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-Li-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-NiSO₄.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-As-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-Rb.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-NaCl-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-S.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-K₂CrO₄-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-AgCl-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-CH₃Cl-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-PbSO₄.png |
| D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-Na₂B₄O₇-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-AgBr.png |
| D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-NiSO₄-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-NaHCO₃.png |
| D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-Rb-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-FeSO₄.png |
| D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-S-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-Al(OH)₃.png |
| D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-AgBr.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-Na₂B₄O₇-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-Al(OH)₃.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-S-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-FeSO₄.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-Rb-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-H₂S.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-NaHCO₃.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-NiSO₄-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-PbSO₄.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-CH₃Cl-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-AgBr-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-Mg(OH)₂.png |
| D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-Al(OH)₃-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-H₂O.png |
| D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-FeSO₄-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-CrCl₃.png |
| D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-H₂S-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-CuSO₄·5H₂O.png |
| D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-NaHCO₃-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-Br₂.png |
| D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-PbSO₄-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-CH₃COCH₃.png |
| D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-Br₂.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-NaHCO₃-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-CH₃COCH₃.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-PbSO₄-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-CrCl₃.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-FeSO₄-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-CuSO₄·5H₂O.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-H₂S-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-H₂O.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-Al(OH)₃-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-Mg(OH)₂.png | 截图 | 第1层某角点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-AgBr-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-Br₂-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-CH₂Cl₂.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-CH₂Cl₂-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CH₃COCH₃-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-KCl.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-KCl-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CrCl₃-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-NaBr.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-NaBr-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CuSO₄·5H₂O-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\E1-被拦截牌-Al₂(SO₄)₃-干净特写.png; D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-Al₂(SO₄)₃.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-Al₂(SO₄)₃-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-H₂O-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\E1-被拦截牌-K₂O₂-干净特写.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-K₂O₂-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-Mg(OH)₂-成功入槽.png | 截图 | 第1层某角点击后成功 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-NH₄Cl.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-NH₄Cl-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R14-五张移除后-全局.png | 截图 | 五张移除后全局 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-Al₂(SO₄)₃.png | 截图 | 被拦截牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\E1-被拦截牌-Al₂(SO₄)₃-干净特写.png; D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CuSO₄·5H₂O-成功入槽.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-Al₂(SO₄)₃-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-CH₂Cl₂.png | 截图 | 被拦截牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-Br₂-成功入槽.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-CH₂Cl₂-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-KCl.png | 截图 | 被拦截牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CH₃COCH₃-成功入槽.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-KCl-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-K₂O₂.png | 截图 | 被拦截牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | - |
| D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-NaBr.png | 截图 | 被拦截牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CrCl₃-成功入槽.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-NaBr-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-NH₄Cl.png | 截图 | 被拦截牌点击前 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-Mg(OH)₂-成功入槽.png; D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-NH₄Cl-无反应(缺陷复现).png |
| D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-Al₂(SO₄)₃-无反应(缺陷复现).png | 截图 | 被拦截牌点击后无反应 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\E1-被拦截牌-Al₂(SO₄)₃-干净特写.png; D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CuSO₄·5H₂O-成功入槽.png; D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-Al₂(SO₄)₃.png |
| D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-CH₂Cl₂-无反应(缺陷复现).png | 截图 | 被拦截牌点击后无反应 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-Br₂-成功入槽.png; D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-CH₂Cl₂.png |
| D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-KCl-无反应(缺陷复现).png | 截图 | 被拦截牌点击后无反应 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CH₃COCH₃-成功入槽.png; D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-KCl.png |
| D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-K₂O₂-无反应(缺陷复现).png | 截图 | 被拦截牌点击后无反应 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\E1-被拦截牌-K₂O₂-干净特写.png; D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-H₂O-成功入槽.png |
| D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-NaBr-无反应(缺陷复现).png | 截图 | 被拦截牌点击后无反应 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CrCl₃-成功入槽.png; D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-NaBr.png |
| D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-NH₄Cl-无反应(缺陷复现).png | 截图 | 被拦截牌点击后无反应 | 🕓已过时(被主批次/生产批次取代) | B | 同md5: D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-Mg(OH)₂-成功入槽.png; D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-NH₄Cl.png |

---

## 建议删除清单

| 文件路径 | 类型 | 原因 | 是否可从其它文件恢复 |
|---|---|---|---|
| D:\program\game one\qa-evidence\E1-被拦截牌-C₆H₁₂O₆-干净特写.png | 截图 | 内容重复: 同md5: D:\program\game one\qa-evidence\R13-点击后-第1层-右下-Br₂-成功入槽.png; D:\program\game one\qa-evidence\R15-点击前-被拦截牌-C₆H₁₂O₆.png; D:\program\game one\qa-evidence\R16-点击后-被拦截牌-C₆H₁₂O₆-无反应(缺陷复现).png | 是(保留的代表文件可替代) |
| D:\program\game one\qa-evidence\prod\run.log | 日志 | 纯运行日志，无长期证据价值 | 可重新运行脚本生成 |
| D:\program\game one\qa-evidence\qa-report.html | 报告 | 内容重复: 同报告不同格式 | 是(保留的代表文件可替代) |
| D:\program\game one\qa-evidence\run.log | 日志 | 纯运行日志，无长期证据价值 | 可重新运行脚本生成 |
| D:\program\game one\qa-evidence\shots.log | 日志 | 内容重复: 同报告不同格式 | 是(保留的代表文件可替代) |
| qa-evidence/_stale/* | 截图/JSON/日志 | 历史批次，已被主批次和生产批次取代 | 是(主批次+生产批次可替代) |
| (其中 _stale 文件数 94 个，约 19191.6 KB) | | | |

---

## 建议保留清单

- **D:\program\game one\qa-evidence\01-进入页面-新手引导.png** (截图)：新手引导页 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\02-昵称窗.png** (截图)：昵称输入窗 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\03-开局棋盘.png** (截图)：开局棋盘全景 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\04-步骤1-点击前.png** (截图)：顶层牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\05-步骤1-点击后.png** (截图)：顶层牌点击后/首步结果 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\06-点击前-Al₂O₃.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\06-点击前-HClO₄.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\06-点击前-NH₄NO₃.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\07-点击后-Al₂O₃-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\07-点击后-HClO₄-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\07-点击后-NH₄NO₃-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\08-点击前-C₆H₆.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\08-点击前-HCl.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\08-点击前-NaNO₃.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\09-点击后-C₆H₆-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\09-点击后-HCl-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\09-点击后-NaNO₃-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\10-点击前-CrO₂.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\10-点击前-C₆H₅OH.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\10-点击前-KBr.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\11-点击后-CrO₂-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\11-点击后-C₆H₅OH-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\11-点击后-KBr-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\12-点击前-KBr.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\12-点击前-K₂CrO₄.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\12-点击前-NaClO₃.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\13-点击后-KBr-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\13-点击后-K₂CrO₄-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\13-点击后-NaClO₃-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\dom-evidence.json** (JSON)：幽灵容器DOM证据
- **D:\program\game one\qa-evidence\E2-被拦截牌-C₆H₁₂O₆-覆盖标注.png** (截图)：覆盖标注
- **D:\program\game one\qa-evidence\E3-DevTools-Elements-两层结构.png** (截图)：DevTools Elements两层结构
- **D:\program\game one\qa-evidence\E4-DevTools-Computed-pointer-events.png** (截图)：DevTools Computed pointer-events
- **D:\program\game one\qa-evidence\E5-Console-elementFromPoint.png** (截图)：Console elementFromPoint
- **D:\program\game one\qa-evidence\evidence.json** (JSON)：旧格式QA记录 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\evidence2.json** (JSON)：回归轮结构化点击记录
- **D:\program\game one\qa-evidence\prod\evidence2.json** (JSON)：回归轮结构化点击记录
- **D:\program\game one\qa-evidence\prod\R01-新手引导.png** (截图)：新手引导页
- **D:\program\game one\qa-evidence\prod\R02-昵称窗.png** (截图)：昵称输入窗
- **D:\program\game one\qa-evidence\prod\R03-开局棋盘.png** (截图)：开局棋盘全景
- **D:\program\game one\qa-evidence\prod\R04-点击前-顶层牌(第0层)-K₂O₂.png** (截图)：顶层牌点击前
- **D:\program\game one\qa-evidence\prod\R05-点击后-顶层牌(第0层)-K₂O₂-成功入槽.png** (截图)：顶层牌点击后/首步结果
- **D:\program\game one\qa-evidence\prod\R06-点击前-第1层-左上-ZnSO₄.png** (截图)：第1层某角点击前
- **D:\program\game one\qa-evidence\prod\R07-点击后-第1层-左上-ZnSO₄-成功入槽.png** (截图)：第1层某角点击后成功
- **D:\program\game one\qa-evidence\prod\R08-点击前-第1层-右上-CH₃CHO.png** (截图)：第1层某角点击前
- **D:\program\game one\qa-evidence\prod\R09-点击后-第1层-右上-CH₃CHO-成功入槽.png** (截图)：第1层某角点击后成功
- **D:\program\game one\qa-evidence\prod\R10-点击前-第1层-左下-C₆H₁₂O₆.png** (截图)：第1层某角点击前
- **D:\program\game one\qa-evidence\prod\R11-点击后-第1层-左下-C₆H₁₂O₆-成功入槽.png** (截图)：第1层某角点击后成功
- **D:\program\game one\qa-evidence\prod\R12-点击前-第1层-右下-C₂H₆.png** (截图)：第1层某角点击前
- **D:\program\game one\qa-evidence\prod\R13-点击后-第1层-右下-C₂H₆-成功入槽.png** (截图)：第1层某角点击后成功
- **D:\program\game one\qa-evidence\prod\R14-五张移除后-全局.png** (截图)：五张移除后全局
- **D:\program\game one\qa-evidence\prod\R15-点击前-被拦截牌-[Cu(NH₃)₄]SO₄.png** (截图)：被拦截牌点击前
- **D:\program\game one\qa-evidence\prod\R16-点击后-被拦截牌-[Cu(NH₃)₄]SO₄-无反应(缺陷复现).png** (截图)：被拦截牌点击后无反应
- **D:\program\game one\qa-evidence\qa-report.md** (报告)：缺陷报告(Markdown)
- **D:\program\game one\qa-evidence\qa-repro.mjs** (脚本)：缺陷复现脚本
- **D:\program\game one\qa-evidence\R01-新手引导.png** (截图)：新手引导页
- **D:\program\game one\qa-evidence\R02-昵称窗.png** (截图)：昵称输入窗
- **D:\program\game one\qa-evidence\R03-开局棋盘.png** (截图)：开局棋盘全景
- **D:\program\game one\qa-evidence\R04-点击前-顶层牌(第0层)-Fe₂(SO₄)₃.png** (截图)：顶层牌点击前
- **D:\program\game one\qa-evidence\R05-点击后-顶层牌(第0层)-Fe₂(SO₄)₃-成功入槽.png** (截图)：顶层牌点击后/首步结果
- **D:\program\game one\qa-evidence\R06-点击前-第1层-左上-C₂H₄.png** (截图)：第1层某角点击前
- **D:\program\game one\qa-evidence\R07-点击后-第1层-左上-C₂H₄-成功入槽.png** (截图)：第1层某角点击后成功
- **D:\program\game one\qa-evidence\R08-点击前-第1层-右上-NiSO₄.png** (截图)：第1层某角点击前
- **D:\program\game one\qa-evidence\R09-点击后-第1层-右上-NiSO₄-成功入槽.png** (截图)：第1层某角点击后成功
- **D:\program\game one\qa-evidence\R10-点击前-第1层-左下-I₂.png** (截图)：第1层某角点击前
- **D:\program\game one\qa-evidence\R11-点击后-第1层-左下-I₂-成功入槽.png** (截图)：第1层某角点击后成功
- **D:\program\game one\qa-evidence\R12-点击前-第1层-右下-Br₂.png** (截图)：第1层某角点击前
- **D:\program\game one\qa-evidence\R13-点击后-第1层-右下-Br₂-成功入槽.png** (截图)：第1层某角点击后成功
- **D:\program\game one\qa-evidence\R14-五张移除后-全局.png** (截图)：五张移除后全局
- **D:\program\game one\qa-evidence\R15-点击前-被拦截牌-C₆H₁₂O₆.png** (截图)：被拦截牌点击前
- **D:\program\game one\qa-evidence\R16-点击后-被拦截牌-C₆H₁₂O₆-无反应(缺陷复现).png** (截图)：被拦截牌点击后无反应
- **D:\program\game one\qa-evidence\_stale\01-进入页面-新手引导.png** (截图)：新手引导页 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\02-昵称窗.png** (截图)：昵称输入窗 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\03-开局棋盘.png** (截图)：开局棋盘全景 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\04-步骤1-点击前.png** (截图)：顶层牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\05-步骤1-点击后.png** (截图)：顶层牌点击后/首步结果 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\06-点击前-C₆₀.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\07-点击后-C₆₀-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\08-点击前-NO₂.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\09-点击后-NO₂-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\10-点击前-K₂O₂.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\11-点击后-K₂O₂-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\12-点击前-HNO₂.png** (截图)：某卡牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\13-点击后-HNO₂-成功.png** (截图)：某卡牌点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\E1-缺陷状态-中心牌特写.png** (截图)：被拦截牌干净特写 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\E1-被拦截牌-Al₂(SO₄)₃-干净特写.png** (截图)：被拦截牌干净特写 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\E1-被拦截牌-K₂O₂-干净特写.png** (截图)：被拦截牌干净特写 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\E2-标注-幽灵容器覆盖目标牌.png** (截图)：覆盖标注 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\E2-被拦截牌-Al₂(SO₄)₃-覆盖标注.png** (截图)：覆盖标注 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\E2-被拦截牌-K₂O₂-覆盖标注.png** (截图)：覆盖标注 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\E3-DevTools-Elements-两层结构.png** (截图)：DevTools Elements两层结构 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\E4-DevTools-Computed-pointer-events.png** (截图)：DevTools Computed pointer-events (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\E5-Console-elementFromPoint.png** (截图)：Console elementFromPoint (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\evidence2.json** (JSON)：回归轮结构化点击记录 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R04-点击前-顶层牌(第0层)-C₂H₂.png** (截图)：顶层牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R04-点击前-顶层牌(第0层)-FeSO₄.png** (截图)：顶层牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R04-点击前-顶层牌(第0层)-N₂O₄.png** (截图)：顶层牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R04-点击前-顶层牌(第0层)-SeO.png** (截图)：顶层牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-Cr(OH)₃-成功入槽.png** (截图)：顶层牌点击后/首步结果 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-C₂H₂-成功入槽.png** (截图)：顶层牌点击后/首步结果 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-FeSO₄-成功入槽.png** (截图)：顶层牌点击后/首步结果 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-HNO₃-成功入槽.png** (截图)：顶层牌点击后/首步结果 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-N₂O₄-成功入槽.png** (截图)：顶层牌点击后/首步结果 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R05-点击后-顶层牌(第0层)-SeO-成功入槽.png** (截图)：顶层牌点击后/首步结果 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-As.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-Fe(OH)₃.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-KAl(SO₄)₂.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-K₂CrO₄.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-Li.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R06-点击前-第1层-左上-NaCl.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-As-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-Fe(OH)₃-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-KAl(SO₄)₂-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-K₂CrO₄-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-Li-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R07-点击后-第1层-左上-NaCl-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-AgCl.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-CH₃Cl.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-Na₂B₄O₇.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-NiSO₄.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-Rb.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R08-点击前-第1层-右上-S.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-AgCl-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-CH₃Cl-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-Na₂B₄O₇-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-NiSO₄-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-Rb-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R09-点击后-第1层-右上-S-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-AgBr.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-Al(OH)₃.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-FeSO₄.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-H₂S.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-NaHCO₃.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R10-点击前-第1层-左下-PbSO₄.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-AgBr-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-Al(OH)₃-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-FeSO₄-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-H₂S-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-NaHCO₃-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R11-点击后-第1层-左下-PbSO₄-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-Br₂.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-CH₃COCH₃.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-CrCl₃.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-CuSO₄·5H₂O.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-H₂O.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R12-点击前-第1层-右下-Mg(OH)₂.png** (截图)：第1层某角点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-Br₂-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CH₃COCH₃-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CrCl₃-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-CuSO₄·5H₂O-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-H₂O-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R13-点击后-第1层-右下-Mg(OH)₂-成功入槽.png** (截图)：第1层某角点击后成功 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R14-五张移除后-全局.png** (截图)：五张移除后全局 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-Al₂(SO₄)₃.png** (截图)：被拦截牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-CH₂Cl₂.png** (截图)：被拦截牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-KCl.png** (截图)：被拦截牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-K₂O₂.png** (截图)：被拦截牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-NaBr.png** (截图)：被拦截牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R15-点击前-被拦截牌-NH₄Cl.png** (截图)：被拦截牌点击前 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-Al₂(SO₄)₃-无反应(缺陷复现).png** (截图)：被拦截牌点击后无反应 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-CH₂Cl₂-无反应(缺陷复现).png** (截图)：被拦截牌点击后无反应 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-KCl-无反应(缺陷复现).png** (截图)：被拦截牌点击后无反应 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-K₂O₂-无反应(缺陷复现).png** (截图)：被拦截牌点击后无反应 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-NaBr-无反应(缺陷复现).png** (截图)：被拦截牌点击后无反应 (历史/被取代,仅作归档)
- **D:\program\game one\qa-evidence\_stale\R16-点击后-被拦截牌-NH₄Cl-无反应(缺陷复现).png** (截图)：被拦截牌点击后无反应 (历史/被取代,仅作归档)

---

## 去重方案

### A. 同运行顺序帧（内容重复但非无效证据）

以下“前一对的后帧”与“后一对的前帧”完全相同，是连续截图的正常产物。若需瘦身，可每轮只保留第一个“点击前”帧 + 每个点击事件后的“新状态帧”：

- 主批次：`R05 == R06-前`、`R07 == R08-前`、`R09 == R10-前`、`R11 == R12-前`
- 生产批次：`R05 == R06-前`、`R07 == R08-前`、`R09 == R10-前`、`R11 == R12-前`
- _stale：所有 R05/R07/R09/R11 后帧均与下一个 R06/R08/R10/R12 前帧同 MD5

### B. 缺陷复现同帧（必须保留，不可删除）

以下 `R15 == R16` 是**预期结果**，证明点击被拦截后画面无变化：

- 主批次：`R15-被拦截牌-C₆H₁₂O₆ == R16-无反应`（== `R13-后-Br₂` == `E1-干净特写`）
- 生产批次：`R15-[Cu(NH₃)₄]SO₄ == R16-无反应`（== `R13-后-C₂H₆`）
- _stale：多组 `R15 == R16` 同帧（如 Al₂(SO₄)₃、K₂O₂ 等）

### C. 真重复文件（可直接删除其中一份）

| 保留代表 | 删除副本 | 说明 |
|---|---|---|
| `qa-evidence/dom-evidence.json` | `qa-evidence/shots.log` | 内容除末尾换行外完全一致 |
| `qa-evidence/qa-report.md` | `qa-evidence/qa-report.html` | 同一报告，md 更便于编辑 |
| 主批次 `R13-后 / R15 / R16` 任选其一 | `E1-被拦截牌-C₆H₁₂O₆-干净特写` | E1 与上述帧像素完全一致，未提供额外信息 |
| _stale 各缺陷目标 `R13-后 / R15 / R16` 任选其一 | _stale 对应 `E1-...-干净特写` | 同上，已被主批次 E2-E5 取代 |

### D. 三份 `evidence2.json` 去留结论

- `qa-evidence/evidence2.json`（主批次，顶层牌 Fe₂(SO₄)₃，目标 C₆H₁₂O₆）→ **保留 A**
- `qa-evidence/prod/evidence2.json`（生产批次，顶层牌 K₂O₂，目标 [Cu(NH₃)₄]SO₄）→ **保留 A**
- `qa-evidence/_stale/evidence2.json`（旧本地批次，顶层牌 HNO₃，目标 CH₂Cl₂）→ **删除 C**（结论已被主批次和生产批次覆盖）

---

## `_stale/` 整批结论

**建议整体作废并删除。**

_stale/ 内是多次早期尝试的混合体：包含 01-13 旧流程截图、多组不同顶层牌/被拦截牌的 R 系列截图、以及多份针对 Al₂(SO₄)₃ / K₂O₂ 等目标的 E 系列截图。虽然部分文件展示了不同化学式的缺陷实例，但其证明力与结构化程度均不及主批次 `R01-R16 + E2-E5 + evidence2.json` 和生产批次 `prod/R01-R16 + evidence2.json`。没有发现任何 _stale 独有的、主/生产批次无法替代的关键证据。

---

## 预计可安全删除空间

- 纯冗余/日志文件：约 187.5 KB
- 若加上整批 _stale/：约 19191.6 KB
- 总计（建议删除清单 + _stale 全批）：约 19379.0 KB，共 99 个文件

*注：以上容量估算包含 PNG、JSON、日志、报告等全部类型。*
