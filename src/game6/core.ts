/*
 * 默了个写 · 核心逻辑 (src/game6/core.ts) —— 纯逻辑, 无 DOM
 * =====================================================
 * 全程无键盘输入, 四种全点选题型:
 *   - couplet 句对匹配: 给上句(或下句)4 选 1, 干扰项优先同篇/同作者;
 *   - tiles 字池拼句(招牌): 从字块池按序点选拼出目标句, 干扰字=该句易错字 traps + 同篇其他句的字 +
 *     随机字(标准/困难混入同篇字, 大幅提升迷惑性); 标准/困难优先理解性 cue 题干;
 *   - order 篇章复原: 篇目连续 4 句乱序, 按原文顺序点选;
 *   - flower 点选飞花令: 给令字, 从 9 句中点选所有含令字的句子。
 * 抽取权重(v2): 真题考过的篇目(EXAM_WEIGHT, ×2)高于未考篇目; 篇内高频考点句(key)以 70% 概率优先。
 * 一局 8 题, 血量 3, 提示道具 2 次; 通关=答完 8 题且未阵亡。
 */
import {
    EXAM_WEIGHT, FLOWER_COMMON_POOL, FLOWER_HARD_POOL, JUNIOR_WEIGHT, MLGX_LINES, MLGX_PIECES, countLinesWith, normalizeLine,
    type MlgxLine,
} from "./bank";

export type MlgxMode = "easy" | "normal" | "hard";

export const ROUND_TOTAL = 8;
export const HP_MAX = 3;
export const HINT_LIMIT = 2;
/** 高频考点句(key)的抽取优先概率 */
const KEY_LINE_PROB = 0.7;

export const MLGX_MODES: { mode: MlgxMode; label: string }[] = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "hard", label: "困难" },
];

/* ---------------- 题型数据 ---------------- */

export interface CoupletQ {
    kind: "couplet";
    src: string; author: string;
    examCount: number;             // 篇目真题考查次数(页面「近年高考考查」徽标)
    given: string;
    askNext: boolean;
    options: string[];
    answer: number;
    disabled: number[];
}
export interface Tile {
    id: number;
    ch: string;
}
export interface TilesQ {
    kind: "tiles";
    src: string; author: string;
    examCount: number;
    prompt: string;
    isCue: boolean;
    answerNorm: string;
    answerText: string;         // 目标句原文(含标点, 错题回顾展示用)
    slots: number;
    pool: Tile[];
    removed: number[];
}
export interface OrderQ {
    kind: "order";
    src: string; author: string;
    examCount: number;
    shown: string[];
    correct: string[];
    revealedFirst: boolean;
}
export interface FlowerQ {
    kind: "flower";
    src: string; author: string;   // 跨多篇, 固定「飞花令/多篇」
    examCount: number;             // 恒为 0
    char: string;
    sentences: string[];
    hits: boolean[];
    disabled: number[];
}
export type MlgxQuestion = CoupletQ | TilesQ | OrderQ | FlowerQ;

export interface RoundResult {
    kind: MlgxQuestion["kind"];
    src: string;
    correct: boolean;
}

function shuffled<T>(arr: readonly T[], rng: () => number): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function sample<T>(arr: readonly T[], n: number, rng: () => number): T[] {
    return shuffled(arr, rng).slice(0, n);
}
/** 按权重随机取一项 */
function weightedPick<T>(items: readonly T[], weight: (x: T) => number, rng: () => number): T {
    const total = items.reduce((s, x) => s + weight(x), 0);
    let r = rng() * total;
    for (const x of items) {
        r -= weight(x);
        if (r <= 0) return x;
    }
    return items[items.length - 1];
}

/** 抽取权重: 真题考过 ×EXAM_WEIGHT; 初中篇目 ×JUNIOR_WEIGHT(= 高中一般题目的 50%) */
function lineWeight(l: { examCount: number; stage: "high" | "junior" }): number {
    return (l.examCount > 0 ? EXAM_WEIGHT : 1) * (l.stage === "junior" ? JUNIOR_WEIGHT : 1);
}

