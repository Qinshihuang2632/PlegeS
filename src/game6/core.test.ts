/*
 * 默了个写 · 测试 (src/game6/core.test.ts) v2
 * 题库完整性(考纲篇目/唯一性/cue/traps 校验) + 四题型生成与作答逻辑 + 真题加权机制。
 */
import { describe, expect, it } from "vitest";
import {
    EXAM_WEIGHT, FLOWER_COMMON_POOL, FLOWER_HARD_POOL, MLGX_LINES, MLGX_PIECES, countLinesWith, normalizeLine,
} from "./bank";
import { COUPLET_PAIRS, HINT_LIMIT, HP_MAX, MlgxGame, ORDER_WINDOWS, ROUND_TOTAL } from "./core";

/** 可复现随机源(LCG) */
function lcg(seed: number): () => number {
    let s = seed >>> 0 || 1;
    return () => {
        s = (s * 48271) % 2147483647;
        return s / 2147483647;
    };
}

describe("mlgx 题库完整性(v2 考纲版)", () => {
    it("篇目唯一且规模达标(高中+初中)", () => {
        const keys = MLGX_PIECES.map((p) => p.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(MLGX_PIECES.length).toBeGreaterThanOrEqual(100);
        expect(MLGX_PIECES.filter((p) => p.stage === "high").length).toBeGreaterThanOrEqual(60);
        // 考纲外小学篇目不得回流
        for (const p of MLGX_PIECES) {
            expect(p.src).not.toContain("静夜思");
            expect(p.src).not.toContain("登鹳雀楼");
            expect(p.src).not.toContain("春晓");
        }
    });

    it("句子 norm 非空且全局唯一", () => {
        const norms = MLGX_LINES.map((l) => l.norm);
        for (const n of norms) expect(n.length).toBeGreaterThan(0);
        expect(new Set(norms).size).toBe(norms.length);
    });

    it("cue 规模达标且不含答案原文(理解性默写模式)", () => {
        const cued = MLGX_LINES.filter((l) => l.cue);
        expect(cued.length).toBeGreaterThanOrEqual(60);
        for (const l of cued) {
            expect(l.cue!.length).toBeGreaterThan(8);
            expect(l.cue).not.toContain(l.norm);
        }
    });

    it("traps: 易错字必须在本句中, 干扰字不得在本句中", () => {
        const trapped = MLGX_LINES.filter((l) => l.traps);
        expect(trapped.length).toBeGreaterThanOrEqual(50);
        for (const l of trapped) {
            for (const [ch, confuses] of Object.entries(l.traps!)) {
                expect(l.norm.includes(ch), `${l.pieceKey}「${l.norm}」缺易错字「${ch}」`).toBe(true);
                for (const c of confuses) {
                    expect(c.length).toBe(1);
                    expect(l.norm.includes(c), `${l.pieceKey}「${l.norm}」干扰字「${c}」与原文冲突`).toBe(false);
                }
            }
        }
    });

    it("真题考查记录格式正确(2017 改革以来)", () => {
        const withObs = MLGX_PIECES.filter((p) => p.examObs?.length);
        expect(withObs.length).toBeGreaterThanOrEqual(10);
        for (const p of withObs) {
            for (const o of p.examObs!) {
                expect(o.y).toBeGreaterThanOrEqual(0);
                expect(o.y).toBeLessThanOrEqual(2026);
                expect(o.q.length).toBeGreaterThan(1);
            }
        }
        // 已核实锚点: 2026 全国二卷考了琵琶行 / 2025 全国一卷考了望海潮与书愤
        expect(MLGX_PIECES.find((p) => p.src === "《琵琶行》")!.examObs!.some((o) => o.y === 2026)).toBe(true);
        expect(MLGX_PIECES.find((p) => p.src === "《望海潮》")!.examObs!.some((o) => o.y === 2025)).toBe(true);
        expect(MLGX_PIECES.find((p) => p.src === "《书愤》")!.examObs!.some((o) => o.y === 2025)).toBe(true);
    });

    it("飞花令令字池覆盖达标", () => {
        for (const c of FLOWER_COMMON_POOL) expect(countLinesWith(c)).toBeGreaterThanOrEqual(3);
        for (const c of FLOWER_HARD_POOL) expect(countLinesWith(c)).toBeGreaterThanOrEqual(2);
    });

    it("篇章复原素材: 至少 20 篇有 ≥4 句", () => {
        expect(MLGX_PIECES.filter((p) => p.lines.length >= 4).length).toBeGreaterThanOrEqual(20);
    });

    it("论语十二章: 十二章全部入库", () => {
        const piece = MLGX_PIECES.find((p) => p.src === "《论语》十二章")!;
        expect(piece.lines.length).toBeGreaterThanOrEqual(12);
        const norms = piece.lines.map((l) => normalizeLine(l.text));
        for (const must of ["朝闻道", "克己复礼为仁", "己所不欲", "譬如为山", "士不可以不弘毅", "诗可以兴"]) {
            expect(norms.some((n) => n.includes(must)), `论语十二章缺「${must}」`).toBe(true);
        }
    });

    it("删除项: 蜀道难开篇句/长亭送别/老子八章/季氏/孟子一则/逍遥游/谏逐客书/观刈麦 不再出现", () => {
        const spd = MLGX_PIECES.find((p) => p.src === "《蜀道难》")!;
        expect(spd.lines.some((l) => normalizeLine(l.text).startsWith("噫吁嚱"))).toBe(false);
        for (const src of ["《长亭送别》", "《老子》八章", "《季氏将伐颛臾》", "《孟子》一则", "《逍遥游》", "《谏逐客书》", "《观刈麦》"]) {
            expect(MLGX_PIECES.some((p) => p.src === src), `未删除: ${src}`).toBe(false);
        }
    });
});

describe("mlgx 对局逻辑(v2)", () => {
    const MODES = ["easy", "normal", "hard"] as const;

    /** 答对前面的题, 直到目标题型成为当前题 */
    function gotoKind(g: MlgxGame, kind: "couplet" | "tiles" | "order" | "flower") {
        let guard = 0;
        while (g.cur && g.cur.kind !== kind && guard++ < 10) {
            const q = g.cur;
            if (q.kind === "couplet") g.answer([q.answer]);
            else if (q.kind === "tiles") {
                const ids: number[] = [];
                const used = new Map<number, true>();
                for (const ch of q.answerNorm) {
                    const t = q.pool.find((x) => x.ch === ch && !used.has(x.id))!;
                    used.set(t.id, true);
                    ids.push(t.id);
                }
                g.answer(ids);
            } else if (q.kind === "order") g.answer(q.correct);
            else g.answer(q.hits.map((h, i) => (h ? i : -1)).filter((i) => i >= 0));
        }
        return g.cur;
    }

    it("三种难度均生成 8 题且题型配比正确", () => {
        for (const mode of MODES) {
            const g = new MlgxGame(mode, lcg(42));
            expect(g.qs.length).toBe(ROUND_TOTAL);
            const count = (k: string) => g.qs.filter((q) => q.kind === k).length;
            if (mode === "easy") { expect(count("couplet")).toBe(6); expect(count("tiles")).toBe(2); }
            if (mode === "normal") { expect(count("couplet")).toBe(2); expect(count("tiles")).toBe(4); expect(count("order")).toBe(2); }
            if (mode === "hard") { expect(count("tiles")).toBe(4); expect(count("order")).toBe(2); expect(count("flower")).toBe(1); }
        }
    });

    it("句对匹配: 4 选项唯一, 提示排除 2 个错误项", () => {
        const g = new MlgxGame("easy", lcg(7));
        const q = gotoKind(g, "couplet")!;
        if (!q || q.kind !== "couplet") return;
        expect(new Set(q.options).size).toBe(4);
        expect(q.disabled.length).toBe(0);
        expect(g.hint()).toBe(true);
        expect(q.disabled.length).toBe(2);
        expect(q.disabled).not.toContain(q.answer);
    });

    it("字池拼句: 池含目标句全部字(按次数), 正确路径判定通过", () => {
        const g = new MlgxGame("normal", lcg(11));
        const q = gotoKind(g, "tiles")!;
        if (!q || q.kind !== "tiles") return;
        const need = new Map<string, number>();
        for (const ch of q.answerNorm) need.set(ch, (need.get(ch) ?? 0) + 1);
        const have = new Map<string, number>();
        for (const t of q.pool) have.set(t.ch, (have.get(t.ch) ?? 0) + 1);
        for (const [ch, n] of need) expect(have.get(ch) ?? 0).toBeGreaterThanOrEqual(n);
        expect(q.pool.length).toBeGreaterThan(q.slots);
        const ids: number[] = [];
        const used = new Map<number, true>();
        for (const ch of q.answerNorm) {
            const t = q.pool.find((x) => x.ch === ch && !used.has(x.id))!;
            used.set(t.id, true);
            ids.push(t.id);
        }
        expect(g.answer(ids)).toBe(true);
    });

    it("字池拼句: 标准/困难混入同篇干扰字(难度提升), 提示只删多余块", () => {
        let withSibling = 0;
        for (let seed = 1; seed <= 50; seed++) {
            const g = new MlgxGame("normal", lcg(seed * 31));
            const q = gotoKind(g, "tiles");
            if (!q || q.kind !== "tiles") continue;
            const pieceLines = MLGX_LINES.filter((l) => l.pieceKey === q.src + "·" + q.author && l.norm !== q.answerNorm)
                .map((l) => l.norm);
            const pieceChars = new Set(pieceLines.join(""));
            const distractors = q.pool.slice(q.slots).map((t) => t.ch);
            if (distractors.some((ch) => pieceChars.has(ch))) withSibling++;
        }
        expect(withSibling).toBeGreaterThan(0);
        const g = new MlgxGame("hard", lcg(13));
        const q = gotoKind(g, "tiles")!;
        if (q && q.kind === "tiles") {
            expect(g.hint()).toBe(true);
            for (const id of q.removed) {
                const t = q.pool.find((x) => x.id === id)!;
                const remainNeed = [...q.answerNorm].filter((ch) => ch === t.ch).length;
                const remainHave = q.pool.filter((x) => x.ch === t.ch && !q.removed.includes(x.id)).length;
                expect(remainHave).toBeGreaterThanOrEqual(remainNeed);
            }
        }
    });

    it("篇章复原: correct 必为「原文紧邻且同段」的 4 句窗口(ORDER_WINDOWS), 判定正确路径", () => {
        const g = new MlgxGame("normal", lcg(17));
        const q = gotoKind(g, "order")!;
        if (!q || q.kind !== "order") return;
        expect(q.shown.length).toBe(4);
        const isLegalWindow = ORDER_WINDOWS.some((w) => w.src === q.src && w.lines.every((t, k) => t === q.correct[k]));
        expect(isLegalWindow).toBe(true);
        expect(g.hint()).toBe(true);
        expect(q.revealedFirst).toBe(true);
        expect(g.answer(q.correct)).toBe(true);
    });

    it("回归(严重错误): 「大弦嘈嘈如急雨，小弦切切如私语」的下句必须是「嘈嘈切切错杂弹，大珠小珠落玉盘」", () => {
        const pair = COUPLET_PAIRS.find((p) => p.given.startsWith("大弦嘈嘈"));
        expect(pair).toBeDefined();
        expect(pair!.answer).toBe("嘈嘈切切错杂弹，大珠小珠落玉盘。");
        // 反向也成立
        const rev = COUPLET_PAIRS.find((p) => p.given === "嘈嘈切切错杂弹，大珠小珠落玉盘。");
        expect(rev!.answer).toBe("大弦嘈嘈如急雨，小弦切切如私语。");
    });

    it("跨自然段/跳行不配对: 「夫子哂之」等非紧邻句不得作为任何联的应答句", () => {
        // 侍坐「夫子哂之」前句非紧邻(不同自然段), 不得出现在 COUPLET_PAIRS 的 answer 里
        const answers = COUPLET_PAIRS.map((p) => p.answer);
        expect(answers).not.toContain("夫子哂之。");
        // 数据不变量: 每条联的应答句必须紧跟展示句且带 cont 标注(原文紧邻且同段)
        for (const p of COUPLET_PAIRS) {
            const piece = MLGX_PIECES.find((x) => x.src === p.src && x.author === p.author);
            expect(piece, `联篇目不在库: ${p.src}`).toBeDefined();
            const gi = piece!.lines.findIndex((l) => l.text === p.given);
            const ai = piece!.lines.findIndex((l) => l.text === p.answer);
            expect(gi, `联展示句不在篇内: ${p.given}`).toBeGreaterThanOrEqual(0);
            expect(ai, `联应答句不在篇内: ${p.answer}`).toBeGreaterThanOrEqual(0);
            expect(Math.abs(ai - gi), `联两句不紧邻: ${p.given} → ${p.answer}`).toBe(1);
            expect(piece!.lines[Math.max(ai, gi)].cont, `后句未标紧邻: ${p.answer}`).toBe(true);
        }
    });

    it("点选飞花令: 9 句、命中 3~5、全对/多选判定正确, 提示排除不含令字句", () => {
        const g = new MlgxGame("hard", lcg(19));
        const q = gotoKind(g, "flower")!;
        if (q && q.kind === "flower") {
            expect(q.sentences.length).toBe(9);
            expect(q.fulls.length).toBe(9);
            // 掩码不变量: 每句恰好挖空(□); 命中句挖的是令字(显示不再含令字), 非命中句原文本就不含令字
            for (let i = 0; i < 9; i++) {
                expect(q.sentences[i].includes("□"), `第 ${i} 句未挖空: ${q.sentences[i]}`).toBe(true);
                if (q.hits[i]) {
                    expect(q.fulls[i].includes(q.char)).toBe(true);
                    expect(q.sentences[i].includes(q.char)).toBe(false);
                } else {
                    expect(q.fulls[i].includes(q.char)).toBe(false);
                }
            }
            const hitN = q.hits.filter(Boolean).length;
            expect(hitN).toBeGreaterThanOrEqual(3);
            expect(hitN).toBeLessThanOrEqual(5);
            expect(g.hint()).toBe(true);
            expect(q.disabled.length).toBe(1);
            expect(q.hits[q.disabled[0]]).toBe(false);
        }
        const g2 = new MlgxGame("hard", lcg(23));
        const q2 = gotoKind(g2, "flower");
        if (q2 && q2.kind === "flower") {
            const right = q2.hits.map((h, i) => (h ? i : -1)).filter((i) => i >= 0);
            expect(g2.answer(right)).toBe(true);
        }
        const g3 = new MlgxGame("hard", lcg(29));
        const q3 = gotoKind(g3, "flower");
        if (q3 && q3.kind === "flower") {
            const extra = q3.hits.findIndex((h) => !h);
            const sel = [...q3.hits.map((h, i) => (h ? i : -1)).filter((i) => i >= 0), extra];
            expect(g3.answer(sel)).toBe(false);
        }
    });

    it("真题加权: 考过篇目在长程抽样中占比显著高于未考篇目", () => {
        const drawn = new Map<string, number>();
        for (let seed = 1; seed <= 500; seed++) {
            const g = new MlgxGame("normal", lcg(seed * 7 + 3));
            const q = g.qs.find((x) => x.kind === "tiles");
            if (q && q.kind === "tiles") drawn.set(q.src + "·" + q.author, (drawn.get(q.src + "·" + q.author) ?? 0) + 1);
        }
        const exam = [...drawn].filter(([k]) => (MLGX_PIECES.find((p) => p.key === k)?.examObs?.length ?? 0) > 0);
        const nonExam = [...drawn].filter(([k]) => (MLGX_PIECES.find((p) => p.key === k)?.examObs?.length ?? 0) === 0);
        expect(exam.length).toBeGreaterThan(0);
        expect(nonExam.length).toBeGreaterThan(0);
        const examAvg = exam.reduce((s, [, n]) => s + n, 0) / exam.length;
        const nonExamAvg = nonExam.reduce((s, [, n]) => s + n, 0) / nonExam.length;
        expect(examAvg / nonExamAvg).toBeGreaterThan(1.3);
        expect(EXAM_WEIGHT).toBe(2);
    });

    it("完整对局: 全对通关, 连错 3 题阵亡, 提示上限 2 次", () => {
        for (const mode of MODES) {
            const g = new MlgxGame(mode, lcg(101));
            let guard = 0;
            while (!g.done && guard++ < 20) {
                const q = g.cur!;
                if (q.kind === "couplet") g.answer([q.answer]);
                else if (q.kind === "tiles") {
                    const ids: number[] = [];
                    const used = new Map<number, true>();
                    for (const ch of q.answerNorm) {
                        const t = q.pool.find((x) => x.ch === ch && !used.has(x.id))!;
                        used.set(t.id, true);
                        ids.push(t.id);
                    }
                    g.answer(ids);
                } else if (q.kind === "order") g.answer(q.correct);
                else g.answer(q.hits.map((h, i) => (h ? i : -1)).filter((i) => i >= 0));
            }
            expect(g.done).toBe(true);
            expect(g.win).toBe(true);
            expect(g.score).toBe(ROUND_TOTAL);
            expect(g.hp).toBe(HP_MAX);
        }
        const g2 = new MlgxGame("easy", lcg(103));
        let guard = 0;
        while (!g2.done && guard++ < 10) g2.answer([-1]);
        expect(g2.done).toBe(true);
        expect(g2.win).toBe(false);
        expect(g2.hp).toBe(0);
        const g3 = new MlgxGame("easy", lcg(107));
        let usedHints = 0;
        while (g3.hint()) usedHints++;
        expect(usedHints).toBeLessThanOrEqual(HINT_LIMIT);
    });

    it("初中概率下调: 初中篇目被抽频率约为高中一半(JUNIOR_WEIGHT=0.5)", () => {
        const drawn = new Map<string, number>();
        for (let seed = 1; seed <= 600; seed++) {
            const g = new MlgxGame("normal", lcg(seed * 11 + 5));
            const q = g.qs.find((x) => x.kind === "tiles");
            if (q && q.kind === "tiles") drawn.set(q.src + "·" + q.author, (drawn.get(q.src + "·" + q.author) ?? 0) + 1);
        }
        const junior = [...drawn].filter(([k]) => MLGX_PIECES.find((p) => p.key === k)?.stage === "junior");
        const high = [...drawn].filter(([k]) => MLGX_PIECES.find((p) => p.key === k)?.stage === "high");
        expect(junior.length).toBeGreaterThan(0);
        expect(high.length).toBeGreaterThan(0);
        const jAvg = junior.reduce((s, [, n]) => s + n, 0) / junior.length;
        const hAvg = high.reduce((s, [, n]) => s + n, 0) / high.length;
        expect(jAvg / hAvg).toBeLessThan(0.9);
        expect(jAvg / hAvg).toBeGreaterThan(0.15);
    });

    it("错题回顾: 答错一题即记录, 正确答案非空; 全对则无错题", () => {
        const g = new MlgxGame("easy", lcg(55));
        const q = g.cur!;
        if (q.kind === "couplet") g.answer([q.answer === 0 ? 1 : 0]);
        else if (q.kind === "tiles") {
            const d = q.pool.find((t) => !q.answerNorm.includes(t.ch))!;
            g.answer([d.id]);
        } else if (q.kind === "order") g.answer([...q.correct].reverse());
        else g.answer(q.hits.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0));
        expect(g.wrongList.length).toBe(1);
        expect(g.wrongList[0].prompt.length).toBeGreaterThan(0);
        expect(g.wrongList[0].answer.length).toBeGreaterThan(0);
        const g2 = new MlgxGame("easy", lcg(57));
        let guard = 0;
        while (!g2.done && guard++ < 20) {
            const q2 = g2.cur!;
            if (q2.kind === "couplet") g2.answer([q2.answer]);
            else if (q2.kind === "tiles") {
                const ids: number[] = [];
                const used = new Map<number, true>();
                for (const ch of q2.answerNorm) {
                    const t = q2.pool.find((x) => x.ch === ch && !used.has(x.id))!;
                    used.set(t.id, true);
                    ids.push(t.id);
                }
                g2.answer(ids);
            } else if (q2.kind === "order") g2.answer(q2.correct);
            else g2.answer(q2.hits.map((h, i) => (h ? i : -1)).filter((i) => i >= 0));
        }
        expect(g2.wrongList.length).toBe(0);
    });

    it("随机种子 300 局无崩溃且结构合法", () => {
        for (let seed = 1; seed <= 300; seed++) {
            const mode = MODES[seed % 3];
            const g = new MlgxGame(mode, lcg(seed));
            expect(g.qs.length).toBe(ROUND_TOTAL);
            for (const q of g.qs) {
                if (q.kind === "couplet") expect(new Set(q.options).size).toBe(4);
                if (q.kind === "tiles") expect(q.pool.length).toBeGreaterThan(q.slots);
                if (q.kind === "flower") expect(q.sentences.length).toBe(9);
            }
        }
    });
});
