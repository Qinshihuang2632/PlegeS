/*
 * 分了个类 · 核心逻辑测试 (src/game4/core.test.ts)
 * 重点锁定用户规则: 传送带满 5 张不立刻判负, 「新卡该出现」时刻才判负;
 * 20 张出完后不再出牌也不判负; 有机酸双类均可。
 */
import { describe, expect, it } from "vitest";
import {
    BELT_CAPACITY, FLGL_INTERVAL, ROUND_TOTAL, TRICKY_NAMES, TRICKY_POOL,
    acceptCats, buildDeck, judge, newGame, tick, wrongHint,
    type FlglState,
} from "./core";
import { HLGX_SUBSTANCES } from "../game/substances";

/* 可播种的伪随机源(确定性测试) */
const seedRng = (seed: number) => {
    let s = seed >>> 0 || 1;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
};

const sub = (n: string) => {
    const s = HLGX_SUBSTANCES.find((x) => x.n === n);
    if (!s) throw new Error(`题库中找不到物质「${n}」`);
    return s;
};

/** 把 belt 上的一张卡正确分类 */
const judgeRight = (st: FlglState, id: number): FlglState =>
    judge(st, id, [...acceptCats(st.belt.find((c) => c.id === id)!.sub)][0]);

describe("分了个类 · 核心", () => {
    it("newGame: playing / 空传送带 / 首张待出牌 / 满血", () => {
        const st = newGame("easy", seedRng(7));
        expect(st.phase).toBe("playing");
        expect(st.belt).toHaveLength(0);
        expect(st.spawned).toBe(0);
        expect(st.spawnIn).toBe(0);
        expect(st.hp).toBe(3);
        expect(st.deck).toHaveLength(ROUND_TOTAL);
    });

    it("首张物质在首次 tick 后出现, 间隔重置为难度值", () => {
        let st = newGame("hard", seedRng(7));
        st = tick(st, 0.1);
        expect(st.belt).toHaveLength(1);
        expect(st.spawned).toBe(1);
        expect(st.spawnIn).toBeCloseTo(FLGL_INTERVAL.hard, 5);
        expect(st.belt[0].sub).toBe(st.deck[0]);
    });

    it("传送带可容纳 5 张: 满 5 张时仍不判负(用户规则: 满载 ≠ 判负)", () => {
        let st = newGame("hard", seedRng(7));
        for (let i = 0; i < BELT_CAPACITY; i++) {
            st = tick(st, FLGL_INTERVAL.hard + 0.01);
        }
        expect(st.belt).toHaveLength(BELT_CAPACITY);
        expect(st.spawned).toBe(BELT_CAPACITY);
        expect(st.phase).toBe("playing");
    });

    it("满载后撑到「新卡该出现」时刻才判负(overflow)", () => {
        let st = newGame("hard", seedRng(7));
        for (let i = 0; i < BELT_CAPACITY; i++) {
            st = tick(st, FLGL_INTERVAL.hard + 0.01);
        }
        // 距下一张还差 0.01s: 仍存活
        st = tick(st, FLGL_INTERVAL.hard - 0.02);
        expect(st.phase).toBe("playing");
        // 到点: 新卡该出现但满载 → 判负
        st = tick(st, 0.05);
        expect(st.phase).toBe("lose");
        expect(st.loseReason).toBe("overflow");
    });

    it("正确分类: 卡牌移除 + 得分; 错误分类: 扣血且卡牌保留", () => {
        let st = newGame("easy", seedRng(11));
        st = tick(st, 0.1);
        const id = st.belt[0].id;
        // 故意选一个不属于它的类别
        const right = [...acceptCats(st.belt[0].sub)][0];
        const wrong = (["metal", "nonmetal", "oxide", "acid", "base", "salt", "organic", "mix"] as const)
            .find((c) => !acceptCats(st.belt[0].sub).has(c))!;
        expect(right).toBeTruthy();
        st = judge(st, id, wrong);
        expect(st.score).toBe(0);
        expect(st.hp).toBe(2);
        expect(st.belt).toHaveLength(1);   // 卡牌保留
        expect(st.mistakes).toBe(1);
        expect(st.lastJudge?.ok).toBe(false);
        st = judge(st, id, right);
        expect(st.score).toBe(1);
        expect(st.belt).toHaveLength(0);
        expect(st.lastJudge?.ok).toBe(true);
    });

    it("血量归零判负(hp)", () => {
        let st = newGame("easy", seedRng(11));
        st = tick(st, 0.1);
        const id = st.belt[0].id;
        const wrong = (["metal", "nonmetal", "oxide", "acid", "base", "salt", "organic", "mix"] as const)
            .find((c) => !acceptCats(st.belt[0].sub).has(c))!;
        st = judge(st, id, wrong);
        st = judge(st, id, wrong);
        expect(st.phase).toBe("playing");
        st = judge(st, id, wrong);
        expect(st.phase).toBe("lose");
        expect(st.loseReason).toBe("hp");
    });

    it("有机酸双类均可: 醋酸按「酸」或「有机物」均正确, 其它类别错误", () => {
        const cu = sub("醋酸");
        expect(acceptCats(cu)).toEqual(new Set(["acid", "organic"]));
        const st: FlglState = { ...newGame("easy", seedRng(3)), belt: [{ id: 9, sub: cu }] };
        expect(judge(st, 9, "acid").score).toBe(1);
        expect(judge(st, 9, "organic").score).toBe(1);
        expect(judge(st, 9, "salt").score).toBe(0);
        expect(judge(st, 9, "salt").hp).toBe(2);
        expect(wrongHint(cu)).toContain("酸 / 有机物");
    });

    it("牌库: 每局 20 张且名称不重复, 全部来自物质库", () => {
        for (const mode of ["easy", "normal", "hard"] as const) {
            const deck = buildDeck(mode, seedRng(42));
            expect(deck).toHaveLength(ROUND_TOTAL);
            expect(new Set(deck.map((s) => s.n)).size).toBe(ROUND_TOTAL);
            for (const s of deck) expect(HLGX_SUBSTANCES).toContain(s);
        }
    });

    it("简单: 前 16 张类别均衡(8 类各 2 张); 标准掺易错后仍 8 类齐", () => {
        const easy = buildDeck("easy", seedRng(5));
        const counts = new Map<string, number>();
        for (const s of easy.slice(0, 16)) counts.set(s.c, (counts.get(s.c) ?? 0) + 1);
        expect([...counts.values()].every((v) => v === 2)).toBe(true);
        // 标准难度有 30% 易错替换, 不保证恰好均衡, 但 20 张内 8 类应齐
        const normal = buildDeck("normal", seedRng(5));
        const nc = new Set(normal.map((s) => s.c));
        expect(nc.size).toBe(8);
    });

    it("标准难度掺入易错物质: rng 恒小于 0.3 → 全部来自易错池", () => {
        const deck = buildDeck("normal", () => 0.05);
        for (const s of deck) expect(TRICKY_NAMES.has(s.n)).toBe(true);
    });

    it("易错池 ≥ 30 且清单名称全部在物质库中有效", () => {
        expect(TRICKY_POOL.length).toBeGreaterThanOrEqual(30);
        expect(TRICKY_POOL.length).toBe(TRICKY_NAMES.size);
    });

    it("20 张出完后: 不再出牌也不判负, 剩余卡可慢慢分完", () => {
        let st = newGame("hard", seedRng(9));
        // 前 15 张出现后立即正确分类, 最后 5 张故意留在带上
        while (st.spawned < ROUND_TOTAL) {
            st = tick(st, FLGL_INTERVAL.hard + 0.01);
            if (st.phase !== "playing") break;
            if (st.spawned <= 15) for (const c of [...st.belt]) st = judgeRight(st, c.id);
        }
        expect(st.spawned).toBe(ROUND_TOTAL);
        expect(st.belt).toHaveLength(BELT_CAPACITY);   // 满载…
        st = tick(st, 999);                            // …但已无新卡 → 不判负
        expect(st.phase).toBe("playing");
        // 分完剩余 → 胜利
        while (st.belt.length > 0 && st.phase === "playing") {
            st = judgeRight(st, st.belt[0].id);
        }
        expect(st.phase).toBe("win");
        expect(st.score).toBe(ROUND_TOTAL);
    });

    it("完整一局: 正确分完全部 20 张 → win, 计时累计", () => {
        let st = newGame("normal", seedRng(13));
        let guard = 0;
        while (st.phase === "playing" && guard++ < 500) {
            st = tick(st, 0.5);
            if (st.belt.length > 0) st = judgeRight(st, st.belt[st.belt.length - 1].id);
        }
        expect(st.phase).toBe("win");
        expect(st.score).toBe(ROUND_TOTAL);
        expect(st.mistakes).toBe(0);
        expect(st.elapsed).toBeGreaterThan(0);
    });
});
