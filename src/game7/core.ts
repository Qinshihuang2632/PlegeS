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

/** 每张卡「年份正确区段」: 同年事件并列, 区段 = [首个该年位置, 末个该年位置]; 卡位于区段内即算归位。
    简单/标准无同年(区段=单点), 与旧版唯一位置判定等价; 困难允许同年并列(v1.2.0)。 */
export function yearRange(cards: LlgsCard[], y: number): [number, number] {
    const ys = cards.map((c) => c.ev.y).sort((a, b) => a - b);
    let lo = ys.indexOf(y);
    let hi = ys.lastIndexOf(y);
    if (lo < 0) { lo = 0; hi = 0; }
    return [lo, hi];
}

/** 当前排列是否全部处于各自年份区段(等价于年份序列非降序; 同年组内任意顺序均正确) */
export function isYearlyCorrect(cards: LlgsCard[]): boolean {
    for (let i = 1; i < cards.length; i++) {
        if (cards[i - 1].ev.y > cards[i].ev.y) return false;
    }
    return true;
}

/** 开局: 按难度抽 5 张事件并打乱(保证初始不是全对)。
    简单/标准: 年份去重(同年不同局共现); 困难(v1.2.0): 解除去重允许同年并列,
    且有 75% 概率强制出现一组同年事件(并列辨析是困难核心难度, 天然 ~2% 太低)。 */
export function newGame(mode: LlgsMode, rng: () => number = Math.random): LlgsState {
    const pool = POOL_OF[mode];
    const picked: LlgsEvent[] = [];
    const seenYear = new Set<number>();
    const rest = shuffle([...pool], rng);
    // 困难模式: 大概率先挑一组同年事件(整组 2~3 张, 组内全取)
    if (mode === "hard" && rng() < 0.75) {
        const byYear = new Map<number, LlgsEvent[]>();
        for (const ev of pool) {
            const arr = byYear.get(ev.y) ?? [];
            arr.push(ev);
            byYear.set(ev.y, arr);
        }
        const groups = [...byYear.entries()].filter(([, arr]) => arr.length >= 2);
        const [gy, gev] = groups[Math.floor(rng() * groups.length)];
        const take = gev.slice(0, 3);   // 组内最多取 3 张(1945 四件套也只取 3)
        picked.push(...take);
        seenYear.add(gy);
    }
    for (const ev of rest) {
        if (picked.length >= ROUND_CARDS) break;
        if (mode !== "hard" && seenYear.has(ev.y)) continue;   // 困难: 同年可重复出现(并列)
        if (seenYear.has(ev.y)) continue;                      // 已选同年组年份不重复补位
        seenYear.add(ev.y);
        picked.push(ev);
    }
    const cards: LlgsCard[] = picked.map((ev) => ({ ev }));
    // 洗乱: 保证初始排列不是正确顺序(否则一上来就通关没意义)
    let order = cards.map((_, i) => i);
    do {
        order = shuffle(order, rng);
    } while (isYearlyCorrect(order.map((i) => cards[i])));
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

/** 交换两张卡的位置(拖拽落位) */
export function swap(st: LlgsState, a: number, b: number): LlgsState {
    if (st.phase !== "playing" || a === b) return st;
    if (st.done[a] || st.done[b]) return st;   // 已归位卡不可动
    const cards = [...st.cards];
    [cards[a], cards[b]] = [cards[b], cards[a]];
    return { ...st, cards, lastWrong: null };
}

/** 提交判定(v1.2.0 区段模型): 卡位于自己年份区段内 → 归位锁定(同年并列任意顺序均可);
    区段外 → 错位标红可续调。全绿 → win。 */
export function judge(st: LlgsState): LlgsState {
    if (st.phase !== "playing") return st;
    const done = [...st.done];
    const wrong: number[] = [];
    for (let i = 0; i < st.cards.length; i++) {
        const [lo, hi] = yearRange(st.cards, st.cards[i].ev.y);
        if (i >= lo && i <= hi) done[i] = true;
        else if (!done[i]) wrong.push(i);
    }
    const phase = done.every(Boolean) ? "win" as const : "playing" as const;
    return { ...st, done, lastWrong: phase === "playing" ? wrong : null, attempts: st.attempts + 1, phase };
}

/** 提示道具(v1.2.0): 选一张未归位卡插回其年份区段内的空位并锁定(同年并列时区段内任意空位均可);
    用尽/全归位则原样返回 */
export function useHint(st: LlgsState, rng: () => number = Math.random): LlgsState {
    if (st.phase !== "playing" || st.hintsLeft <= 0) return st;
    const undone = st.cards.map((_, i) => i).filter((i) => !st.done[i]);
    if (undone.length === 0) return st;
    const i = undone[Math.floor(rng() * undone.length)];
    const y = st.cards[i].ev.y;
    const sortedYs = st.cards.map((c) => c.ev.y).sort((a, b) => a - b);
    const lo = sortedYs.indexOf(y);
    const hi = sortedYs.lastIndexOf(y);
    // 区段内未被锁定的位置优先(已锁定卡不可被顶替); 全部锁定则任意区段位
    let target = -1;
    for (let p = lo; p <= hi; p++) {
        if (!st.done[p]) { target = p; break; }
    }
    if (target < 0) target = lo;
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