/*
 * 化了个学 · 游戏核心逻辑测试 (Vitest)
 * ====================================
 * 迁移自旧版两类测试(断言不丢失):
 *   1) hualegexue/hlgx_selftest.js —— 布局/分布/遮挡/配色/通关率
 *   2) scripts/checkwin_logic_test.mjs —— 过关判定 5 场景 8 断言
 * 运行: npm test
 */
import { describe, expect, it } from "vitest";
import { HLGX_CATS, HLGX_DESC, HLGX_SUBSTANCES, type Category } from "./substances";
import {
    HuaGame, TOOL_LIMIT, buildSlots, buildStack, catsOf, fmtTime, slotColorIdx,
    type Tile,
} from "./core";

const NORMAL_LAYERS = [1, 2, 3, 4, 5, 6, 7];

/* ==================== 1. 物质库与简介 ==================== */
describe("物质库", () => {
    it("超过100种物质", () => {
        expect(HLGX_SUBSTANCES.length).toBeGreaterThan(100);
    });

    it("共8个类别(含混合物)", () => {
        expect(Object.keys(HLGX_CATS).length).toBe(8);
    });

    it("全部物质都有性质简介", () => {
        const missing = HLGX_SUBSTANCES.filter(s => !HLGX_DESC[s.n]);
        expect(missing.map(s => s.n)).toEqual([]);
    });

    it("性质简介均≤10字(去除 ,，· 后)", () => {
        const long = HLGX_SUBSTANCES.filter(s =>
            (HLGX_DESC[s.n] || "").replace(/[,，·]/g, "").length > 10);
        expect(long.map(s => s.n + "(" + HLGX_DESC[s.n] + ")")).toEqual([]);
    });

    it("简介键与物质一一对应", () => {
        const names = new Set(HLGX_SUBSTANCES.map(s => s.n));
        const keys = Object.keys(HLGX_DESC);
        expect(keys.filter(k => !names.has(k))).toEqual([]);
        expect(names.size).toBe(HLGX_SUBSTANCES.length);   // 中文名唯一
    });

    it("简介不暴露物质类别(悬停可见, 防作弊)", () => {
        const hint = /(酸|碱|盐|氧化物|金属|非金属|有机物|单质|化合物|氢氧化物|混合物)/;
        const leak = HLGX_SUBSTANCES.filter(s => hint.test(HLGX_DESC[s.n] || ""));
        expect(leak.map(s => s.n + "(" + HLGX_DESC[s.n] + ")")).toEqual([]);
    });

    it("多类别附加字段(multi)引用合法, 且仅有机酸跨类", () => {
        const cats = new Set(Object.keys(HLGX_CATS));
        const multiSubs = HLGX_SUBSTANCES.filter(s => s.multi);
        expect(multiSubs.length).toBeGreaterThanOrEqual(5);
        for (const s of multiSubs) {
            expect(s.multi!.length).toBe(1);
            expect(cats.has(s.multi![0])).toBe(true);
            expect(s.multi![0]).not.toBe(s.c);
            // 有机酸必须同时覆盖 acid 与 organic 两类
            const set = new Set([s.c, ...s.multi!]);
            expect(set.has("acid") && set.has("organic"), s.n).toBe(true);
        }
    });
});

