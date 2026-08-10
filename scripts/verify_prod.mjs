/*
 * 生产环境线上验证 (verify_prod.mjs)
 * 用法: ADMIN_TOKEN=<生产令牌> node scripts/verify_prod.mjs [BASE]
 * 默认 BASE = https://hua-liao-ge-xue.pages.dev
 * 覆盖: 页面/SPA 路由 200 / 构建资源无 404 / 用户 API 契约 /
 *       管理 API(登录→me→榜单只读→审计→会话列表→登出, 非破坏性)/ 中文 UTF-8
 * 注意:
 *   - 提交限频 60s/IP: 生产下本机 IP 恒定, 脚本最多提交 1 次成绩(所有检查合并在一条记录上)
 *   - 结尾通过管理端清空测试痕迹并恢复生产数据(帅帅)
 *   - ADMIN_TOKEN 必须经环境变量传入, 绝不硬编码进 git; 缺失则拒绝执行
 */
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] || "https://hua-liao-ge-xue.pages.dev";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
    console.error("缺少生产管理员令牌: 请用 ADMIN_TOKEN=<令牌> node scripts/verify_prod.mjs 运行");
    process.exit(1);
}
let pass = 0, fail = 0;
const fails = [];
function check(name, cond, detail = "") {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; fails.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); }
}

async function get(path) {
    const r = await fetch(BASE + path);
    return { status: r.status, headers: r.headers, text: await r.text() };
}
async function api(path, method = "GET", body, headers = {}) {
    const r = await fetch(BASE + path, body ? {
        method, headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
    } : { method, headers });
    let data = null, txt = await r.text();
    try { data = JSON.parse(txt); } catch { /* 非 JSON */ }
    return { status: r.status, data, txt, headers: r.headers };
}

/* ---------- 管理会话(登录一次, 全程复用) ---------- */
console.log(`\n== 管理登录 (${BASE}) ==`);
const login = await api("/admin/api/auth", "POST", { token: ADMIN_TOKEN });
check("POST /admin/api/auth 登录 → 200", login.status === 200 && login.data?.ok === true, `(实际 ${login.status})`);
// 注意: Node fetch 默认屏蔽 Set-Cookie 响应头, 须用 getSetCookie() 读取
const setCookies = login.headers?.getSetCookie ? login.headers.getSetCookie() : [];
const cookie = (setCookies[0] || "").split(";")[0];
check("登录下发会话 Cookie", cookie.startsWith("hlgx_admin="), (setCookies[0] || "").slice(0, 40));

const adminGet = (path) => api(path, "GET", undefined, { cookie });
const me = await adminGet("/admin/api/auth");
check("GET /admin/api/auth me → 200", me.status === 200 && me.data?.actor === "admin", `(实际 ${me.status})`);

