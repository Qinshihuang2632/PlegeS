/*
 * 生产环境线上验证(阶段 5)
 * 用法: node scripts/verify_prod.mjs [BASE]
 * 默认 BASE = https://hua-liao-ge-xue.pages.dev
 * 覆盖: 页面 200 / 资源无 404 / API 契约(排序、surpassed、clamp、建议、DELETE)/ 中文昵称 UTF-8
 * 注意: 会 POST 测试成绩并清空 easy 榜,最后恢复原始数据(帅帅)由本脚本尾部重新写入。
 */
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] || "https://hua-liao-ge-xue.pages.dev";
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
async function api(path, method = "GET", body) {
    const r = await fetch(BASE + path, body ? {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    } : { method });
    let data = null, txt = await r.text();
    try { data = JSON.parse(txt); } catch { /* 非 JSON */ }
    return { status: r.status, data, txt };
}

console.log(`\n== 页面与静态资源 (${BASE}) ==`);
{
    for (const p of ["/", "/hlgx/hua", "/hlgx/rank"]) {
        const r = await get(p);
        check(`GET ${p} → 200`, r.status === 200, `(实际 ${r.status})`);
    }
    for (const p of ["/css/hlgx_style.css", "/js/hlgx_hua.js"]) {
        const r = await get(p);
        check(`GET ${p} → 200`, r.status === 200, `(实际 ${r.status})`);
    }
    const r = await get("/hlgx/hua.html");
    check("GET /hlgx/hua.html → 200 (干净 URL 兼容)", r.status === 200, `(实际 ${r.status})`);
    const r404 = await get("/hlgx/no-such-page");
    check("不存在页面 → 404", r404.status === 404, `(实际 ${r404.status})`);
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
    check("normal 榜为空", Array.isArray(rn.data?.rank) && rn.data.rank.length === 0);
    const rx = await api("/hlgx/api/rank?mode=xx");
    check("GET rank?mode=xx 非法 → 回落 normal", rx.data?.mode === "normal");
}

console.log("\n== API: exists / suggest ==");
{
    const r1 = await api("/hlgx/api/name/exists?name=" + encodeURIComponent("帅帅"));
    check("exists 帅帅 → true", r1.data?.exists === true);
    const r2 = await api("/hlgx/api/name/exists?name=" + encodeURIComponent("不存在的人"));
    check("exists 不存在的人 → false", r2.data?.exists === false);
    const r3 = await api("/hlgx/api/name/exists?name=");
    check("exists 空名 → false", r3.data?.exists === false);
    const s1 = await api("/hlgx/api/name/suggest?name=" + encodeURIComponent("帅帅"));
    check("suggest 帅帅 → 帅帅*001", s1.data?.name === "帅帅*001", `(实际 ${s1.data?.name})`);
    const s2 = await api("/hlgx/api/name/suggest?name=");
    check("suggest 空名 → 空", s2.data?.name === "");
}

