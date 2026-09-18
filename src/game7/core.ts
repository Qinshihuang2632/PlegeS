/*
 * 历了个史 · 核心逻辑 (src/game7/core.ts) —— 纯逻辑, 无 DOM
 * =====================================================
 * 玩法(v1.3.0 列模型重做): 时间轴排序 —— 每局 5 张历史事件卡组成若干「列」,
 *   列从左到右按时间先后排列, 同一年的事件可上下并列在同一列(顺序不限)。
 *   玩家点选一张卡, 再用方位按键移动: 左/右=与左/右相邻卡交换;
 *   左上/左下=移到左列顶部/底部(构成并列); 右上/右下=移到右列顶部/底部。
 *   点「提交判定」: 归位正确(卡处于其年份区段)→ 变绿锁定; 错位→ 标红可继续调整。
 * 无血条(宽容理念): 失误 = 提交判定次数; 提示道具每局 2 次(自动把一张错位卡
 *   放回正确位置并锁定, 计入排名)。
 * 选中跟踪(v1.3.0): 选中对象是「卡」而非槽位 —— 移动/交换后选中跟随该卡,
 *   直到点按其他卡才切换。已归位(绿)卡不可点选、不可被移动。
 * 难度: 简单(中国古代+近现代常识, 年份跨度大) / 标准(近代史+世界史)
 *       / 困难(全库, 75% 局含同年并列组, 解除年份去重)。
 * 榜单: 独立 API /llgs/api/rank, 排序 归位对数↓ → 用时↑ → 失误↑ → 提示↑。
 */
import { bank, type LlgsEvent, type LlgsMode } from "./bank";
export type { LlgsEvent, LlgsMode } from "./bank";

export const ROUND_CARDS = 5;     // 每局事件卡数
export const HINT_LIMIT = 2;      // 提示道具每局次数

/* 难度 → 题库池 */
const POOL_OF: Record<LlgsMode, LlgsEvent[]> = {
    easy: bank.filter((e) => e.tier === 1),
    normal: bank.filter((e) => e.tier <= 2),
    hard: bank,
};

export interface LlgsCard {
    ev: LlgsEvent;
    done?: boolean;   // 已归位(锁定; v1.3.0 挂在卡对象上, 跟随卡移动)
}

export interface LlgsState {
    mode: LlgsMode;
    phase: "playing" | "win";
    cols: LlgsCard[][];       // 列模型: 外层=列(左→右), 内层=列内卡(上→下)
    sel: string | null;       // 选中卡的事件名(唯一, 跟随卡移动)
    attempts: number;         // 提交判定次数(失误)
    hintsLeft: number;
    lastWrong: string[] | null;   // 上一次判定的错位卡事件名(UI 标红)
    elapsed: number;
}

/* 可播种的伪随机(测试用) */
export function seedRng(seed: number): () => number {
    let s = seed >>> 0 || 1;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
}

