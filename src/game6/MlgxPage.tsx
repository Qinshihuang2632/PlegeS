/*
 * 默了个写 · 游戏页 (/mlgx)
 * =========================
 * 古诗文默写记忆: 全程无键盘, 四种全点选题型(句对匹配/字池拼句/篇章复原/点选飞花令)。
 * v1.1.0: 排行榜接入 —— 昵称流(首登弹窗/局内改名二次确认/排行参与开关)+开局会话令牌+
 *         结算提交(超越数/失败重试)+查看排行榜; 三档难度独立榜单(与历了个史同构)。
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HLGX_Audio } from "@/game/audio";
import { detectPlatform } from "@/game/platform";
import { RankPartToggle, readSkipRank, storeSkipRank } from "@/game/RankPartToggle";
import { NameConfirmDialog, validateNickname } from "@/game/NameConfirmDialog";
import { NameEntryDialog, storedIdentity } from "@/game/NameEntryDialog";
import { reportPlayLog } from "@/game/playlog";
import { fetchRankToken } from "@/lib/rankToken";
import { MLGX_VERSION } from "./version";
import { HINT_LIMIT, MLGX_MODES, MlgxGame, ROUND_TOTAL, type MlgxQuestion } from "./core";

const NAME_KEY = "hlgx_name";   // 平台昵称(与其他游戏共享)

interface ResultInfo {
    score: number;
    time: number;
    toolsUsed: number;
    skipped?: boolean;          // 未填昵称或选择不参与排行, 成绩未上传
    surpassed: number | null;
    failed: boolean;
    failMsg?: string;
}

interface Feedback {
    correct: boolean;
    answer: string;   // 错误时展示的正确答案
}

export function MlgxPage() {
    const navigate = useNavigate();
    const gameRef = useRef<MlgxGame>(new MlgxGame("easy"));
    const [, setTick] = useState(0);
    const refresh = () => setTick((t) => t + 1);
    const [mode, setMode] = useState<"easy" | "normal" | "hard">("easy");
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const lockedRef = useRef(false);          // 判定动画期间锁输入
    const [elapsed, setElapsed] = useState(0);
    const rankTokenRef = useRef("");          // v2.8.0: 一次性成绩提交凭证
    const submittedRef = useRef(false);

    /* 昵称与排行参与(与错了个字/历了个史同构) */
    const [name, setName] = useState(() => localStorage.getItem(NAME_KEY)?.trim() || "");
    const [nameDraft, setNameDraft] = useState(() => localStorage.getItem(NAME_KEY)?.trim() || "");
    const [nameTip, setNameTip] = useState("");
    const [nameConfirmOpen, setNameConfirmOpen] = useState(false);
    const [entryOpen, setEntryOpen] = useState(() => !storedIdentity());
    const [skipRank, setSkipRank] = useState(() => readSkipRank());
    const rankActive = !!name.trim() && !skipRank;

    const [result, setResult] = useState<ResultInfo | null>(null);

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
        submittedRef.current = false;
        setResult(null);
        rankTokenRef.current = "";
        void fetchRankToken("mlgx", m).then((t) => { rankTokenRef.current = t; });
        refresh();
    };

    /* 提交成绩(失败可重试) */
    const submitRank = async (time: number, score: number, toolsUsed: number, nm: string) => {
        try {
            let token = rankTokenRef.current;
            if (!token) {
                token = await fetchRankToken("mlgx", mode);
                rankTokenRef.current = token;
            }
            const res = await fetch("/mlgx/api/rank", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode, name: nm, score, time, tools: toolsUsed,
                    version: MLGX_VERSION, platform: detectPlatform(), token,
                }),
            });
            const d = await res.json().catch(() => null);
            setResult({
                score, time, toolsUsed,
                surpassed: res.ok && typeof d?.surpassed === "number" ? d.surpassed : null,
                failed: !res.ok,
                failMsg: !res.ok ? (d?.msg ?? `提交失败(HTTP ${res.status})`) : undefined,
            });
        } catch {
            setResult({ score, time, toolsUsed, surpassed: null, failed: true, failMsg: "网络异常,请检查网络后重试" });
        }
        refresh();
    };

    /* 对局结束: 音效 → 成绩提交(未填昵称/不参与则只记游玩) */
    const finishAndSubmit = () => {
        const game = gameRef.current;
        const time = Math.max(1, game.elapsed);
        const score = game.score;
        const toolsUsed = HINT_LIMIT - game.tools;
        const nm = name.trim();
        if (!nm || skipRank) {
            setResult({ score, time, toolsUsed, skipped: true, surpassed: null, failed: false });
            void reportPlayLog({
                game: "mlgx", mode, name: nm || undefined,
                win: game.win, score, time, tools: toolsUsed, version: MLGX_VERSION,
            });
            refresh();
            return;
        }
        setResult({ score, time, toolsUsed, surpassed: null, failed: false });
        void submitRank(time, score, toolsUsed, nm);
    };

    /** 提交判定: 判定 → 音效/反馈 → 短暂展示后进入下一题; 终局触发成绩提交 */
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
            if (g.done && !submittedRef.current) {
                submittedRef.current = true;
                if (g.win) HLGX_Audio.win();
                else HLGX_Audio.lose();
                finishAndSubmit();
            }
            refresh();
        }, correct ? 700 : 1500);
    };

    const doHint = () => {
        if (lockedRef.current) return;
        if (!g.hint()) return;
        refresh();
    };

    /* 局内改名(二次确认后生效并重开本局, 与错了个字同构) */
    const requestNameConfirm = () => {
        const tip = validateNickname(nameDraft);
        if (tip) { setNameTip(tip); return; }
        if (nameDraft.trim() === name.trim()) { setNameTip("昵称未变化"); return; }
        setNameTip("");
        setNameConfirmOpen(true);
    };
    const confirmName = () => {
        const n = nameDraft.trim();
        setName(n);
        localStorage.setItem(NAME_KEY, n);
        setNameConfirmOpen(false);
        setNameTip("");
        restart();   // 重启本局(重领会话令牌)
    };

    /* 排行榜参与开关: 二次确认后切换并重开本局(昵称保留) */
    const confirmRankPart = (participate: boolean) => {
        setSkipRank(!participate);
        storeSkipRank(!participate);
        restart();
    };

    const q = g.cur;

    return (
        <div className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-10 pt-6">
            {/* 顶栏 */}
            <header className="mb-2 flex items-center gap-2">
                <Link to="/" className="shrink-0 whitespace-nowrap text-sm text-muted-foreground hover:text-foreground">← 返回大厅</Link>
                <h1 className="flex-1 whitespace-nowrap text-center text-lg font-extrabold">默了个写</h1>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{MLGX_VERSION}</span>
            </header>
            {/* 昵称行: 输入 + 二次确认 + 排行参与开关 + 错误提示(与错了个字同构) */}
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1">
                    <input
                        value={nameDraft}
                        maxLength={10}
                        placeholder="昵称"
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") requestNameConfirm(); }}
                        className="w-24 rounded-lg border bg-card px-2 py-1 text-sm outline-none focus:border-primary"
                        aria-label="当前昵称,点击直接修改"
                        title="当前昵称,修改后需二次确认并重开本局"
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={requestNameConfirm} aria-label="确认修改昵称">✓</Button>
                </div>
                <RankPartToggle active={rankActive} onConfirmedChange={confirmRankPart} />
                {nameTip && <span className="text-xs font-semibold text-destructive">{nameTip}</span>}
            </div>

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

            {g.done && result ? (
                /* 结算 */
                <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                    <p className="text-lg font-bold">{g.win ? "本局完成" : "血量耗尽"}</p>
                    <p className="mt-2 text-3xl font-extrabold text-primary">{result.score} / {ROUND_TOTAL} 题</p>
                    <p className="mt-1 text-sm text-muted-foreground">用时 {result.time}s · 提示 {result.toolsUsed} 次</p>
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
                    <div className="mt-3 text-sm">
                        {result.failed ? (
                            <p className="text-destructive">成绩提交失败: {result.failMsg ?? "未知原因"}</p>
                        ) : result.skipped ? (
                            <p className="text-muted-foreground">{name.trim() ? "已选择不参与排行榜,本局成绩未上榜" : "未填写昵称,成绩未上榜"}</p>
                        ) : result.surpassed !== null ? (
                            <p className="font-semibold text-primary">超越 {result.surpassed} 名玩家</p>
                        ) : null}
                    </div>
                    {result.failed && rankActive && (
                        <Button variant="outline" size="sm" className="mt-2"
                            onClick={() => { setResult({ ...result, failed: false }); void submitRank(result.time, result.score, result.toolsUsed, name.trim()); }}>
                            重试提交
                        </Button>
                    )}
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Button asChild variant="outline"><Link to="/hlgx/rank?game=mlgx">查看排行榜</Link></Button>
                        <Button onClick={() => restart()}>再来一局</Button>
                    </div>
                </div>
            ) : g.done ? (
                <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                    <p className="text-sm text-muted-foreground">正在结算成绩…</p>
                </div>
            ) : q && (
                <>
                    {/* 状态栏 */}
                    <div className="mb-3 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2 text-sm">
                        <span>第 {g.idx + 1} / {ROUND_TOTAL} 题</span>
                        <span>得分 {g.score}</span>
                        <span aria-label={`血量 ${g.hp}`}>{[...Array(3)].map((_, i) => (i < g.hp ? "❤️" : "🤍")).join("")}</span>
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

            <footer className="mt-6 text-center text-xs text-muted-foreground">默了个写 · {MLGX_VERSION}(仅供个人娱乐)</footer>

            {/* 首次进入昵称弹窗(未设置昵称时先设置, 放弃则回大厅) */}
            <NameEntryDialog
                open={entryOpen}
                gameName="默了个写"
                onDismiss={() => navigate("/")}
                onConfirm={(nm, skip) => {
                    setName(nm);
                    setNameDraft(nm);
                    setSkipRank(skip);
                    storeSkipRank(skip);
                    if (nm) localStorage.setItem(NAME_KEY, nm);
                    setEntryOpen(false);
                }}
            />

            {/* 改名二次确认(确认后保存并重开本局) */}
            <NameConfirmDialog
                open={nameConfirmOpen}
                pending={nameDraft}
                current={name}
                onOpenChange={setNameConfirmOpen}
                onConfirm={confirmName}
            />
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
                <p className="text-xs text-muted-foreground">
                    {src}
                    {q.examCount > 0 && <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">近年高考考查</span>}
                </p>
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
            onSubmit(assembled, q.answerText);
        };
        return (
            <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
                <p className="text-xs text-muted-foreground">
                    {src}
                    {q.examCount > 0 && <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">近年高考考查</span>}
                </p>
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
                <p className="text-xs text-muted-foreground">
                    {src}
                    {q.examCount > 0 && <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">近年高考考查</span>}
                </p>
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
