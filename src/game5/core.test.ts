/*
 * 配了个平 · 测试 (src/game5/core.test.ts)
 * 两部分: ① 题库守恒/最简比自动校验(111 条全量, 改题库必过); ② 游戏逻辑。
 */
import { describe, expect, it } from "vitest";
import { PLGP_EQUATIONS } from "./equations";
import { parseFormula } from "./parse";
import {
    HINT_LIMIT, ROUND_TOTAL,
    appendDigit, backspace, currentEquation, gcdList, isScaledVersion,
    mcOptions, newGame, setBlank, submit, tick, useHint,
    type PlgpState,
} from "./core";

/* 可播种的伪随机源 */
const seedRng = (seed: number) => {
    let s = seed >>> 0 || 1;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
};

describe("配了个平 · 题库守恒校验(111 条全量)", () => {
    it("总量与难度分布: 简单32 / 标准43 / 困难36", () => {
        expect(PLGP_EQUATIONS).toHaveLength(111);
        expect(PLGP_EQUATIONS.filter((e) => e.diff === 1)).toHaveLength(32);
        expect(PLGP_EQUATIONS.filter((e) => e.diff === 2)).toHaveLength(43);
        expect(PLGP_EQUATIONS.filter((e) => e.diff === 3)).toHaveLength(36);
    });

    it("id 唯一且字段长度一致、系数均为正整数", () => {
        const ids = new Set(PLGP_EQUATIONS.map((e) => e.id));
        expect(ids.size).toBe(PLGP_EQUATIONS.length);
        for (const e of PLGP_EQUATIONS) {
            expect(e.coefs).toHaveLength(e.left.length + e.right.length);
            for (const c of e.coefs) {
                expect(Number.isInteger(c)).toBe(true);
                expect(c).toBeGreaterThanOrEqual(1);
            }
        }
    });

    it("每条方程左右两边元素守恒(逐条质量守恒)", () => {
        for (const e of PLGP_EQUATIONS) {
            const sum = (side: string[], offset: number) => {
                const total: Record<string, number> = {};
                side.forEach((f, i) => {
                    for (const [el, n] of Object.entries(parseFormula(f))) {
                        total[el] = (total[el] ?? 0) + n * e.coefs[offset + i];
                    }
                });
                return total;
            };
            const L = sum(e.left, 0);
            const R = sum(e.right, e.left.length);
            expect(Object.keys(L).sort().join(","), `#${e.id} 元素集合不一致`)
                .toBe(Object.keys(R).sort().join(","));
            for (const [el, n] of Object.entries(L)) {
                expect(R[el], `#${e.id} 元素 ${el}: 左 ${n} vs 右 ${R[el]}`).toBe(n);
            }
        }
    });

    it("每条系数都是最简整数比(gcd = 1)", () => {
        for (const e of PLGP_EQUATIONS) {
            expect(gcdList(e.coefs), `#${e.id} 系数非最简: ${e.coefs.join(",")}`).toBe(1);
        }
    });

    it("解析器抽查: 括号嵌套/限量标注/有机串式/双键写法", () => {
        expect(parseFormula("Na[Al(OH)₄]")).toEqual({ Na: 1, Al: 1, O: 4, H: 4 });
        expect(parseFormula("Fe(足量)")).toEqual({ Fe: 1 });
        expect(parseFormula("HNO₃(稀,足量)")).toEqual({ H: 1, N: 1, O: 3 });
        expect(parseFormula("CH₃COOC₂H₅")).toEqual({ C: 4, H: 8, O: 2 });
        expect(parseFormula("CH₂=CH₂")).toEqual({ C: 2, H: 4 });
        expect(parseFormula("Cu₂(OH)₂CO₃")).toEqual({ Cu: 2, O: 5, H: 2, C: 1 });
        expect(parseFormula("C₆H₅NO₂")).toEqual({ C: 6, H: 5, N: 1, O: 2 });
    });
});

