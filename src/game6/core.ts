/*
 * 诗了个句 · 核心逻辑 (src/game6/core.ts) —— 纯逻辑, 无 DOM
 * =====================================================
 * 玩法(v1.0.0): 每局 8 题, 血量 3。
 *   - 简单: 名句选择题(双向混合)——给上句选下句或给下句选上句, 4 选 1;
 *   - 标准/困难(飞花令): 给出一个「令字」, 在限时内输入**课标必背古诗词中含有该字的任意一句**;
 *     输入去除标点后须与库中某句逐字一致 —— 错字/别字/不存在均判错(考查默写, 注意字的写法!),
 *     不含令字判错, 同一句本局不能重复使用; 每题限时(标准 40s / 困难 30s), 超时判错。
 * 道具: 「提示」每局 2 次 —— 显示一条可接受答案的出处与作者(如《静夜思》·李白), 次数计入 tools。
 */
import {
    ALL_LINES, FLOWER_COMMON_POOL, FLOWER_HARD_POOL, POEM_COUPLETS, countLinesWith, normalizeLine,
    type PoemCouplet,
} from "./bank";

export type SlgjMode = "easy" | "normal" | "hard";

export const ROUND_TOTAL = 8;
export const HP_MAX = 3;
export const HINT_LIMIT = 2;
/** 飞花令每题限时(秒) */
export const FLOW_TIME: Record<"normal" | "hard", number> = { normal: 40, hard: 30 };

export const SLGJ_MODES: { mode: SlgjMode; label: string }[] = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "hard", label: "困难" },
];

function shuffled<T>(arr: T[], rng: () => number): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* ---------- 题目 ---------- */

export interface McQuestion {
    kind: "mc";
    prompt: string;        // 题面句
    answer: string;        // 正确答案句
    options: string[];     // 4 个选项(含答案)
    dir: "next" | "prev";  // next=给上句选下句, prev=给下句选上句
    src: string;
    author: string;        // 出处与作者(提示用)
}

export interface FlowQuestion {
    kind: "flow";
    char: string;          // 令字
    timeLimit: number;     // 本题限时(秒)
}

export type SlgjQuestion = McQuestion | FlowQuestion;

/** 生成一道名句选择题(双向混合): 给上句选下句 / 给下句选上句 */
export function makeMc(rng: () => number = Math.random, couplets: PoemCouplet[] = POEM_COUPLETS): McQuestion {
    const c = couplets[Math.floor(rng() * couplets.length)];
    const dir: "next" | "prev" = rng() < 0.5 ? "next" : "prev";
    const prompt = dir === "next" ? c.prev : c.next;
    const answer = dir === "next" ? c.next : c.prev;
    const ansKey = normalizeLine(answer);
    const promptKey = normalizeLine(prompt);
    const distractors: string[] = [];
    for (const l of shuffled(ALL_LINES, rng)) {
        if (distractors.length >= 3) break;
        const k = l.norm;
        if (k === ansKey || k === promptKey) continue;
        if (distractors.some((d) => normalizeLine(d) === k)) continue;
        distractors.push(l.text);
    }
    return {
        kind: "mc",
        prompt,
        answer,
        options: shuffled([answer, ...distractors], rng),
        dir,
        src: c.src,
        author: c.author,
    };
}

/** 飞花令令字池: 从候选池过滤出库内命中 ≥ minCount 句的字符(标准高频 / 困难扩展) */
export function flowerChars(mode: "normal" | "hard"): string[] {
    const pool = mode === "normal" ? FLOWER_COMMON_POOL : [...FLOWER_COMMON_POOL, ...FLOWER_HARD_POOL];
    const minCount = mode === "normal" ? 5 : 3;
    return pool.filter((ch) => countLinesWith(ch) >= minCount);
}

/** 生成一道飞花令题(令字不与本局已用重复由调用方保证; 此处仅从池中取) */
export function makeFlow(mode: "normal" | "hard", rng: () => number): FlowQuestion {
    const chars = flowerChars(mode);
    const ch = chars[Math.floor(rng() * chars.length)] ?? "花";
    return { kind: "flow", char: ch, timeLimit: FLOW_TIME[mode] };
}

/** 找一条含令字的句子(提示用: 返回其出处与作者) */
export function findLineWith(char: string, excludeNorms: Set<string>): { text: string; src: string; author: string } | null {
    for (const l of ALL_LINES) {
        if (l.norm.includes(char) && !excludeNorms.has(l.norm)) {
            return { text: l.text, src: l.src, author: l.author };
        }
    }
    return null;
}

/* ---------- 状态机 ---------- */

export type SlgjPhase = "playing" | "win" | "lose";

export interface SlgjJudge {
    ok: boolean;
    reason?: "empty" | "notcontain" | "unknown" | "used" | "timeout" | "wrong";
}

export interface SlgjState {
    phase: SlgjPhase;
    mode: SlgjMode;
    deck: SlgjQuestion[];
    idx: number;
    input: string;               // 飞花令当前输入原文
    usedNorms: string[];         // 本局已用句(去标点后)
    remain: number;              // 飞花令本题剩余秒数(easy 恒 0)
    score: number;
    mistakes: number;
    hp: number;
    hintsLeft: number;
    toolsUsed: number;
    elapsed: number;
    lastJudge?: SlgjJudge;
}

