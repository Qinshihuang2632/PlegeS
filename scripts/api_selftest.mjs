/*
 * 化了个学 · Pages Functions API 契约自测 (api_selftest.mjs)
 * 运行: npm run test:api  (或 node scripts/api_selftest.mjs)
 *
 * 用内存 KV mock 直接调用 functions/ 下的真实处理器, 验证:
 *   - 用户 API 契约(排序 / surpassed / clamp / 同名昵称放开)
 *   - v2.1.0 加固: 提交限频 429 / 昵称清洗 / 榜单上限 / 用户 API 不再有 DELETE
 *   - 管理 API: 登录鉴权与锁定 / 会话 / 榜单管理 / 审计日志 / 强制下线 / 审计环形上限
 * 任一项失败退出码 1。
 */
const BASE = "file:///D:/program/game one/";
const rankApi = await import(BASE + "functions/hlgx/api/rank.js");
const adminAuth = await import(BASE + "functions/admin/api/auth.js");
const adminRank = await import(BASE + "functions/admin/api/rank.js");
const adminLogs = await import(BASE + "functions/admin/api/logs.js");
const adminSessions = await import(BASE + "functions/admin/api/sessions.js");
const auditLib = await import(BASE + "functions/_lib/audit.js");

/* ---------- 内存 KV mock ---------- */
const store = new Map();
const ADMIN_TOKEN = "test-admin-token-2026";   // 测试用管理员令牌
const env = {
    ADMIN_TOKEN,
    RANKINGS: {
        get: async (k) => (store.has(k) ? store.get(k) : null),
        put: async (k, v) => { store.set(k, v); },   // 忽略 expirationTtl(mock)
        delete: async (k) => { store.delete(k); },
        list: async ({ prefix }) => ({
            keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })),
        }),
    },
};
const reset = () => { store.clear(); };

/* ---------- request mock + 调用包装 ----------
 * 默认给每个请求独立的 X-Forwarded-For(模拟不同玩家 IP, 不触发提交限频);
 * 需要同 IP 的用例显式传 headers。 */
let ipCounter = 0;
const mockReq = (url, body, headers = {}) => {
    if (!headers["X-Forwarded-For"] && !headers["x-forwarded-for"] && !headers["cf-connecting-ip"]) {
        headers["X-Forwarded-For"] = "selftest-ip-" + (++ipCounter);
    }
    return {
        url,
        // HTTP 头大小写不敏感(与真实服务器行为一致)
        headers: {
            get: (h) => {
                const k = Object.keys(headers).find((key) => key.toLowerCase() === String(h).toLowerCase());
                return k ? headers[k] : null;
            },
        },
        json: async () => body,
    };
};
async function call(fn, ...args) {
    const resp = await fn(...args);
    let data = null;
    try { data = await resp.json(); } catch { /* 非 JSON 响应 */ }
    return { data, status: resp.status, headers: resp.headers };
}

/* ---------- 断言工具 ---------- */
const results = [];
function check(name, pass, detail = "") {
    results.push({ name, pass: !!pass, detail: pass ? "" : detail });
}
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const post = (body, headers = {}) =>
    call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", body, headers), env });

/* ---------- 1. GET 查询 ---------- */
reset();
let r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank"), env });
check("GET 默认 mode=normal 且空榜", deepEq(r.data, { mode: "normal", platform: "all", rank: [] }), JSON.stringify(r.data));

r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=easy"), env });
check("GET mode=easy", deepEq(r.data, { mode: "easy", platform: "all", rank: [] }), JSON.stringify(r.data));

r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=瞎写"), env });
check("GET 非法 mode 回退 normal", deepEq(r.data, { mode: "normal", platform: "all", rank: [] }), JSON.stringify(r.data));

/* ---------- 2. POST 校验与 clamp ---------- */
reset();
r = await post({ mode: "easy", name: "", hp: 3, time: 10, tools: 0 });
check("POST 空昵称 400 缺少昵称", r.status === 400 && r.data.msg === "缺少昵称", JSON.stringify(r.data));

reset();
r = await post({ mode: "easy", name: "帅帅", hp: 9, time: 10, tools: 100 });
check("POST hp>3→3, tools>9→9 (clamp)", r.data.ok === true && r.data.rank[0].hp === 3 && r.data.rank[0].tools === 9, JSON.stringify(r.data.rank));

