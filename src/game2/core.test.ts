/*
 * p了个s · 英了个语 核心逻辑测试 (Vitest)
 * ==========================================
 * 覆盖: 词库课标性、交叉网格生成(词数/交叉一致性/不重复/词库合法)、
 * 唯一解保证(三难度)、挖空与预填、填写/校验/扣血/胜负、提示道具。
 * 运行: npx vitest run --pool=forks
 */
import { describe, expect, it } from "vitest";
import { HINT_LIMIT, WsGame, WS_DIFFICULTIES, buildCross, dictFor, solveCross, type PlacedWord } from "./core";
import { WS_WORDS, WS_WORDS_HARD } from "./words";

/* 词所占格子 */
function cellsOf(w: PlacedWord): [number, number][] {
    const cells: [number, number][] = [];
    for (let s = 0; s < w.word.length; s++)
        cells.push(w.dir === "h" ? [w.r, w.c + s] : [w.r + s, w.c]);
    return cells;
}

/* 并查集: 词之间若共享任意格即连通; 要求全部词属同一连通分量(连成一个图形) */
function isConnected(words: PlacedWord[]): boolean {
    const n = words.length;
    if (n <= 1) return true;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const union = (a: number, b: number) => { parent[find(a)] = find(b); };
    const owner = new Map<string, number>();
    for (let i = 0; i < n; i++) {
        for (const [r, c] of cellsOf(words[i])) {
            const key = `${r},${c}`;
            if (owner.has(key)) union(i, owner.get(key)!);
            else owner.set(key, i);
        }
    }
    const root = find(0);
    return words.every((_, i) => find(i) === root);
}

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

describe("交叉单词网格生成(自由图形)", () => {
    it("三种难度均可生成指定词数网格: 词不重复、全部在词库、交叉点字母一致", () => {
        for (const mode of ["easy", "normal", "hard"] as const) {
            const d = WS_DIFFICULTIES[mode];
            const dict = dictFor(mode);
            const set = new Set(dict);
            const built = buildCross(d.words, dict);
            expect(built, `${mode} 生成失败`).not.toBeNull();
            expect(built!.words.length).toBe(d.words);
            // 词不重复
            const names = built!.words.map(w => w.word);
            expect(new Set(names).size).toBe(names.length);
            // 词库合法
            for (const w of built!.words) expect(set.has(w.word)).toBe(true);
            // 交叉一致性: 每个占用格字母唯一(同一格在不同词中字母一致)
            for (const [k, v] of built!.map) {
                const [r, c] = k.split(",").map(Number);
                const letters = built!.words
                    .filter(w => {
                        if (w.dir === "h") return w.r === r && w.c <= c && c < w.c + w.word.length;
                        return w.c === c && w.r <= r && r < w.r + w.word.length;
                    })
                    .map(w => {
                        const s = w.dir === "h" ? c - w.c : r - w.r;
                        return w.word[s];
                    });
                expect(letters.length).toBeGreaterThanOrEqual(1);
                for (const L of letters) expect(L, `交叉格(${r},${c}) 字母冲突`).toBe(v);
            }
            // 自由图形: 存在未占用格(非全填)
            const total = built!.H * built!.W;
            const occ = built!.map.size;
            expect(occ).toBeLessThan(total);
        }
    });
});

describe("单词连通成图(回归: 修前 ~96% 网格是断开的)", () => {
    it("buildCross 生成的所有词共享格子、连成单一连通图形", () => {
        for (const mode of ["easy", "normal", "hard"] as const) {
            const d = WS_DIFFICULTIES[mode];
            const dict = dictFor(mode);
            for (let t = 0; t < 40; t++) {
                const built = buildCross(d.words, dict, d.maxDim);
                expect(built, `${mode} 生成失败`).not.toBeNull();
                expect(isConnected(built!.words), `${mode} 第${t}次: 词未连通`).toBe(true);
            }
        }
    });

    it("网格尺寸受 maxDim 约束: H、W 均不超上限(图形紧凑)", () => {
        for (const mode of ["easy", "normal", "hard"] as const) {
            const d = WS_DIFFICULTIES[mode];
            const dict = dictFor(mode);
            for (let t = 0; t < 40; t++) {
                const built = buildCross(d.words, dict, d.maxDim);
                expect(built, `${mode} 生成失败`).not.toBeNull();
                expect(built!.H, `${mode} H=${built!.H} > ${d.maxDim}`).toBeLessThanOrEqual(d.maxDim);
                expect(built!.W, `${mode} W=${built!.W} > ${d.maxDim}`).toBeLessThanOrEqual(d.maxDim);
            }
        }
    });
});

