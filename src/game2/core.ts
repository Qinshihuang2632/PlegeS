/*
 * p了个s · 英语单词数独 核心逻辑 (src/game2/core.ts) —— 纯逻辑, 无 DOM
 * =====================================================================
 * 棋盘 N×N, 每行拼一个完整单词, 每列同样拼成完整单词(对称 word square:
 * 列 j 拼出的词 = 第 j 个行词)。暂不要求「宫」。
 * 玩法: 部分格子预填(题目), 玩家逐格填字母; 每行填满时自动校验是否为词库
 * 单词, 非法则扣血并标红(每行只扣一次), 全部行填满且均为合法词 → 通关;
 * 血量归零 → 失败。
 * 难度: 简单 N=4(短词少挖)/ 标准 N=5 / 困难 N=6(长词多挖)。
 */
import { WS_WORDS, WS_WORDS_HARD } from "./words";

/* 难度: 简单=4×4 基础词少挖 / 标准=5×5 进阶词 / 困难=5×5 难词(低频抽象)多挖且无首行提示
   (6 字母的 6×6 word square 在高考词库下数学上几乎无解, 故困难在词难度与提示上收紧) */
export const WS_DIFFICULTIES = {
    easy:   { label: "简单", N: 4, dictKey: "basic", firstRowHint: true,  blankRate: 0.40 },
    normal: { label: "标准", N: 5, dictKey: "basic", firstRowHint: true,  blankRate: 0.55 },
    hard:   { label: "困难", N: 5, dictKey: "hard",  firstRowHint: false, blankRate: 0.70 },
} as const;
export type WsMode = keyof typeof WS_DIFFICULTIES;

export function dictFor(mode: WsMode): string[] {
    return WS_DIFFICULTIES[mode].dictKey === "hard" ? WS_WORDS_HARD : WS_WORDS[WS_DIFFICULTIES[mode].N];
}

export function shuffleArr<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* word square 生成: 选 N 个行词(两两不同), 使每个转置列也拼成词库单词
   (行词与列词独立、交叉格天然一致; 对称方阵是其特例)。
   回溯逐行构造: 候选行词需使每个「列前缀 + 该字母」仍是词库前缀(剪枝)。 */
export function pickSquare(N: number, dict: string[], tries = 200): string[] | null {
    const set = new Set(dict);
    const pool = [...set];
    // 前缀索引: 词库所有前缀 → 拥有该前缀的词集合
    const pref = new Map<string, Set<string>>();
    for (const w of pool) {
        for (let i = 1; i <= w.length; i++) {
            const p = w.slice(0, i);
            if (!pref.has(p)) pref.set(p, new Set());
            pref.get(p)!.add(w);
        }
    }
    for (let t = 0; t < tries; t++) {
        const order = shuffleArr(pool);
        const rows: string[] = [];
        const ok = (() => {
            const bt = (r: number): boolean => {
                if (r === N) {
                    // 全部列词必须都在词库
                    for (let c = 0; c < N; c++) {
                        const col = rows.map(w => w[c]).join("");
                        if (!set.has(col)) return false;
                    }
                    return true;
                }
                // 候选行词: 未用 + 每个列前缀扩展后仍是词库前缀
                const cands = order.filter(w => {
                    if (rows.includes(w)) return false;
                    for (let c = 0; c < N; c++) {
                        let p = "";
                        for (let k = 0; k < r; k++) p += rows[k][c];
                        if (!pref.has(p + w[c])) return false;
                    }
                    return true;
                });
                for (const w of shuffleArr(cands)) {
                    rows.push(w);
                    if (bt(r + 1)) return true;
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

export type CellState = { answer: string; filled: string | null };

export class WsGame {
    mode: WsMode = "normal";
    N = 5;
    hp = 3;
    rows: string[] = [];                  // 行词(对称方阵, 列词与行词相同)
    puzzle: (string | null)[][] = [];     // 题目(预填字母或 null)
    grid: (string | null)[][] = [];       // 当前填写
    rowDone: boolean[] = [];              // 行已填满且为合法词
    rowBad: boolean[] = [];               // 行已扣血(填满非法)
    selected: { r: number; c: number } | null = null;
    gameOver = false;
    win = false;
    startAt = 0;
    elapsed = 0;
    fills = 0;                            // 已填字母数(排行参考)

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
        this.selected = null;
        this.rows = pickSquare(this.N, [...this.dictSet]) ?? [];
        this.puzzle = [];
        this.grid = [];
        this.rowDone = [];
        this.rowBad = [];
        for (let r = 0; r < this.N; r++) {
            this.puzzle.push(this.rows[r].split(""));
            this.grid.push(Array(this.N).fill(null) as (string | null)[]);
            this.rowDone.push(false);
            this.rowBad.push(false);
            // 挖空: 第一行按难度保留提示; 其余按 blankRate 挖
            for (let c = 0; c < this.N; c++) {
                const keep = (r === 0 && d.firstRowHint) ? c < this.N : Math.random() > d.blankRate;
                if (keep) {
                    this.grid[r][c] = this.rows[r][c];
                } else {
                    this.puzzle[r][c] = null;
                }
            }
            if (this.grid[r].every(x => x !== null)) this.rowDone[r] = true;
        }
        this.startAt = Date.now();
    }

    get remainingBlanks(): number {
        return this.grid.flat().filter(x => x === null).length;
    }

    /* 填字母: 目标格未预填且未定行才可改 */
    fill(r: number, c: number, ch: string): boolean {
        if (this.gameOver || this.win) return false;
        if (this.rowDone[r]) return false;
        if (this.puzzle[r][c] !== null) return false;   // 预填格不可改
        if (!/^[a-z]$/.test(ch)) return false;
        this.grid[r][c] = ch;
        this.fills++;
        this.checkRow(r);
        this.checkEnd();
        return true;
    }

    erase(r: number, c: number): boolean {
        if (this.gameOver || this.win) return false;
        if (this.rowDone[r] || this.puzzle[r][c] !== null) return false;
        this.grid[r][c] = null;
        return true;
    }

    /* 行填满校验: 合法 → rowDone; 非法 → 扣血(仅一次)并标红 */
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

    private checkEnd() {
        if (this.rowDone.every(x => x)) {
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

    /* 当前行词合法性预览(用于 UI 提示, 不扣血) */
    rowWord(r: number): string {
        return this.grid[r].map(x => x ?? "·").join("");
    }
}
