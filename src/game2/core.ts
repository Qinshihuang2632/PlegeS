/*
 * p了个s · 英了个语 核心逻辑 (src/game2/core.ts) —— 纯逻辑, 无 DOM
 * =================================================================
 * 玩法(v1.4.0): 填字游戏式「交叉单词网格」——
 *   若干水平词与垂直词交叉摆放(相交处共享同一字母), 组成自由图形;
 *   未占用的表格位为灰色、不可点(不是单词的组成成分)。
 *   生成器自算标准答案, 挖空后经回溯求解器验证「唯一解」, 无逻辑漏洞。
 *   校验按横行纵列: 每个词(水平/垂直)填满时校验是否为词库单词, 非法扣血。
 *   生成保证: 每个词都与已放词交叉共享至少 1 格(全图连通), 且边界框受各难度
 *   maxDim 约束(简单 7 / 标准 9 / 困难 10), 图形紧凑不撑爆界面。
 *   生成只用「有释义的词」, 保证对局内每个词都能在结算页查看词性与释义。
 * 道具: 填空提示(每局 2 次, 向随机空位填正确字母)/ 含义提示(每局 1 次,
 *       提示随机一个未填完单词的随机一条释义)。
 * 难度: 每词挖空受「已知字母数」配额控制(known 数组, 不挖出只有 1 个字母已知的词):
 *       简单 4 词(4 字母, 首词全提示其余各留 2 字母, 至少 1 交叉格被挖且总空 ≥4)/
 *       标准 6 词(5 字母, 2 全提示 + 2 留 3 字母 + 2 留 2 字母)/
 *       困难 8 词(5 字母课标难词, 1 全提示 + 2 留 3 字母 + 5 留 2 字母); 均保证唯一解。
 */
import { YLGY_WORDS, YLGY_WORDS_HARD } from "./words";
import { YLGY_MEANINGS } from "./meanings";
import { YLGY_MEANINGS_5 } from "./meanings5";

export const YLGY_DIFFICULTIES = {
    easy:   { label: "简单", words: 4, len: 4, dictKey: "basic", known: [4, 2, 2, 2], maxDim: 7 },
    normal: { label: "标准", words: 6, len: 5, dictKey: "basic", known: [5, 5, 3, 3, 2, 2], maxDim: 9 },
    hard:   { label: "困难", words: 8, len: 5, dictKey: "hard",  known: [5, 3, 3, 2, 2, 2, 2, 2], maxDim: 10 },
} as const;
export type YlgyMode = keyof typeof YLGY_DIFFICULTIES;

export const HINT_LIMIT = 2;          // 填空提示每局次数
export const MEANING_HINT_LIMIT = 1;  // 含义提示每局次数

export function shuffleArr<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* 单词释义(4/5 字母词库); 无释义返回 null */
export function meaningOf(word: string): { pos: string; zh: string }[] | null {
    return YLGY_MEANINGS[word] ?? YLGY_MEANINGS_5[word] ?? null;
}

/* 生成词库 = 课标词 ∩ 有释义词(保证本局所有词可解释) */
export function dictFor(mode: YlgyMode): string[] {
    const base = YLGY_DIFFICULTIES[mode].dictKey === "hard" ? YLGY_WORDS_HARD : YLGY_WORDS[YLGY_DIFFICULTIES[mode].len];
    return base.filter(w => meaningOf(w) !== null);
}

export interface PlacedWord {
    word: string;
    r: number;      // 起始行
    c: number;      // 起始列
    dir: "h" | "v";
}

/* 交叉单词网格生成: 第 1 词水平放置, 之后每词与已放词垂直交叉
   (新词穿过某已放词的某个字母, 共享字母一致; 其余格不得与已有格冲突;
   新词首尾不得紧贴已有字母, 以免两条同向词拼成一条长线)。词不重复。
   生成过程中实时维护边界框, 任一方向超过 maxDim 即放弃该候选, 保证图形紧凑。
   坐标可为负, 生成后归一化到 0 起。 */
