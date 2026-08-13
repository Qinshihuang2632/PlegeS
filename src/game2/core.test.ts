/*
 * p了个s · 英语单词数独 核心逻辑测试 (Vitest)
 * ==========================================
 * 覆盖: 生成器(对称性/词库合法/可生成率)、难度参数、挖空与预填、
 * 填写/校验/扣血/胜负流程。运行: npx vitest run --pool=forks
 */
import { describe, expect, it } from "vitest";
import { WsGame, WS_DIFFICULTIES, dictFor, pickSquare } from "./core";
import { WS_WORDS, WS_WORDS_HARD } from "./words";

describe("词库", () => {
    it("4/5/6 字母词库均 ≥100 且全部小写、无重复; 难词表均为 5 字母", () => {
        for (const n of [4, 5, 6]) {
            const ws = WS_WORDS[n];
            expect(ws.length).toBeGreaterThanOrEqual(100);
            expect(new Set(ws).size).toBe(ws.length);
            expect(ws.every(w => /^[a-z]+$/.test(w) && w.length === n)).toBe(true);
        }
        expect(WS_WORDS_HARD.length).toBeGreaterThanOrEqual(100);
        expect(WS_WORDS_HARD.every(w => w.length === 5)).toBe(true);
    });
});

describe("word square 生成器", () => {
    it("三种难度均可生成方阵(行词/列词均在各自词库)", () => {
        for (const mode of ["easy", "normal", "hard"] as const) {
            const N = WS_DIFFICULTIES[mode].N;
            const dict = dictFor(mode);
            const set = new Set(dict);
            for (let t = 0; t < 5; t++) {
                const rows = pickSquare(N, dict);
                expect(rows, `${mode} 生成失败`).not.toBeNull();
                expect(rows!.length).toBe(N);
                for (const w of rows!) expect(set.has(w)).toBe(true);
                // 列词均为词库单词(非对称方阵不要求对称)
                for (let c = 0; c < N; c++)
                    expect(set.has(rows!.map(w => w[c]).join("")), `${mode} 列${c} 非法`).toBe(true);
            }
        }
    });
});

describe("游戏流程", () => {
    it("难度参数: 简单4×4/标准5×5/困难5×5难词, 挖空率递增", () => {
        expect(WS_DIFFICULTIES.easy.N).toBe(4);
        expect(WS_DIFFICULTIES.normal.N).toBe(5);
        expect(WS_DIFFICULTIES.hard.N).toBe(5);
        expect(WS_DIFFICULTIES.hard.dictKey).toBe("hard");
        expect(WS_DIFFICULTIES.hard.blankRate).toBeGreaterThan(WS_DIFFICULTIES.normal.blankRate);
        expect(WS_DIFFICULTIES.normal.blankRate).toBeGreaterThan(WS_DIFFICULTIES.easy.blankRate);
        expect(WS_DIFFICULTIES.hard.firstRowHint).toBe(false);
    });

    it("开局: 预填格不可改, 挖空待填; 第一行提示符合难度", () => {
        const g = new WsGame("easy");
        expect(g.rows.length).toBe(4);
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (g.puzzle[r][c] !== null) {
                    expect(g.fill(r, c, "z")).toBe(false);   // 预填不可改
                    expect(g.grid[r][c]).toBe(g.puzzle[r][c]);
                }
            }
        }
        // 简单: 第一行全提示
        expect(g.puzzle[0].every(x => x !== null)).toBe(true);
        // 存在待填空格
        expect(g.remainingBlanks).toBeGreaterThan(0);
    });

    it("按答案填写全部空格 → 通关; 填错满行 → 扣血标红", () => {
        const g = new WsGame("easy");
        // 先按答案填所有空格 → 通关
        for (let r = 0; r < g.N; r++) {
            for (let c = 0; c < g.N; c++) {
                if (g.grid[r][c] === null) g.fill(r, c, g.rows[r][c]);
            }
        }
        expect(g.win).toBe(true);
        expect(g.gameOver).toBe(true);

        // 错误行: 构造一个必错填法(第一格填错字母)
        const g2 = new WsGame("easy");
        const blanks = g2.grid.flatMap((row, r) => row.map((v, c) => ({ r, c, v })).filter(x => x.v === null));
        expect(blanks.length).toBeGreaterThan(0);
        // 找一个非首行的空白格, 填入一个"与答案不同的字母", 再按答案填满其余 → 该行非法扣血
        const target = blanks.find(b => b.r > 0)!;
        const wrong = g2.rows[target.r][target.c] === "a" ? "b" : "a";
        g2.fill(target.r, target.c, wrong);
        for (const b of blanks) {
            if (b.r === target.r && b.c === target.c) continue;
            if (g2.grid[b.r][b.c] === null) g2.fill(b.r, b.c, g2.rows[b.r][b.c]);
        }
        expect(g2.rowBad[target.r]).toBe(true);
        expect(g2.hp).toBe(2);
        expect(g2.win).toBe(false);
    });

    it("预填格外的空格全部可修改(erase 后可重填)", () => {
        const g = new WsGame("normal");
        const blank = g.grid.flatMap((row, r) => row.map((v, c) => ({ r, c, v })).filter(x => x.v === null))[0];
        expect(g.fill(blank.r, blank.c, "x")).toBe(true);
        expect(g.erase(blank.r, blank.c)).toBe(true);
        expect(g.grid[blank.r][blank.c]).toBeNull();
    });
});
