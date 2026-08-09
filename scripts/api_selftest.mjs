/*
 * 化了个学 · Pages Functions API 契约自测 (api_selftest.mjs)
 * 运行: npm run test:api  (或 node scripts/api_selftest.mjs)
 *
 * 用内存 KV mock 直接调用 functions/ 下的真实处理器, 验证与 Flask 版
 * hlgx_rank.py 的契约完全一致: 排序规则 / surpassed / clamp / 昵称查重
 * 与建议 / 清榜消息。任一项失败退出码 1。
 */
const BASE = "file:///D:/program/game one/";
const rankApi = await import(BASE + "functions/hlgx/api/rank.js");
const existsApi = await import(BASE + "functions/hlgx/api/name/exists.js");
const suggestApi = await import(BASE + "functions/hlgx/api/name/suggest.js");

/* ---------- 内存 KV mock ---------- */
const store = new Map();
const env = {
    RANKINGS: {
        get: async (k) => (store.has(k) ? store.get(k) : null),
        put: async (k, v) => { store.set(k, v); },
        delete: async (k) => { store.delete(k); },
    },
};
const reset = () => { store.clear(); };

/* ---------- request mock + 调用包装 ---------- */
const mockReq = (url, body) => ({ url, json: async () => body });
// Functions 处理器返回标准 Response, 统一解包成 { data, status }
async function call(fn, ...args) {
    const resp = await fn(...args);
    let data = null;
    try { data = await resp.json(); } catch { /* 非 JSON 响应 */ }
    return { data, status: resp.status };
}

/* ---------- 断言工具 ---------- */
const results = [];
function check(name, pass, detail = "") {
    results.push({ name, pass: !!pass, detail: pass ? "" : detail });
}
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- 1. GET 查询 ---------- */
reset();
let r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank"), env });
check("GET 默认 mode=normal 且空榜", deepEq(r.data, { mode: "normal", rank: [] }), JSON.stringify(r.data));

r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=easy"), env });
check("GET mode=easy", deepEq(r.data, { mode: "easy", rank: [] }), JSON.stringify(r.data));

r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=瞎写"), env });
check("GET 非法 mode 回退 normal", deepEq(r.data, { mode: "normal", rank: [] }), JSON.stringify(r.data));

/* ---------- 2. POST 校验与 clamp ---------- */
reset();
r = await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "", hp: 3, time: 10, tools: 0 }), env });
check("POST 空昵称 400 缺少昵称", r.status === 400 && r.data.msg === "缺少昵称", JSON.stringify(r.data));

reset();
r = await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "帅帅", hp: 9, time: 10, tools: 100 }), env });
check("POST hp>3→3, tools>9→9 (clamp)", r.data.ok === true && r.data.rank[0].hp === 3 && r.data.rank[0].tools === 9, JSON.stringify(r.data.rank));

reset();
r = await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "帅帅", hp: -5, time: -3, tools: -1 }), env });
check("POST hp/time/tools 负数→0", r.data.rank[0].hp === 0 && r.data.rank[0].time === 0 && r.data.rank[0].tools === 0, JSON.stringify(r.data.rank[0]));

check("POST 条目含 date 且格式 YYYY-MM-DD HH:MM",
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(r.data.rank[0].date || ""), r.data.rank[0].date);

reset();
r = await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "不存在的模式", name: "小可", hp: 2, time: 5, tools: 1 }), env });
check("POST 非法 mode 存入 normal", r.data.rank[0] && r.data.rank[0].name === "小可", JSON.stringify(r.data));

/* ---------- 3. 排序规则 hp↓ → time↑ → tools↑ ---------- */
reset();
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "T200", hp: 3, time: 200, tools: 0 }), env });
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "T100B", hp: 3, time: 100, tools: 3 }), env });
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "H4", hp: 4, time: 50, tools: 5 }), env });
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "T100A", hp: 3, time: 100, tools: 1 }), env });
r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=easy"), env });
const order = r.data.rank.map((e) => e.name).join(",");
check("排序 hp↓→time↑→tools↑", order === "H4,T100A,T100B,T200", order);

/* ---------- 4. surpassed 超越人数 (严格优于才计数) ---------- */
reset();
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "A", hp: 3, time: 100, tools: 0 }), env });
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "B", hp: 3, time: 200, tools: 0 }), env });
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "C", hp: 2, time: 50, tools: 5 }), env });
r = await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "D", hp: 3, time: 150, tools: 0 }), env });
check("surpassed: D(3,150) 超越 B(3,200)与C(2,50) → 2", r.data.surpassed === 2, "got " + r.data.surpassed);
r = await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "E", hp: 2, time: 50, tools: 5 }), env });
check("surpassed: E 与C完全同分 → 0 (严格更优才计)", r.data.surpassed === 0, "got " + r.data.surpassed);
reset();
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "A", hp: 3, time: 100, tools: 0 }), env });
r = await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "F", hp: 3, time: 100, tools: 2 }), env });
check("surpassed: 同hp同time但tools更大 → 不超越A → 0", r.data.surpassed === 0, "got " + r.data.surpassed);
reset();
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "A", hp: 3, time: 100, tools: 0 }), env });
r = await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "G", hp: 4, time: 0, tools: 0 }), env });
check("surpassed: hp更高 → 超越A → 1", r.data.surpassed === 1, "got " + r.data.surpassed);