export function buildCross(
    count: number,
    dict: string[],
    maxDim = Infinity,
): { words: PlacedWord[]; H: number; W: number; map: Map<string, string> } | null {
    const pool = [...new Set(dict)];
    for (let t = 0; t < 400; t++) {
        const used = new Set<string>();
        const words: PlacedWord[] = [];
        const map = new Map<string, string>();   // "r,c" → letter
        const first = pool[Math.floor(Math.random() * pool.length)];
        words.push({ word: first, r: 0, c: 0, dir: "h" });
        used.add(first);
        for (let k = 0; k < first.length; k++) map.set(`0,${k}`, first[k]);
        // 当前边界框(未归一化): 首词占第 0 行、0..len-1 列
        let minR = 0, maxR = 0, minC = 0, maxC = first.length - 1;

        let ok = true;
        for (let i = 1; i < count; i++) {
            // 随机挑一个已放词, 随机挑一个字母位, 尝试垂直方向放新词
            const placed = shuffleArr([...words]);
            let placedOk = false;
            for (const pw of placed) {
                const idxs = shuffleArr(Array.from({ length: pw.word.length }, (_, i) => i));
                for (const k of idxs) {
                    const anchor = pw.word[k];
                    const cands = shuffleArr(pool.filter(w => !used.has(w) && w.includes(anchor) && w !== pw.word));
                    for (const w of cands) {
                        // 新词与 pw 垂直交叉: 新词的第 j 个字母 = anchor
                        for (const j of shuffleArr(Array.from({ length: w.length }, (_, i) => i))) {
                            if (w[j] !== anchor) continue;
                            // 计算新词起点: pw 的第 k 格 (anchor) 与新词的第 j 格重合
                            const dir: "h" | "v" = pw.dir === "h" ? "v" : "h";
                            const nr = pw.dir === "h" ? pw.r - j : pw.r + k;
                            const nc = pw.dir === "h" ? pw.c + k : pw.c - j;
                            // 逐格检查: 与已占格字母必须一致; 同时收集"新增格"(非交叉点)
                            let conflict = false;
                            const fresh: Array<[number, number]> = [];
                            for (let s = 0; s < w.length; s++) {
                                const rr = dir === "h" ? nr : nr + s;
                                const cc = dir === "h" ? nc + s : nc;
                                const key = `${rr},${cc}`;
                                if (map.has(key)) {
                                    if (map.get(key) !== w[s]) { conflict = true; break; }
                                } else {
                                    fresh.push([rr, cc]);
                                }
                            }
                            if (conflict) continue;
                            // 邻接检查(标准 crossword 规则, 防止产生不成词的连字):
                            //   ① 新词首尾(沿自身方向)外扩一格不得已占 —— 避免同向两词拼成长词;
                            //   ② 每个"新增格"的垂直方向邻居必须为空 —— 避免与已有字母相邻却无交叉,
                            //      否则会拼出字典里没有的横向/纵向假词。
                            const beforeR = dir === "h" ? nr : nr - 1;
                            const beforeC = dir === "h" ? nc - 1 : nc;
                            const afterR = dir === "h" ? nr : nr + w.length;
                            const afterC = dir === "h" ? nc + w.length : nc;
                            if (map.has(`${beforeR},${beforeC}`) || map.has(`${afterR},${afterC}`)) continue;
                            let adj = false;
                            for (const [rr, cc] of fresh) {
                                if (dir === "v") {
                                    if (map.has(`${rr},${cc - 1}`) || map.has(`${rr},${cc + 1}`)) { adj = true; break; }
                                } else {
                                    if (map.has(`${rr - 1},${cc}`) || map.has(`${rr + 1},${cc}`)) { adj = true; break; }
                                }
                            }
                            if (adj) continue;
                            // 边界框检查: 放置后任一方向不得超过 maxDim
                            const eR0 = nr, eR1 = dir === "v" ? nr + w.length - 1 : nr;
                            const eC0 = nc, eC1 = dir === "h" ? nc + w.length - 1 : nc;
                            const nMinR = Math.min(minR, eR0), nMaxR = Math.max(maxR, eR1);
                            const nMinC = Math.min(minC, eC0), nMaxC = Math.max(maxC, eC1);
                            if (nMaxR - nMinR + 1 > maxDim || nMaxC - nMinC + 1 > maxDim) continue;
                            // 放置
                            for (let s = 0; s < w.length; s++) {
                                const rr = dir === "h" ? nr : nr + s;
                                const cc = dir === "h" ? nc + s : nc;
                                map.set(`${rr},${cc}`, w[s]);
                            }
                            words.push({ word: w, r: nr, c: nc, dir });
                            used.add(w);
                            minR = nMinR; maxR = nMaxR; minC = nMinC; maxC = nMaxC;
                            placedOk = true;
                            break;
                        }
                        if (placedOk) break;
                    }
                    if (placedOk) break;
                }
                if (placedOk) break;
            }
            if (!placedOk) { ok = false; break; }
        }
        if (!ok) continue;

        const H = maxR - minR + 1, W = maxC - minC + 1;
        const norm: PlacedWord[] = words.map(w => ({ ...w, r: w.r - minR, c: w.c - minC }));
        const nmap = new Map<string, string>();
        for (const [k, v] of map) {
            const [r, c] = k.split(",").map(Number);
            nmap.set(`${r - minR},${c - minC}`, v);
        }
        return { words: norm, H, W, map: nmap };
    }
    return null;
}

