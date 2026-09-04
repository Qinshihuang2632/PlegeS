/*
 * 历了个史 · 核心逻辑 (src/game7/core.ts) —— 纯逻辑, 无 DOM
 * =====================================================
 * 玩法(v1.0.0): 时间轴排序 —— 每局 5 张历史事件卡(年份互异), 玩家拖拽排成
 *   时间先后顺序, 点「提交判定」逐卡比对: 已归位卡变绿锁定不能再动;
 *   错位卡标红可继续调整, 直到全部归位 → 通关。
 * 无血条(宽容理念): 失误 = 提交判定次数; 提示道具每局 2 次(自动把一张错位卡
 *   放回正确位置并锁定, 计入排名)。题库均为课标事件, 年份即答案(唯一性天然保证)。
 * 难度: 简单(中国古代+近现代常识, 年份跨度大) / 标准(近代史+世界史, 跨近代)
 *       / 困难(全库+相近年份辨析)。
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
}

export interface LlgsState {
    mode: LlgsMode;
    phase: "playing" | "win";
    cards: LlgsCard[];        // 当前排列(下标即时间轴位序)
    done: boolean[];          // 已归位(锁定)
    attempts: number;         // 提交判定次数(失误)
    hintsLeft: number;
    lastWrong: number[] | null;   // 上一次判定中的错位卡下标(UI 标红)
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

/** 开局: 按难度抽 5 张事件(年份互异, 同年事件不同局共现)并打乱(保证初始不是全对) */
export function newGame(mode: LlgsMode, rng: () => number = Math.random): LlgsState {
    const pool = POOL_OF[mode];
    const picked: LlgsEvent[] = [];
    const seenYear = new Set<number>();
    const rest = shuffle([...pool], rng);
    for (const ev of rest) {
        if (picked.length >= ROUND_CARDS) break;
        if (seenYear.has(ev.y)) continue;
        seenYear.add(ev.y);
        picked.push(ev);
    }
    const cards: LlgsCard[] = picked.map((ev) => ({ ev }));
    // 洗乱: 保证初始排列不是正确顺序(否则一上来就通关没意义)
    let order = cards.map((_, i) => i);
    do {
        order = shuffle(order, rng);
    } while (order.every((v, i) => cards[v].ev.y <= (i > 0 ? cards[order[i - 1]].ev.y : -Infinity)));
    const arranged = order.map((i) => cards[i]);
    return {
        mode,
        phase: "playing",
        cards: arranged,
        done: arranged.map(() => false),
        attempts: 0,
        hintsLeft: HINT_LIMIT,
        lastWrong: null,
        elapsed: 0,
    };
}

/** 是否已处于正确时间顺序(年份升序) */
export function isOrdered(cards: LlgsCard[]): boolean {
    for (let i = 1; i < cards.length; i++) {
        if (cards[i - 1].ev.y > cards[i].ev.y) return false;
    }
    return true;
}

/** 交换两张卡的位置(拖拽落位) */
export function swap(st: LlgsState, a: number, b: number): LlgsState {
    if (st.phase !== "playing" || a === b) return st;
    if (st.done[a] || st.done[b]) return st;   // 已归位卡不可动
    const cards = [...st.cards];
    [cards[a], cards[b]] = [cards[b], cards[a]];
    return { ...st, cards, lastWrong: null };
}

/** 提交判定: 归位正确 → 锁定; 错位 → 保持可调并记录(返回新状态; win 时 phase="win") */
export function judge(st: LlgsState): LlgsState {
    if (st.phase !== "playing") return st;
    const done = [...st.done];
    const wrong: number[] = [];
    for (let i = 0; i < st.cards.length; i++) {
        // 该位事件是否就是「按年份升序该出现在这里」的事件
        const sorted = [...st.cards].sort((a, b) => a.ev.y - b.ev.y);
        if (st.cards[i].ev.n === sorted[i].ev.n) done[i] = true;
        else if (!done[i]) wrong.push(i);
    }
    const phase = done.every(Boolean) ? "win" as const : "playing" as const;
    return { ...st, done, lastWrong: phase === "playing" ? wrong : null, attempts: st.attempts + 1, phase };
}

/** 提示道具: 选一张未归位卡按正确时间顺序插回(该位锁定); 用尽/全归位则原样返回 */
export function useHint(st: LlgsState, rng: () => number = Math.random): LlgsState {
    if (st.phase !== "playing" || st.hintsLeft <= 0) return st;
    const undone = st.cards.map((_, i) => i).filter((i) => !st.done[i]);
    if (undone.length === 0) return st;
    const sorted = [...st.cards].sort((a, b) => a.ev.y - b.ev.y);
    const i = undone[Math.floor(rng() * undone.length)];
    const target = sorted.findIndex((c) => c.ev.n === st.cards[i].ev.n);
    const cards = [...st.cards];
    const card = cards[i];
    cards.splice(i, 1);
    cards.splice(target, 0, card);
    const doneArr = new Array(cards.length).fill(false) as boolean[];
    st.done.forEach((d, k) => {
        const moved = k < i ? k : k > i ? k - 1 : -1;
        if (moved >= 0) doneArr[moved] = d;
    });
    doneArr[target] = true;
    return { ...st, cards, done: doneArr, hintsLeft: st.hintsLeft - 1, lastWrong: null };
}

/** 推进时间(UI 时钟调用) */
export function tick(st: LlgsState, dt: number): LlgsState {
    if (st.phase !== "playing") return st;
    return { ...st, elapsed: st.elapsed + dt };
}