/*
 * 默了个写 · 游戏页 (/mlgx) —— 内测版 v0.9.0
 * ==========================================
 * 古诗文默写记忆: 全程无键盘, 四种全点选题型(句对匹配/字池拼句/篇章复原/点选飞花令)。
 * 排行榜与主界面入口将在题库审定后随 v1.0.0 接入; 本页先供试玩与题库校对。
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HLGX_Audio } from "@/game/audio";
import { MLGX_VERSION } from "./version";
import { MLGX_MODES, MlgxGame, ROUND_TOTAL, type MlgxQuestion } from "./core";

interface Feedback {
    correct: boolean;
    answer: string;   // 错误时展示的正确答案
}

export function MlgxPage() {
    const gameRef = useRef<MlgxGame>(new MlgxGame("easy"));
    const [, setTick] = useState(0);
    const refresh = () => setTick((t) => t + 1);
    const [mode, setMode] = useState<"easy" | "normal" | "hard">("easy");
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const lockedRef = useRef(false);          // 判定动画期间锁输入
    const [elapsed, setElapsed] = useState(0);

    const g = gameRef.current;

    useEffect(() => {
        const t = setInterval(() => {
            if (!gameRef.current.done) setElapsed(Math.floor((Date.now() - gameRef.current.startAt) / 1000));
        }, 500);
        return () => clearInterval(t);
    }, []);

    const restart = (m: "easy" | "normal" | "hard" = mode) => {
        setMode(m);
        gameRef.current.newGame(m);
        setFeedback(null);
        setElapsed(0);
        lockedRef.current = false;
        refresh();
    };

    /** 提交: 判定 → 音效/反馈 → 短暂展示后进入下一题 */
    const submit = (payload: number[] | string[], answerText: string) => {
        if (lockedRef.current || g.done) return;
        lockedRef.current = true;
        const correct = g.answer(payload);
        if (correct) HLGX_Audio.correct();
        else HLGX_Audio.wrong();
        setFeedback({ correct, answer: correct ? "" : answerText });
        setTimeout(() => {
            setFeedback(null);
            lockedRef.current = false;
            if (g.done) {
                if (g.win) HLGX_Audio.win();
                else HLGX_Audio.lose();
            }
            refresh();
        }, correct ? 700 : 1500);
    };

    const doHint = () => {
        if (lockedRef.current) return;
        if (!g.hint()) return;
        refresh();
    };

    const q = g.cur;

    return (
        <div className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-10 pt-6">
            {/* 顶栏 */}
            <header className="mb-2 flex items-center gap-2">
                <Link to="/" className="shrink-0 whitespace-nowrap text-sm text-muted-foreground hover:text-foreground">← 返回大厅</Link>
                <h1 className="flex-1 whitespace-nowrap text-center text-lg font-extrabold">默了个写</h1>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{MLGX_VERSION} 内测</span>
            </header>

            {/* 难度切换 */}
            <div className="mb-2 flex gap-1 rounded-full bg-muted p-1">
                {MLGX_MODES.map(({ mode: m, label }) => (
                    <button key={m} onClick={() => restart(m)}
                        className={cn("flex-1 rounded-full px-2 py-1.5 text-sm font-semibold transition",
                            mode === m ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                        {label}
                    </button>
                ))}
            </div>

            {g.done ? (
                /* 结算 */
                <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                    <p className="text-lg font-bold">{g.win ? "本局完成" : "血量耗尽"}</p>
                    <p className="mt-2 text-3xl font-extrabold text-primary">{g.score} / {ROUND_TOTAL} 题</p>
                    <p className="mt-1 text-sm text-muted-foreground">用时 {g.elapsed}s</p>
                    {g.wrongList.length > 0 && (
                        <div className="mx-auto mt-3 max-w-md rounded-lg bg-muted/40 p-3 text-left">
                            <p className="text-xs font-semibold text-muted-foreground">错题回顾({g.wrongList.length} 题, 正确答案):</p>
                            <ul className="mt-1.5 space-y-2">
                                {g.wrongList.map((w, i) => (
                                    <li key={i} className="text-sm leading-relaxed">
                                        <span className="text-muted-foreground">{w.prompt}</span>
                                        <br />
                                        <span className="font-semibold text-success">{w.answer}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">排行榜将在题库审定后随 v1.0.0 上线</p>
                    <div className="mt-4 flex justify-center gap-2">
                        <Button onClick={() => restart()}>再来一局</Button>
                    </div>
                </div>
            ) : q && (
                <>
                    {/* 状态栏 */}
                    <div className="mb-3 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2 text-sm">
                        <span>第 {g.idx + 1} / {ROUND_TOTAL} 题</span>
                        <span>得分 {g.score}</span>
                        <span aria-label={`血量 ${g.hp}`}>{["❤️", "🤍"][0] && [...Array(3)].map((_, i) => (i < g.hp ? "❤️" : "🤍")).join("")}</span>
                        <span className="tabular-nums">⏱ {elapsed}s</span>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={doHint} disabled={g.tools <= 0}>
                            提示({g.tools})
                        </Button>
                    </div>

                    <QuestionCard key={g.idx} q={q} lockedRef={lockedRef} onSubmit={submit} onTick={refresh} />

                    {/* 判定反馈 */}
                    {feedback && (
                        <p className={cn("mt-3 text-center text-sm font-semibold",
                            feedback.correct ? "text-success" : "text-destructive")}
                            role="status">
                            {feedback.correct ? "✓ 正确!" : `✗ 应为「${feedback.answer}」`}
                        </p>
                    )}
                </>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
                全程点选, 无需打字 —— 先记住写什么, 写法去「错了个字」练
            </p>
        </div>
    );
}

/** 题卡: 按题型渲染; key=题目序号保证切题时重置局部状态 */
function QuestionCard({ q, lockedRef, onSubmit, onTick }: {
    q: MlgxQuestion;
    lockedRef: React.RefObject<boolean>;
    onSubmit: (payload: number[] | string[], answerText: string) => void;
    onTick: () => void;
}) {
    const [assembled, setAssembled] = useState<number[]>([]);   // tiles 已拼字块 id
    const [picked, setPicked] = useState<string[]>([]);         // order 已选句子
    const [selected, setSelected] = useState<Set<number>>(new Set());   // flower 勾选

    useEffect(() => {
        setAssembled([]);
        setPicked([]);
        setSelected(new Set());
    }, [q]);

    const src = q.kind === "flower" ? "" : `《${q.src.replace(/[《》]/g, "")}》· ${q.author}`;

    if (q.kind === "couplet") {
        return (
            <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
                <p className="text-xs text-muted-foreground">{src}{q.examCount > 0 && <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">近年高考考查</span>}</p>
                <p className="mb-4 mt-2 text-2xl font-bold leading-relaxed">{q.given}</p>
                <p className="mb-3 text-xs text-muted-foreground">{q.askNext ? "选出它的下一句" : "选出它的上一句"}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, i) => (
                        <button key={i} disabled={lockedRef.current || q.disabled.includes(i)}
                            onClick={() => onSubmit([i], q.options[q.answer])}
                            className={cn(
                                "rounded-xl border p-3 text-sm font-semibold leading-relaxed transition",
                                q.disabled.includes(i)
                                    ? "border-border bg-muted/30 text-muted-foreground/40 line-through"
                                    : "border-border bg-card hover:bg-muted/60 hover:border-primary/60",
                            )}>
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (q.kind === "tiles") {
        const usedIds = new Set(assembled);
        const full = assembled.length === q.slots;
        const submitTiles = () => {
            if (!full || lockedRef.current) return;
            onSubmit(assembled, q.answerNorm);
        };
        return (
            <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
                <p className="text-xs text-muted-foreground">{src}{q.examCount > 0 && <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">近年高考考查</span>}</p>
                <p className="mb-1 mt-2 text-sm font-semibold leading-relaxed">{q.prompt}</p>
                <p className="mb-3 text-xs text-muted-foreground">从下方字块中按顺序点选, 拼出答案({q.slots} 字)</p>
                {/* 拼写槽 */}
                <div className="mb-4 flex flex-wrap justify-center gap-1.5">
                    {[...Array(q.slots)].map((_, i) => {
                        const id = assembled[i];
                        const ch = id !== undefined ? q.pool.find((t) => t.id === id)?.ch ?? "" : "";
                        return (
                            <button key={i} aria-label={`第 ${i + 1} 字${ch ? `:${ch}` : "(空)"}`}
                                onClick={() => {
                                    if (ch && !lockedRef.current) { setAssembled(assembled.filter((x) => x !== id)); onTick(); }
                                }}
                                className={cn("flex h-11 w-11 items-center justify-center rounded-lg border-2 text-xl font-bold",
                                    ch ? "border-primary bg-primary/10 text-primary" : "border-dashed border-muted-foreground/40 bg-muted/20 text-transparent")}>
                                {ch || "？"}
                            </button>
                        );
                    })}
                </div>
                {/* 字块池 */}
                <div className="flex flex-wrap justify-center gap-1.5">
                    {q.pool.map((t) => {
                        const removed = q.removed.includes(t.id);
                        const used = usedIds.has(t.id);
                        return (
                            <button key={t.id} aria-label={`字块:${t.ch}`}
                                disabled={removed || used || lockedRef.current}
                                onClick={() => {
                                    if (assembled.length >= q.slots) return;
                                    const next = [...assembled, t.id];
                                    setAssembled(next);
                                    onTick();
                                    if (next.length === q.slots) setTimeout(() => submitTiles(), 150);
                                }}
                                className={cn(
                                    "flex h-11 w-11 items-center justify-center rounded-lg border text-xl font-bold transition",
                                    removed ? "border-border/40 bg-muted/20 text-transparent" :
                                        used ? "border-border/40 bg-muted/40 text-muted-foreground/30" :
                                            "border-border bg-card shadow-sm hover:border-primary hover:bg-primary/10 active:scale-95",
                                )}>
                                {removed ? "" : t.ch}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4 flex justify-center gap-2">
                    <Button size="sm" variant="outline" disabled={assembled.length === 0 || lockedRef.current}
                        onClick={() => { setAssembled([]); onTick(); }}>
                        重拼
                    </Button>
                    <Button size="sm" disabled={!full || lockedRef.current} onClick={submitTiles}>提交判定</Button>
                </div>
            </div>
        );
    }

    if (q.kind === "order") {
        const full = picked.length === q.shown.length;
        return (
            <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
                <p className="text-xs text-muted-foreground">{src}{q.examCount > 0 && <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">近年高考考查</span>}</p>
                <p className="mb-3 mt-2 text-sm font-semibold">按原文顺序点选下面四句</p>
                {q.revealedFirst && (
                    <p className="mb-2 text-xs font-semibold text-primary">提示: 首句是「{q.correct[0]}」</p>
                )}
                <ol className="mx-auto mb-4 max-w-md space-y-1 text-left">
                    {picked.map((t, i) => (
                        <li key={i} className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                            {t}
                        </li>
                    ))}
                </ol>
                <div className="grid gap-2">
                    {q.shown.map((t) => {
                        const used = picked.includes(t);
                        return (
                            <button key={t} disabled={used || lockedRef.current}
                                onClick={() => {
                                    if (picked.length >= q.shown.length) return;
                                    const next = [...picked, t];
                                    setPicked(next);
                                    onTick();
                                    if (next.length === q.shown.length) setTimeout(() => onSubmit(next, q.correct.join("")), 200);
                                }}
                                className={cn("rounded-xl border p-3 text-sm font-semibold transition",
                                    used ? "border-border/40 bg-muted/30 text-muted-foreground/30" : "border-border bg-card hover:border-primary/60 hover:bg-muted/60")}>
                                {t}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4 flex justify-center gap-2">
                    <Button size="sm" variant="outline" disabled={picked.length === 0 || lockedRef.current}
                        onClick={() => { setPicked([]); onTick(); }}>
                        重置
                    </Button>
                    <Button size="sm" disabled={!full || lockedRef.current} onClick={() => onSubmit(picked, q.correct.join(""))}>提交判定</Button>
                </div>
            </div>
        );
    }

    // flower
    return (
        <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
            <p className="text-sm font-semibold">
                点选出<strong className="mx-1 text-xl text-primary">「{q.char}」</strong>所在的句子(可多选)
            </p>
            <p className="mb-3 text-xs text-muted-foreground">没有令字的句子不要选</p>
            <div className="grid gap-2">
                {q.sentences.map((t, i) => {
                    const off = q.disabled.includes(i);
                    return (
                        <button key={i} disabled={off || lockedRef.current}
                            onClick={() => {
                                const next = new Set(selected);
                                if (next.has(i)) next.delete(i); else next.add(i);
                                setSelected(next);
                                onTick();
                            }}
                            className={cn("rounded-xl border p-3 text-left text-sm font-semibold transition",
                                off ? "border-border/40 bg-muted/20 text-muted-foreground/30 line-through"
                                    : selected.has(i) ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-card hover:border-primary/60 hover:bg-muted/60")}>
                            {t}
                        </button>
                    );
                })}
            </div>
            <Button size="sm" className="mt-4" disabled={selected.size === 0 || lockedRef.current}
                onClick={() => {
                    const answerText = q.hits.map((h, i) => (h ? q.sentences[i] : "")).filter(Boolean).join(" / ");
                    onSubmit([...selected], answerText);
                }}>
                提交判定({selected.size})
            </Button>
        </div>
    );
}
