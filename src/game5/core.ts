/*
 * 配了个平 · 核心逻辑 (src/game5/core.ts) —— 纯逻辑, 无 DOM
 * =====================================================
 * 玩法(v1.0.0): 每局 8 题, 从所选难度题库随机抽取(不重复);
 *   - 简单: 选择题式 —— 3 组候选系数组合点选(含 ×2 比例陷阱, 训练最简比意识);
 *   - 标准/困难: 数字键盘逐系数填写(端游物理键盘 / 手游屏幕数字条);
 * 判定: 所有系数位填满才能提交; 提交 = 正确答案 → 得分进入下一题;
 *   与答案成比例(如 4/2/4 对 3/2/1 的两倍) → 判错并提示「需化为最简整数比」;
   其它错误 → 判错扣 1 血(共 3), 填写保留可改; 血量归零本局结算。
 * 道具: 「提示」每局 2 次 —— 自动把一个未锁定的空位/错位填成正确系数并锁定;
 *   使用次数计入排行榜 tools(用得少靠前)。
 */
import { equationsOf, type PlgpDifficulty, type PlgpEquation } from "./equations";

export type PlgpMode = "easy" | "normal" | "hard";

export const ROUND_TOTAL = 8;    // 每局题数
export const HP_MAX = 3;
export const HINT_LIMIT = 2;
export const COEF_MAX = 99;      // 单个系数输入上限

export const PLGP_MODES: { mode: PlgpMode; label: string }[] = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "hard", label: "困难" },
];

const DIFF_OF: Record<PlgpMode, PlgpDifficulty> = { easy: 1, normal: 2, hard: 3 };

export type PlgpPhase = "playing" | "win" | "lose";
export interface PlgpJudge {
    ok: boolean;
    reason?: "incomplete" | "ratio" | "wrong";
}