function buildDeck(mode: SlgjMode, rng: () => number): SlgjQuestion[] {
    if (mode === "easy") {
        const deck: SlgjQuestion[] = [];
        const usedPrompts = new Set<string>();
        let guard = 0;
        while (deck.length < ROUND_TOTAL && guard++ < 200) {
            const q = makeMc(rng);
            const key = q.prompt + "|" + q.answer;
            if (usedPrompts.has(key)) continue;
            usedPrompts.add(key);
            deck.push(q);
        }
        return deck;
    }
    const deck: SlgjQuestion[] = [];
    const usedChars = new Set<string>();
    let guard = 0;
    while (deck.length < ROUND_TOTAL && guard++ < 200) {
        const q = makeFlow(mode as "normal" | "hard", rng);
        if (usedChars.has(q.char)) continue;
        usedChars.add(q.char);
        deck.push(q);
    }
    return deck;
}

export function newGame(mode: SlgjMode, rng: () => number = Math.random): SlgjState {
    const st: SlgjState = {
        phase: "playing",
        mode,
        deck: [],
        idx: 0,
        input: "",
        usedNorms: [],
        remain: 0,
        score: 0,
        mistakes: 0,
        hp: HP_MAX,
        hintsLeft: HINT_LIMIT,
        toolsUsed: 0,
        elapsed: 0,
    };
    st.deck = buildDeck(mode, rng);
    if (st.deck[0]?.kind === "flow") st.remain = (st.deck[0] as FlowQuestion).timeLimit;
    return st;
}

/** 推进 dt 秒: 总计时 + 飞花令倒计时(超时由 UI 调 flowTimeout 显式结算, 这里只扣表) */
export function tick(st: SlgjState, dt: number): SlgjState {
    if (st.phase !== "playing") return st;
    const q = st.deck[st.idx];
    const isFlow = q && q.kind === "flow";
    return {
        ...st,
        elapsed: st.elapsed + dt,
        remain: isFlow ? Math.max(0, st.remain - dt) : st.remain,
    };
}

export function currentQuestion(st: SlgjState): SlgjQuestion | undefined {
    return st.deck[st.idx];
}

export function setInput(st: SlgjState, v: string): SlgjState {
    if (st.phase !== "playing") return st;
    return { ...st, input: v.slice(0, 60), lastJudge: undefined };
}

function advance(st: SlgjState): PlgLikeNext {
    const nextIdx = st.idx + 1;
    if (nextIdx >= st.deck.length) {
        return { phase: "win", idx: st.idx };
    }
    const q = st.deck[nextIdx];
    return {
        phase: "playing",
        idx: nextIdx,
        input: "",
        remain: q.kind === "flow" ? q.timeLimit : 0,
    };
}
interface PlgLikeNext {
    phase: SlgjPhase;
    idx: number;
    input?: string;
    remain?: number;
}

/** 提交飞花令作答(简单模式不用) */
export function submitFlow(st: SlgjState): SlgjState {
    if (st.phase !== "playing") return st;
    const q = st.deck[st.idx];
    if (!q || q.kind !== "flow") return st;
    const norm = normalizeLine(st.input);
    if (!norm) return { ...st, lastJudge: { ok: false, reason: "empty" } };
    let reason: "notcontain" | "unknown" | "used";
    if (!norm.includes(q.char)) reason = "notcontain";
    else if (st.usedNorms.includes(norm)) reason = "used";
    else if (!ALL_LINES.some((l) => l.norm === norm)) reason = "unknown";
    else {
        // 正确
        const used = [...st.usedNorms, norm];
        const nxt = advance({ ...st, usedNorms: used });
        return {
            ...st,
            ...nxt,
            usedNorms: used,
            score: st.score + 1,
            input: "",
            lastJudge: { ok: true },
        };
    }
    const hp = st.hp - 1;
    return {
        ...st,
        hp,
        mistakes: st.mistakes + 1,
        phase: hp <= 0 ? "lose" : "playing",
        lastJudge: { ok: false, reason },
    };
}

/** 飞花令超时(由 UI 计时到 0 时调用) */
export function flowTimeout(st: SlgjState): SlgjState {
    if (st.phase !== "playing") return st;
    const q = st.deck[st.idx];
    if (!q || q.kind !== "flow" || st.lastJudge?.ok) return st;
    const hp = st.hp - 1;
    const nxt = advance(st);
    return {
        ...st,
        ...nxt,
        hp,
        mistakes: st.mistakes + 1,
        phase: hp <= 0 ? "lose" : "playing",
        lastJudge: { ok: false, reason: "timeout" },
    };
}

/** 简单选择题作答 */
export function answerMc(st: SlgjState, choice: string): SlgjState {
    if (st.phase !== "playing") return st;
    const q = st.deck[st.idx];
    if (!q || q.kind !== "mc") return st;
    const ok = normalizeLine(choice) === normalizeLine((q as McQuestion).answer);
    if (!ok) {
        const hp = st.hp - 1;
        return {
            ...st,
            hp,
            mistakes: st.mistakes + 1,
            phase: hp <= 0 ? "lose" : "playing",
            lastJudge: { ok: false, reason: "wrong" } as SlgjJudge,
        };
    }
    const nxt = advance(st);
    return { ...st, ...nxt, score: st.score + 1, lastJudge: { ok: true } };
}

/** 提示: 显示一条可接受答案的出处与作者(不计入答案域变更); 用尽则原样返回 */
export function useHint(st: SlgjState): { state: SlgjState; hint: { text: string; src: string; author: string } | null } {
    if (st.phase !== "playing" || st.hintsLeft <= 0) return { state: st, hint: null };
    const q = st.deck[st.idx];
    if (!q) return { state: st, hint: null };
    let found: ReturnType<typeof findLineWith> = null;
    if (q.kind === "flow") {
        found = findLineWith(q.char, new Set(st.usedNorms));
    } else {
        found = { text: q.answer, src: q.src, author: q.author };
    }
    if (!found) return { state: st, hint: null };
    return {
        state: { ...st, hintsLeft: st.hintsLeft - 1, toolsUsed: st.toolsUsed + 1 },
        hint: found,
    };
}