/* ==================== 2. 布局与分布 ==================== */
describe("布局与分布", () => {
    it("共7层, 消除槽容量10, 总槽位140 (标准难度)", () => {
        const g = new HuaGame("normal");
        expect(g.layers).toEqual(NORMAL_LAYERS);
        expect(g.trayMax).toBe(10);
        expect(buildSlots(NORMAL_LAYERS).length).toBe(140);
        expect(g.tiles.length).toBe(140);
    });

    it("简单55槽(5层) / 挑战204槽(8层, 槽8)", () => {
        expect(buildSlots([1, 2, 3, 4, 5]).length).toBe(55);
        const g = new HuaGame("challenge");
        expect(g.tiles.length).toBe(204);
        expect(g.trayMax).toBe(8);
    });

    it("方块总数与槽数一致, 8个类别每类至少3块", () => {
        const g = new HuaGame();
        const cnt: Record<string, number> = {};
        g.tiles.forEach(t => { cnt[t.sub.c] = (cnt[t.sub.c] || 0) + 1; });
        expect(Object.keys(cnt).length).toBe(8);
        for (const v of Object.values(cnt)) expect(v).toBeGreaterThanOrEqual(3);
    });

    it("各类卡牌数 ≡0 或 ≡2 (mod 3), 永不≡1(避免剩1张卡死)", () => {
        for (const layers of [NORMAL_LAYERS, [1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6, 7, 8]]) {
            const st = buildStack(buildSlots(layers).length);
            const cnt: Record<string, number> = {};
            st.forEach(s => { cnt[s.c] = (cnt[s.c] || 0) + 1; });
            for (const v of Object.values(cnt)) {
                expect(v % 3, `类别 ${JSON.stringify(cnt)} mod3=${v % 3}`).not.toBe(1);
            }
        }
    });

    it("单物质出现概率近似相等(各类 卡牌数/该类物质数 差 ≤0.25)", () => {
        const st = buildStack(buildSlots(NORMAL_LAYERS).length);
        const cnt: Record<string, number> = {};
        st.forEach(s => { cnt[s.c] = (cnt[s.c] || 0) + 1; });
        const byCatCount: Record<string, number> = {};
        HLGX_SUBSTANCES.forEach(s => { byCatCount[s.c] = (byCatCount[s.c] || 0) + 1; });
        const probs = Object.keys(cnt).map(c => cnt[c] / byCatCount[c]);
        expect(Math.max(...probs) - Math.min(...probs)).toBeLessThanOrEqual(0.25);
    });
});

/* ==================== 3. 初始遮挡 ==================== */
describe("初始遮挡", () => {
    it("顶层1块开局可见", () => {
        const g = new HuaGame();
        const top = g.tiles.find(t => t.L === 0);
        expect(top).toBeTruthy();
        expect(g.isBlocked(top!)).toBe(false);
    });

    it("存在被上层遮挡的方块", () => {
        const g = new HuaGame();
        expect(g.tiles.some(t => !t.removed && g.isBlocked(t))).toBe(true);
    });

    it("开局有可点击方块", () => {
        const g = new HuaGame();
        expect(g.tiles.some(t => !t.removed && !g.isBlocked(t))).toBe(true);
    });

    it("同层相邻卡牌颜色不同(含叠层)", () => {
        const g = new HuaGame();
        for (const t of g.tiles) {
            for (const o of g.tiles) {
                if (t === o || t.removed || o.removed) continue;
                if (o.L === t.L && Math.abs(o.r - t.r) + Math.abs(o.c - t.c) === 1) {
                    expect(o.color, `${t.sub.n}(${t.r},${t.c},${t.L}) 与 ${o.sub.n}`).not.toBe(t.color);
                }
            }
        }
    });

    it("slotColorIdx 相邻格/相邻层必然不同色", () => {
        for (let L = 0; L < 8; L++) {
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const base = slotColorIdx(r, c, L);
                    if (r + 1 < 8) expect(slotColorIdx(r + 1, c, L)).not.toBe(base);
                    if (c + 1 < 8) expect(slotColorIdx(r, c + 1, L)).not.toBe(base);
                    expect(slotColorIdx(r, c, L + 1)).not.toBe(base);
                }
            }
        }
    });
});

/* ==================== 4. 过关判定(迁移 checkwin_logic_test 全部场景) ==================== */
const mk = (c: Category, removed = false) =>
    ({ removed, sub: { c } }) as unknown as Tile;