export interface PlgpState {
    phase: PlgpPhase;
    mode: PlgpMode;
    deck: PlgpEquation[];        // 本局 8 题
    idx: number;                 // 当前题下标
    blanks: (number | null)[];   // 当前题玩家填写(按物质顺序)
    locked: boolean[];           // 提示填入的位不可修改
    score: number;
    mistakes: number;            // 总失误次数(星级依据)
    hp: number;
    hintsLeft: number;
    toolsUsed: number;
    elapsed: number;             // 秒
    lastJudge?: PlgpJudge;
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** 从难度题库随机抽 ROUND_TOTAL 题(不重复) */
export function pickRound(mode: PlgpMode, rng: () => number = Math.random): PlgpEquation[] {
    const pool = equationsOf(DIFF_OF[mode]);
    return shuffled(pool, rng).slice(0, Math.min(ROUND_TOTAL, pool.length));
}

export function newGame(mode: PlgpMode, rng: () => number = Math.random): PlgpState {
    const base: PlgpState = {
        phase: "playing",
        mode,
        deck: pickRound(mode, rng),
        idx: 0,
        blanks: [],
        locked: [],
        score: 0,
        mistakes: 0,
        hp: HP_MAX,
        hintsLeft: HINT_LIMIT,
        toolsUsed: 0,
        elapsed: 0,
    };
    return { ...base, ...resetAnswer(base) };
}

export function currentEquation(st: PlgpState): PlgpEquation {
    return st.deck[st.idx];
}

/** 重置当前题的作答区(开局与进入下一题共用) */
function resetAnswer(st: PlgpState): Pick<PlgpState, "blanks" | "locked" | "lastJudge"> {
    const n = st.deck[st.idx].coefs.length;
    return { blanks: Array<number | null>(n).fill(null), locked: Array<boolean>(n).fill(false), lastJudge: undefined };
}

/** 推进时间(UI 时钟调用) */
export function tick(st: PlgpState, dt: number): PlgpState {
    if (st.phase !== "playing") return st;
    return { ...st, elapsed: st.elapsed + dt };
}

/** 填某个系数位(null 清空); 提示锁定位不可改 */
export function setBlank(st: PlgpState, i: number, v: number | null): PlgpState {
    if (st.phase !== "playing" || st.locked[i]) return st;
    if (v !== null && (!Number.isInteger(v) || v < 0 || v > COEF_MAX)) return st;
    if (st.blanks[i] === v) return st;
    const blanks = [...st.blanks];
    blanks[i] = v;
    return { ...st, blanks };
}

/** 在某位追加一位数字(两位封顶); 无值则从该数字开始 */
export function appendDigit(st: PlgpState, i: number, d: number): PlgpState {
    const cur = st.blanks[i];
    const nv = (cur ?? 0) * 10 + d;
    if (nv > COEF_MAX) return st;
    return setBlank(st, i, nv);
}

/** 退格某位(0 → 清空) */
export function backspace(st: PlgpState, i: number): PlgpState {
    const cur = st.blanks[i];
    if (cur === null || cur === undefined) return st;
    return setBlank(st, i, cur >= 10 ? Math.floor(cur / 10) : null);
}

function gcd(a: number, b: number): number {
    while (b) { [a, b] = [b, a % b]; }
    return a;
}
export function gcdList(a: number[]): number {
    return a.reduce((g, v) => gcd(g, v), 0);
}

/** submitted 是否为 correct 的非 1 倍比例解(如 4/2/4 对 3/2/1 的两倍) */
export function isScaledVersion(submitted: number[], correct: number[]): boolean {
    if (submitted.length !== correct.length) return false;
    const k = submitted[0] / correct[0];
    if (!(k > 0) || k === 1) return false;
    return submitted.every((v, i) => Math.abs(v - k * correct[i]) < 1e-9);
}

/** 提交当前作答: 全满才判定; 正确 → 下一题/win; 错误 → 扣血(归零 lose), 作答保留可修改 */
export function submit(st: PlgpState): PlgpState {
    if (st.phase !== "playing") return st;
    const eq = currentEquation(st);
    if (st.blanks.some((b) => b === null)) {
        return { ...st, lastJudge: { ok: false, reason: "incomplete" } };
    }
    const sub = st.blanks as number[];
    if (sub.every((v, i) => v === eq.coefs[i])) {
        const score = st.score + 1;
        const nextIdx = st.idx + 1;
        if (nextIdx >= st.deck.length) {
            return { ...st, phase: "win", score, lastJudge: { ok: true } };
        }
        const advanced: PlgpState = { ...st, score, idx: nextIdx, lastJudge: { ok: true } };
        return { ...advanced, ...resetAnswer(advanced) };
    }
    const hp = st.hp - 1;
    const reason: "ratio" | "wrong" = isScaledVersion(sub, eq.coefs) ? "ratio" : "wrong";
    return {
        ...st,
        hp,
        mistakes: st.mistakes + 1,
        phase: hp <= 0 ? "lose" : "playing",
        lastJudge: { ok: false, reason },
    };
}

/** 提示道具: 把第一个「未锁定且为空或错误」的位填成正确系数并锁定; 用尽/无目标则原样返回 */
export function useHint(st: PlgpState): PlgpState {
    if (st.phase !== "playing" || st.hintsLeft <= 0) return st;
    const eq = currentEquation(st);
    let target = -1;
    for (let i = 0; i < eq.coefs.length; i++) {
        if (st.locked[i]) continue;
        if (st.blanks[i] === null || st.blanks[i] !== eq.coefs[i]) { target = i; break; }
    }
    if (target < 0) return st;
    const blanks = [...st.blanks];
    blanks[target] = eq.coefs[target];
    const locked = [...st.locked];
    locked[target] = true;
    return { ...st, blanks, locked, hintsLeft: st.hintsLeft - 1, toolsUsed: st.toolsUsed + 1 };
}

/* ---------- 简单难度: 选择题选项生成 ---------- */

/** 生成 3 组候选系数(含正确组): ×2 比例陷阱 + 最大系数 ±1 扰动; 打乱返回 */
export function mcOptions(eq: PlgpEquation, rng: () => number = Math.random): number[][] {
    const key = (o: number[]) => o.join(",");
    const correct = eq.coefs.slice();
    const options: number[][] = [correct];
    options.push(correct.map((v) => v * 2));                       // 比例陷阱
    const perturb = correct.slice();
    const mi = perturb.reduce((mi, v, i) => (perturb[mi] >= v ? mi : i), 0);
    perturb[mi] += 1;
    if (!options.some((o) => key(o) === key(perturb))) options.push(perturb);
    else {
        const alt = correct.slice();
        alt[alt.length - 1] += 1;
        if (!options.some((o) => key(o) === key(alt))) options.push(alt);
    }
    return shuffled(options.filter((o) => !o.some((v) => v > COEF_MAX)), rng);
}