/* ---------- 5. 昵称查重 (跨所有模式) ---------- */
reset();
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "normal", name: "小明", hp: 1, time: 30, tools: 2 }), env });
r = await call(existsApi.onRequestGet, { request: mockReq("http://x/hlgx/api/name/exists?name=%E5%B0%8F%E6%98%8E"), env });
check("exists: 已存在 → true", r.data.exists === true, JSON.stringify(r.data));
r = await call(existsApi.onRequestGet, { request: mockReq("http://x/hlgx/api/name/exists?name=%E5%B0%8F%E7%BA%A2"), env });
check("exists: 不存在 → false", r.data.exists === false, JSON.stringify(r.data));
r = await call(existsApi.onRequestGet, { request: mockReq("http://x/hlgx/api/name/exists?name="), env });
check("exists: 空名 → false", r.data.exists === false, JSON.stringify(r.data));

/* ---------- 6. 昵称建议 X*001..X*999 ---------- */
reset();
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "小明*001", hp: 1, time: 30, tools: 2 }), env });
r = await call(suggestApi.onRequestGet, { request: mockReq("http://x/hlgx/api/name/suggest?name=%E5%B0%8F%E6%98%8E"), env });
check("suggest: *001被占 → *002", r.data.name === "小明*002", JSON.stringify(r.data));
r = await call(suggestApi.onRequestGet, { request: mockReq("http://x/hlgx/api/name/suggest?name=%E5%B0%8F%E6%98%8E"), env });
check("suggest: 连续调用返回同一名", r.data.name === "小明*002", JSON.stringify(r.data));
r = await call(suggestApi.onRequestGet, { request: mockReq("http://x/hlgx/api/name/suggest?name="), env });
check("suggest: 空名 → 空串", r.data.name === "", JSON.stringify(r.data));
// 占用 *001~*999 全部 → 回退 *999
reset();
const nine = [];
for (let i = 1; i <= 999; i++) nine.push({ name: "满*" + String(i).padStart(3, "0"), hp: 0, time: 0, tools: 0, date: "2026-08-09 00:00" });
store.set("easy", JSON.stringify(nine));
r = await call(suggestApi.onRequestGet, { request: mockReq("http://x/hlgx/api/name/suggest?name=%E6%BB%A1"), env });
check("suggest: 全占用 → 回退 *999", r.data.name === "满*999", JSON.stringify(r.data));

/* ---------- 7. DELETE 清榜 ---------- */
reset();
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "easy", name: "X", hp: 1, time: 1, tools: 0 }), env });
await call(rankApi.onRequestPost, { request: mockReq("http://x/hlgx/api/rank", { mode: "challenge", name: "Y", hp: 2, time: 2, tools: 0 }), env });
r = await call(rankApi.onRequestDelete, { request: mockReq("http://x/hlgx/api/rank?mode=easy"), env });
check("DELETE easy → 已清空 easy 榜单", deepEq(r.data, { ok: true, msg: "已清空 easy 榜单" }), JSON.stringify(r.data));
r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=easy"), env });
check("DELETE 后 easy 为空", r.data.rank.length === 0, JSON.stringify(r.data));
r = await call(rankApi.onRequestDelete, { request: mockReq("http://x/hlgx/api/rank?mode=all"), env });
check("DELETE all → 已清空全部榜单", deepEq(r.data, { ok: true, msg: "已清空全部榜单" }), JSON.stringify(r.data));
r = await call(rankApi.onRequestGet, { request: mockReq("http://x/hlgx/api/rank?mode=challenge"), env });
check("DELETE all 后 challenge 也为空", r.data.rank.length === 0, JSON.stringify(r.data));
r = await call(rankApi.onRequestDelete, { request: mockReq("http://x/hlgx/api/rank?mode=abc"), env });
check("DELETE 非法 mode → 400 参数错误", r.status === 400 && r.data.msg === "参数错误", JSON.stringify(r.data));

/* ---------- 汇总 ---------- */
console.log("========== API 契约自测结果 ==========");
results.forEach((x) => console.log((x.pass ? "✓ " : "✗ ") + x.name + (x.pass ? "" : "  ← " + x.detail)));
const failed = results.filter((x) => !x.pass);
if (failed.length) { console.error(`\n共 ${failed.length} 项失败, 需修复!`); process.exit(1); }
console.log(`\n全部 ${results.length} 项通过 ✓ 与 Flask 契约一致`);