/** 加权抽取一句 + 篇内 key 句优先 */
function pickLine(rng: () => number, filter: (l: MlgxLine) => boolean): MlgxLine {
    let cands = MLGX_LINES.filter(filter);
    if (cands.length === 0) cands = MLGX_LINES.filter((l) => l.norm.length >= 4 && l.norm.length <= 9);
    const line = weightedPick(cands, lineWeight, rng);
    if (!line.key && rng() < KEY_LINE_PROB) {
        const siblings = MLGX_LINES.filter((l) => l.pieceKey === line.pieceKey && filter(l) && l.key);
        if (siblings.length > 0) return siblings[Math.floor(rng() * siblings.length)];
    }
    return line;
}

/* ---------------- 对局 ---------------- */

export class MlgxGame {
    mode: MlgxMode = "easy";
    qs: MlgxQuestion[] = [];
    idx = 0;
    score = 0;
    hp = HP_MAX;
    tools = HINT_LIMIT;
    results: RoundResult[] = [];
    /** 错题回顾(v0.9.3, 与配了个平/英了个语同构): 答错的题 + 正确答案 */
    wrongList: { kind: MlgxQuestion["kind"]; src: string; prompt: string; answer: string }[] = [];
    done = false;
    win = false;
    elapsed = 0;
    startAt = Date.now();
    private rng: () => number = Math.random;

    constructor(mode: MlgxMode = "easy", rng: () => number = Math.random) {
        this.newGame(mode, rng);
    }

    newGame(mode: MlgxMode = this.mode, rng: () => number = this.rng) {
        this.mode = mode;
        this.rng = rng;
        this.idx = 0;
        this.score = 0;
        this.hp = HP_MAX;
        this.tools = HINT_LIMIT;
        this.results = [];
        this.wrongList = [];
        this.done = false;
        this.win = false;
        this.elapsed = 0;
        this.startAt = Date.now();
        this.qs = this.buildRound();
    }

    /** 每档题型配比(共 8 题): 简单 6句对+2短字池; 标准 2句对+4字池+2排序; 困难 1句对+4字池+2排序+1飞花令 */
    private mixFor(mode: MlgxMode): { couplet: number; tiles: number; order: number; flower: number } {
        if (mode === "easy") return { couplet: 6, tiles: 2, order: 0, flower: 0 };
        if (mode === "normal") return { couplet: 2, tiles: 4, order: 2, flower: 0 };
        return { couplet: 1, tiles: 4, order: 2, flower: 1 };
    }

    private buildRound(): MlgxQuestion[] {
        const mix = this.mixFor(this.mode);
        const used = new Set<string>();
        const qs: MlgxQuestion[] = [];
        for (let i = 0; i < mix.couplet; i++) this.pushCouplet(qs, used);
        for (let i = 0; i < mix.tiles; i++) this.pushTiles(qs, used);
        for (let i = 0; i < mix.order; i++) this.pushOrder(qs);
        for (let i = 0; i < mix.flower; i++) this.pushFlower(qs);
        return shuffled(qs, this.rng);
    }