/* 交叉网格求解器: 填满占用格, 使每个词(横/竖)都是词典单词。
   MRV 启发式(候选最少的词优先) + 候选按已定字母过滤 + maxSols 上限(找满即停)。 */
export function solveCross(
    _occupied: boolean[][],
    pre: (string | null)[][],
    words: PlacedWord[],
    dict: string[],
    maxSols = 2,
): string[][] {
    const set = new Set(dict);
    const grid: (string | null)[][] = pre.map(row => [...row]);
    const solutions: string[][] = [];

    const cellsOf = (w: PlacedWord): [number, number][] => {
        const cells: [number, number][] = [];
        for (let s = 0; s < w.word.length; s++)
            cells.push(w.dir === "h" ? [w.r, w.c + s] : [w.r + s, w.c]);
        return cells;
    };

    const bt = (): void => {
        if (solutions.length >= maxSols) return;
        // MRV: 选「候选词最少」且有空格子的词
        let best: PlacedWord | null = null;
        let bestCands: string[] | null = null;
        for (const w of words) {
            const cells = cellsOf(w);
            if (cells.every(([r, c]) => grid[r][c] !== null)) continue;
            const cands = [...set].filter(cand =>
                cand.length === w.word.length &&
                cells.every(([r, c], s) => grid[r][c] === null || grid[r][c] === cand[s]));
            if (cands.length === 0) return;                    // 无解
            if (!bestCands || cands.length < bestCands.length) { best = w; bestCands = cands; }
        }
        if (!best || !bestCands) {   // 全部填满 → 校验所有词
            for (const w of words) {
                const cells = cellsOf(w);
                const word = cells.map(([r, c]) => grid[r][c]).join("");
                if (!set.has(word)) return;
            }
            solutions.push(grid.map(row => row.map(v => v ?? "").join("")));
            return;
        }
        for (const cand of bestCands) {
            const cells = cellsOf(best);
            const writes: [number, number][] = [];
            for (let s = 0; s < cand.length; s++) {
                const [r, c] = cells[s];
                if (grid[r][c] === null) { grid[r][c] = cand[s]; writes.push([r, c]); }
            }
            bt();
            for (const [r, c] of writes) grid[r][c] = null;
        }
    };
    bt();
    return solutions;
}

