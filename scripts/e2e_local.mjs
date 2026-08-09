/*
 * 化了个学 · 本地端到端验证 (e2e_local.mjs)
 * 运行前提: 本地已启动 wrangler pages dev (见 package.json "dev")
 *   npx wrangler pages dev dist --kv=RANKINGS --persist-to .wrangler/state --port=8799
 * 然后: node scripts/e2e_local.mjs [baseUrl]
 * 验证: 静态页面 200 / 资源无 404 / 干净URL / 5 个 API 契约(真实 HTTP 层) /
 *       404 行为 / 中文 UTF-8。任一项失败退出码 1。
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
async function send(path, method, body) {
    const res = await fetch(BASE + path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* 非 JSON */ }
    return { status: res.status, data };
}

/* ---------- 1. 静态页面 + 资源 ---------- */
let r = await get("/");
check("页面 / 返回 200", r.status === 200, "status " + r.status);
check("页面 / 内容为化了个学大厅", r.text.includes("化了个学") && r.text.includes("hlgx_style.css"), "");

r = await get("/hlgx/hua");
check("页面 /hlgx/hua 返回 200 (干净URL)", r.status === 200, "status " + r.status);
check("/hlgx/hua 引用静态资源路径", r.text.includes("/js/hlgx_hua.js") && r.text.includes("/js/hlgx_substances.js"), "");

r = await get("/hlgx/rank");
check("页面 /hlgx/rank 返回 200 (干净URL)", r.status === 200, "status " + r.status);

for (const p of ["/css/hlgx_style.css", "/js/hlgx_hua.js", "/js/hlgx_substances.js"]) {
    r = await get(p);
    check("资源 " + p + " 无 404", r.status === 200, "status " + r.status);
}

r = await get("/hlgx/hua.html");
check("带 .html 后缀同样可访问", r.status === 200, "status " + r.status);

r = await get("/不存在的页面xyz");
check("不存在的静态页 → 404", r.status === 404, "status " + r.status);

/* ---------- 2. API: GET rank ---------- */
r = await get("/hlgx/api/rank?mode=easy");
check("GET rank 200 + 契约", r.status === 200 && r.text.includes('"mode":"easy"') && r.text.includes('"rank"'), r.text.slice(0, 120));

r = await get("/hlgx/api/rank?mode=乱写");
check("GET rank 非法mode回退normal", r.status === 200 && r.text.includes('"mode":"normal"'), r.text.slice(0, 120));

/* ---------- 3. API: POST rank (中文昵称 UTF-8) ---------- */
let p = await send("/hlgx/api/rank", "POST", { mode: "easy", name: "帅帅", hp: 3, time: 131, tools: 0 });
check("POST rank 200 + ok:true", p.status === 200 && p.data.ok === true, JSON.stringify(p.data).slice(0, 200));
check("POST 中文昵称正确返回", p.data.rank && p.data.rank[0].name === "帅帅", JSON.stringify(p.data.rank && p.data.rank[0]));
check("POST date 格式正确", /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(p.data.rank[0].date || ""), p.data.rank[0].date);

p = await send("/hlgx/api/rank", "POST", { mode: "easy", name: "", hp: 1, time: 1, tools: 0 });
check("POST 空昵称 → 400", p.status === 400 && p.data.msg === "缺少昵称", "status " + p.status + " " + JSON.stringify(p.data));

/* ---------- 4. API: exists / suggest ---------- */
r = await get("/hlgx/api/name/exists?name=" + encodeURIComponent("帅帅"));
check("exists 已存在 → true", r.status === 200 && r.text.includes('"exists":true'), r.text);

r = await get("/hlgx/api/name/exists?name=" + encodeURIComponent("路人"));
check("exists 不存在 → false", r.status === 200 && r.text.includes('"exists":false'), r.text);

r = await get("/hlgx/api/name/suggest?name=" + encodeURIComponent("帅帅"));
check("suggest 返回 *001 形式", r.status === 200 && /"name":"帅帅\*\d{3}"/.test(r.text), r.text);

/* ---------- 5. API: DELETE ---------- */
p = await send("/hlgx/api/rank?mode=easy", "DELETE");
check("DELETE 返回已清空消息", p.status === 200 && p.data.msg === "已清空 easy 榜单", JSON.stringify(p.data));

r = await get("/hlgx/api/rank?mode=easy");
check("DELETE 后榜单为空", r.status === 200 && r.text.includes('"rank":[]'), r.text);

/* ---------- 6. 404 行为 ---------- */
r = await get("/hlgx/api/rankx");
check("未知 API 路径 → 404", r.status === 404, "status " + r.status);

/* ---------- 汇总 ---------- */
console.log("========== 本地 E2E 验证结果 ==========");
results.forEach((x) => console.log((x.pass ? "✓ " : "✗ ") + x.name + (x.pass ? "" : "  ← " + x.detail)));
const failed = results.filter((x) => !x.pass);
if (failed.length) { console.error(`\n共 ${failed.length} 项失败!`); process.exit(1); }
console.log(`\n全部 ${results.length} 项通过 ✓ 本地 Pages 环境工作正常`);