    /* ---- 句对匹配(仅原文紧邻且同段的句对; 跳行/跨段绝不配对) ---- */
    private pushCouplet(qs: MlgxQuestion[], used: Set<string>) {
        const askNext = this.rng() < 0.5;
        const pairs = COUPLET_PAIRS.filter((p) => !used.has(normalizeLine(p.answer)));
        const chosen = weightedPick(pairs, (p) => lineWeight(p), this.rng);
        const answerText = chosen.answer;
        used.add(normalizeLine(answerText));
        // 干扰项: 同篇其他句(迷惑性最强) > 同作者 > 全库
        const pieceKey = chosen.src + "·" + chosen.author;
        const others = MLGX_LINES.filter((l) => l.norm !== normalizeLine(answerText) && l.text !== chosen.given);
        const samePiece = sample(others.filter((l) => l.pieceKey === pieceKey), 2, this.rng);
        const sameAuthor = sample(others.filter((l) => l.author === chosen.author && !samePiece.includes(l)), 1, this.rng);
        const rest = sample(others.filter((l) => !samePiece.includes(l) && !sameAuthor.includes(l)), 3, this.rng);
        const distractors = [...samePiece, ...sameAuthor, ...rest].slice(0, 3).map((l) => l.text);
        while (distractors.length < 3) {
            const extra = others[Math.floor(this.rng() * others.length)];
            if (!distractors.includes(extra.text) && extra.text !== answerText) distractors.push(extra.text);
        }
        const options = shuffled([answerText, ...distractors], this.rng);
        qs.push({
            kind: "couplet", src: chosen.src, author: chosen.author, examCount: chosen.examCount,
            given: chosen.given, askNext,
            options, answer: options.indexOf(answerText), disabled: [],
        });
    }

    /* ---- 字池拼句 ---- */
    private pushTiles(qs: MlgxQuestion[], used: Set<string>) {
        const hard = this.mode === "hard";
        const easy = this.mode === "easy";
        // 标准/困难优先带 cue 的理解性默写句(高考出题模式)
        const line = pickLine(this.rng, (l) => {
            if (used.has(l.norm) || l.norm.length < 4 || l.norm.length > 9) return false;
            if (easy) return l.norm.length <= 7;   // 简单档短句(提示优先紧邻上句, 无则退化 cue/篇目题干)
            return true;
        });
        used.add(line.norm);
        // 干扰字: 该句 traps 混淆字(迷惑性最强) → 同篇其他句的字(标准/困难) → 随机
        const distractorCount = easy ? 2 : hard ? 7 : 5;
        const answerChars = [...line.norm];
        const answerSet = new Set(answerChars);
        const picked: string[] = [];
        const addDistractor = (ch: string): boolean => {
            if (!ch || answerSet.has(ch) || picked.includes(ch)) return false;
            picked.push(ch);
            return true;
        };
        const trapChars = line.traps ? Object.entries(line.traps).flatMap(([ch, cs]) => [ch, ...cs]) : [];
        if (!easy) {
            for (const ch of shuffled(trapChars, this.rng)) {
                if (picked.length >= distractorCount) break;
                addDistractor(ch);
            }
            const siblings = MLGX_LINES.filter((l) => l.pieceKey === line.pieceKey && l.norm !== line.norm);
            for (const s of shuffled(siblings, this.rng)) {
                if (picked.length >= distractorCount) break;
                for (const ch of shuffled([...s.norm], this.rng)) {
                    if (picked.length >= distractorCount) break;
                    addDistractor(ch);
                }
            }
        }
        const others = MLGX_LINES.filter((l) => l.norm !== line.norm);
        while (picked.length < distractorCount) {
            const l = others[Math.floor(this.rng() * others.length)];
            addDistractor(l.norm[Math.floor(this.rng() * l.norm.length)]);
        }
        let id = 0;
        const tiles: Tile[] = [
            ...answerChars.map((ch) => ({ id: id++, ch })),
            ...picked.map((ch) => ({ id: id++, ch })),
        ];
        const pool = shuffled(tiles, this.rng);
        // 上下文提示必须原文紧邻(跳行/跨段不出接句题); 无紧邻且无 cue 时退化为篇目名句题干
        const prevContig = !!line.contig && !!line.neighbor?.prev;
        const nextContig = !!line.neighbor?.next && NEXT_CONTIG.get(line.norm) === true;
        const isCue = !easy && !!line.cue && !prevContig && !nextContig;
        const prompt = isCue
            ? line.cue!
            : prevContig
                ? `「${line.neighbor!.prev}」——请接下一句`
                : nextContig
                    ? `请写出「${line.neighbor!.next}」的上一句`
                    : (line.cue ?? `默写《${line.src.replace(/[《》]/g, "")}》中的名句(${line.norm.length} 字)`);
        qs.push({
            kind: "tiles", src: line.src, author: line.author, examCount: line.examCount,
            prompt, isCue, answerNorm: line.norm, answerText: line.text, slots: line.norm.length,
            pool, removed: [],
        });
    }