reset();
r = await post({ mode: "easy", name: "帅帅", hp: -5, time: 30, tools: -1 });
check("POST hp负数→0, tools负数→0 (clamp)", r.data.rank[0].hp === 0 && r.data.rank[0].time === 30 && r.data.rank[0].tools === 0, JSON.stringify(r.data.rank[0]));
check("POST 条目含 date 且格式 YYYY-MM-DD HH:MM",
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(r.data.rank[0].date || ""), r.data.rank[0].date);

reset();
r = await post({ mode: "easy", name: "帅帅", hp: 3, time: -3, tools: 0 });
check("POST time 负数 → 400 成绩无效(防刷)", r.status === 400 && r.data.msg === "成绩无效:用时过短", JSON.stringify(r.data));

reset();
r = await post({ mode: "不存在的模式", name: "小可", hp: 2, time: 30, tools: 1 });
check("POST 非法 mode 存入 normal", r.data.rank[0] && r.data.rank[0].name === "小可", JSON.stringify(r.data));

/* ---------- 3. 排序规则 hp↓ → time↑ → tools↑ ---------- */
reset();
await post({ mode: "easy", name: "T200", hp: 3, time: 200, tools: 0 });
await post({ mode: "easy", name: "T100B", hp: 3, time: 100, tools: 3 });
await post({ mode: "easy", name: "H4", hp: 4, time: 50, tools: 5 });
await post({ mode: "easy", name: "T100A", hp: 3, time: 100, tools: 1 });
r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=easy"), env });
const order = r.data.rank.map((e) => e.name).join(",");
check("排序 hp↓→time↑→tools↑", order === "H4,T100A,T100B,T200", order);

/* ---------- 4. surpassed 超越人数 (严格优于才计数) ---------- */
reset();
await post({ mode: "easy", name: "A", hp: 3, time: 100, tools: 0 });
await post({ mode: "easy", name: "B", hp: 3, time: 200, tools: 0 });
await post({ mode: "easy", name: "C", hp: 2, time: 50, tools: 5 });
r = await post({ mode: "easy", name: "D", hp: 3, time: 150, tools: 0 });
check("surpassed: D(3,150) 超越 B(3,200)与C(2,50) → 2", r.data.surpassed === 2, "got " + r.data.surpassed);
r = await post({ mode: "easy", name: "E", hp: 2, time: 50, tools: 5 });
check("surpassed: E 与C完全同分 → 0 (严格更优才计)", r.data.surpassed === 0, "got " + r.data.surpassed);
reset();
await post({ mode: "easy", name: "A", hp: 3, time: 100, tools: 0 });
r = await post({ mode: "easy", name: "F", hp: 3, time: 100, tools: 2 });
check("surpassed: 同hp同time但tools更大 → 不超越A → 0", r.data.surpassed === 0, "got " + r.data.surpassed);
reset();
await post({ mode: "easy", name: "A", hp: 3, time: 100, tools: 0 });
r = await post({ mode: "easy", name: "G", hp: 4, time: 15, tools: 0 });
check("surpassed: hp更高 → 超越A → 1", r.data.surpassed === 1, "got " + r.data.surpassed);

/* ---------- 5. 同名昵称放开(v2.1.6): 靠上榜时间区分玩家 ---------- */
reset();
await post({ mode: "normal", name: "小明", hp: 1, time: 30, tools: 2 });
r = await post({ mode: "easy", name: "小明", hp: 1, time: 31, tools: 2 });
check("同名第 2 次提交(另一难度)成功", r.status === 200 && r.data.ok === true, JSON.stringify(r.data));
r = await post({ mode: "easy", name: "小明", hp: 1, time: 32, tools: 2 });
check("同名第 3 次提交(同难度)仍成功, 榜单保留两条", r.status === 200 && r.data.ok === true && r.data.rank.filter((e) => e.name === "小明").length === 2, JSON.stringify(r.data));

/* ---------- 7. v2.1.0 用户 API 加固 ---------- */
reset();
// 7.1 提交限频: 同 IP 60 秒内第 2 次 → 429
r = await post({ mode: "easy", name: "限频甲", hp: 3, time: 10, tools: 0 }, { "X-Forwarded-For": "rl-ip-1" });
check("限频: 第1次提交成功", r.status === 200 && r.data.ok === true, JSON.stringify(r.data));
r = await post({ mode: "easy", name: "限频乙", hp: 3, time: 20, tools: 0 }, { "X-Forwarded-For": "rl-ip-1" });
check("限频: 同IP 60秒内第2次 → 429", r.status === 429 && r.data.msg === "提交过于频繁,请稍后再试", JSON.stringify(r.data));
r = await post({ mode: "easy", name: "限频丙", hp: 3, time: 30, tools: 0 }, { "X-Forwarded-For": "rl-ip-2" });
check("限频: 不同 IP 不受影响", r.status === 200 && r.data.ok === true, JSON.stringify(r.data));

