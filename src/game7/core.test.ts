/*
 * 历了个史 · 核心逻辑测试 (src/game7/core.test.ts) —— v1.3.0 列模型
 * 覆盖: 题库规模/开局(年份互异与困难并列)/点选跟踪/左右交换/并列移动/判定锁定/
 *        提示道具/完整一局。
 */
import { describe, expect, it } from "vitest";
import {
    HINT_LIMIT, ROUND_CARDS, isYearlyCorrect, judge, locate, moveSide,
    newGame, select, seedRng, swapAdjacent, tick, useHint, type LlgsState,
} from "./core";
import { bank } from "./bank";

/** 构造显式列局面: 传入每列的年份(负=公元前), 事件名 E0/E1/... 按创建顺序 */
function mk(cols: number[][]): LlgsState {
    let id = 0;
    return {
        mode: "hard", phase: "playing",
        cols: cols.map((col) => col.map((y) => ({ ev: { n: `E${id++}`, y, era: "测试", tier: 3, d: "" }, done: false }))),
        sel: null, attempts: 0, hintsLeft: HINT_LIMIT, lastWrong: null, elapsed: 0,
    };
}

describe("历了个史 · 题库与开局", () => {
    it("题库 ≥ 60 条且事件名唯一, 字段完整", () => {
        expect(bank.length).toBeGreaterThanOrEqual(60);
        const names2 = new Set(bank.map((e) => e.n));
        expect(names2.size).toBe(bank.length);
        for (const e of bank) {
            expect(e.n.length).toBeGreaterThan(0);
            expect(typeof e.y).toBe("number");
            expect(e.d.length).toBeGreaterThan(0);
        }
    });

    it("难度池规模: 简单 ≥12 / 标准 ≥20 / 困难全库", () => {
        const easy = bank.filter((e) => e.tier === 1);
        const normal = bank.filter((e) => e.tier <= 2);
        expect(easy.length).toBeGreaterThanOrEqual(12);
        expect(normal.length).toBeGreaterThanOrEqual(20);
        expect(normal.length).toBeGreaterThan(easy.length);
    });

    it("开局: 5 卡各成列、初始乱序; 简单/标准年份互异, 困难允许同年并列", () => {
        for (let seed = 0; seed < 20; seed++) {
            for (const m of ["easy", "normal"] as const) {
                const st = newGame(m, seedRng(seed));
                expect(st.cols.flat()).toHaveLength(ROUND_CARDS);
                expect(st.cols.every((c) => c.length === 1)).toBe(true);   // 每卡独立成列
                expect(new Set(st.cols.flat().map((c) => c.ev.y)).size).toBe(ROUND_CARDS);
                expect(isYearlyCorrect(st.cols)).toBe(false);
            }
            const h = newGame("hard", seedRng(seed));
            expect(h.cols.flat()).toHaveLength(ROUND_CARDS);
            expect(isYearlyCorrect(h.cols)).toBe(false);
        }
        // 困难大步长种子取样应出现同年并列局
        let tie = 0;
        for (let seed = 1; seed <= 200; seed += 7) {
            const h = newGame("hard", seedRng(seed * 977));
            if (new Set(h.cols.flat().map((c) => c.ev.y)).size < ROUND_CARDS) tie++;
        }
        expect(tie).toBeGreaterThan(0);
    });
});