    /* ---- 篇章复原(仅原文紧邻且同段的连续 4 句窗口) ---- */
    private pushOrder(qs: MlgxQuestion[]) {
        const win = weightedPick(ORDER_WINDOWS, (w) => lineWeight(w), this.rng);
        let shown = shuffled(win.lines, this.rng);
        if (shown.every((t, i) => t === win.lines[i])) shown = shuffled(win.lines, this.rng);
        qs.push({ kind: "order", src: win.src, author: win.author, examCount: win.examCount, shown, correct: win.lines, revealedFirst: false });
    }

    /* ---- 点选飞花令 ---- */
    private pushFlower(qs: MlgxQuestion[]) {
        const chars = [...FLOWER_COMMON_POOL, ...FLOWER_HARD_POOL]
            .filter((c) => { const n = countLinesWith(c); return n >= 3 && n <= 10; });
        const char = chars[Math.floor(this.rng() * chars.length)] ?? FLOWER_COMMON_POOL[0];
        const hitLines = MLGX_LINES.filter((l) => l.norm.includes(char));
        const missLines = MLGX_LINES.filter((l) => !l.norm.includes(char));
        const hitCount = Math.min(hitLines.length, 3 + Math.floor(this.rng() * 3));
        const picked = [
            ...sample(hitLines, hitCount, this.rng),
            ...sample(missLines, 9 - hitCount, this.rng),
        ];
        const sentences = shuffled(picked, this.rng).map((l) => l.text);
        qs.push({
            kind: "flower", src: "飞花令", author: "多篇", examCount: 0, char,
            sentences,
            hits: sentences.map((t) => normalizeLine(t).includes(char)),
            disabled: [],
        });
    }

    /* ---------------- 作答与流程 ---------------- */

    get cur(): MlgxQuestion | null {
        return this.done ? null : this.qs[this.idx] ?? null;
    }

    answer(payload: number[] | string[]): boolean {
        const q = this.cur;
        if (!q) return false;
        let correct = false;
        if (q.kind === "couplet") {
            correct = (payload as number[])[0] === q.answer;
        } else if (q.kind === "tiles") {
            const assembled = (payload as number[]).map((id) => q.pool.find((t) => t.id === id)?.ch ?? "").join("");
            correct = normalizeLine(assembled) === q.answerNorm;
        } else if (q.kind === "order") {
            const picked = payload as string[];
            correct = picked.length === q.correct.length && picked.every((t, i) => t === q.correct[i]);
        } else {
            const sel = new Set(payload as number[]);
            correct = q.hits.every((h, i) => sel.has(i) === h);
        }
        this.results.push({ kind: q.kind, src: q.src, correct });
        if (correct) this.score++;
        else {
            this.hp--;
            // 错题记录(结算页逐条展示正确答案)
            if (q.kind === "couplet") {
                this.wrongList.push({ kind: q.kind, src: q.src, prompt: `${q.given}（${q.askNext ? "下" : "上"}一句）`, answer: q.options[q.answer] });
            } else if (q.kind === "tiles") {
                this.wrongList.push({ kind: q.kind, src: q.src, prompt: q.prompt, answer: q.answerText });
            } else if (q.kind === "order") {
                this.wrongList.push({ kind: q.kind, src: q.src, prompt: `《${q.src.replace(/[《》]/g, "")}》篇章排序`, answer: q.correct.join("") });
            } else {
                this.wrongList.push({ kind: q.kind, src: q.src, prompt: `点选含「${q.char}」的句子`, answer: q.sentences.filter((_, i) => q.hits[i]).join(" / ") });
            }
        }
        this.idx++;
        if (this.idx >= ROUND_TOTAL || this.hp <= 0) this.finish();
        return correct;
    }

