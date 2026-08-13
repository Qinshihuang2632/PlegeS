/*
 * p了个s · 英了个语 核心逻辑 (src/game2/core.ts) —— 纯逻辑, 无 DOM
 * =================================================================
 * 玩法(v1.2.0 重构): 规则 N×N 网格(word square)——
 *   每行拼成一个完整单词, 每列也拼成一个完整单词(对称方阵: 列 j 拼出的
 *   词 = 第 j 个行词); 部分格子预填为题面, 玩家逐格补全。
 *   生成器自算标准答案并保证「唯一解」: 挖空后经回溯求解器验证解数 == 1,
 *   多解则逐格补回提示直到唯一 —— 无逻辑漏洞, 可逐步推理。
 *   每行/列填满时校验是否为词库单词, 非法扣血标红; 全部补全且合法 → 通关。
 * 道具: 提示(每局最多 2 次, 向随机空位填一个正确字母)。
 * 难度: 简单 N=4(基础词/挖40%/首行提示)/ 标准 N=5(进阶词/挖55%/首行提示)/
 *       困难 N=5(课标难词/挖70%/无提示), 均保证唯一解。
 */
import { WS_WORDS, WS_WORDS_HARD } from "./words";

export const WS_DIFFICULTIES = {
    easy:   { label: "简单", N: 4, dictKey: "basic", firstRowHint: true,  blankRate: 0.40 },
    normal: { label: "标准", N: 5, dictKey: "basic", firstRowHint: true,  blankRate: 0.55 },
    hard:   { label: "困难", N: 5, dictKey: "hard",  firstRowHint: false, blankRate: 0.70 },
} as const;
export type WsMode = keyof typeof WS_DIFFICULTIES;

export const HINT_LIMIT = 2;   // 提示道具每局次数

export function shuffleArr<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function dictFor(mode: WsMode): string[] {
    return WS_DIFFICULTIES[mode].dictKey === "hard" ? WS_WORDS_HARD : WS_WORDS[WS_DIFFICULTIES[mode].N];
}

/* 对称 word square 生成: 选 N 个 N 字母行词, 满足 words[i][j] === words[j][i]
   (列 j 即行词 j, 转置后仍是词)。回溯构造, 失败换随机序重试。 */
export function pickSquare(N: number, dict: string[]): string[] | null {
    const pool = [...new Set(dict)];
    for (let t = 0; t < 300; t++) {
        const order = shuffleArr(pool);
        const rows: string[] = [];
        const ok = (() => {
            const bt = (i: number): boolean => {
                if (i === N) return true;
                for (const w of order) {
                    if (rows.includes(w)) continue;
                    let match = true;
                    for (let k = 0; k < i; k++) {
                        if (w[k] !== rows[k][i]) { match = false; break; }
                    }
                    if (!match) continue;
                    rows.push(w);
                    if (bt(i + 1)) return true;
                    rows.pop();
                }
                return false;
            };
            return bt(0);
        })();
        if (ok) return rows;
    }
    return null;
}

/* 对称 word square 求解器: 给定部分预填网格(字母或 null), 返回所有对称解。
   行词两两不同; 对称约束 words[i][j] === words[j][i]。 */
export function solveSquare(pre: (string | null)[][], dict: string[]): string[][] {
    const N = pre.length;
    const set = new Set(dict);
    const pool = [...set];
    const grid: (string | null)[][] = pre.map(row => [...row]);
    const solutions: string[][] = [];
    const bt = (i: number) => {
        if (i === N) {
            solutions.push(grid.map(row => row.join("")));
            return;
        }
        for (const w of pool) {
            // 与已选行词不重复
            if (grid.slice(0, i).some(r => r.join("") === w)) continue;
            let match = true;
            for (let c = 0; c < N; c++) {
                // 对称: 填 (i,c) 需等于 (c,i); 若 c 行已填则取已定值
                const known = c < i ? grid[c][i] : grid[i][c];
                if (known !== null && known !== w[c]) { match = false; break; }
            }
            if (!match) continue;
            // 写入 (i, c) 与 (c, i)
            const written: [number, number][] = [];
            for (let c = 0; c < N; c++) {
                if (grid[i][c] === null) { grid[i][c] = w[c]; written.push([i, c]); }
                if (grid[c][i] === null) { grid[c][i] = w[c]; written.push([c, i]); }
            }
            bt(i + 1);
            for (const [r, c] of written) grid[r][c] = null;
        }
    };
    bt(0);
    return solutions;
}

export class WsGame {
    mode: WsMode = "normal";
    N = 5;                            // 网格边长(每行/每列一个单词)
    hp = 3;
    rows: string[] = [];              // 行词(对称方阵, 列词与行词相同)
    puzzle: (string | null)[][] = []; // 题面(预填字母或 null)
    grid: (string | null)[][] = [];   // 当前填写
    rowDone: boolean[] = [];
    rowBad: boolean[] = [];
    selected: { r: number; c: number } | null = null;
    gameOver = false;
    win = false;
    startAt = 0;
    elapsed = 0;
    fills = 0;                        // 已填字母数(排行参考)
    hints = 0;                        // 已用提示次数

    private dictSet: Set<string> = new Set();

    constructor(mode: WsMode = "normal") {
        this.applyMode(mode);
        this.newGame();
    }

    applyMode(mode: WsMode) {
        const d = WS_DIFFICULTIES[mode];
        this.mode = mode;
        this.N = d.N;
        this.dictSet = new Set(dictFor(mode));
    }

