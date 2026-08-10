/*
 * 化了个学 · 本地端到端验证 (e2e_local.mjs)
 * 运行前提: 本地已启动 wrangler pages dev (见 package.json "dev:pages")
 *   npm run dev:pages
 * 然后: node scripts/e2e_local.mjs [baseUrl]
 * 验证: 静态页面 / SPA 路由 / 构建资源 / 用户 API 契约(含限频)/
 *       管理 API 全流程(登录→榜单管理→审计→会话→登出)/ 404 行为 / 中文 UTF-8。
 * 任一项失败退出码 1。
 */
const BASE = process.argv[2] || "http://127.0.0.1:8799";

const results = [];
function check(name, pass, detail = "") {
    results.push({ name, pass: !!pass, detail: pass ? "" : detail });
}

async function get(path) {
    const res = await fetch(BASE + path);
    return { status: res.status, text: await res.text() };
}
/* HTTP 层请求: body 为对象时序列化 JSON; headers 可覆盖(如 X-Forwarded-For 模拟不同玩家) */
async function send(path, method, body, headers = {}) {
    const res = await fetch(BASE + path, {
        method,
        headers: body ? { "Content-Type": "application/json", ...headers } : headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* 非 JSON */ }
    return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
}
/* 独立 IP 提交(避免触发 60s 提交限频; 本地 KV 持久化, 每次运行用时间戳保证全新 IP) */
const RUN = Date.now();
let ipn = 0;
const postRank = (body) => send("/hlgx/api/rank", "POST", body, { "X-Forwarded-For": `e2e-${RUN}-${++ipn}` });
const postRankSameIp = (body) => send("/hlgx/api/rank", "POST", body, { "X-Forwarded-For": `e2e-${RUN}-same` });

/* ---------- 1. 静态页面 + SPA 路由 ---------- */
let r = await get("/");
check("页面 / 返回 200", r.status === 200, "status " + r.status);
check("页面 / 为 React 大厅(root 挂载点)", r.text.includes("id=\"root\"") && r.text.includes("/assets/"), "");

r = await get("/hlgx/hua");
check("页面 /hlgx/hua 返回 200 (SPA 路由)", r.status === 200, "status " + r.status);

r = await get("/hlgx/rank");
check("页面 /hlgx/rank 返回 200 (SPA 路由)", r.status === 200, "status " + r.status);

r = await get("/admin/dashboard");
check("页面 /admin/dashboard 返回 200 (管理 SPA 路由)", r.status === 200, "status " + r.status);

// 构建产物资源(从 index.html 提取真实文件名)
const asset = (r.text.match(/\/assets\/[^"]+\.js/) || [])[0];
r = await get(asset || "/assets/missing");
check("构建资源 " + (asset || "") + " 无 404", r.status === 200, "status " + r.status);

r = await get("/不存在的页面xyz");
check("不存在的静态页 → 404", r.status === 404, "status " + r.status);

/* ---------- 2. API: GET rank ---------- */
r = await get("/hlgx/api/rank?mode=easy");
check("GET rank 200 + 契约", r.status === 200 && r.text.includes('"mode":"easy"') && r.text.includes('"rank"'), r.text.slice(0, 120));

r = await get("/hlgx/api/rank?mode=乱写");
check("GET rank 非法mode回退normal", r.status === 200 && r.text.includes('"mode":"normal"'), r.text.slice(0, 120));

/* ---------- 3. API: POST rank (中文昵称 UTF-8 + 限频) ---------- */
let p = await postRank({ mode: "easy", name: "帅帅", hp: 3, time: 131, tools: 0 });
check("POST rank 200 + ok:true", p.status === 200 && p.data.ok === true, JSON.stringify(p.data).slice(0, 200));
check("POST 中文昵称正确返回(UTF-8)", p.data.rank && p.data.rank[0].name === "帅帅", JSON.stringify(p.data.rank && p.data.rank[0]));
check("POST date 格式正确", /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(p.data.rank[0].date || ""), p.data.rank[0].date);

p = await postRank({ mode: "easy", name: "", hp: 1, time: 1, tools: 0 });
check("POST 空昵称 → 400", p.status === 400 && p.data.msg === "缺少昵称", "status " + p.status + " " + JSON.stringify(p.data));

p = await postRankSameIp({ mode: "easy", name: "同IP一", hp: 1, time: 20, tools: 0 });
check("限频: 同IP第1次提交成功", p.status === 200, "status " + p.status);
p = await postRankSameIp({ mode: "easy", name: "同IP二", hp: 1, time: 21, tools: 0 });
check("限频: 同IP 60秒内第2次 → 429", p.status === 429 && p.data.msg === "提交过于频繁,请稍后再试", "status " + p.status + " " + JSON.stringify(p.data));

p = await postRank({ mode: "easy", name: "秒杀", hp: 3, time: 2, tools: 0 });
check("时间过短(2秒) → 400 成绩无效", p.status === 400 && p.data.msg === "成绩无效:用时过短", "status " + p.status + " " + JSON.stringify(p.data));

p = await postRank({ mode: "easy", name: "<script>", hp: 3, time: 30, tools: 0 });
check("昵称含 < > → 400 非法字符", p.status === 400 && p.data.msg === "昵称包含非法字符", "status " + p.status + " " + JSON.stringify(p.data));

/* ---------- 4. API: exists / suggest ---------- */
r = await get("/hlgx/api/name/exists?name=" + encodeURIComponent("帅帅"));
check("exists 已存在 → true", r.status === 200 && r.text.includes('"exists":true'), r.text);

r = await get("/hlgx/api/name/exists?name=" + encodeURIComponent("路人"));
check("exists 不存在 → false", r.status === 200 && r.text.includes('"exists":false'), r.text);

r = await get("/hlgx/api/name/suggest?name=" + encodeURIComponent("帅帅"));
check("suggest 返回 *001 形式", r.status === 200 && /"name":"帅帅\*\d{3}"/.test(r.text), r.text);

/* ---------- 5. 用户 API 不再提供 DELETE ---------- */
p = await send("/hlgx/api/rank?mode=easy", "DELETE");
check("用户 API DELETE → 404 接口不存在", p.status === 404 && p.data.msg === "接口不存在", "status " + p.status + " " + JSON.stringify(p.data));

/* ---------- 6. 管理 API 全流程 ---------- */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN_LOCAL || "wkQBogU6fQgL4ON3O_5C70FsbJY7w2Qw";   // 本地令牌, 见 .dev.vars(不入 git)

// 6.1 登录
p = await send("/admin/api/auth", "POST", { token: "wrong" }, { "X-Forwarded-For": "e2e-admin-wrong" });
check("管理登录 错令牌 → 401", p.status === 401, "status " + p.status);
p = await send("/admin/api/auth", "POST", { token: ADMIN_TOKEN }, { "X-Forwarded-For": "e2e-admin" });
const cookie = (p.setCookie || "").split(";")[0];
check("管理登录 正确令牌 → 200 + Cookie", p.status === 200 && p.data.ok === true && cookie.startsWith("hlgx_admin="), p.setCookie || "");

// 6.2 me / 未登录拒绝
p = await send("/admin/api/auth", "GET", null, { cookie });
check("me 已登录 → 200", p.status === 200 && p.data.actor === "admin", JSON.stringify(p.data));
p = await send("/admin/api/rank?mode=easy", "GET");
check("管理榜单 未登录 → 401", p.status === 401, "status " + p.status);

// 6.3 榜单管理: 查看 → 单条删除 → 清空(全部留审计)
p = await send("/admin/api/rank?mode=easy", "GET", null, { cookie });
const entry = (p.data?.rank || [])[0];
check("管理榜单 含刚才提交的记录(帅帅)", !!entry && entry.name === "帅帅", JSON.stringify(p.data?.rank));
p = await send("/admin/api/rank?mode=easy&key=" + entry.key, "DELETE", null, { cookie });
check("单条删除 → 200", p.status === 200 && p.data.ok === true, JSON.stringify(p.data));
p = await send("/admin/api/rank?mode=easy", "DELETE", null, { cookie });
check("清空 easy → 200", p.status === 200 && p.data.ok === true, JSON.stringify(p.data));

// 6.4 审计日志: 登录/删除/清空可见
p = await send("/admin/api/logs?limit=20", "GET", null, { cookie });
const acts = (p.data?.entries || []).map((e) => e.action);
check("审计日志 含 login_success/rank_delete_one/rank_clear_mode",
      ["login_success", "rank_delete_one", "rank_clear_mode"].every((a) => acts.includes(a)), acts.join(","));

// 6.5 会话: 列表 → 强制下线自己 → 失效
p = await send("/admin/api/sessions", "GET", null, { cookie });
check("会话列表 ≥1", p.status === 200 && p.data.sessions.length >= 1, JSON.stringify(p.data));
const mySid = cookie.split("=")[1];
p = await send("/admin/api/sessions?id=" + mySid, "DELETE", null, { cookie });
check("强制下线自己 → 200", p.status === 200 && p.data.ok === true, JSON.stringify(p.data));
p = await send("/admin/api/auth", "GET", null, { cookie });
check("下线后 me → 401", p.status === 401, "status " + p.status);

/* ---------- 7. 404 行为 ---------- */
r = await get("/hlgx/api/rankx");
check("未知 API 路径 → 404", r.status === 404, "status " + r.status);

/* ---------- 汇总 ---------- */
console.log("========== 本地 E2E 验证结果 ==========");
results.forEach((x) => console.log((x.pass ? "✓ " : "✗ ") + x.name + (x.pass ? "" : "  ← " + x.detail)));
const failed = results.filter((x) => !x.pass);
if (failed.length) { console.error(`\n共 ${failed.length} 项失败!`); process.exit(1); }
console.log(`\n全部 ${results.length} 项通过 ✓ 本地 Pages 环境工作正常(v2.1.0)`);