describe("唯一解保证(无逻辑漏洞)", () => {
    it("三种难度生成的题面均恰有 1 个解", () => {
        for (const mode of ["easy", "normal", "hard"] as const) {
            for (let t = 0; t < 6; t++) {
                const g = new WsGame(mode);
                const dict = dictFor(mode);
                const sols = solveCross(g.occupied, g.puzzle, g.words, dict);
                expect(sols.length, `${mode} 第${t}局解数=${sols.length}`).toBe(1);
                // 唯一解 = 答案
                const expectGrid = g.occupied.map((row, r) =>
                    row.map((occ, c) => (occ ? g.cellAnswer(r, c) : "")));
                expect(sols[0].join("|")).toBe(expectGrid.map(row => row.join("")).join("|"));
            }
        }
    });
});

describe("游戏流程", () => {
    it("难度参数: 4词/6词/8词, 挖空率递增, 简单首词提示", () => {
        expect(WS_DIFFICULTIES.easy.words).toBe(4);
        expect(WS_DIFFICULTIES.normal.words).toBe(6);
        expect(WS_DIFFICULTIES.hard.words).toBe(8);
        expect(WS_DIFFICULTIES.hard.dictKey).toBe("hard");
        expect(WS_DIFFICULTIES.hard.blankRate).toBeGreaterThan(WS_DIFFICULTIES.normal.blankRate);
        expect(WS_DIFFICULTIES.normal.blankRate).toBeGreaterThan(WS_DIFFICULTIES.easy.blankRate);
        expect(WS_DIFFICULTIES.hard.firstHint).toBe(false);
    });

    it("开局: 未占用格不可填/不可点, 预填格不可改, 简单首词全提示", () => {
        const g = new WsGame("easy");
        expect(g.words.length).toBe(4);
        // 未占用格不可填
        for (let r = 0; r < g.H; r++)
            for (let c = 0; c < g.W; c++)
                if (!g.occupied[r][c]) expect(g.fill(r, c, "a")).toBe(false);
        // 预填格不可改
        for (let r = 0; r < g.H; r++)
            for (let c = 0; c < g.W; c++)
                if (g.puzzle[r][c] !== null) {
                    expect(g.fill(r, c, "z")).toBe(false);
                    expect(g.grid[r][c]).toBe(g.puzzle[r][c]);
                }
        // 首词全提示
        const first = g.wordCells(0);
        expect(first.every(([r, c]) => g.puzzle[r][c] !== null)).toBe(true);
        expect(g.totalBlanks).toBeGreaterThan(0);
    });

    it("按答案填写全部空格 → 通关; 填错使词非法 → 扣血", () => {
        const g = new WsGame("easy");
        for (let r = 0; r < g.H; r++)
            for (let c = 0; c < g.W; c++)
                if (g.occupied[r][c] && g.grid[r][c] === null) g.fill(r, c, g.cellAnswer(r, c));
        expect(g.win).toBe(true);

        const g2 = new WsGame("easy");
        // 找一个只属于单一词的占用空格(非交叉点): 填错后只让这 1 个词变非法 → 恰好扣 1 血
        const pickBlank = (): [number, number] => {
            const single: [number, number][] = [];
            for (let r = 0; r < g2.H; r++)
                for (let c = 0; c < g2.W; c++) {
                    if (!(g2.occupied[r][c] && g2.grid[r][c] === null && g2.puzzle[r][c] === null)) continue;
                    const cnt = g2.words.filter((_, i) =>
                        g2.wordCells(i).some(([rr, cc]) => rr === r && cc === c)).length;
                    if (cnt === 1) single.push([r, c]);
                }
            return single.length ? single[0] : [-1, -1];
        };
        const [br, bc] = pickBlank();
        expect(br, "应存在非交叉空格").toBeGreaterThanOrEqual(0);
        const wi = g2.words.findIndex((_, i) => g2.wordCells(i).some(([rr, cc]) => rr === br && cc === bc));
        const ans = g2.cellAnswer(br, bc);
        g2.fill(br, bc, ans === "a" ? "b" : "a");
        // 填满该词其余格 → 整词非法 → 扣 1 血
        for (const [rr, cc] of g2.wordCells(wi)) {
            if (g2.grid[rr][cc] === null) g2.fill(rr, cc, g2.cellAnswer(rr, cc));
        }
        expect(g2.wordBad[wi]).toBe(true);
        expect(g2.hp).toBe(2);
        expect(g2.win).toBe(false);
    });

    it("提示道具: 每局最多 2 次, 向占用空位填正确字母", () => {
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