describe("配了个平 · 游戏逻辑", () => {
    it("newGame/pickRound: 8 题不重复且属于所选难度", () => {
        for (const mode of ["easy", "normal", "hard"] as const) {
            const st = newGame(mode, seedRng(7));
            expect(st.deck).toHaveLength(ROUND_TOTAL);
            expect(new Set(st.deck.map((e) => e.id)).size).toBe(ROUND_TOTAL);
            const diff = mode === "easy" ? 1 : mode === "normal" ? 2 : 3;
            expect(st.deck.every((e) => e.diff === diff)).toBe(true);
            expect(st.blanks).toHaveLength(st.deck[0].coefs.length);
            expect(st.hp).toBe(3);
            expect(st.hintsLeft).toBe(HINT_LIMIT);
        }
    });

    const fillCorrect = (st: PlgpState): PlgpState => {
        let s = st;
        currentEquation(s).coefs.forEach((c, i) => { s = setBlank(s, i, c); });
        return submit(s);
    };

    it("正确提交 → 得分进入下一题; 全部答对 → win", () => {
        let st = newGame("normal", seedRng(11));
        for (let q = 0; q < ROUND_TOTAL; q++) {
            st = fillCorrect(st);
            if (q < ROUND_TOTAL - 1) {
                expect(st.phase).toBe("playing");
                expect(st.score).toBe(q + 1);
                expect(st.blanks.every((b) => b === null)).toBe(true);   // 新题作答区已清空
            }
        }
        expect(st.phase).toBe("win");
        expect(st.score).toBe(ROUND_TOTAL);
    });

    it("未填满提交不判定(incomplete)", () => {
        let st = newGame("easy", seedRng(12));
        st = setBlank(st, 0, currentEquation(st).coefs[0]);
        const snapshot = st;
        st = submit(st);
        expect(st.lastJudge?.ok).toBe(false);
        expect(st.lastJudge?.reason).toBe("incomplete");
        expect(st.idx).toBe(snapshot.idx);
        expect(st.hp).toBe(3);
    });

    it("错误提交 → 扣血 + 作答保留可修改; 血量归零 → lose", () => {
        let st = newGame("normal", seedRng(13));
        const wrongFill = (s: PlgpState): PlgpState => {
            let out = s;
            currentEquation(out).coefs.forEach((c, i) => { out = setBlank(out, i, i === 0 ? Math.max(1, c + 7) : c); });
            return submit(out);
        };
        st = wrongFill(st);
        expect(st.lastJudge?.reason).toBe("wrong");
        expect(st.hp).toBe(2);
        expect(st.mistakes).toBe(1);
        expect(st.blanks.some((b) => b !== null)).toBe(true);   // 作答保留
        st = wrongFill(st);
        st = wrongFill(st);
        expect(st.phase).toBe("lose");
        expect(st.mistakes).toBe(3);
    });

    it("比例解判错并提示需化为最简整数比(ratio)", () => {
        let st = newGame("hard", seedRng(14));
        // 找一条最大系数 ≤ 10 的题(留出 ×2 后仍 ≤99 的空间)
        while (Math.max(...currentEquation(st).coefs) > 10 || currentEquation(st).coefs.length < 3) {
            st = newGame("hard", seedRng(Math.floor(Math.random() * 1e9)));
        }
        const eq = currentEquation(st);
        let s = st;
        eq.coefs.forEach((c, i) => { s = setBlank(s, i, c * 2); });
        s = submit(s);
        expect(s.lastJudge?.ok).toBe(false);
        expect(s.lastJudge?.reason).toBe("ratio");
        expect(s.hp).toBe(2);
        expect(isScaledVersion([4, 2, 4], [2, 1, 2])).toBe(true);
        expect(isScaledVersion([2, 1, 2], [2, 1, 2])).toBe(false);
        expect(isScaledVersion([1, 2], [2, 1])).toBe(false);
    });

    it("提示道具: 填入正确系数并锁定; 用尽后无效; 锁定位不可修改", () => {
        let st = newGame("normal", seedRng(15));
        st = useHint(st);
        expect(st.hintsLeft).toBe(HINT_LIMIT - 1);
        expect(st.toolsUsed).toBe(1);
        const li = st.locked.findIndex((v) => v);
        expect(li).toBeGreaterThanOrEqual(0);
        expect(st.blanks[li]).toBe(currentEquation(st).coefs[li]);
        // 锁定后 setBlank 无效
        st = setBlank(st, li, 99);
        expect(st.blanks[li]).toBe(currentEquation(st).coefs[li]);
        // 连用至耗尽
        st = useHint(st);
        expect(st.hintsLeft).toBe(0);
        const snap = st;
        st = useHint(st);
        expect(st.toolsUsed).toBe(snap.toolsUsed);
        // 数字追加/退格
        let s = newGame("easy", seedRng(16));
        s = appendDigit(s, 0, 1);
        s = appendDigit(s, 0, 6);
        expect(s.blanks[0]).toBe(16);
        s = appendDigit(s, 0, 8);      // 超上限忽略
        expect(s.blanks[0]).toBe(16);
        s = backspace(s, 0);
        expect(s.blanks[0]).toBe(1);
        s = backspace(s, 0);
        expect(s.blanks[0]).toBe(null);
        s = backspace(s, 0);
        expect(s.blanks[0]).toBe(null);
    });

    it("简单难度选择题: 3 组互异选项且恰含一组正确答案", () => {
        for (let k = 0; k < 30; k++) {
            const st = newGame("easy", seedRng(100 + k));
            const opts = mcOptions(currentEquation(st), seedRng(200 + k));
            expect(opts.length).toBe(3);
            const keys = new Set(opts.map((o) => o.join(",")));
            expect(keys.size).toBe(3);
            const eq = currentEquation(st);
            const correctKey = eq.coefs.join(",");
            expect(opts.filter((o) => o.join(",") === correctKey)).toHaveLength(1);
        }
    });

    it("tick 计时与结算后不再推进", () => {
        let st = newGame("hard", seedRng(17));
        st = tick(st, 2.5);
        expect(st.elapsed).toBeCloseTo(2.5);
        while (st.phase === "playing") st = fillCorrect(st);
        const t = st.elapsed;
        st = tick(st, 5);
        expect(st.elapsed).toBe(t);
    });
});
