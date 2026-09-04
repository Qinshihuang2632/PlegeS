/*
 * 历了个史 · 游戏页 (/llgs, src/game7/LlgsPage.tsx)
 * ==================================================
 * 玩法: 时间轴排序 —— 一局 5 张事件卡, 玩家拖拽排成时间先后, 点「提交判定」:
 *       归位正确的卡变绿锁定, 错位卡标红可继续调整, 全部归位 → 通关。
 * 无血条(失误 = 提交次数); 提示道具每局 2 次(自动归位一张并锁定, 计入排名)。
 * 榜单: 独立 API /llgs/api/rank, 排序 归位对数↓ → 用时↑ → 失误↑ → 提示↑。
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/game/core";
import { detectPlatform } from "@/game/platform";
import { NameConfirmDialog, validateNickname } from "@/game/NameConfirmDialog";
import { HLGX_Audio } from "@/game/audio";
import { fetchRankToken } from "@/lib/rankToken";
import { RankPartToggle, readSkipRank, storeSkipRank } from "@/game/RankPartToggle";
import { NameEntryDialog, storedIdentity } from "@/game/NameEntryDialog";
import { reportPlayLog } from "@/game/playlog";
import { LlgsRules } from "./LlgsRules";
import { LLGS_VERSION } from "./version";
import { HINT_LIMIT, ROUND_CARDS, judge, newGame, swap, tick, useHint, type LlgsMode, type LlgsState } from "./core";

const NAME_KEY = "hlgx_name";   // 平台昵称(全平台共享)

function readName(): string {
    try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
}

const MODE_TABS: { mode: LlgsMode; label: string }[] = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "hard", label: "困难" },
];

interface ResultInfo {
    win: boolean;
    score: number;
    time: number;
    attempts: number;
    hintsUsed: number;
    surpassed: number | null;
    failed: boolean;
    failMsg?: string;
    skipped?: boolean;
}

export function LlgsPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<LlgsMode>("easy");
    const [phase, setPhase] = useState<"ready" | "playing" | "result">("ready");
    const [st, setSt] = useState<LlgsState | null>(null);
    const [dragIdx, setDragIdx] = useState<number | null>(null);   // 拖拽中的卡位
    const [overIdx, setOverIdx] = useState<number | null>(null);   // 悬停目标位
    const [result, setResult] = useState<ResultInfo | null>(null);
    const submittedRef = useRef(false);

    /* 昵称 / 排行 */
    const [name, setName] = useState(readName);
    const [nameDraft, setNameDraft] = useState(readName);
    const [nameTip, setNameTip] = useState("");
    const [nameConfirmOpen, setNameConfirmOpen] = useState(false);
    const [skipRank, setSkipRank] = useState(() => readSkipRank());
    const rankActive = !!name.trim() && !skipRank;
    const [entryOpen, setEntryOpen] = useState(() => !storedIdentity());
    const [muted, setMuted] = useState(HLGX_Audio.isMuted());
    const rankTokenRef = useRef("");   // v2.8.0: 一次性成绩提交凭证

    const onNameDraftChange = (v: string) => { setNameDraft(v); setNameTip(validateNickname(v)); };
    const requestNameConfirm = () => {
        const tip = validateNickname(nameDraft);
        if (tip) { setNameTip(tip); return; }
        if (nameDraft.trim() === name.trim()) { setNameTip("昵称未变化"); return; }
        setNameConfirmOpen(true);
    };
    const confirmName = () => {
        const n = nameDraft.trim();
        setName(n);
        localStorage.setItem(NAME_KEY, n);
        setNameConfirmOpen(false);
        setNameTip("");
        if (phase === "playing") start(mode);
    };
    const confirmRankPart = (p: boolean) => {
        setSkipRank(!p);
        storeSkipRank(!p);
        if (phase === "playing") start(mode);
    };
    const confirmEntry = (n: string, skip: boolean) => {
        if (n) { setName(n); setNameDraft(n); localStorage.setItem(NAME_KEY, n); }
        setSkipRank(skip);
        storeSkipRank(skip);
        setEntryOpen(false);
    };

    /* 开局 */
    const start = (m: LlgsMode) => {
        setMode(m);
        setResult(null);
        submittedRef.current = false;
        setSt(newGame(m));
        setPhase("playing");
        rankTokenRef.current = "";
        void fetchRankToken("llgs", m).then((t) => { rankTokenRef.current = t; });
    };

    /* 结算与提交 */
    useEffect(() => {
        if (!st || st.phase !== "win" || submittedRef.current) return;
        submittedRef.current = true;
        setPhase("result");
        if (st.phase === "win") HLGX_Audio.win();
        const time = Math.max(1, Math.ceil(st.elapsed));
        const score = ROUND_CARDS;
        const info: ResultInfo = {
            win: true, score, time,
            attempts: st.attempts,
            hintsUsed: HINT_LIMIT - st.hintsLeft,
            skipped: false, surpassed: null, failed: false,
        };
        const nm = name.trim();
        if (!nm || skipRank) {
            setResult({ ...info, skipped: true });
            void reportPlayLog({
                game: "llgs", mode, name: nm || undefined,
                win: true, score, time, tools: HINT_LIMIT - st.hintsLeft, version: LLGS_VERSION,
            });
            return;
        }
        (async () => {
            try {
                let token = rankTokenRef.current;
                if (!token) {
                    token = await fetchRankToken("llgs", mode);
                    rankTokenRef.current = token;
                }
                const res = await fetch("/llgs/api/rank", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        mode, name: nm, score, time,
                        attempts: st.attempts, tools: HINT_LIMIT - st.hintsLeft,
                        version: LLGS_VERSION, platform: detectPlatform(), token,
                    }),
                });
                const d = await res.json().catch(() => null);
                setResult({
                    ...info,
                    skipped: false,
                    surpassed: res.ok && typeof d?.surpassed === "number" ? d.surpassed : null,
                    failed: !res.ok,
                    failMsg: !res.ok ? (d?.msg ?? `提交失败(HTTP ${res.status})`) : undefined,
                });
            } catch {
                setResult({ ...info, failed: true, failMsg: "网络异常,请检查网络后重试" });
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [st?.phase]);

    /* 计时 */
    useEffect(() => {
        if (phase !== "playing") return;
        const t = setInterval(() => setSt((prev) => (prev && prev.phase === "playing" ? tick(prev, 0.5) : prev)), 500);
        return () => clearInterval(t);
    }, [phase]);

    /* 拖拽: pointer 事件(手机/电脑通用) */
    const onCardPointerDown = (e: React.PointerEvent, idx: number) => {
        if (!st || st.phase !== "playing" || st.done[idx]) return;
        e.preventDefault();
        setDragIdx(idx);
    };
    const onCardPointerUp = (idx: number) => {
        if (dragIdx === null) return;
        setSt((prev) => (prev ? swap(prev, dragIdx, idx) : prev));
        setDragIdx(null);
        setOverIdx(null);
    };

    const doJudge = () => {
        setSt((prev) => (prev ? judge(prev) : prev));
        // 错位时提示音(全对时结算 effect 会播通关音)
        if (st && st.lastWrong && st.lastWrong.length > 0) HLGX_Audio.wrong();
    };
    const doHint = () => setSt((prev) => (prev ? useHint(prev) : prev));

    const [rulesOpen, setRulesOpen] = useState(false);

    if (phase === "ready") {
        return (
            <ReadyScreen
                mode={mode}
                setMode={setMode}
                onStart={() => start(mode)}
                onRules={() => setRulesOpen(true)}
                rankActive={rankActive}
                onRankToggle={confirmRankPart}
                nameDraft={nameDraft}
                onNameDraftChange={onNameDraftChange}
                onNameConfirm={requestNameConfirm}
                nameTip={nameTip}
                muted={muted}
                setMuted={setMuted}
            />
        );
    }

    return (
        <div className="mx-auto min-h-dvh w-full max-w-xl px-3 pb-10 pt-3">
            {/* 顶栏 */}
            <header className="mb-2 flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to="/">← 返回大厅</Link>
                </Button>
                <h1 className="flex-1 whitespace-nowrap text-center text-lg font-extrabold">历了个史</h1>
                <div className="flex shrink-0 items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setMuted(!muted); HLGX_Audio.setMuted(!muted); }}
                        aria-label="静音开关"
                        title={muted ? "已静音" : "音效"}
                    >
                        {muted ? "🔇" : "🔊"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => start(mode)} aria-label="重新开始" title="重新开始本局">⟳</Button>
                </div>
            </header>

            {st && (
                <div className="space-y-3">
                    {/* 状态栏 */}
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-4 py-2 text-sm">
                        <span>⏱ <b className="tabular-nums font-mono">{fmtTime(Math.floor(st.elapsed))}</b></span>
                        <span>已归位 <b>{st.done.filter(Boolean).length}</b>/{ROUND_CARDS}</span>
                        <span>提交 <b className="tabular-nums font-mono">{st.attempts}</b> 次</span>
                        <span>提示 <b>{st.hintsLeft}</b> 次</span>
                    </div>

                    {/* 提示条 */}
                    <p className="min-h-5 text-center text-xs text-muted-foreground">
                        按时间先后拖动事件卡排序,排好后点「提交判定」;正确卡变绿锁定,错位卡标红可继续调
                    </p>
                    {st.lastWrong && st.lastWrong.length > 0 && (
                        <p className="text-center text-xs font-semibold text-destructive">
                            有 {st.lastWrong.length} 张卡位置不对:红色卡可继续拖动(可先排好确定正确的卡)
                        </p>
                    )}

                    {/* 事件卡 + 时间轴: 先排卡区(乱序), 拖到时间轴槽位 */}
                    <div className="rounded-2xl border bg-card p-3 shadow-sm">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">事件卡(乱序,点击卡再点空位交换)</p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {st.cards.map((c, i) => (
                                <button
                                    key={c.ev.n}
                                    onPointerDown={(e) => onCardPointerDown(e, i)}
                                    onPointerUp={() => onCardPointerUp(i)}
                                    aria-label={`第 ${i + 1} 位:${c.ev.n}`}
                                    className={cn(
                                        "flex h-16 touch-none select-none items-center justify-center rounded-lg border px-1 text-center text-[11px] font-bold leading-tight shadow-sm transition",
                                        st.done[i] ? "cursor-default border-success/60 bg-success/15 text-success"
                                            : st.lastWrong?.includes(i) ? "cursor-grab border-destructive bg-destructive/10 text-destructive active:cursor-grabbing"
                                                : dragIdx === i ? "cursor-grabbing border-primary bg-primary/10 text-primary"
                                                    : "cursor-grab border-border bg-card hover:bg-muted/60 active:cursor-grabbing",
                                        dragIdx !== null && dragIdx !== i && overIdx === i && "border-primary ring-2 ring-primary/50",
                                    )}
                                >
                                    {c.ev.n}
                                </button>
                            ))}
                        </div>
                        {/* 时间轴: 左早右晚 */}
                        <div
                            className="mt-3 flex items-center justify-between gap-1 rounded-xl border border-dashed bg-muted/30 px-2 py-1.5 text-[10px] text-muted-foreground"
                            role="img"
                            aria-label="时间轴:左早右晚"
                        >
                            <span>更早 ←</span>
                            <span>→ 更晚</span>
                        </div>
                    </div>

                    {/* 操作 */}
                    <div className="flex justify-center gap-2">
                        <Button size="sm" onClick={doJudge}>提交判定</Button>
                        <Button variant="outline" size="sm" disabled={st.hintsLeft <= 0} onClick={doHint}>
                            提示({st.hintsLeft})
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => start(mode)}>重开</Button>
                    </div>

                    {/* 归位进度 */}
                    <div className="flex justify-center gap-1">
                        {st.done.map((d, i) => (
                            <span key={i} className={cn("h-1.5 w-8 rounded-full", d ? "bg-success" : "bg-muted")} />
                        ))}
                    </div>
                </div>
            )}

            {phase === "result" && result && (
                <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                    <p className="text-lg font-bold">全部归位成功!</p>
                    <p className="mt-1 text-sm font-bold tracking-widest text-primary">
                        {result.attempts === 1 ? "一次通过,太强了!" : result.attempts <= 3 ? "几次就排对了,不错!" : "多试几次终于排对了,记住它们!"}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-primary">{result.score} / {ROUND_CARDS} 张</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        用时 {fmtTime(result.time)} · 提交 {result.attempts} 次 · 提示 {result.hintsUsed} 次
                    </p>
                    <div className="mt-3 text-sm">
                        {result.failed ? (
                            <p className="text-destructive">成绩提交失败: {result.failMsg ?? "未知原因"}。</p>
                        ) : result.skipped ? (
                            <p className="text-muted-foreground">{name.trim() ? "已选择不参与排行榜,本局成绩未上榜" : "未填写昵称,成绩未上榜"}</p>
                        ) : result.surpassed !== null ? (
                            <p className="font-semibold text-primary">超越 {result.surpassed} 名玩家</p>
                        ) : null}
                    </div>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Button asChild variant="outline"><Link to="/hlgx/rank?game=llgs">查看排行榜</Link></Button>
                        <Button onClick={() => start(mode)}>再来一局</Button>
                    </div>
                </div>
            )}

            <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>玩法介绍</DialogTitle>
                        <DialogDescription>把事件按时间先后排好,一次通关</DialogDescription>
                    </DialogHeader>
                    <LlgsRules />
                </DialogContent>
            </Dialog>

            <NameConfirmDialog
                open={nameConfirmOpen}
                pending={nameDraft}
                current={name}
                onOpenChange={setNameConfirmOpen}
                onConfirm={confirmName}
            />
            <NameEntryDialog
                open={entryOpen}
                gameName="历了个史"
                onDismiss={() => navigate("/")}
                onConfirm={confirmEntry}
            />
            <footer className="mt-8 text-center text-xs text-muted-foreground">历了个史 · {LLGS_VERSION}(仅供个人娱乐)</footer>
        </div>
    );
}