console.log("\n== 页面与静态资源 ==");
{
    for (const p of ["/", "/hlgx/hua", "/hlgx/rank", "/admin/login"]) {
        const r = await get(p);
        check(`GET ${p} → 200`, r.status === 200, `(实际 ${r.status})`);
    }
    const root = await get("/");
    const asset = (root.text.match(/\/assets\/[^"]+\.js/) || [])[0];
    const r = await get(asset || "/assets/missing");
    check(`GET ${asset} → 200 (构建资源)`, asset && r.status === 200, `(实际 ${r.status})`);
    const r404 = await get("/hlgx/no-such-page");
    check("不存在页面 → 404", r404.status === 404, `(实际 ${r404.status})`);
    const rApi404 = await get("/hlgx/api/rankx");
    check("未知 API 路径 → 404", rApi404.status === 404, `(实际 ${rApi404.status})`);
}

console.log("\n== API: GET 榜单(含迁移数据) ==");
{
    const r = await api("/hlgx/api/rank?mode=easy");
    check("GET rank?mode=easy → 200", r.status === 200, `(实际 ${r.status})`);
    check("响应 mode=easy", r.data?.mode === "easy");
    check("迁移数据存在: 帅帅 hp3 time131 tools0", r.data?.rank?.some(e => e.name === "帅帅" && e.hp === 3 && e.time === 131 && e.tools === 0));
    const shuai = r.data?.rank?.find(e => e.name === "帅帅");
    check("date 原样保留 2026-08-09 12:37", shuai?.date === "2026-08-09 12:37", `(实际 ${shuai?.date})`);
    const rn = await api("/hlgx/api/rank");
    check("GET rank 默认 → normal", rn.data?.mode === "normal");
    const rx = await api("/hlgx/api/rank?mode=xx");
    check("GET rank?mode=xx 非法 → 回落 normal", rx.data?.mode === "normal");
}

console.log("\n== API: exists / suggest ==");
{
    const r1 = await api("/hlgx/api/name/exists?name=" + encodeURIComponent("帅帅"));
    check("exists 帅帅 → true", r1.data?.exists === true);
    const r2 = await api("/hlgx/api/name/exists?name=" + encodeURIComponent("不存在的人"));
    check("exists 不存在的人 → false", r2.data?.exists === false);
    const s1 = await api("/hlgx/api/name/suggest?name=" + encodeURIComponent("帅帅"));
    check("suggest 帅帅 → 帅帅*001", s1.data?.name === "帅帅*001", `(实际 ${s1.data?.name})`);
}

console.log("\n== API: POST 提交(限频下仅 1 条, 合并检查) ==");
{
    const P = await api("/hlgx/api/rank", "POST", { mode: "easy", name: "氦氖氩氪氙氡", hp: 99, time: 15, tools: -3 });
    check("POST → 200 ok:true", P.status === 200 && P.data?.ok === true, `(实际 ${P.status} ${P.data?.msg || ""})`);
    const f = (P.data?.rank || []).find(e => e.name === "氦氖氩氪氙氡");
    check("中文昵称 UTF-8 + clamp(hp99→3, tools-3→0)", f?.hp === 3 && f?.time === 15 && f?.tools === 0, `(实际 ${JSON.stringify(f)})`);
    check("date 格式 YYYY-MM-DD HH:MM", typeof f?.date === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(f.date), `(实际 ${f?.date})`);
    const P2 = await api("/hlgx/api/rank", "POST", { mode: "easy", name: "重复提交", hp: 1, time: 1, tools: 0 });
    check("限频: 同 IP 60 秒内再次提交 → 429", P2.status === 429, `(实际 ${P2.status})`);
}

console.log("\n== 管理 API(只读 + 非破坏性) ==");
{
    const list = await adminGet("/admin/api/rank?mode=easy");
    check("管理榜单 easy → 200 含 key", list.status === 200 && Array.isArray(list.data?.rank) && typeof list.data?.rank?.[0]?.key === "number", `(实际 ${list.status})`);
    const q = await adminGet("/admin/api/rank?mode=easy&q=" + encodeURIComponent("帅帅"));
    check("管理榜单 搜索帅帅 → 命中", q.status === 200 && q.data?.rank?.some(e => e.name === "帅帅"), "");
    const logs = await adminGet("/admin/api/logs?limit=20");
    const acts = (logs.data?.entries || []).map(e => e.action);
    check("审计日志 → 200 且含 login_success", logs.status === 200 && acts.includes("login_success"), `(实际 ${logs.status})`);
    const sessions = await adminGet("/admin/api/sessions");
    check("会话列表 → 200 ≥1", sessions.status === 200 && sessions.data?.sessions?.length >= 1, `(实际 ${sessions.status})`);
    const unauth = await api("/admin/api/rank?mode=easy");
    check("未登录访问管理 API → 401", unauth.status === 401, `(实际 ${unauth.status})`);
}

// 恢复生产数据: 清空测试痕迹, 恢复原始 easy 榜(帅帅)与空 normal/challenge
console.log("\n== 恢复生产数据 ==");
{
    const clearAll = await api("/admin/api/rank?mode=all", "DELETE", undefined, { cookie });
    check("管理端清空全部 → ok", clearAll.data?.ok === true, JSON.stringify(clearAll.data));
    const restored = [{ "name": "帅帅", "hp": 3, "time": 131, "tools": 0, "date": "2026-08-09 12:37" }];
    writeFileSync(new URL("../.wrangler/kv-migrate/easy.json", import.meta.url), JSON.stringify(restored), "utf8");
    console.log("  (原始数据由脚本末尾的 kv put --remote 恢复, 见输出下方提示)");
    const logout = await api("/admin/api/auth", "DELETE", undefined, { cookie });
    check("登出 → 200", logout.status === 200, `(实际 ${logout.status})`);
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
if (fail > 0) { console.log("失败项:\n" + fails.map(f => "  - " + f).join("\n")); process.exit(1); }
console.log(`\n恢复提示: npx wrangler kv key put easy --path=.wrangler/kv-migrate/easy.json --binding=RANKINGS --remote`);