export class YlgyGame {
    mode: YlgyMode = "normal";
    hp = 3;
    words: PlacedWord[] = [];       // 全部词(横+竖)
    H = 0; W = 0;                   // 网格尺寸(自由图形范围)
    occupied: boolean[][] = [];     // 占用格(单词组成成分)
    puzzle: (string | null)[][] = []; // 题面(预填字母或 null)
    grid: (string | null)[][] = []; // 当前填写
    wordDone: boolean[] = [];
    wordBad: boolean[] = [];
    wordBadAt: (number | null)[] = [];   // 该词最近一次判错的时间戳(UI 据此闪红 2 秒后变无色)
    selected: { r: number; c: number } | null = null;
    gameOver = false;
    win = false;
    startAt = 0;
    elapsed = 0;
    fills = 0;
    hints = 0;                        // 已用填空提示次数
    meaningHints = 0;                 // 已用含义提示次数

    private dictSet: Set<string> = new Set();

    constructor(mode: YlgyMode = "normal") {
        this.applyMode(mode);
        this.newGame();
    }

    applyMode(mode: YlgyMode) {
        this.mode = mode;
        this.dictSet = new Set(dictFor(mode));
    }

    newGame() {
        const d = YLGY_DIFFICULTIES[this.mode];
        this.hp = 3;
        this.gameOver = false;
        this.win = false;
        this.fills = 0;
        this.hints = 0;
        this.meaningHints = 0;
        this.selected = null;

        const dict = [...this.dictSet];
        const gen = this.buildUniquePuzzle(d, dict);
        this.words = gen.words;
        this.H = gen.H;
        this.W = gen.W;
        this.occupied = gen.occupied;
        this.puzzle = gen.puzzle;
        this.grid = gen.grid.map(row => [...row]);
        this.wordDone = [];
        this.wordBad = [];
        this.wordBadAt = [];
        for (let i = 0; i < this.words.length; i++) {
            this.wordDone.push(this.wordCells(i).every(([r, c]) => this.grid[r][c] !== null));
            this.wordBad.push(false);
            this.wordBadAt.push(null);
        }
        this.startAt = Date.now();
    }

    wordCells(wi: number): [number, number][] {
        const w = this.words[wi];
        const cells: [number, number][] = [];
        for (let s = 0; s < w.word.length; s++)
            cells.push(w.dir === "h" ? [w.r, w.c + s] : [w.r + s, w.c]);
        return cells;
    }