// 7.2 昵称清洗 + 字数 10 字限制 + 违禁词
reset();
r = await post({ mode: "easy", name: " 甲\u0007乙丙丁戊己庚  ", hp: 3, time: 10, tools: 0 });
const cleaned = r.data.rank[0].name;
check("昵称清洗: 去空格/控制字符(剩余 7 字)",
      cleaned === "甲乙丙丁戊己庚", JSON.stringify(cleaned));
r = await post({ mode: "easy", name: "一二三四五六七八九十十一", hp: 3, time: 10, tools: 0 });
check("昵称超 10 字 → 400 拒绝", r.status === 400 && r.data.msg === "昵称不能超过 10 个字", JSON.stringify(r.data));
r = await post({ mode: "easy", name: "傻逼", hp: 3, time: 10, tools: 0 });
check("昵称含违禁词 → 400 拒绝", r.status === 400 && r.data.msg === "昵称包含违禁词,请更换", JSON.stringify(r.data));
r = await post({ mode: "easy", name: "小明同学", hp: 3, time: 10, tools: 0 });
check("正常昵称(小明同学)不受影响", r.status === 200 && r.data.ok === true, JSON.stringify(r.data));

// 7.3 榜单上限 200 条 → 拒绝
reset();
const full = [];
for (let i = 0; i < 200; i++) full.push({ name: "占位" + i, hp: 0, time: 0, tools: 0, date: "2026-08-09 00:00" });
store.set("easy", JSON.stringify(full));
r = await post({ mode: "easy", name: "新人", hp: 3, time: 10, tools: 0 });
check("榜单满 200 条 → 400 榜单已满", r.status === 400 && r.data.msg === "榜单已满", JSON.stringify(r.data));

// 7.4 成绩合理性: 用时过短 → 拒绝(防 1~2 秒假成绩)
reset();
r = await post({ mode: "easy", name: "秒杀", hp: 3, time: 5, tools: 0 });
check("时间过短(5秒) → 400 成绩无效", r.status === 400 && r.data.msg === "成绩无效:用时过短", JSON.stringify(r.data));

// 7.5 昵称注入字符过滤(< > 为脚本试探特征)
reset();
r = await post({ mode: "easy", name: "<script>", hp: 3, time: 30, tools: 0 });
check("昵称含 < > → 400 非法字符", r.status === 400 && r.data.msg === "昵称包含非法字符", JSON.stringify(r.data));

// 7.6 同名昵称放开: 同一昵称可多次提交(不再 24h 限 3 次)
reset();
for (let i = 0; i < 4; i++) {
    r = await post({ mode: "easy", name: "刷子", hp: 1, time: 30 + i, tools: 0 });
}
check("同名连续 4 次提交全部成功(放开同名)", r.status === 200 && r.data.ok === true && r.data.rank.filter((e) => e.name === "刷子").length === 4, JSON.stringify(r.data));

