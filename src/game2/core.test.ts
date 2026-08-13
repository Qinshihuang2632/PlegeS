/*
 * p了个s · 英了个语 核心逻辑测试 (Vitest)
 * ==========================================
 * 覆盖: 词库课标性、对称方阵生成(行/列均成词)、唯一解保证(简单/标准/困难)、
 * 难度参数、挖空与预填、填写/校验/扣血/胜负、提示道具。运行: npx vitest run --pool=forks
 */
import { describe, expect, it } from "vitest";
import { HINT_LIMIT, WsGame, WS_DIFFICULTIES, dictFor, pickSquare, solveSquare } from "./core";
import { WS_WORDS, WS_WORDS_HARD } from "./words";

describe("词库(课标及衍生)", () => {
    it("4/5/6 字母词库均 ≥100 且全部小写、无重复", () => {
        for (const n of [4, 5, 6]) {
            const ws = WS_WORDS[n];
            expect(ws.length).toBeGreaterThanOrEqual(100);
            expect(new Set(ws).size).toBe(ws.length);
            expect(ws.every(w => /^[a-z]+$/.test(w) && w.length === n)).toBe(true);
        }
    });

    it("难词表全部取自课标 5 字母主词库(课标及衍生占比 100%)", () => {
        const base = new Set(WS_WORDS[5]);
        expect(WS_WORDS_HARD.length).toBeGreaterThanOrEqual(100);
        expect(WS_WORDS_HARD.every(w => w.length === 5)).toBe(true);
        expect(WS_WORDS_HARD.every(w => base.has(w))).toBe(true);
    });
});

describe("word square 生成", () => {
    it("三种难度均可生成对称方阵(行词/列词均在词库)", () => {
        for (const mode of ["easy", "normal", "hard"] as const) {
            const N = WS_DIFFICULTIES[mode].N;
            const dict = dictFor(mode);
            const set = new Set(dict);
            const rows = pickSquare(N, dict);
            expect(rows, `${mode} 生成失败`).not.toBeNull();
            for (const w of rows!) expect(set.has(w)).toBe(true);
            for (let i = 0; i < N; i++)
                for (let j = 0; j < N; j++)
                    expect(rows![i][j], `${mode} 不对称 (${i},${j})`).toBe(rows![j][i]);
            for (let c = 0; c < N; c++)
                expect(set.has(rows!.map(w => w[c]).join("")), `${mode} 列${c} 非法`).toBe(true);
        }
    });
});

describe("唯一解保证(无逻辑漏洞)", () => {
    it("三种难度生成的题面均恰有 1 个解", () => {
        for (const mode of ["easy", "normal", "hard"] as const) {
            for (let t = 0; t < 6; t++) {
                const g = new WsGame(mode);
                const sols = solveSquare(g.puzzle, dictFor(mode));
                expect(sols.length, `${mode} 第${t}局解数=${sols.length}`).toBe(1);
                expect(sols[0].join("|")).toBe(g.rows.join("|"));   // 唯一解 = 答案
            }
        }
    });
});

describe("游戏流程", () => {
    it("难度参数: 简单4×4/标准5×5/困难5×5难库, 挖空率递增", () => {
        expect(WS_DIFFICULTIES.easy.N).toBe(4);
        expect(WS_DIFFICULTIES.normal.N).toBe(5);
        expect(WS_DIFFICULTIES.hard.N).toBe(5);
        expect(WS_DIFFICULTIES.hard.dictKey).toBe("hard");
        expect(WS_DIFFICULTIES.hard.blankRate).toBeGreaterThan(WS_DIFFICULTIES.normal.blankRate);
        expect(WS_DIFFICULTIES.normal.blankRate).toBeGreaterThan(WS_DIFFICULTIES.easy.blankRate);
        expect(WS_DIFFICULTIES.hard.firstRowHint).toBe(false);
    });

    it("开局: 预填格不可改, 挖空待填; 简单首行全提示", () => {
        const g = new WsGame("easy");
        expect(g.rows.length).toBe(4);
        for (let r = 0; r < g.N; r++)
            for (let c = 0; c < g.N; c++)
                if (g.puzzle[r][c] !== null) {
                    expect(g.fill(r, c, "z")).toBe(false);   // 预填不可改
                    expect(g.grid[r][c]).toBe(g.puzzle[r][c]);
                }
        expect(g.puzzle[0].every(x => x !== null)).toBe(true);
        expect(g.totalBlanks).toBeGreaterThan(0);
    });

    it("按答案填写全部空格 → 通关; 填错满行 → 扣血标红", () => {
        const g = new WsGame("easy");
        for (let r = 0; r < g.N; r++)
            for (let c = 0; c < g.N; c++)
                if (g.grid[r][c] === null) g.fill(r, c, g.rows[r][c]);
        expect(g.win).toBe(true);

        const g2 = new WsGame("easy");
        const blanks: { r: number; c: number }[] = [];
        for (let r = 0; r < g2.N; r++)
            for (let c = 0; c < g2.N; c++)
                if (g2.grid[r][c] === null && g2.puzzle[r][c] === null) blanks.push({ r, c });
        const target = blanks.find(b => b.r > 0)!;
        const wrong = g2.rows[target.r][target.c] === "a" ? "b" : "a";
        g2.fill(target.r, target.c, wrong);
        for (const b of blanks) {
            if (b.r === target.r && b.c === target.c) continue;
            if (g2.grid[b.r][b.c] === null) g2.fill(b.r, b.c, g2.rows[b.r][b.c]);
        }
        expect(g2.hp).toBeLessThan(3);
        expect(g2.win).toBe(false);
    });

    it("提示道具: 每局最多 2 次, 向空位填正确字母", () => {
        const g = new WsGame("normal");
        expect(HINT_LIMIT).toBe(2);
        const blanksBefore = g.totalBlanks;
        expect(g.hint()).toBe(true);
        expect(g.hints).toBe(1);
        expect(g.totalBlanks).toBe(blanksBefore - 1);
        expect(g.hint()).toBe(true);
        expect(g.hints).toBe(2);
        expect(g.hint()).toBe(false);
        expect(g.hints).toBe(2);
    });
});
