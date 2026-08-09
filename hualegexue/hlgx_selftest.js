/*
 * 化了个学 · 逻辑自检脚本 (hlgx_selftest.js)
 * 运行: node hlgx_selftest.js
 * 在 Node 中模拟浏览器 DOM, 加载真实游戏代码验证:
 *   1) 布局/分布正确  2) 初始遮挡正确  3) 同层相邻不同色
 *   4) 贪心策略模拟30局, 通关率须 ≥ 80%
 * 任一项失败则退出码 1, 提示代码需要修复。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const SELF_DIR = __dirname;   // 自检脚本所在目录(hualegexue)

/* ---------- 最小 DOM 模拟 ---------- */
const fakeEl = () => ({
    innerHTML: "", textContent: "", disabled: false, className: "", title: "",
    style: {}, offsetWidth: 0,
    classList: (() => {
        const s = new Set();
        return {
            add(...c) { c.forEach(x => s.add(x)); },
            remove(...c) { c.forEach(x => s.delete(x)); },
            toggle(c, f) { if (f === undefined ? !s.has(c) : f) s.add(c); else s.delete(c); return s.has(c); },
            contains(c) { return s.has(c); },
        };
    })(),
    addEventListener() {}, appendChild() {}, remove() {},
});
global.document = {
    getElementById: (() => { const m = {}; return (id) => (m[id] = m[id] || fakeEl()); })(),
    createElement: () => fakeEl(),
    querySelectorAll: () => [],
};

const srcSubstances = fs.readFileSync(path.join(SELF_DIR, "static/js/hlgx_substances.js"), "utf8");
const srcGame = fs.readFileSync(path.join(SELF_DIR, "static/js/hlgx_hua.js"), "utf8");