// 7.4 用户 API 已移除 DELETE(管理功能收归管理端)
reset();
check("用户 API 不再导出 onRequestDelete", typeof rankApi.onRequestDelete === "undefined", "");
/* ---------- 7.7 平台分离(手游/端游榜单分开) ---------- */
reset();
// UA 兜底: 无 platform + Android UA → mobile
r = await call(rankApi.onRequestPost, {
    request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "触屏玩家", hp: 3, time: 30, tools: 0 }, { "user-agent": "Mozilla/5.0 (Linux; Android 14) Mobile" }),
    env,
});
check("UA 兜底: Android UA → mobile", r.data.platform === "mobile" && r.data.rank[0].platform === "mobile", JSON.stringify(r.data));
// 显式 platform
r = await post({ mode: "easy", name: "键鼠玩家", hp: 3, time: 40, tools: 0, platform: "desktop" });
check("显式 platform: desktop 提交", r.data.platform === "desktop" && r.data.rank.some((e) => e.name === "键鼠玩家" && e.platform === "desktop"), JSON.stringify(r.data));
r = await post({ mode: "easy", name: "手机玩家", hp: 3, time: 50, tools: 0, platform: "mobile" });
check("显式 platform: mobile 提交", r.data.platform === "mobile" && r.data.rank.some((e) => e.name === "手机玩家" && e.platform === "mobile"), JSON.stringify(r.data));
// GET 过滤
r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=easy&platform=mobile"), env });
check("GET platform=mobile 只含手游", r.data.platform === "mobile" && r.data.rank.length === 2 && r.data.rank.every((e) => e.platform === "mobile"), r.data.rank.map((e) => e.name).join(","));
r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=easy&platform=desktop"), env });
check("GET platform=desktop 只含端游", r.data.platform === "desktop" && r.data.rank.length === 1 && r.data.rank.every((e) => e.platform !== "mobile"), r.data.rank.map((e) => e.name).join(","));
r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=easy"), env });
check("GET 缺省 → 全部 + platform=all", r.data.platform === "all" && r.data.rank.length === 3, JSON.stringify(r.data));
// surpassed 只与同平台比较
reset();
await post({ mode: "easy", name: "端游快", hp: 3, time: 100, tools: 0, platform: "desktop" });
r = await post({ mode: "easy", name: "手游快", hp: 3, time: 20, tools: 0, platform: "mobile" });
check("surpassed 只与同平台比: 手游(3,20) 超越数为 0", r.data.surpassed === 0, "got " + r.data.surpassed);
// 旧条目(无 platform)归端游
reset();
store.set("easy", JSON.stringify([{ name: "历史记录", hp: 3, time: 100, tools: 0, date: "2026-08-09 12:00" }]));
r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=easy&platform=desktop"), env });
check("旧条目无 platform → 归端游", r.data.rank.length === 1 && r.data.rank[0].name === "历史记录", JSON.stringify(r.data));
r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=easy&platform=mobile"), env });
check("旧条目不出现在手游榜", r.data.rank.length === 0, JSON.stringify(r.data));

/* ---------- 8. 管理登录: 令牌校验 / 锁定 ---------- */
reset();
r = await call(adminAuth.onRequestPost, { request: mockReq("http://x/admin/api/auth", {}, { "X-Forwarded-For": "mg-ip-1" }), env });
check("登录 缺令牌 → 400", r.status === 400 && r.data.msg === "缺少令牌", JSON.stringify(r.data));
r = await call(adminAuth.onRequestPost, { request: mockReq("http://x/admin/api/auth", { token: "wrong" }, { "X-Forwarded-For": "mg-ip-2" }), env });
check("登录 错令牌 → 401 且提示剩余次数", r.status === 401 && r.data.msg.includes("还剩 4 次机会"), JSON.stringify(r.data));
// 同 IP 连错 5 次 → 锁定
for (let i = 0; i < 4; i++) {
    await call(adminAuth.onRequestPost, { request: mockReq("http://x/admin/api/auth", { token: "wrong" }, { "X-Forwarded-For": "lock-ip" }), env });
}
r = await call(adminAuth.onRequestPost, { request: mockReq("http://x/admin/api/auth", { token: "wrong" }, { "X-Forwarded-For": "lock-ip" }), env });
check("登录 连错5次 → 锁定提示", r.status === 401 && r.data.msg === "令牌错误,已锁定 15 分钟", JSON.stringify(r.data));
r = await call(adminAuth.onRequestPost, { request: mockReq("http://x/admin/api/auth", { token: ADMIN_TOKEN }, { "X-Forwarded-For": "lock-ip" }), env });
check("登录 锁定期内即使令牌正确 → 429", r.status === 429 && r.data.msg.includes("锁定"), JSON.stringify(r.data));
// 未配置 ADMIN_TOKEN → 500
r = await call(adminAuth.onRequestPost, { request: mockReq("http://x/admin/api/auth", { token: "x" }, { "X-Forwarded-For": "mg-ip-3" }), env: { ...env, ADMIN_TOKEN: undefined } });
check("登录 未配置令牌 → 500", r.status === 500, JSON.stringify(r.data));