describe("过关判定(checkWin)", () => {
    it("场景1 全部拾取+无三消 → 通关, 通关后手牌清空", () => {
        const g = new HuaGame();
        g.tiles = [mk("oxide", true), mk("metal", true), mk("salt", true)];
        g.tray = [mk("acid"), mk("base")];     // 2 张不同类, 无三消可能
        g.gameOver = false; g.win = false; g.settled = false;
        g.checkWin();
        expect(g.win).toBe(true);
        expect(g.canEliminate()).toBe(false);
        expect(g.tray.length).toBe(0);
        expect(g.result?.win).toBe(true);
    });

    it("场景2 全部拾取+有三消可能 → 不通关, 手牌保留", () => {
        const g = new HuaGame();
        g.tiles = [mk("oxide", true), mk("metal", true), mk("salt", true)];
        g.tray = [mk("nonmetal"), mk("nonmetal"), mk("nonmetal"), mk("acid")];   // 3 张同类
        g.gameOver = false; g.win = false; g.settled = false;
        g.checkWin();
        expect(g.win).toBe(false);
        expect(g.canEliminate()).toBe(true);
        expect(g.tray.length).toBe(4);
    });

    it("场景3 棋盘未清空 → 不通关", () => {
        const g = new HuaGame();
        g.tiles = [mk("oxide", true), mk("metal", true), mk("salt", false)];
        g.tray = [mk("acid"), mk("base")];
        g.gameOver = false; g.win = false; g.settled = false;
        g.checkWin();
        expect(g.win).toBe(false);
        expect(g.tiles.filter(t => t.removed).length).toBe(2);
    });

    it("场景4 完成最后一次消除后 → 通关(最后一步消除也计入)", () => {
        const g = new HuaGame();
        g.tiles = [mk("oxide", true), mk("metal", true), mk("salt", true)];
        g.tray = [mk("nonmetal"), mk("nonmetal"), mk("nonmetal"), mk("acid")];
        g.gameOver = false; g.win = false; g.settled = false;
        g.checkWin();
        expect(g.win).toBe(false);               // 消除前不通关
        g.tray = g.tray.filter((_, i) => !(i < 3));   // 完成三消, 剩 1 张 acid
        g.selected = [];
        g.checkWin();
        expect(g.win).toBe(true);
        expect(g.canEliminate()).toBe(false);
    });

    it("场景5 全部拾取+仅剩2张同类(无三消) → 通关", () => {
        const g = new HuaGame();
        g.tiles = [mk("oxide", true), mk("metal", true), mk("salt", true)];
        g.tray = [mk("nonmetal"), mk("nonmetal")];
        g.gameOver = false; g.win = false; g.settled = false;
        g.checkWin();
        expect(g.win).toBe(true);
    });
});

/* ==================== 4.5 多类别消除(有机酸双身份) ==================== */
/* 构造带 multi 的 Tile: 醋酸式 {c:"acid",multi:["organic"]} / 苯甲酸式 {c:"organic",multi:["acid"]} */
const mkSub2 = (cat: Category, multi: Category[] = [], removed = false): Tile =>
    ({ id: 0, r: 0, c: 0, L: 0, x: 0, y: 0, color: 0, removed, blocked: false,
       sub: { f: "", n: "", c: cat, ...(multi.length ? { multi } : {}) } }) as Tile;

describe("多类别消除(有机酸)", () => {
    it("醋酸+盐酸+硝酸 → 共享 acid, 按酸消除", () => {
        const g = new HuaGame();
        g.tray = [mkSub2("acid", ["organic"], true), mkSub2("acid", undefined, true), mkSub2("acid", undefined, true)];
        g.selected = [...g.tray];
        expect(g.clearSelected()).toBe("cleared");
        expect(g.tray.length).toBe(0);
    });

    it("醋酸+甲烷+乙醇 → 共享 organic, 按有机物消除", () => {
        const g = new HuaGame();
        g.tray = [mkSub2("acid", ["organic"], true), mkSub2("organic", undefined, true), mkSub2("organic", undefined, true)];
        g.selected = [...g.tray];
        expect(g.clearSelected()).toBe("cleared");
        expect(g.tray.length).toBe(0);
    });

    it("醋酸+甲烷+盐酸 → 无共同类别 → wrongSet 扣血不消除", () => {
        const g = new HuaGame();
        // 交集: {acid,organic} ∩ {organic} ∩ {acid} = ∅
        g.tray = [mkSub2("acid", ["organic"], true), mkSub2("organic", undefined, true), mkSub2("acid", undefined, true)];
        g.selected = [...g.tray];
        const hpBefore = g.hp;
        expect(g.clearSelected()).toBe("wrongSet");
        expect(g.hp).toBe(hpBefore - 1);
        expect(g.tray.length).toBe(3);
    });

    it("苯甲酸(c=organic,multi=acid): 与无机酸按酸消除, 与甲烷等按有机物消除", () => {
        const g1 = new HuaGame();
        g1.tray = [mkSub2("organic", ["acid"], true), mkSub2("acid", undefined, true), mkSub2("acid", undefined, true)];
        g1.selected = [...g1.tray];
        expect(g1.clearSelected()).toBe("cleared");
        expect(g1.tray.length).toBe(0);

        const g2 = new HuaGame();
        g2.tray = [mkSub2("organic", ["acid"], true), mkSub2("organic", undefined, true), mkSub2("organic", undefined, true)];
        g2.selected = [...g2.tray];
        expect(g2.clearSelected()).toBe("cleared");
        expect(g2.tray.length).toBe(0);
    });

    it("甘氨酸(c=organic,multi=acid)+盐酸+硫酸 → 按酸消除", () => {
        const g = new HuaGame();
        g.tray = [mkSub2("organic", ["acid"], true), mkSub2("acid", undefined, true), mkSub2("acid", undefined, true)];
        g.selected = [...g.tray];
        expect(g.clearSelected()).toBe("cleared");
        expect(g.tray.length).toBe(0);
    });

    it("canEliminate 双类别计数: 醋酸+盐酸+甲烷 不成三消, 再入盐酸成酸三消", () => {
        const g = new HuaGame();
        g.tray = [mkSub2("acid", ["organic"]), mkSub2("acid"), mkSub2("organic")];
        expect(g.canEliminate()).toBe(false);          // acid=2, organic=2
        g.tray.push(mkSub2("acid"));
        expect(g.canEliminate()).toBe(true);           // acid=3
        g.tray = [mkSub2("acid", ["organic"]), mkSub2("organic"), mkSub2("organic")];
        expect(g.canEliminate()).toBe(true);           // organic=3
    });

    it("真实数据: 醋酸/甲酸/草酸/苯甲酸/甘氨酸 均跨 acid+organic", () => {
        const pick = (n: string) => HLGX_SUBSTANCES.find(s => s.n === n)!;
        for (const n of ["醋酸", "甲酸", "草酸", "苯甲酸", "甘氨酸"]) {
            const s = pick(n);
            const set = new Set([s.c, ...(s.multi || [])]);
            expect(set.has("acid"), n).toBe(true);
            expect(set.has("organic"), n).toBe(true);
        }
    });
});

