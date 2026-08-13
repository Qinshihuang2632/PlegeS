/*
 * p了个s · 英了个语 核心逻辑 (src/game2/core.ts) —— 纯逻辑, 无 DOM
 * =================================================================
 * 玩法(v1.1.0 重构, 效仿外刊填词栏目):
 *   由随机一个单词出发, 依「重复字母」与后续词拼接(当前词的后缀 = 下一词的前缀,
 *   共享字母重叠), 形成阶梯状单词链; 删去部分字母形成关卡(挖空),
 *   玩家逐格补全; 每行(词)填满时校验是否为词库单词, 非法扣血标红;
 *   全部词补全且合法 → 通关; 血量归零 → 失败。
 *   最终形状由词长与重叠位置决定, 不一定是规则方格。
 * 道具: 提示(每局最多 2 次, 向随机空位填一个正确字母)。
 * 难度: 简单 K=4 词(基础词/挖40%/首行提示)/ 标准 K=5(进阶词/挖55%/首行提示)/
 *       困难 K=5(课标难词/挖70%/无提示)。
 */
import { WS_WORDS, WS_WORDS_HARD } from "./words";

export const WS_DIFFICULTIES = {
    easy:   { label: "简单", K: 4, dictKey: "basic", firstRowHint: true,  blankRate: 0.40 },
    normal: { label: "标准", K: 5, dictKey: "basic", firstRowHint: true,  blankRate: 0.55 },
    hard:   { label: "困难", K: 5, dictKey: "hard",  firstRowHint: false, blankRate: 0.70 },
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
    return WS_DIFFICULTIES[mode].dictKey === "hard" ? WS_WORDS_HARD : WS_WORDS[WS_DIFFICULTIES[mode].K];
}

/* 链式单词拼图生成: 随机起始词, 依「重复字母」与后续词拼接(当前词后缀 = 下一词前缀,
   重叠 2-3 字母优先), 输出每行词与每行起始列(阶梯错位, 不规则形状)。
   行 i 的起始列 = 行 i-1 中与行 i 重叠部分的起始位置。 */
export function buildChain(K: number, dict: string[]): { rows: string[]; startCol: number[] } | null {
    const pool = [...new Set(dict)];
    for (let t = 0; t < 200; t++) {
        const rows: string[] = [];
        const startCol: number[] = [0];
        let cur = pool[Math.floor(Math.random() * pool.length)];
        rows.push(cur);
        const used = new Set([cur]);
        let ok = true;
        for (let i = 1; i < K; i++) {
            const cands = pool.filter(w => !used.has(w) && w !== cur);
            let next: string | null = null;
            let ovLen = 0;
            for (const ov of [3, 2, 1]) {   // 重叠长度优先 3 → 2 → 1
                const cs = cands.filter(w => w.startsWith(cur.slice(cur.length - ov)));
                if (cs.length) {
                    next = cs[Math.floor(Math.random() * cs.length)];
                    ovLen = ov;
                    break;
                }
            }
            if (!next) { ok = false; break; }
            const overlapStart = cur.length - ovLen;   // 当前词中重叠起始位置(列)
            rows.push(next);
            startCol.push(overlapStart);
            used.add(next);
            cur = next;
        }
        if (ok) return { rows, startCol };
    }
    return null;
}

export class WsGame {
    mode: WsMode = "normal";
    K = 5;                            // 单局单词数量(行数)
    hp = 3;
    rows: string[] = [];              // 每行单词
    startCol: number[] = [];          // 每行起始列(链式错位)
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
        this.K = d.K;
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
        const chain = buildChain(this.K, [...this.dictSet]);
        this.rows = chain?.rows ?? [];
        this.startCol = chain?.startCol ?? [];
        this.puzzle = [];
        this.grid = [];
        this.rowDone = [];
        this.rowBad = [];
        for (let r = 0; r < this.rows.length; r++) {
            const word = this.rows[r];
            this.puzzle.push(word.split(""));
            this.grid.push(Array(word.length).fill(null) as (string | null)[]);
            this.rowDone.push(false);
            this.rowBad.push(false);
            for (let c = 0; c < word.length; c++) {
                const keep = (r === 0 && d.firstRowHint) ? c < word.length : Math.random() > d.blankRate;
                if (keep) {
                    this.grid[r][c] = word[c];
                } else {
                    this.puzzle[r][c] = null;
                }
            }
            if (this.grid[r].every(x => x !== null)) this.rowDone[r] = true;
        }
        this.startAt = Date.now();
    }

    get totalBlanks(): number {
        return this.grid.flat().filter(x => x === null).length;
    }

    /* 提示道具: 向随机空位填一个正确字母(每局最多 HINT_LIMIT 次) */
    hint(): boolean {
        if (this.gameOver || this.win || this.hints >= HINT_LIMIT) return false;
        const blanks: { r: number; c: number }[] = [];
        for (let r = 0; r < this.rows.length; r++)
            for (let c = 0; c < this.rows[r].length; c++)
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
        this.checkEnd();
        return true;
    }

    erase(r: number, c: number): boolean {
        if (this.gameOver || this.win) return false;
        if (this.rowDone[r] || this.puzzle[r][c] !== null) return false;
        this.grid[r][c] = null;
        return true;
    }

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
}