// 正确令牌登录 → 200 + Set-Cookie + 会话落 KV
r = await call(adminAuth.onRequestPost, { request: mockReq("http://x/admin/api/auth", { token: ADMIN_TOKEN }, { "X-Forwarded-For": "mg-ip-9" }), env });
const setCookie = r.headers.get("set-cookie") || "";
const sid = (setCookie.match(/hlgx_admin=([^;]+)/) || [])[1];
check("登录 正确令牌 → 200 并下发会话 Cookie", r.status === 200 && r.data.ok === true && !!sid, setCookie.slice(0, 80));
check("Cookie 含 HttpOnly/SameSite=Lax/Path=/", /HttpOnly/i.test(setCookie) && /SameSite=Lax/i.test(setCookie) && /Path=\//.test(setCookie), setCookie);

/* ---------- 9. 管理会话: me / 登出 / 鉴权 ---------- */
const authReq = (h = {}) => ({ request: mockReq("http://x/admin/api/auth", null, h), env });
r = await call(adminAuth.onRequestGet, authReq());
check("me 未登录 → 401", r.status === 401, JSON.stringify(r.data));
r = await call(adminAuth.onRequestGet, authReq({ cookie: "hlgx_admin=" + sid }));
check("me 已登录 → 200 含 actor/ip", r.status === 200 && r.data.actor === "admin" && r.data.id === sid, JSON.stringify(r.data));
r = await call(adminAuth.onRequestGet, authReq({ cookie: "hlgx_admin=deadbeef" }));
check("me 伪造会话 → 401", r.status === 401, JSON.stringify(r.data));
r = await call(adminAuth.onRequestDelete, authReq({ cookie: "hlgx_admin=" + sid }));
check("登出 → 200 并清 Cookie", r.status === 200 && /Max-Age=0/.test(r.headers.get("set-cookie") || ""), "");
r = await call(adminAuth.onRequestGet, authReq({ cookie: "hlgx_admin=" + sid }));
check("登出后旧会话失效 → 401", r.status === 401, JSON.stringify(r.data));

/* ---------- 10. 管理榜单操作(含审计) ---------- */
reset();
await post({ mode: "easy", name: "记录甲", hp: 3, time: 100, tools: 0 });
await post({ mode: "easy", name: "记录乙", hp: 2, time: 200, tools: 1 });
await post({ mode: "challenge", name: "挑战者", hp: 3, time: 50, tools: 0 });
r = await call(adminAuth.onRequestPost, { request: mockReq("http://x/admin/api/auth", { token: ADMIN_TOKEN }, { "X-Forwarded-For": "mg-ip-10" }), env });
const sid2 = (r.headers.get("set-cookie") || "").match(/hlgx_admin=([^;]+)/)[1];
const adminReq = (path, method = "GET", headers = {}) => ({ request: mockReq("http://x" + path, null, { cookie: "hlgx_admin=" + sid2, ...headers }), env });

r = await call(adminRank.onRequestGet, { request: mockReq("http://x/admin/api/rank?mode=easy"), env });
check("管理榜单 未登录 → 401", r.status === 401, JSON.stringify(r.data));
r = await call(adminRank.onRequestGet, adminReq("/admin/api/rank?mode=easy"));
check("管理榜单 已登录 → 含管理索引 key", r.status === 200 && r.data.rank.length === 2 && typeof r.data.rank[0].key === "number", JSON.stringify(r.data));
r = await call(adminRank.onRequestGet, adminReq("/admin/api/rank?mode=easy&q=%E4%B9%99"));
check("管理榜单 搜索昵称关键字", r.data.rank.length === 1 && r.data.rank[0].name === "记录乙", JSON.stringify(r.data));
r = await call(adminRank.onRequestGet, adminReq("/admin/api/rank?mode=xx"));
check("管理榜单 非法 mode → 400", r.status === 400, JSON.stringify(r.data));

// 单条删除 + 审计
r = await call(adminRank.onRequestDelete, adminReq("/admin/api/rank?mode=easy&key=0", "DELETE"));
check("管理榜单 单条删除 → 200", r.status === 200 && r.data.ok === true, JSON.stringify(r.data));
r = await call(adminRank.onRequestGet, adminReq("/admin/api/rank?mode=easy"));
check("单条删除后剩 1 条", r.data.rank.length === 1, JSON.stringify(r.data));
r = await call(adminRank.onRequestDelete, adminReq("/admin/api/rank?mode=easy&key=99", "DELETE"));
check("单条删除 索引越界 → 404", r.status === 404, JSON.stringify(r.data));

// 清空单难度 + 清空全部 + 审计
r = await call(adminRank.onRequestDelete, adminReq("/admin/api/rank?mode=easy", "DELETE"));
check("清空 easy → 200", r.status === 200 && r.data.msg === "已清空 easy 榜单", JSON.stringify(r.data));
r = await call(adminRank.onRequestDelete, adminReq("/admin/api/rank?mode=all", "DELETE"));
check("清空全部 → 200", r.status === 200 && r.data.msg === "已清空全部榜单", JSON.stringify(r.data));
r = await call(adminRank.onRequestGet, adminReq("/admin/api/rank?mode=challenge"));
check("清空全部后 challenge 为空", r.data.total === 0, JSON.stringify(r.data));

/* ---------- 11. 审计日志: 分页 / 过滤 ---------- */
r = await call(adminLogs.onRequestGet, { request: mockReq("http://x/admin/api/logs"), env });
check("审计日志 未登录 → 401", r.status === 401, JSON.stringify(r.data));
r = await call(adminLogs.onRequestGet, adminReq("/admin/api/logs?limit=100"));
check("审计日志 已登录 → 含全部操作", r.status === 200 && r.data.total >= 4, "total=" + r.data.total);
const actions = r.data.entries.map((e) => e.action);
check("审计动作覆盖 login_success/rank_delete_one/rank_clear_mode/rank_clear_all",
      ["login_success", "rank_delete_one", "rank_clear_mode", "rank_clear_all"].every((a) => actions.includes(a)),
      actions.join(","));
r = await call(adminLogs.onRequestGet, adminReq("/admin/api/logs?action=rank_delete_one"));
check("审计日志 按 action 过滤", r.data.entries.every((e) => e.action === "rank_delete_one") && r.data.total >= 1, JSON.stringify(r.data));
r = await call(adminLogs.onRequestGet, adminReq("/admin/api/logs?limit=2&offset=0"));
check("审计日志 分页 limit=2", r.data.entries.length === 2 && r.data.entries[0].ts >= r.data.entries[1].ts, JSON.stringify(r.data));
// 最新在前
r = await call(adminLogs.onRequestGet, adminReq("/admin/api/logs?limit=100"));
const tsList = r.data.entries.map((e) => e.ts);
check("审计日志 倒序(最新在前)", tsList.every((t, i) => i === 0 || tsList[i - 1] >= t), tsList.join(","));

/* ---------- 12. 会话管理: 列表 / 强制下线 ---------- */
r = await call(adminSessions.onRequestGet, { request: mockReq("http://x/admin/api/sessions"), env });
check("会话列表 未登录 → 401", r.status === 401, JSON.stringify(r.data));
r = await call(adminSessions.onRequestGet, adminReq("/admin/api/sessions"));
check("会话列表 已登录 → 至少含当前会话", r.status === 200 && r.data.sessions.length >= 1, JSON.stringify(r.data));
r = await call(adminSessions.onRequestDelete, adminReq("/admin/api/sessions?id=ghost", "DELETE"));
check("下线不存在的会话 → 200(幂等)", r.status === 200, JSON.stringify(r.data));
r = await call(adminSessions.onRequestDelete, adminReq("/admin/api/sessions?id=" + sid2, "DELETE"));
check("强制下线 → 200", r.status === 200 && r.data.ok === true, JSON.stringify(r.data));
r = await call(adminAuth.onRequestGet, authReq({ cookie: "hlgx_admin=" + sid2 }));
check("下线后会话失效 → 401", r.status === 401, JSON.stringify(r.data));

/* ---------- 13. 审计环形上限 500 ---------- */
reset();
r = await call(adminAuth.onRequestPost, { request: mockReq("http://x/admin/api/auth", { token: ADMIN_TOKEN }, { "X-Forwarded-For": "mg-ip-13" }), env });
const sid3 = (r.headers.get("set-cookie") || "").match(/hlgx_admin=([^;]+)/)[1];
for (let i = 0; i < auditLib.AUDIT_MAX + 20; i++) {
    await auditLib.appendAudit(env, { action: "login_fail", detail: "压测" + i, ip: "x" });
}
r = await call(adminLogs.onRequestGet, { request: mockReq("http://x/admin/api/logs?limit=100", null, { cookie: "hlgx_admin=" + sid3 }), env });
check("审计环形上限: 压测 520 条后仅保留 500 条", r.data.total === auditLib.AUDIT_MAX, "total=" + r.data.total);
check("审计环形: 最新一条保留", r.data.entries[0].detail === "压测519", r.data.entries[0].detail);

/* ---------- 汇总 ---------- */
console.log("========== API 契约自测结果 ==========");
results.forEach((x) => console.log((x.pass ? "✓ " : "✗ ") + x.name + (x.pass ? "" : "  ← " + x.detail)));
const failed = results.filter((x) => !x.pass);
if (failed.length) { console.error(`\n共 ${failed.length} 项失败, 需修复!`); process.exit(1); }
console.log(`\n全部 ${results.length} 项通过 ✓ 与 Flask 契约一致(v2.1.0 管理端 + 加固)`);
