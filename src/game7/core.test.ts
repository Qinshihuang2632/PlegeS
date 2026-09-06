/*
 * 历了个史 · 核心逻辑测试 (src/game7/core.test.ts)
 * 覆盖: 题库规模与年份唯一 / 抽题年份互异 / 初始乱序 / 判定锁定与全对通关 /
 *        已归位卡不可动 / 提示道具(插入正确位+锁定) / 计时。
 */
import { describe, expect, it } from "vitest";
import { HINT_LIMIT, ROUND_CARDS, isYearlyCorrect, judge, newGame, seedRng, swap, tick, useHint, type LlgsState } from "./core";
import { bank } from "./bank";

function solve(st: LlgsState): LlgsState {
    // 直接按年份排序(同年组内任意顺序均可, 稳定排序即合法解)
    return { ...st, cards: [...st.cards].sort((a, b) => a.ev.y - b.ev.y) };
}

describe("历了个史 · 题库与开局", () => {
    it("题库 ≥ 60 条且事件名唯一, 字段完整", () => {
        expect(bank.length).toBeGreaterThanOrEqual(60);
        const names = new Set(bank.map((e) => e.n));
        expect(names.size).toBe(bank.length);
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

    it("开局: 抽满 5 张、初始乱序(非全对); 简单/标准年份互异, 困难允许同年并列(v1.2.0)", () => {
        for (let seed = 0; seed < 20; seed++) {
            for (const m of ["easy", "normal"] as const) {
                const st = newGame(m, seedRng(seed));
                expect(st.cards).toHaveLength(ROUND_CARDS);
                expect(new Set(st.cards.map((c) => c.ev.y)).size).toBe(ROUND_CARDS);   // 去重
                expect(isYearlyCorrect(st.cards)).toBe(false);                         // 初始乱序
            }
            const h = newGame("hard", seedRng(seed));
            expect(h.cards).toHaveLength(ROUND_CARDS);
            expect(isYearlyCorrect(h.cards)).toBe(false);
        }
        // 困难抽卡不强制去重: 大步长种子取样, 应出现同年并列局(池内含 17 个同年组)
        let tie = 0;
        for (let seed = 1; seed <= 200; seed += 7) {
            const h = newGame("hard", seedRng(seed * 977));
            if (new Set(h.cards.map((c) => c.ev.y)).size < ROUND_CARDS) tie++;
        }
        expect(tie).toBeGreaterThan(0);
    });
});

describe("历了个史 · 判定与通关", () => {
    it("判对: 排成正确顺序一次提交 → 全归位 win, attempts=1", () => {
        const st = solve(newGame("easy", seedRng(7)));
        const g = judge(st);
        expect(g.done.every(Boolean)).toBe(true);
        expect(g.phase).toBe("win");
        expect(g.attempts).toBe(1);
    });

    it("判错: 错位卡不锁定、lastWrong 标注; 已归位卡变绿", () => {
        let g = newGame("easy", seedRng(8));
        // 先排好前两位(通过 swap 实现), 其余不动
        const target = [...g.cards].sort((a, b) => a.ev.y - b.ev.y);
        for (let i = 0; i < 2; i++) {
            const cur = g.cards.findIndex((c) => c.ev.n === target[i].ev.n);
            if (cur !== i) g = swap(g, i, cur);
        }
        const j = judge(g);
        expect(j.done[0]).toBe(true);
        expect(j.done[1]).toBe(true);
        expect(j.lastWrong!.length).toBeGreaterThanOrEqual(1);
        expect(j.phase).toBe("playing");
        // 已归位卡不可再交换
        const s2 = swap(j, 0, 2);
        expect(s2.cards[0].ev.n).toBe(j.cards[0].ev.n);
    });

    it("提示道具: 未归位卡插回正确位并锁定, 用尽后无效", () => {
        let g = newGame("hard", seedRng(9));
        g = useHint(g, () => 0);
        expect(g.hintsLeft).toBe(HINT_LIMIT - 1);
        const locked = g.done.filter(Boolean).length;
        expect(locked).toBe(1);
        // 已锁定卡确实在正确位置
        const target = [...g.cards].sort((a, b) => a.ev.y - b.ev.y);
        const li = g.done.findIndex((d) => d);
        expect(g.cards[li].ev.n).toBe(target[li].ev.n);
        // 用尽
        g = useHint(g, () => 0);
        g = useHint(g, () => 0);
        expect(g.hintsLeft).toBe(0);
        const g2 = useHint(g, () => 0);
        expect(g2.hintsLeft).toBe(0);
    });

    it("完整一局: 反复判定直到全对 → win, 计时累计, 失误=提交次数", () => {
        let g = newGame("normal", seedRng(10));
        let guard = 0;
        while (g.phase !== "win" && guard++ < 50) {
            const before = g.attempts;
            g = judge(g);                // 未排好 → playing
            if (g.phase === "playing") {
                const wrongIdx = g.lastWrong?.[0] ?? 0;
                // 模拟玩家调整: 把错位卡与正确位置换
                const target = [...g.cards].sort((a, b) => a.ev.y - b.ev.y);
                const cur = g.cards.findIndex((c) => c.ev.n === target[wrongIdx].ev.n);
                g = swap(g, wrongIdx, cur);
                if (g.attempts === before) g = tick(g, 10);   // 计时推进
            } else break;
        }
        g = judge(g);
        expect(g.phase).toBe("win");
        expect(g.elapsed).toBeGreaterThanOrEqual(0);
        expect(g.attempts).toBeGreaterThanOrEqual(1);
    });
});
describe("历了个史 · v1.2.0 困难并列机制", () => {
    // 构造含同年的显式局面
    const mk = (ys: number[]): LlgsState => ({
        mode: "hard", phase: "playing",
        cards: ys.map((y, i) => ({ ev: { n: `E${i}`, y, era: "测试", tier: 3, d: "" } })),
        done: ys.map(() => false), attempts: 0, hintsLeft: HINT_LIMIT, lastWrong: null, elapsed: 0,
    });

    it("同年并列: 两件同年事件同在区段内(任意上下) → 全部归位通关(win)", () => {
        // 排列 [1861, 1870, 1861, 1914, 1939]: 1861 区段 [0,1], 1870 区段 [2,2]
        const st = mk([1861, 1870, 1861, 1914, 1939]);
        const g = judge(st);
        expect(g.done[0]).toBe(true);    // 1861 在 0 ∈ [0,1] ✓
        expect(g.done[1]).toBe(false);   // 1870 在 1 ∉ [2,2] → 红
        expect(g.done[2]).toBe(false);   // 1861 在 2 ∉ [0,1] → 红
        expect(g.done[3]).toBe(true);
        expect(g.done[4]).toBe(true);
        expect(g.phase).toBe("playing");
        // 调整为 [1861, 1861, 1870, 1914, 1939]: 同年任意上下 → 全绿通关
        const g2 = judge({ ...st, cards: [st.cards[2], st.cards[0], st.cards[1], st.cards[3], st.cards[4]] });
        expect(g2.done.every(Boolean)).toBe(true);
        expect(g2.phase).toBe("win");
    });

    it("同年错位判红: 1861 卡离开区段 → 标红且不锁定", () => {
        // 排列 [1861, 1870, 1914, 1861, 1939]
        const st = mk([1861, 1870, 1914, 1861, 1939]);
        const g = judge(st);
        expect(g.done[0]).toBe(true);    // 1861 在 0 ∈ [0,1] ✓
        expect(g.done[1]).toBe(false);   // 1870 在 1 ∉ [2,2] 红
        expect(g.done[2]).toBe(false);   // 1914 在 2 ∉ [3,3] 红
        expect(g.done[3]).toBe(false);   // 1861 在 3 ∉ [0,1] 红
        expect(g.done[4]).toBe(true);
        expect(g.lastWrong!.sort()).toEqual([1, 2, 3]);
        expect(g.phase).toBe("playing");
        // 已绿卡不可交换
        const s2 = swap(g, 0, 3);
        expect(s2.cards[0].ev.n).toBe(g.cards[0].ev.n);
    });


    it("提示插入同年区段空位并锁定", () => {
        let st = mk([1861, 1861, 1870, 1914, 1939]);
        // 手动打乱: 把一张 1861 挪到 1914 后
        st = { ...st, cards: [st.cards[2], st.cards[0], st.cards[1], st.cards[3], st.cards[4]] };
        st = useHint(st, () => 0);
        expect(st.hintsLeft).toBe(HINT_LIMIT - 1);
        const locked = st.done.findIndex((d) => d);
        expect(locked).toBeGreaterThanOrEqual(0);
        // 锁定卡必须在自己的年份区段内(1861→[0,1] 或 1870→[2,2] …)
        const y = st.cards[locked].ev.y;
        const [lo, hi] = [st.cards.map((c) => c.ev.y).sort((a, b) => a - b).indexOf(y),
                          st.cards.map((c) => c.ev.y).sort((a, b) => a - b).lastIndexOf(y)];
        expect(locked >= lo && locked <= hi).toBe(true);
    });
});
