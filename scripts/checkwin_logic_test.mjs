/*
 * 化了个学 · 过关判定逻辑测试 (checkwin_logic_test.mjs)
 * =====================================================
 * 需求 v2.0.1: 过关 = 全部卡牌被拾取 且 手牌槽无 3 张同类可消(最后一步消除也纳入考察)。
 * 本测试从线上部署的 dist/js/hlgx_hua.js 中提取真实的 canEliminate / checkWin 函数源码,
 * 在 node vm 沙箱中构造终局场景,验证四种情况的行为,而非复制逻辑再测一遍。
 * 运行: node scripts/checkwin_logic_test.mjs   (无依赖,零配置)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "dist", "js", "hlgx_hua.js"), "utf8");

// 提取函数源码(精确到函数体,带缩进无妨)
function extract(fnName) {
    const re = new RegExp("function\\s+" + fnName + "\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}", "m");
    const m = src.match(re);
    if (!m) throw new Error("未在 dist/js/hlgx_hua.js 中找到 " + fnName + "()");
    return m[0];
}
const canEliminateSrc = extract("canEliminate");
const checkWinSrc = extract("checkWin");

/* 用 dist 真实代码 + vm 沙箱构造一个可运行的检查器 */
function makeRunner({ tiles, tray, selected = [], gameOver = false }) {
    const ctx = { gameOver, win: false, tiles, tray, selected };
    vm.createContext(ctx);
    // 辅助函数与游戏函数同处一个沙箱作用域,共享 tray/win 等全局变量
    const helpers = `
        function renderTray() {}                 // 渲染为空操作,不参与判定
        function showWin() { win = true; }       // 通关动作 → 置 win
    `;
    vm.runInContext(helpers + "\n" + canEliminateSrc + "\n" + checkWinSrc, ctx);
    return ctx;
}

/* 构造卡牌: sub.c = 物质类别(同类可消) */
const mk = (c, removed = false) => ({ removed, sub: { c } });

const results = [];
function check(name, pass, detail = "") {
    results.push({ name, pass: !!pass, detail: pass ? "" : detail });
}

/* ---------- 场景 1: 全部拾取 + 手牌无三消 → 应立即通关 ---------- */
{
    const ctx = makeRunner({
        tiles: [mk("氯气", true), mk("氢气", true), mk("氧气", true)],
        tray: [mk("铁"), mk("铜")],                       // 2 张不同类,无三消可能
    });
    ctx.checkWin();
    check("场景1 全部拾取+无三消 → 通关", ctx.win === true,
        "win=" + ctx.win + " canEliminate=" + ctx.canEliminate());
    check("场景1 通关后手牌清空", ctx.tray.length === 0, "tray=" + ctx.tray.length);
}

/* ---------- 场景 2: 全部拾取 + 手牌存在 3 张同类 → 不得通关(必须完成最后一次消除) ---------- */
{
    const ctx = makeRunner({
        tiles: [mk("氯气", true), mk("氢气", true), mk("氧气", true)],
        tray: [mk("钠"), mk("钠"), mk("钠"), mk("铁")],   // 3 张同类「钠」,仍可消
    });
    ctx.checkWin();
    check("场景2 全部拾取+有三消可能 → 不通关", ctx.win === false,
        "win=" + ctx.win + " canEliminate=" + ctx.canEliminate());
    check("场景2 手牌保留(等待玩家消除)", ctx.tray.length === 4, "tray=" + ctx.tray.length);
}

/* ---------- 场景 3: 未全部拾取(棋盘还有牌) → 不通关 ---------- */
{
    const ctx = makeRunner({
        tiles: [mk("氯气", true), mk("氢气", true), mk("氧气", false)],  // 氧气还在棋盘
        tray: [mk("铁"), mk("铜")],
    });
    ctx.checkWin();
    check("场景3 棋盘未清空 → 不通关", ctx.win === false,
        "win=" + ctx.win + " tilesRemoved=" + ctx.tiles.filter(t => t.removed).length + "/3");
}

/* ---------- 场景 4: 场景2 局面完成最后一次消除后 → 通关(最后一步消除也计入) ---------- */
{
    const ctx = makeRunner({
        tiles: [mk("氯气", true), mk("氢气", true), mk("氧气", true)],
        tray: [mk("钠"), mk("钠"), mk("钠"), mk("铁")],
    });
    ctx.checkWin();
    const beforeEliminate = ctx.win;                       // 先确认消除前不通关
    // 模拟玩家完成三消: 移除 3 张同类钠,留下 1 张铁(无三消可能)
    ctx.tray = ctx.tray.filter((x, i) => !(i < 3));
    ctx.checkWin();
    check("场景4 消除前不通关", beforeEliminate === false, "before=" + beforeEliminate);
    check("场景4 完成最后一次消除后 → 通关", ctx.win === true,
        "win=" + ctx.win + " canEliminate=" + ctx.canEliminate());
}

/* ---------- 场景 5: 全部拾取 + 手牌恰好剩 2 张同类(无三消) → 通关 ---------- */
{
    const ctx = makeRunner({
        tiles: [mk("氯气", true), mk("氢气", true), mk("氧气", true)],
        tray: [mk("钠"), mk("钠")],                        // 2 张同类不足 3,无三消可能
    });
    ctx.checkWin();
    check("场景5 全部拾取+仅剩2同类 → 通关", ctx.win === true,
        "win=" + ctx.win + " canEliminate=" + ctx.canEliminate());
}

/* ---------- 汇总 ---------- */
console.log("========== 过关判定逻辑测试(vm 沙箱,dist 真实代码) ==========");
results.forEach((x) => console.log((x.pass ? "✓ " : "✗ ") + x.name + (x.pass ? "" : "  ← " + x.detail)));
const failed = results.filter((x) => !x.pass);
if (failed.length) { console.error(`\n共 ${failed.length} 项失败!`); process.exit(1); }
console.log(`\n全部 ${results.length} 项通过 ✓ 过关判定符合 v2.0.1 需求`);
