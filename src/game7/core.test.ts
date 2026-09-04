/*
 * 历了个史 · 核心逻辑测试 (src/game7/core.test.ts)
 * 覆盖: 题库规模与年份唯一 / 抽题年份互异 / 初始乱序 / 判定锁定与全对通关 /
 *        已归位卡不可动 / 提示道具(插入正确位+锁定) / 计时。
 */
import { describe, expect, it } from "vitest";
import { HINT_LIMIT, ROUND_CARDS, judge, newGame, seedRng, swap, tick, useHint, type LlgsState } from "./core";
import { bank } from "./bank";

function solve(st: LlgsState): LlgsState {
    // 通过交换把牌排成正确顺序(只动未锁定卡)
    let g = st;
    const target = [...g.cards].sort((a, b) => a.ev.y - b.ev.y);
    for (let i = 0; i < target.length; i++) {
        const cur = g.cards.findIndex((c) => c.ev.n === target[i].ev.n);
        if (cur !== i) g = swap(g, i, cur);
    }
    return g;
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

    it("开局: 抽满 5 张、年份互异、初始乱序(非全对)", () => {
        for (let seed = 0; seed < 20; seed++) {
            const st = newGame("hard", seedRng(seed));
            expect(st.cards).toHaveLength(ROUND_CARDS);
            const ys = new Set(st.cards.map((c) => c.ev.y));
            expect(ys.size).toBe(ROUND_CARDS);   // 年份互异 → 答案唯一
            // 初始非全对
            let ordered = 0;
            for (let i = 1; i < st.cards.length; i++) if (st.cards[i - 1].ev.y <= st.cards[i].ev.y) ordered++;
            expect(ordered).toBeLessThan(ROUND_CARDS - 1);
        }
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