console.log("\n== API: POST 提交(排序 / surpassed / 中文 UTF-8) ==");
{
    // 清空 easy 保证可预测
    const del = await api("/hlgx/api/rank?mode=easy", "DELETE");
    check("DELETE easy → ok", del.data?.ok === true);
    // A: 常规成绩
    const A = await api("/hlgx/api/rank", "POST", { mode: "easy", name: "测试甲", hp: 3, time: 150, tools: 2 });
    check("POST A → 200", A.status === 200, `(实际 ${A.status})`);
    check("POST A surpassed=0", A.data?.surpassed === 0, `(实际 ${A.data?.surpassed})`);
    // B: hp 更差、time 更快 → 排名应低于 A (hp 优先)
    const B = await api("/hlgx/api/rank", "POST", { mode: "easy", name: "测试乙", hp: 2, time: 100, tools: 0 });
    check("POST B surpassed=0 (hp 更低不算超过)", B.data?.surpassed === 0, `(实际 ${B.data?.surpassed})`);
    // C: 同 hp=3 但 time 更快 → 超过 A 和 B
    const C = await api("/hlgx/api/rank", "POST", { mode: "easy", name: "测试丙", hp: 3, time: 120, tools: 5 });
    check("POST C surpassed=2 (3,120 强于 3,150 与 2,100)", C.data?.surpassed === 2, `(实际 ${C.data?.surpassed})`);
    // D: 同 hp=3 同 time=120 但 tools 更少 → 超过 A/B/C
    const D = await api("/hlgx/api/rank", "POST", { mode: "easy", name: "测试丁", hp: 3, time: 120, tools: 1 });
    check("POST D surpassed=3 (3,120,1 强于 3,120,5)", D.data?.surpassed === 3, `(实际 ${D.data?.surpassed})`);
    // E: 中文昵称 UTF-8 回读
    const E = await api("/hlgx/api/rank", "POST", { mode: "easy", name: "氦氖氩氪氙氡", hp: 1, time: 300, tools: 9 });
    check("POST E 中文昵称 UTF-8", E.data?.rank?.some(e => e.name === "氦氖氩氪氙氡"));
    // 最终榜单顺序: D(3,120,1) > C(3,120,5) > A(3,150,2) > B(2,100,0) > E(1,300,9)
    const R = await api("/hlgx/api/rank?mode=easy");
    const names = (R.data?.rank || []).map(e => e.name);
    check("排序 hp↓ time↑ tools↑", JSON.stringify(names) === JSON.stringify(["测试丁", "测试丙", "测试甲", "测试乙", "氦氖氩氪氙氡"]), `(实际 ${names.join(",")})`);
    const d = R.data?.rank?.[0]?.date;
    check("date 格式 YYYY-MM-DD HH:MM", typeof d === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(d), `(实际 ${d})`);
    // clamp: hp 越界 → 0-3
    const F = await api("/hlgx/api/rank", "POST", { mode: "easy", name: "clamp测试", hp: 99, time: -5, tools: -3 });
    const f = F.data?.rank?.find(e => e.name === "clamp测试");
    check("clamp hp99→3 time-5→0 tools-3→0", f?.hp === 3 && f?.time === 0 && f?.tools === 0, `(实际 ${JSON.stringify(f)})`);
    // 空昵称 → 400
    const G = await api("/hlgx/api/rank", "POST", { mode: "easy", name: "  ", hp: 3, time: 100, tools: 0 });
    check("POST 空昵称 → 400", G.status === 400, `(实际 ${G.status})`);
    // 非法 mode 存入 normal
    const H = await api("/hlgx/api/rank", "POST", { mode: "boom", name: "乱模式", hp: 2, time: 200, tools: 1 });
    const h = H.data?.rank?.find(e => e.name === "乱模式");
    check("POST 非法 mode → 存入 normal", H.data?.rank && h, `(实际 ${H.data?.mode})`);
}

console.log("\n== API: 未知路径 404 ==");
{
    const r = await api("/hlgx/api/rankx");
    check("GET /hlgx/api/rankx → 404", r.status === 404, `(实际 ${r.status})`);
}

// 恢复生产数据: 清空所有测试痕迹, 恢复原始 easy 榜(帅帅)与空 normal/challenge
console.log("\n== 恢复生产数据 ==");
{
    await api("/hlgx/api/rank?mode=easy", "DELETE");
    await api("/hlgx/api/rank?mode=normal", "DELETE");
    await api("/hlgx/api/rank?mode=challenge", "DELETE");
    const restored = [{"name":"帅帅","hp":3,"time":131,"tools":0,"date":"2026-08-09 12:37"}];
    writeFileSync(new URL("../.wrangler/kv-migrate/easy.json", import.meta.url), JSON.stringify(restored), "utf8");
    const rr = await api("/hlgx/api/rank?mode=easy");
    check("easy 榜已清空测试数据", rr.data?.rank?.length === 0);
    console.log("  (原始数据由脚本末尾的 kv put --remote 恢复)");
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
if (fail > 0) { console.log("失败项:\n" + fails.map(f => "  - " + f).join("\n")); process.exit(1); }