    newGame() {
        const d = WS_DIFFICULTIES[this.mode];
        this.hp = 3;
        this.gameOver = false;
        this.win = false;
        this.fills = 0;
        this.hints = 0;
        this.selected = null;

        const dict = [...this.dictSet];
        // 生成答案方阵 + 挖空, 并保证唯一解
        const gen = this.buildUniquePuzzle(d, dict);
        this.rows = gen.rows;
        this.puzzle = gen.puzzle;
        this.grid = gen.grid.map(row => [...row]);
        this.rowDone = [];
        this.rowBad = [];
        for (let r = 0; r < this.N; r++) {
            this.rowDone.push(this.grid[r].every(x => x !== null));
            this.rowBad.push(false);
        }
        this.startAt = Date.now();
    }

    /* 生成答案方阵 → 按难度挖空 → 回溯求解验证唯一解;
       多解时逐格补回「其它解中与答案不同」的提示, 直到唯一解 */
    private buildUniquePuzzle(d: typeof WS_DIFFICULTIES[WsMode], dict: string[]):
        { rows: string[]; puzzle: (string | null)[][]; grid: (string | null)[][] } {
        for (let attempt = 0; attempt < 60; attempt++) {
            const rows = pickSquare(this.N, dict);
            if (!rows) continue;
            // 初始挖空
            let grid: (string | null)[][] = rows.map(w => w.split(""));
            for (let r = 0; r < this.N; r++) {
                for (let c = 0; c < this.N; c++) {
                    const keep = (r === 0 && d.firstRowHint) ? true : Math.random() > d.blankRate;
                    if (!keep) grid[r][c] = null;
                }
            }
            // 保证唯一解: 多解则把「其他解中不同于答案」的某格补回为提示
            let guard = 0;
            for (;;) {
                const sols = solveSquare(grid, dict);
                if (sols.length === 0) break;               // 无解(理论不应发生) → 重新生成
                if (sols.length === 1) {
                    const puzzle = grid.map(row => row.map(v => v));   // 预填副本
                    return { rows, puzzle, grid };
                }
                // 多解: 找一个空位, 该格在某非答案解中与答案不同 → 补回为提示
                let fixed = false;
                for (let r = 0; r < this.N && !fixed; r++) {
                    for (let c = 0; c < this.N && !fixed; c++) {
                        if (grid[r][c] !== null) continue;
                        const diff = sols.find(s => s[r][c] !== rows[r][c]);
                        if (diff) { grid[r][c] = rows[r][c]; fixed = true; }
                    }
                }
                if (!fixed) break;                          // 无空位可补 → 重新生成
                if (++guard > 40) break;
            }
        }
        // 兜底: 退化为全提示(首行) + 多解容忍(极少发生)
        const rows = pickSquare(this.N, dict) ?? Array(this.N).fill("aaaa");
        const grid: (string | null)[][] = rows.map(w => w.split(""));
        const puzzle = grid.map(row => row.map(v => v));
        return { rows, puzzle, grid };
    }

    get totalBlanks(): number {
        return this.grid.flat().filter(x => x === null).length;
    }

    /* 提示道具: 向随机空位填一个正确字母(每局最多 HINT_LIMIT 次) */
    hint(): boolean {
        if (this.gameOver || this.win || this.hints >= HINT_LIMIT) return false;
        const blanks: { r: number; c: number }[] = [];
        for (let r = 0; r < this.N; r++)
            for (let c = 0; c < this.N; c++)
                if (this.grid[r][c] === null && this.puzzle[r][c] === null) blanks.push({ r, c });
        if (!blanks.length) return false;
        const b = blanks[Math.floor(Math.random() * blanks.length)];
        this.hints++;
        this.fill(b.r, b.c, this.rows[b.r][b.c]);
        return true;
    }

    fill(r: number, c: number, ch: string): boolean {
        if (this.gameOver || this.win) return false;
        if (this.rowDone[r]) return false;
        if (this.puzzle[r][c] !== null) return false;
        if (!/^[a-z]$/.test(ch)) return false;
        this.grid[r][c] = ch;
        this.fills++;
        this.checkRow(r);
        this.checkCol(c);
        this.checkEnd();
        return true;
    }

    erase(r: number, c: number): boolean {
        if (this.gameOver || this.win) return false;
        if (this.rowDone[r] || this.puzzle[r][c] !== null) return false;
        this.grid[r][c] = null;
        return true;
    }

    /* 行填满校验 */
    private checkRow(r: number) {
        if (this.rowDone[r]) return;
        if (this.grid[r].some(x => x === null)) return;
        const word = this.grid[r].join("");
        if (this.dictSet.has(word)) {
            this.rowDone[r] = true;
            this.rowBad[r] = false;
        } else if (!this.rowBad[r]) {
            this.rowBad[r] = true;
            this.hp--;
        }
    }

    /* 列填满校验(对称方阵下列词 = 行词转置, 但显式校验更稳健) */
    private checkCol(c: number) {
        const col = this.grid.map(row => row[c]);
        if (col.some(x => x === null)) return;
        const word = col.join("");
        if (this.dictSet.has(word)) return;   // 列合法
        // 列非法: 若对应行尚未判定, 扣血一次
        const r = c;                          // 对称方阵列 c = 行词 c
        if (!this.rowBad[r] && !this.rowDone[r]) {
            this.rowBad[r] = true;
            this.hp--;
        }
    }

    private checkEnd() {
        const allDone = this.rowDone.every(x => x);
        if (allDone) {
            this.win = true;
            this.gameOver = true;
            this.elapsed = Math.floor((Date.now() - this.startAt) / 1000);
            return;
        }
        if (this.hp <= 0) {
            this.gameOver = true;
            this.elapsed = Math.floor((Date.now() - this.startAt) / 1000);
        }
    }
}
