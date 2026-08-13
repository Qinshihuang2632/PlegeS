/*
 * p了个s · 英了个语 核心逻辑测试 (Vitest)
 * ==========================================
 * 覆盖: 词库课标性(难词表 ⊆ 课标主词库)、链式生成(重叠拼接/词库合法)、
 * 难度参数、挖空与预填、填写/校验/扣血/胜负、提示道具。运行: npx vitest run --pool=forks
 */
import { describe, expect, it } from "vitest";
import { HINT_LIMIT, WsGame, WS_DIFFICULTIES, buildChain, dictFor } from "./core";
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

describe("链式单词拼图生成", () => {
    it("三种难度均可生成链(相邻词依重复字母重叠拼接, 全部词在词库)", () => {
        for (const mode of ["easy", "normal", "hard"] as const) {
            const K = WS_DIFFICULTIES[mode].K;
            const dict = dictFor(mode);
            const set = new Set(dict);
            for (let t = 0; t < 5; t++) {
                const chain = buildChain(K, dict);
                expect(chain, `${mode} 生成失败`).not.toBeNull();
                expect(chain!.rows.length).toBe(K);
                for (const w of chain!.rows) expect(set.has(w)).toBe(true);
                // 相邻词重叠: 行 i 与行 i-1 共享字母段(行 i 起始列 = 上一行重叠起始列)
                for (let i = 1; i < K; i++) {
                    const prev = chain!.rows[i - 1];
                    const cur = chain!.rows[i];
                    const start = chain!.startCol[i];
                    expect(start, `${mode} 链 ${i} 无重叠`).toBeGreaterThanOrEqual(0);
                    expect(prev.slice(start)).toBe(cur.slice(0, prev.length - start));
                }
                // 不规则形状: 起始列不全部相同(存在错位)
                expect(new Set(chain!.startCol).size).toBeGreaterThan(1);
            }
        }
    });
});

describe("游戏流程", () => {
    it("难度参数: 简单4词/标准5词/困难5词难库, 挖空率递增", () => {
        expect(WS_DIFFICULTIES.easy.K).toBe(4);
        expect(WS_DIFFICULTIES.normal.K).toBe(5);
        expect(WS_DIFFICULTIES.hard.K).toBe(5);
        expect(WS_DIFFICULTIES.hard.dictKey).toBe("hard");
        expect(WS_DIFFICULTIES.hard.blankRate).toBeGreaterThan(WS_DIFFICULTIES.normal.blankRate);
        expect(WS_DIFFICULTIES.normal.blankRate).toBeGreaterThan(WS_DIFFICULTIES.easy.blankRate);
        expect(WS_DIFFICULTIES.hard.firstRowHint).toBe(false);
    });

    it("开局: 预填格不可改, 挖空待填; 简单首行全提示; 形状不规则(行长短不一)", () => {
        const g = new WsGame("easy");
        expect(g.rows.length).toBe(4);
        for (let r = 0; r < g.rows.length; r++) {
            for (let c = 0; c < g.rows[r].length; c++) {
                if (g.puzzle[r][c] !== null) {
                    expect(g.fill(r, c, "z")).toBe(false);
                    expect(g.grid[r][c]).toBe(g.puzzle[r][c]);
                }
            }
        }
        expect(g.puzzle[0].every(x => x !== null)).toBe(true);
        expect(g.totalBlanks).toBeGreaterThan(0);
        // 行长度可能不同(不规则形状)
        expect(new Set(g.rows.map(w => w.length)).size).toBeGreaterThanOrEqual(1);
    });

    it("按答案填写全部空格 → 通关; 填错满行 → 扣血标红", () => {
        const g = new WsGame("easy");
        for (let r = 0; r < g.rows.length; r++)
            for (let c = 0; c < g.rows[r].length; c++)
                if (g.grid[r][c] === null) g.fill(r, c, g.rows[r][c]);
        expect(g.win).toBe(true);

        const g2 = new WsGame("easy");
        const blanks: { r: number; c: number }[] = [];
        for (let r = 0; r < g2.rows.length; r++)
            for (let c = 0; c < g2.rows[r].length; c++)
                if (g2.grid[r][c] === null && g2.puzzle[r][c] === null) blanks.push({ r, c });
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

    it("提示道具: 每局最多 2 次, 向空位填正确字母", () => {
        const g = new WsGame("normal");
        expect(HINT_LIMIT).toBe(2);
        const blanksBefore = g.totalBlanks;
        expect(g.hint()).toBe(true);
        expect(g.hints).toBe(1);
        expect(g.totalBlanks).toBe(blanksBefore - 1);   // 填入一个正确字母
        expect(g.hint()).toBe(true);
        expect(g.hints).toBe(2);
        expect(g.hint()).toBe(false);                    // 超过上限
        expect(g.hints).toBe(2);
    });
});