    hint(): boolean {
        const q = this.cur;
        if (!q || this.done || this.tools <= 0) return false;
        if (q.kind === "couplet") {
            const wrongs = q.options.map((_, i) => i).filter((i) => i !== q.answer && !q.disabled.includes(i));
            if (wrongs.length === 0) return false;
            for (const i of sample(wrongs, Math.min(2, wrongs.length), this.rng)) q.disabled.push(i);
        } else if (q.kind === "tiles") {
            const need = new Map<string, number>();
            for (const ch of q.answerNorm) need.set(ch, (need.get(ch) ?? 0) + 1);
            const removable: number[] = [];
            const seen = new Map<string, number>();
            for (const t of q.pool) {
                if (q.removed.includes(t.id)) continue;
                const usedN = (seen.get(t.ch) ?? 0) + 1;
                seen.set(t.ch, usedN);
                if (usedN > (need.get(t.ch) ?? 0)) removable.push(t.id);
            }
            if (removable.length === 0) return false;
            for (const id of sample(removable, Math.min(2, removable.length), this.rng)) q.removed.push(id);
        } else if (q.kind === "order") {
            if (q.revealedFirst) return false;
            q.revealedFirst = true;
        } else {
            const i = q.hits.findIndex((h, k) => !h && !q.disabled.includes(k));
            if (i < 0) return false;
            q.disabled.push(i);
        }
        this.tools--;
        return true;
    }

    private finish() {
        this.done = true;
        this.win = this.hp > 0;
        this.elapsed = Math.floor((Date.now() - this.startAt) / 1000);
    }
}

/* ---------------- 紧邻关系派生表(只有 cont 标注的原文紧邻且同段句才进入) ---------------- */

export interface CoupletPair {
    src: string; author: string; examCount: number; stage: "high" | "junior";
    given: string;      // 展示句
    answer: string;     // 应答句(与 given 原文紧邻)
}

/** 句对匹配合法联池: 紧邻上下句双向互为问答 */
export const COUPLET_PAIRS: CoupletPair[] = MLGX_PIECES.flatMap((p) => {
    const examCount = p.examObs?.length ?? 0;
    const out: CoupletPair[] = [];
    for (let i = 1; i < p.lines.length; i++) {
        if (p.lines[i].cont !== true) continue;   // 未标注紧邻 → 不配对(防跳行/跨段错配)
        out.push({ src: p.src, author: p.author, examCount, stage: p.stage, given: p.lines[i - 1].text, answer: p.lines[i].text });
        out.push({ src: p.src, author: p.author, examCount, stage: p.stage, given: p.lines[i].text, answer: p.lines[i - 1].text });
    }
    return out;
});

/** 篇章复原合法窗口: 原文紧邻连续 ≥4 句的全部 4 句窗口 */
export const ORDER_WINDOWS: { src: string; author: string; examCount: number; stage: "high" | "junior"; lines: string[] }[] = (() => {
    const out: { src: string; author: string; examCount: number; stage: "high" | "junior"; lines: string[] }[] = [];
    for (const p of MLGX_PIECES) {
        const examCount = p.examObs?.length ?? 0;
        let run: string[] = [];
        const flush = () => {
            if (run.length >= 4) {
                for (let k = 0; k + 3 < run.length; k++) {
                    out.push({ src: p.src, author: p.author, examCount, stage: p.stage, lines: run.slice(k, k + 4) });
                }
            }
        };
        for (let i = 0; i < p.lines.length; i++) {
            if (i > 0 && p.lines[i].cont === true) run.push(p.lines[i].text);
            else { flush(); run = [p.lines[i].text]; }
        }
        flush();
    }
    return out;
})();

/** 句 norm → 其后一句与本句紧邻(用于「请写出上一句」型提示) */
const NEXT_CONTIG: Map<string, boolean> = (() => {
    const m = new Map<string, boolean>();
    for (const p of MLGX_PIECES) {
        for (let i = 0; i + 1 < p.lines.length; i++) {
            if (p.lines[i + 1].cont === true) m.set(normalizeLine(p.lines[i].text), true);
        }
    }
    return m;
})();