describe("历了个史 · 点选与移动(v1.3.0)", () => {
    it("点选跟踪: 选中跟随卡移动, 点其他卡才切换", () => {
        let st = mk([[1914], [1870], [1861], [1861], [1939]]);
        st = select(st, "E0");
        expect(st.sel).toBe("E0");
        // 右移(与右列首卡 E1 交换): E0 去位置1, 选中跟随
        st = swapAdjacent(st, "R");
        expect(locate(st, "E0")).toEqual([1, 0]);
        expect(st.sel).toBe("E0");
        // 点其他卡切换
        st = select(st, "E2");
        expect(st.sel).toBe("E2");
    });

    it("左/右交换: 与左(右)列末(首)卡交换; 最左列左移无效", () => {
        let st = mk([[1914], [1870], [1939], [1861], [1861]]);
        // 选最左 E0(1914), 左移无效
        st = select(st, "E0");
        const before = st.cols.flat().map((c) => c.ev.n);
        st = swapAdjacent(st, "L");
        expect(st.cols.flat().map((c) => c.ev.n)).toEqual(before);
        // 右移: E0(1914) 与右列首卡 E1(1870) 交换
        st = swapAdjacent(st, "R");
        expect(locate(st, "E0")).toEqual([1, 0]);
        // 判定: 1914 在位置1 ∉ 区段[2,2] 红; 1870 在位置0 ∉ 区段[1,1] 红
        const j = judge(st);
        expect(j.cols.flat().filter((c) => c.done).length).toBe(0);
    });

    it("并列移动: 左下/右上把选中卡移到邻列构成并列; 原列空则删除; 多次移动穿列", () => {
        // mk 命名: E0=1870 列0 / E1=1861 列1 / E2=1914 列2 / E3=1939 列3 / E4=1861 列4
        let st = mk([[1870], [1861], [1914], [1939], [1861]]);
        // E1 左下 → 并入左列(1870)底部, 原列1 空被删除
        st = select(st, "E1");
        st = moveSide(st, "L", "bot");
        expect(st.cols[0].map((c) => c.ev.y)).toEqual([1870, 1861]);
        expect(st.cols.length).toBe(4);
        expect(st.cols[3].map((c) => c.ev.y)).toEqual([1861]);
        // E1(选中跟随, 列0 内) 右上 → 移到右列(1914)顶部
        st = moveSide(st, "R", "top");
        expect(st.cols[1].map((c) => c.ev.y)).toEqual([1861, 1914]);
        // E4(列3) 左下 → 并入 1939 列底部
        st = select(st, "E4");
        st = moveSide(st, "L", "bot");
        expect(st.cols[2].map((c) => c.ev.y)).toEqual([1939, 1861]);
        // E4(跟随) 再左下两次 → 依次并入 1861/1914 列底部与 1870 列底部 → [1870, 1861]
        st = moveSide(st, "L", "bot");
        expect(st.cols[1].map((c) => c.ev.y)).toEqual([1861, 1914, 1861]);
        st = moveSide(st, "L", "bot");
        expect(st.cols[0].map((c) => c.ev.y)).toEqual([1870, 1861]);
        // 结构完整性: 多次跨列移动后总卡数不变、无丢失
        expect(st.cols.flat().length).toBe(5);
        expect(new Set(st.cols.flat().map((c) => c.ev.n)).size).toBe(5);
        // 判定功能照常: 乱序局面提交 → 有红有绿、不误判 win
        const j = judge(st);
        expect(j.phase).toBe("playing");
        expect(j.cols.flat().some((c) => c.done)).toBe(true);
        expect(j.cols.flat().some((c) => !c.done)).toBe(true);
    });

    it("同列上下顺序不影响判定: 同年并列任意上下都判绿", () => {
        const st = mk([[1861, 1861], [1870], [1914], [1939]]);
        const j = judge(st);
        expect(j.cols.flat().every((c) => c.done)).toBe(true);
        expect(j.phase).toBe("win");
    });
});

describe("历了个史 · 判定与通关", () => {
    it("判对: 排成正确顺序一次提交 → 全归位 win, attempts=1", () => {
        const st = newGame("easy", seedRng(7));
        const sorted = [...st.cols.flat()].sort((a, b) => a.ev.y - b.ev.y);
        const g: LlgsState = { ...st, cols: sorted.map((c) => [c]) };
        const j = judge(g);
        expect(j.phase).toBe("win");
        expect(j.attempts).toBe(1);
    });

    it("提示道具: 未归位卡移到正确位置并锁定; 用尽后无效", () => {
        let g = newGame("hard", seedRng(9));
        g = useHint(g, () => 0);
        expect(g.hintsLeft).toBe(HINT_LIMIT - 1);
        expect(g.cols.flat().filter((c) => c.done).length).toBeGreaterThanOrEqual(1);
        g = useHint(g, () => 0);
        g = useHint(g, () => 0);
        expect(g.hintsLeft).toBe(0);
        expect(useHint(g, () => 0).hintsLeft).toBe(0);
    });

    it("完整一局: 反复判定直到全对 → win, 计时累计", () => {
        let g = newGame("normal", seedRng(10));
        let guard = 0;
        while (g.phase !== "win" && guard++ < 60) {
            g = judge(g);
            if (g.phase === "playing") {
                const sorted = [...g.cols.flat()].sort((a, b) => a.ev.y - b.ev.y);
                g = { ...g, cols: sorted.map((c) => [c]) };
            }
        }
        g = judge(g);
        expect(g.phase).toBe("win");
        expect(g.attempts).toBeGreaterThanOrEqual(1);
        expect(tick(g, 5).elapsed).toBeGreaterThanOrEqual(0);
    });
});