/** 开屏: 难度/玩法/昵称/排行开关 */
function ReadyScreen(props: {
    mode: LlgsMode;
    setMode: (m: LlgsMode) => void;
    onStart: () => void;
    onRules: () => void;
    rankActive: boolean;
    onRankToggle: (p: boolean) => void;
    nameDraft: string;
    onNameDraftChange: (v: string) => void;
    onNameConfirm: () => void;
    nameTip: string;
    muted: boolean;
    setMuted: (v: boolean) => void;
}) {
    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-3 pb-10 pt-3">
            <header className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to="/">← 返回大厅</Link>
                </Button>
                <h1 className="flex-1 text-center text-lg font-extrabold">历了个史</h1>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { props.setMuted(!props.muted); HLGX_Audio.setMuted(!props.muted); }}
                    aria-label="静音开关"
                    title={props.muted ? "已静音" : "音效"}
                >
                    {props.muted ? "🔇" : "🔊"}
                </Button>
            </header>

            <div className="mb-2 flex items-center gap-2">
                <div className="flex flex-1 justify-center gap-1 rounded-full bg-muted p-1">
                    {MODE_TABS.map(({ mode: m, label }) => (
                        <button key={m} onClick={() => props.setMode(m)}
                            className={cn("flex-1 rounded-full px-2 py-1.5 text-sm font-semibold transition",
                                props.mode === m ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                            {label}
                        </button>
                    ))}
                </div>
                <Button variant="ghost" size="sm" onClick={props.onRules} className="shrink-0">玩法</Button>
            </div>

            {/* 昵称行 + 排行开关（窄屏换行） */}
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1">
                    <input
                        value={props.nameDraft}
                        maxLength={10}
                        placeholder="昵称"
                        onChange={(e) => props.onNameDraftChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") props.onNameConfirm(); }}
                        className="w-24 rounded-lg border bg-card px-2 py-1 text-sm outline-none focus:border-primary"
                        aria-label="当前昵称"
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={props.onNameConfirm} aria-label="确认修改昵称">✓</Button>
                </div>
                <RankPartToggle active={props.rankActive} onConfirmedChange={props.onRankToggle} />
                {props.nameTip && <span className="text-xs font-semibold text-destructive">{props.nameTip}</span>}
            </div>

            <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                <p className="text-3xl" aria-hidden>⏳</p>
                <h2 className="mt-2 text-lg font-bold">把 5 张事件卡按时间先后排好</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    拖动卡片调整顺序,点「提交判定」——正确的卡变绿锁定,错位卡标红继续调整;全部归位即通关,不设扣血,多试几次也能赢。
                </p>
                <Button className="mt-5" size="lg" onClick={props.onStart}>开始排序({ROUND_CARDS} 张)</Button>
            </div>

            <footer className="mt-6 text-center text-xs text-muted-foreground">历了个史 · {LLGS_VERSION}(仅供个人娱乐)</footer>
        </div>
    );
}