    /* 生成答案交叉网格 → 从全填出发逐步挖空: 每一步挖掉某格后都验证
       「恰有 1 个解」, 不唯一则恢复该格 —— 挖空最大化且唯一解严格保证 */
    private buildUniquePuzzle(d: typeof YLGY_DIFFICULTIES[YlgyMode], dict: string[]):
        { words: PlacedWord[]; H: number; W: number; occupied: boolean[][]; puzzle: (string | null)[][]; grid: (string | null)[][] } {
        for (let attempt = 0; attempt < 60; attempt++) {
            const built = buildCross(d.words, dict, d.maxDim);
            if (!built) continue;
            const { words, H, W, map } = built;
            const occupied: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
            const grid: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
            const cells: [number, number][] = [];
            for (const [k, v] of map) {
                const [r, c] = k.split(",").map(Number);
                occupied[r][c] = true;
                grid[r][c] = v;
                cells.push([r, c]);
            }
            // 每词最大挖空数 = 词长 - 该词已知字母数(known=词长 的词全提示不挖)
            const maxDugPerWord = words.map((_, wi) => d.len - d.known[wi]);
            const dugPerWord = words.map(() => 0);
            // 该格所属词(至多一横一竖)
            const ownersOf = (r: number, c: number): number[] => {
                const owners: number[] = [];
                for (let wi = 0; wi < words.length; wi++) {
                    const wc = this.wordCellsOf(words[wi]);
                    if (wc.some(([rr, cc]) => rr === r && cc === c)) owners.push(wi);
                }
                return owners;
            };
            // 挖空: 按词轮询, 每词尽量挖满配额(挖掉保持唯一解, 交叉格同时扣两词配额)
            const order = shuffleArr(words.map((_, i) => i));
            let dug = 0;
            for (const wi of order) {
                const wCells = this.wordCellsOf(words[wi]);
                shuffleArr(wCells);
                for (const [r, c] of wCells) {
                    if (dugPerWord[wi] >= maxDugPerWord[wi]) break;
                    if (grid[r][c] === null) continue;
                    const owners = ownersOf(r, c);
                    if (owners.some(o => dugPerWord[o] >= maxDugPerWord[o])) continue;
                    const ans = map.get(`${r},${c}`) ?? "";
                    grid[r][c] = null;
                    if (solveCross(occupied, grid, words, dict, 2).length === 1) {
                        dug++;
                        for (const o of owners) dugPerWord[o]++;
                    } else {
                        grid[r][c] = ans;   // 挖掉会多解 → 保留提示
                    }
                }
            }
            // 简单难度额外保证: 总空格 ≥4, 且至少一个「交叉格」(两个词的共用字母)被挖空
            let crossBlankOk = true;
            if (this.mode === "easy") {
                const crossCells = cells.filter(([r, c]) => {
                    const owners = ownersOf(r, c);
                    return owners.length >= 2 && owners.every(o => maxDugPerWord[o] > 0);
                });
                if (dug < 4) continue;   // 总空格不足 → 重新生成
                if (!crossCells.some(([r, c]) => grid[r][c] === null)) {
                    crossBlankOk = false;
                    shuffleArr(crossCells);
                    for (const [r, c] of crossCells) {
                        if (grid[r][c] !== null) continue;
                        const owners = ownersOf(r, c);
                        if (owners.some(o => dugPerWord[o] >= maxDugPerWord[o])) continue;
                        const ans = map.get(`${r},${c}`) ?? "";
                        grid[r][c] = null;
                        if (solveCross(occupied, grid, words, dict, 2).length === 1) {
                            dug++;
                            for (const o of owners) dugPerWord[o]++;
                            crossBlankOk = true;
                            break;
                        }
                        grid[r][c] = ans;
                    }
                }
            }
            // easy 保证未满足 → 重新生成(避免总空格 <4 或交叉格全提示的弱题)
            if (this.mode === "easy" && (dug < 4 || !crossBlankOk)) continue;
            if (dug > 0) {
                return { words, H, W, occupied, puzzle: grid.map(row => row.map(v => v)), grid };
            }
        }
        // 兜底(理论几乎不发生): 全部提示
        const built = buildCross(d.words, dict, d.maxDim) ?? { words: [], H: 1, W: 1, map: new Map<string, string>() };
        const occupied: boolean[][] = Array.from({ length: built.H }, () => Array(built.W).fill(false));
        const grid: (string | null)[][] = Array.from({ length: built.H }, () => Array(built.W).fill(null));
        for (const [k, v] of built.map) {
            const [r, c] = k.split(",").map(Number);
            occupied[r][c] = true;
            grid[r][c] = v;
        }
        return { words: built.words, H: built.H, W: built.W, occupied, puzzle: grid.map(row => row.map(v => v)), grid };
    }

    wordCellsOf(w: PlacedWord): [number, number][] {
        const cells: [number, number][] = [];
        for (let s = 0; s < w.word.length; s++)
            cells.push(w.dir === "h" ? [w.r, w.c + s] : [w.r + s, w.c]);
        return cells;
    }

    /* 待填数 = 占用格(单词成分)中未填的格数。不把未占用(灰色)格计入,
       否则总空格数虚高(灰色格在 grid 中也是 null) */
    get totalBlanks(): number {
        let n = 0;
        for (let r = 0; r < this.H; r++)
            for (let c = 0; c < this.W; c++)
                if (this.occupied[r][c] && this.grid[r][c] === null) n++;
        return n;
    }