/* ==================== 5. 基础行为单元 ==================== */
describe("基础行为", () => {
    it("canEliminate: 3张同类→true, 2张同类/3张异类→false", () => {
        const g = new HuaGame();
        g.tray = [mk("oxide"), mk("oxide"), mk("oxide")];
        expect(g.canEliminate()).toBe(true);
        g.tray = [mk("oxide"), mk("oxide")];
        expect(g.canEliminate()).toBe(false);
        g.tray = [mk("oxide"), mk("metal"), mk("acid")];
        expect(g.canEliminate()).toBe(false);
        g.tray = [];
        expect(g.canEliminate()).toBe(false);
    });

    it("清除选中: 3张异类扣1血不消除, 3张同类消除", () => {
        const g = new HuaGame();
        // 构造: 3 张不同类入槽
        const mkSub = (cat: Category, removed: boolean): Tile =>
            ({ id: 0, r: 0, c: 0, L: 0, x: 0, y: 0, color: 0, removed, blocked: false, sub: { f: "", n: "", c: cat } }) as Tile;
        g.tray = [mkSub("metal", true), mkSub("acid", true), mkSub("base", true)];
        g.selected = [...g.tray];
        const hpBefore = g.hp;
        expect(g.clearSelected()).toBe("wrongSet");
        expect(g.hp).toBe(hpBefore - 1);
        expect(g.tray.length).toBe(3);           // 未消除

        // 3 张同类
        g.selected = [];
        g.tray = [mkSub("oxide", true), mkSub("oxide", true), mkSub("oxide", true)];
        g.selected = [...g.tray];
        expect(g.clearSelected()).toBe("cleared");
        expect(g.tray.length).toBe(0);
    });

    it("洗牌打乱物质身份但不改变卡牌数量与位置", () => {
        const g = new HuaGame();
        const before = g.tiles.map(t => t.sub);
        expect(g.shuffleTiles()).toBe("done");
        const after = g.tiles.map(t => t.sub);
        expect(g.tiles.length).toBe(140);
        expect(after.length).toBe(before.length);
        // 洗牌只换物质身份, 同一批物质(按名字统计)原样保留
        const names = (arr: typeof before) => arr.map(s => s.n).sort().join(",");
        expect(names(after)).toBe(names(before));
        // 大概率已打乱(140 张全序不变的概率可忽略)
        expect(after.map(s => s.n).join()).not.toBe(before.map(s => s.n).join());
    });

    it("道具每局限3次", () => {
        const g = new HuaGame();
        for (let i = 0; i < 3; i++) {
            expect(g.undo()).toBe("empty");      // 槽空 → 不消耗
        }
        // 正常消耗路径: 拿1块入槽后撤回
        const t = g.tiles.find(x => !g.isBlocked(x))!;
        g.pickTile(t);
        expect(g.undo()).toBe("done");
        expect(g.toolUsed.undo).toBe(1);
    });

    it("fmtTime 格式化", () => {
        expect(fmtTime(0)).toBe("00:00");
        expect(fmtTime(65)).toBe("01:05");
        expect(fmtTime(600)).toBe("10:00");
    });
});