function shuffle<T>(a: T[], rng: () => number): T[] {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** 展平列结构(列左→右 × 列内上→下) */
export function flatCols(cols: LlgsCard[][]): LlgsCard[] {
    return cols.flat();
}

/** 展平序列是否年份非降序(即全部归位; 同年并列任意上下顺序均正确) */
export function isYearlyCorrect(cols: LlgsCard[][]): boolean {
    const flat = flatCols(cols);
    for (let i = 1; i < flat.length; i++) {
        if (flat[i - 1].ev.y > flat[i].ev.y) return false;
    }
    return true;
}

/** 展平序列中某年份的「正确区段」[首, 末](供判定/提示) */
function yearRange(flat: LlgsCard[], y: number): [number, number] {
    const ys = flat.map((c) => c.ev.y).sort((a, b) => a - b);
    return [ys.indexOf(y), ys.lastIndexOf(y)];
}

/** 按展平区段重算所有卡的 done */
function recomputeDone(st: LlgsState) {
    const flat = flatCols(st.cols);
    const ys = flat.map((c) => c.ev.y).sort((a, b) => a - b);
    for (const c of st.cols.flat()) {
        const lo = ys.indexOf(c.ev.y);
        const hi = ys.lastIndexOf(c.ev.y);
        const pos = flat.findIndex((f) => f.ev.n === c.ev.n);
        c.done = pos >= lo && pos <= hi;
    }
}

/** 开局: 按难度抽 5 张事件, 每卡独立成列并随机排列(保证初始非全对)。
    简单/标准: 年份去重(同年不同局共现); 困难(v1.2.0): 解除去重, 75% 局强制含一组同年事件。 */
export function newGame(mode: LlgsMode, rng: () => number = Math.random): LlgsState {
    const pool = POOL_OF[mode];
    const picked: LlgsEvent[] = [];
    const seenYear = new Set<number>();
    const rest = shuffle([...pool], rng);
    if (mode === "hard" && rng() < 0.75) {
        const byYear = new Map<number, LlgsEvent[]>();
        for (const ev of pool) {
            const arr = byYear.get(ev.y) ?? [];
            arr.push(ev);
            byYear.set(ev.y, arr);
        }
        const groups = [...byYear.entries()].filter(([, arr]) => arr.length >= 2);
        const [gy, gev] = groups[Math.floor(rng() * groups.length)];
        picked.push(...gev.slice(0, 3));
        seenYear.add(gy);
    }
    for (const ev of rest) {
        if (picked.length >= ROUND_CARDS) break;
        if (seenYear.has(ev.y)) continue;   // 强制组之外不重复年份
        seenYear.add(ev.y);
        picked.push(ev);
    }
    // 每卡独立成列, 随机排列(保证初始非全对)
    let order = shuffle(picked.map((ev) => ({ ev, done: false })), rng);
    while (isYearlyCorrect(order.map((c) => [c]))) {
        order = shuffle(order, rng);
    }
    return {
        mode,
        phase: "playing",
        cols: order.map((c) => [c]),
        sel: null,
        attempts: 0,
        hintsLeft: HINT_LIMIT,
        lastWrong: null,
        elapsed: 0,
    };
}

/** 定位某事件的 (列, 列内) 坐标; 未找到返回 null */
export function locate(st: LlgsState, name: string | null): [number, number] | null {
    if (!name) return null;
    for (let ci = 0; ci < st.cols.length; ci++) {
        const ii = st.cols[ci].findIndex((c) => c.ev.n === name);
        if (ii >= 0) return [ci, ii];
    }
    return null;
}

/** 点选卡(切换选中对象; 已归位卡不可选中) */
export function select(st: LlgsState, name: string): LlgsState {
    const pos = locate(st, name);
    if (!pos) return st;
    if (st.cols[pos[0]][pos[1]].done) return st;
    return { ...st, sel: name };
}

/** 交换选中卡与相邻列的卡: dir="L" 与左列末卡交换; "R" 与右列首卡交换。
    涉及已归位卡 → 原样返回。 */
export function swapAdjacent(st: LlgsState, dir: "L" | "R"): LlgsState {
    if (st.phase !== "playing" || !st.sel) return st;
    const pos = locate(st, st.sel);
    if (!pos) return st;
    const [ci, ii] = pos;
    const ti = dir === "L" ? ci - 1 : ci + 1;
    if (ti < 0 || ti >= st.cols.length) return st;
    const jj = dir === "L" ? st.cols[ti].length - 1 : 0;
    if (st.cols[ci][ii].done || st.cols[ti][jj].done) return st;
    const cols = st.cols.map((c) => [...c]);
    [cols[ci][ii], cols[ti][jj]] = [cols[ti][jj], cols[ci][ii]];
    return { ...st, cols, lastWrong: null };
}

/** 并列移动(v1.3.0): 把选中卡移到左(dir="L")/右(dir="R")列的顶部(pos="top")或底部(pos="bot"),
    与该列构成上下并列; 原列因此变空则删除该列。涉及已归位卡 → 原样返回。 */
export function moveSide(st: LlgsState, dir: "L" | "R", pos: "top" | "bot"): LlgsState {
    if (st.phase !== "playing" || !st.sel) return st;
    const p = locate(st, st.sel);
    if (!p) return st;
    const [ci, ii] = p;
    if (dir === "L" && ci === 0) return st;
    if (dir === "R" && ci === st.cols.length - 1) return st;
    if (st.cols[ci][ii].done) return st;
    const cols = st.cols.map((c) => [...c]);
    const [card] = cols[ci].splice(ii, 1);
    let removed = false;
    if (cols[ci].length === 0) { cols.splice(ci, 1); removed = true; }
    let ti = dir === "L" ? ci - 1 : ci + 1;
    if (removed && ti > ci) ti -= 1;
    if (pos === "top") cols[ti].unshift(card);
    else cols[ti].push(card);
    return { ...st, cols, lastWrong: null };
}

/** 提交判定: 按展平区段重算每张卡的归位状态(绿/红); 全部归位 → win */
export function judge(st: LlgsState): LlgsState {
    if (st.phase !== "playing") return st;
    recomputeDone(st);
    const flat = flatCols(st.cols);
    const wrong = flat.filter((c) => !c.done).map((c) => c.ev.n);
    const phase = wrong.length === 0 ? "win" as const : "playing" as const;
    return { ...st, lastWrong: phase === "playing" ? wrong : null, attempts: st.attempts + 1, phase };
}

/** 提示道具: 选一张未归位卡移到其年份区段内的正确位置并锁定; 用尽/全归位则原样返回 */
export function useHint(st: LlgsState, rng: () => number = Math.random): LlgsState {
    if (st.phase !== "playing" || st.hintsLeft <= 0) return st;
    const flat = flatCols(st.cols);
    const undone = flat.filter((c) => !c.done);
    if (undone.length === 0) return st;
    const card = undone[Math.floor(rng() * undone.length)];
    const [lo, hi] = yearRange(flat, card.ev.y);
    // 区段内第一个未归位位置; 全锁定则区段末
    let target = hi;
    for (let p = lo; p <= hi; p++) {
        if (!flat[p].done) { target = p; break; }
    }
    const from = flat.findIndex((c) => c.ev.n === card.ev.n);
    const moved: LlgsState = { ...st, cols: flatMove(st.cols, from, target) };
    recomputeDone(moved);
    const win = moved.cols.flat().every((c) => c.done);
    return { ...moved, hintsLeft: st.hintsLeft - 1, lastWrong: win ? null : st.lastWrong, phase: win ? "win" : "playing" };
}

/** 列结构上的展平移动: 把展平位置 from 的卡移动到展平位置 to */
function flatMove(cols: LlgsCard[][], from: number, to: number): LlgsCard[][] {
    const next = cols.map((c) => [...c]);
    const [fc, fi] = flatPos(next, from);
    const [card] = next[fc].splice(fi, 1);
    let removed = false;
    if (next[fc].length === 0) { next.splice(fc, 1); removed = true; }
    let t = to;
    if (removed && from < to) t -= 1;
    const [tc, ti] = flatPos(next, Math.min(t, flatCount(next)));
    next[tc].splice(ti, 0, card);
    return next;
}

function flatPos(cols: LlgsCard[][], flatIdx: number): [number, number] {
    let n = 0;
    for (let ci = 0; ci < cols.length; ci++) {
        for (let ii = 0; ii < cols[ci].length; ii++) {
            if (n === flatIdx) return [ci, ii];
            n++;
        }
    }
    const last = cols.length - 1;
    return [last, Math.max(0, cols[last].length)];
}

function flatCount(cols: LlgsCard[][]): number {
    return cols.reduce((s, c) => s + c.length, 0);
}

/** 推进时间(UI 时钟调用) */
export function tick(st: LlgsState, dt: number): LlgsState {
    if (st.phase !== "playing") return st;
    return { ...st, elapsed: st.elapsed + dt };
}