    /* 填空提示(v1.4.0 更名): 向随机空位填一个正确字母(每局 HINT_LIMIT 次)。
       v1.5.4: 跳过已被正确词锁定的格子, 避免提示落空 */
    hint(): boolean {
        if (this.gameOver || this.win || this.hints >= HINT_LIMIT) return false;
        const blanks: [number, number][] = [];
        for (let r = 0; r < this.H; r++)
            for (let c = 0; c < this.W; c++)
                if (this.occupied[r][c] && this.grid[r][c] === null && !this.cellLocked(r, c)) blanks.push([r, c]);
        if (!blanks.length) return false;
        const [r, c] = blanks[Math.floor(Math.random() * blanks.length)];
        this.hints++;
        this.fill(r, c, this.cellAnswer(r, c));
        return true;
    }

    /* 含义提示(v1.4.1): 提示随机一个未填完单词的随机一条释义(每局 MEANING_HINT_LIMIT 次)。
       不返回单词拼写 —— UI 用蓝圈圈出该词全部格子, 并在 7 秒/按键后消除 */
    meaningHint(): { wi: number; meaning: { pos: string; zh: string } } | null {
        if (this.gameOver || this.win || this.meaningHints >= MEANING_HINT_LIMIT) return null;
        const undone: number[] = this.words.map((_, i) => i).filter(i => !this.wordDone[i] && !this.wordBad[i]);
        if (!undone.length) return null;
        const wi = undone[Math.floor(Math.random() * undone.length)];
        const ms = meaningOf(this.words[wi].word);
        if (!ms || !ms.length) return null;
        this.meaningHints++;
        return { wi, meaning: ms[Math.floor(Math.random() * ms.length)] };
    }

    cellAnswer(r: number, c: number): string {
        for (let i = 0; i < this.words.length; i++) {
            const cells = this.wordCells(i);
            const idx = cells.findIndex(([rr, cc]) => rr === r && cc === c);
            if (idx >= 0) return this.words[i].word[idx];
        }
        return "";
    }

    fill(r: number, c: number, ch: string): boolean {
        if (this.gameOver || this.win) return false;
        if (!this.occupied[r][c]) return false;               // 非占用格不可填
        if (this.puzzle[r][c] !== null) return false;
        if (this.cellLocked(r, c)) return false;              // v1.5.4: 正确词的格子锁定禁止改动
        if (!/^[a-z]$/.test(ch)) return false;
        this.grid[r][c] = ch;
        this.fills++;
        this.checkCellWords(r, c);
        this.checkEnd();
        return true;
    }

    erase(r: number, c: number): boolean {
        if (this.gameOver || this.win) return false;
        if (!this.occupied[r][c] || this.puzzle[r][c] !== null) return false;
        if (this.cellLocked(r, c)) return false;              // v1.5.4: 正确词的格子锁定禁止改动
        this.grid[r][c] = null;
        return true;
    }

    /** 该格是否已被某个「已完成(正确)」的词锁定 */
    private cellLocked(r: number, c: number): boolean {
        return this.words.some((_, i) => this.wordDone[i] &&
            this.wordCells(i).some(([rr, cc]) => rr === r && cc === c));
    }

    /* 校验经过该格的所有词(至多一横一竖)。
       v1.5.4: 填满即重新检测——已判错的词被修改后再次填满, 仍按当前内容重新判定;
       错误则每次填满都扣血(不是只扣第一次), 并记录判错时间戳供 UI 闪红 2 秒 */
    private checkCellWords(r: number, c: number) {
        for (let i = 0; i < this.words.length; i++) {
            const cells = this.wordCells(i);
            if (!cells.some(([rr, cc]) => rr === r && cc === c)) continue;
            if (this.wordDone[i]) continue;
            const missing = cells.some(([rr, cc]) => this.grid[rr][cc] === null);
            if (missing) continue;
            const word = cells.map(([rr, cc]) => this.grid[rr][cc]).join("");
            if (this.dictSet.has(word)) {
                this.wordDone[i] = true;
                this.wordBad[i] = false;
                this.wordBadAt[i] = null;
            } else {
                this.wordBad[i] = true;
                this.wordBadAt[i] = Date.now();
                this.hp--;
            }
        }
    }

    private checkEnd() {
        if (this.wordDone.every(x => x)) {
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