/* ==================== 6. 三种策略模拟, 通关率达标 ==================== */
function runSim(g: HuaGame, strategy: "greedy" | "balanced" | "cautious") {
    g.newGame();
    let moves = 0;
    while (!g.gameOver && !g.win && moves < 3000) {
        const cc: Record<string, number> = {};
        g.tray.forEach(x => { for (const cat of catsOf(x.sub)) cc[cat] = (cc[cat] || 0) + 1; });
        let target: string | null = null;
        for (const cat in cc) { if (cc[cat] >= 3) { target = cat; break; } }
        if (target) { g.selected = g.tray.filter(x => catsOf(x.sub).includes(target as Category)).slice(0, 3); g.clearSelected(); continue; }
        if (g.tray.length >= g.trayMax) {
            if (g.toolUsed.out < TOOL_LIMIT) { g.moveOut(); continue; }
            if (g.toolUsed.undo < TOOL_LIMIT) { g.undo(); continue; }
            break;
        }
        // 预判救场: 槽位进入危险区且无可立即凑三消的落子 → 提前用道具腾位置
        const dangerLine = strategy === "greedy" ? g.trayMax - 1 : (strategy === "balanced" ? g.trayMax - 2 : g.trayMax - 3);
        if (g.tray.length >= dangerLine) {
            const canFinish = g.tiles.some(t => !t.removed && !g.isBlocked(t) && catsOf(t.sub).some(cat => (cc[cat] || 0) === 2));
            if (!canFinish) {
                if (g.toolUsed.out < TOOL_LIMIT) { g.moveOut(); continue; }
                if (g.toolUsed.undo < TOOL_LIMIT) { g.undo(); continue; }
            }
        }
        const clickable = g.tiles.filter(t => !t.removed && !g.isBlocked(t));
        if (!clickable.length) break;
        const counts: Record<string, number> = {};
        g.tray.forEach(x => { for (const cat of catsOf(x.sub)) counts[cat] = (counts[cat] || 0) + 1; });
        let picked = clickable.find(t => catsOf(t.sub).some(cat => (counts[cat] || 0) === 2));
        if (!picked) picked = clickable.find(t => catsOf(t.sub).some(cat => (counts[cat] || 0) === 1));
        if (!picked) picked = clickable.find(t => catsOf(t.sub).some(cat => (counts[cat] || 0) > 0));
        if (!picked) {
            // 全部可点击的都是槽内未有的新类别: 依策略决定何时才引入
            const limit = strategy === "greedy" ? g.trayMax : (strategy === "balanced" ? 7 : 5);
            if (g.tray.length < limit) {
                picked = clickable[Math.floor(Math.random() * clickable.length)];
            } else {
                if (g.toolUsed.shuffle < TOOL_LIMIT) { g.shuffleTiles(); continue; }
                if (g.toolUsed.out < TOOL_LIMIT) { g.moveOut(); continue; }
                if (g.toolUsed.undo < TOOL_LIMIT) { g.undo(); continue; }
                picked = clickable[Math.floor(Math.random() * clickable.length)];
            }
        }
        g.pickTile(picked!);
        moves++;
    }
    return { moves, win: g.win, gameOver: g.gameOver, tools: { ...g.toolUsed } };
}

describe("通关率模拟(标准难度)", () => {
    it("贪心策略 20 局通关率 ≥ 80%", () => {
        const g = new HuaGame("normal");
        let wins = 0;
        for (let i = 0; i < 20; i++) if (runSim(g, "greedy").win) wins++;
        expect(wins).toBeGreaterThanOrEqual(16);
    });

    it("平衡策略 20 局通关率 ≥ 80%", () => {
        const g = new HuaGame("normal");
        let wins = 0;
        for (let i = 0; i < 20; i++) if (runSim(g, "balanced").win) wins++;
        expect(wins).toBeGreaterThanOrEqual(16);
    });

    it("谨慎策略 20 局通关率 ≥ 70%", () => {
        const g = new HuaGame("normal");
        let wins = 0;
        for (let i = 0; i < 20; i++) if (runSim(g, "cautious").win) wins++;
        expect(wins).toBeGreaterThanOrEqual(14);
    });
});