const testCode = `
const results = [];
function check(name, pass, detail) { results.push({ name, pass: !!pass, detail: pass ? "" : detail }); }

/* 1. 布局与分布 */
check("物质库超过100种", HLGX_SUBSTANCES.length > 100, HLGX_SUBSTANCES.length);
check("共7层", LAYER_SIZES.length === 7, LAYER_SIZES.join(","));
check("消除槽容量10", TRAY_MAX === 10, TRAY_MAX);
check("总槽位140", buildSlots().length === 140, buildSlots().length);
const st = buildStack();
check("方块总数140", st.length === 140, st.length);
const cnt = {};
st.forEach(s => cnt[s.c] = (cnt[s.c] || 0) + 1);
check("共7个类别", Object.keys(cnt).length === 7, JSON.stringify(cnt));
check("每类至少3块", Object.values(cnt).every(v => v >= 3), JSON.stringify(cnt));
// 单物质出现概率: 各类 (卡牌数/该类物质数) 应近似相等
const byCatCount = {};
HLGX_SUBSTANCES.forEach(s => byCatCount[s.c] = (byCatCount[s.c] || 0) + 1);
const probs = Object.keys(cnt).map(c => cnt[c] / byCatCount[c]);
const pMin = Math.min(...probs), pMax = Math.max(...probs);
check("各类单物质出现概率近似相等", pMax - pMin <= 0.25,
      probs.map(p => p.toFixed(2)).join(",") + " 差" + (pMax - pMin).toFixed(2));

/* 1.5 性质简介数据完整性 */
const missingDesc = HLGX_SUBSTANCES.filter(s => !HLGX_DESC[s.n]);
const longDesc = HLGX_SUBSTANCES.filter(s => (HLGX_DESC[s.n] || "").replace(/[,，·]/g, "").length > 10);
check("全部物质都有性质简介", missingDesc.length === 0, missingDesc.map(s => s.n).join(","));
check("性质简介均≤10字", longDesc.length === 0,
      longDesc.map(s => s.n + "(" + HLGX_DESC[s.n] + ")").join(","));

/* 2. 初始遮挡 */
newGame();
const topTile = tiles.find(t => t.L === 0);
check("顶层1块开局可见", topTile && !isBlocked(topTile), "");
check("存在被上层遮挡的方块", tiles.some(t => !t.removed && isBlocked(t)), "");
check("开局有可点击方块", tiles.some(t => !t.removed && !isBlocked(t)), "");

/* 3. 同层相邻不同色 */
let colorOK = true;
for (const t of tiles) for (const o of tiles) {
    if (t === o || t.removed || o.removed || o.L !== t.L) continue;
    if (Math.abs(o.r - t.r) + Math.abs(o.c - t.c) === 1 && o.color === t.color) colorOK = false;
}
check("同层相邻卡牌颜色不同", colorOK);

/* 4. 三种策略模拟20局, 检验通关率 */
function runSim(strategy) {   // strategy: 'greedy' | 'balanced' | 'cautious'
    newGame();
    let moves = 0;
    while (!gameOver && !win && moves < 3000) {
        const cc = {};
        tray.forEach(x => cc[x.sub.c] = (cc[x.sub.c] || 0) + 1);
        let target = null;
        for (const cat in cc) { if (cc[cat] >= 3) { target = cat; break; } }
        if (target) { selected = tray.filter(x => x.sub.c === target).slice(0, 3); clearSelected(); continue; }
        if (tray.length >= TRAY_MAX) {
            if (toolUsed.out < TOOL_LIMIT) { moveOut(); continue; }
            if (toolUsed.undo < TOOL_LIMIT) { undo(); continue; }
            break;
        }
        // 预判救场: 槽位进入危险区且无"可立即凑三消"的落子 → 提前用道具腾位置
        const dangerLine = strategy === 'greedy' ? TRAY_MAX - 1 : (strategy === 'balanced' ? TRAY_MAX - 2 : TRAY_MAX - 3);
        if (tray.length >= dangerLine) {
            const canFinish = tiles.some(t => !t.removed && !isBlocked(t) && (cc[t.sub.c] || 0) === 2);
            if (!canFinish) {
                if (toolUsed.out < TOOL_LIMIT) { moveOut(); continue; }
                if (toolUsed.undo < TOOL_LIMIT) { undo(); continue; }
            }
        }
        const clickable = tiles.filter(t => !t.removed && !isBlocked(t));
        if (!clickable.length) break;
        const counts = {};
        tray.forEach(x => counts[x.sub.c] = (counts[x.sub.c] || 0) + 1);
        let picked = clickable.find(t => (counts[t.sub.c] || 0) === 2);
        if (!picked) picked = clickable.find(t => (counts[t.sub.c] || 0) === 1);
        if (!picked) picked = clickable.find(t => (counts[t.sub.c] || 0) > 0);
        if (!picked) {
            // 全部是可点击的都是槽内未有的新类别: 依策略决定何时才引入
            const limit = strategy === 'greedy' ? TRAY_MAX : (strategy === 'balanced' ? 7 : 5);
            if (tray.length < limit) {
                picked = clickable[Math.floor(Math.random() * clickable.length)];
            } else {
                if (toolUsed.shuffle < TOOL_LIMIT) { shuffleTiles(); continue; }   // 先洗牌重排前沿
                if (toolUsed.out < TOOL_LIMIT) { moveOut(); continue; }
                if (toolUsed.undo < TOOL_LIMIT) { undo(); continue; }
                picked = clickable[Math.floor(Math.random() * clickable.length)];
            }
        }
        pickTile(picked);
        moves++;
    }
    return { moves, win, gameOver, tools: { undo: toolUsed.undo, out: toolUsed.out, shuffle: toolUsed.shuffle } };
}
const STRATS = ['greedy', 'balanced', 'cautious'];
const stratResults = {};
STRATS.forEach(st => {
    const sims = [];
    for (let i = 0; i < 20; i++) sims.push(runSim(st));
    const w = sims.filter(s => s.win).length;
    const loses = sims.filter(s => !s.win).map(s => s.moves);
    stratResults[st] = w;
    const avg = (k) => (sims.reduce((a, x) => a + x.tools[k], 0) / sims.length).toFixed(1);
    console.log("  策略[" + st + "] 通关 " + w + "/20 = " + Math.round(w / 20 * 100) + "%"
        + " (均用 撤回" + avg('undo') + " 移出" + avg('out') + " 洗牌" + avg('shuffle') + ")"
        + (loses.length ? " (失败步数:" + loses.join(",") + ")" : ""));
});
check("贪心策略通关率 ≥ 80%", stratResults.greedy >= 16, stratResults.greedy + "/20");
check("平衡策略通关率 ≥ 80%", stratResults.balanced >= 16, stratResults.balanced + "/20");
check("谨慎策略通关率 ≥ 70%", stratResults.cautious >= 14, stratResults.cautious + "/20");

/* 汇总 */
console.log("========== 化了个学 自检结果 ==========");
results.forEach(r => console.log((r.pass ? "✓ " : "✗ ") + r.name + (r.pass ? "" : "  ← " + r.detail)));
const failed = results.filter(r => !r.pass);
if (failed.length) { console.error(\`\\n共 \${failed.length} 项失败, 代码需要修复!\`); process.exit(1); }
console.log(\`\\n全部 \${results.length} 项通过 ✓ 游戏逻辑正常! 通关率: 贪心\${stratResults.greedy}/20 平衡\${stratResults.balanced}/20 谨慎\${stratResults.cautious}/20\`);
`;

eval(srcSubstances + "\n" + srcGame + "\n" + testCode);
