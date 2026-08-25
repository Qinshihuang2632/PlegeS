/*
 * 配了个平 · 游戏页 (/plgp)
 * ========================
 * 玩法: 每局 8 道未配平方程式。简单=三选一点击系数组合;
 *       标准/困难=点击系数空位 + 物理/屏幕数字键盘逐项填写。
 * 判定: 全满才能提交; 比例解判错提示最简整数比; 错误扣血可改; 提示每局 2 次(tools 计入排行)。
 * 榜单: 独立 API /plgp/api/rank, 排序 答对数↓ → 用时↑ → 提示使用↑。
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/game/core";
import { detectPlatform, PLATFORM_LABEL, type Platform } from "@/game/platform";
import { NameConfirmDialog, validateNickname } from "@/game/NameConfirmDialog";
import { RankPartToggle, readSkipRank, storeSkipRank } from "@/game/RankPartToggle";
import { PlgpRules } from "./PlgpRules";
import { PLGP_VERSION } from "./version";
import {
    HINT_LIMIT, PLGP_MODES, ROUND_TOTAL,
    appendDigit, backspace, currentEquation, mcOptions, newGame, setBlank, submit, tick, useHint,
    type PlgpMode, type PlgpState,
} from "./core";

const NAME_KEY = "hlgx_name";   // 平台昵称(各游戏共享)

interface ResultInfo {
    win: boolean;
    score: number;
    time: number;
    mistakes: number;
    toolsUsed: number;
    skipped?: boolean;   // 未填昵称或选择不参与排行, 成绩未上传
    surpassed: number | null;
    failed: boolean;
    failMsg?: string;
}

function starsOf(mistakes: number): string {
    return mistakes === 0 ? "★★★" : mistakes === 1 ? "★★" : "★";
}

/** 物质式展示: 把限量标注括号(含中文)渲染成小字灰色后缀 */
function FormulaText({ f }: { f: string }) {
    const k = f.indexOf("(");
    if (k <= 0 || !/[^\x00-\x7F]/.test(f.slice(k))) return <span>{f}</span>;
    return (
        <>
            <span>{f.slice(0, k)}</span>
            <span className="text-[10px] font-normal text-muted-foreground">{f.slice(k)}</span>
        </>
    );
}

/** 条件箭头: 条件小字在箭头上方; 可逆反应用 ⇌ */
function Arrow({ condition, reversible }: { condition: string; reversible?: boolean }) {
    return (
        <span className="mx-1.5 inline-flex flex-col items-center justify-end align-bottom leading-none">
            <span className="mb-0.5 whitespace-nowrap text-[10px] text-muted-foreground">{condition}</span>
            <span className="text-lg tracking-tighter">{reversible ? "⇌" : "⟶"}</span>
        </span>
    );
}

export function PlgpPage() {
    const [phase, setPhase] = useState<"ready" | "playing" | "result">("ready");
    const [mode, setMode] = useState<PlgpMode>("easy");
    const [st, setSt] = useState<PlgpState | null>(null);
    const [selIdx, setSelIdx] = useState(0);
    const [mcOpts, setMcOpts] = useState<number[][]>([]);
    const [resInfo, setResInfo] = useState<ResultInfo | null>(null);
    const [platform] = useState<Platform>(() => detectPlatform());
    const [rulesOpen, setRulesOpen] = useState(false);

    /* 昵称与排行参与(与各游戏一致) */
    const [name, setName] = useState(() => localStorage.getItem(NAME_KEY)?.trim() || "");
    const [nameDraft, setNameDraft] = useState(() => localStorage.getItem(NAME_KEY)?.trim() || "");
    const [nameTip, setNameTip] = useState("");
    const [nameConfirmOpen, setNameConfirmOpen] = useState(false);
    const [skipRank, setSkipRank] = useState(() => readSkipRank());
    const rankActive = !!name.trim() && !skipRank;

    const submittedRef = useRef(false);

    const start = (m: PlgpMode) => {
        setMode(m);
        setSt(newGame(m));
        setSelIdx(0);
        setPhase("playing");
        submittedRef.current = false;
    };

    /* 切换题目时刷新选择题选项 */
    useEffect(() => {
        if (phase === "playing" && st && st.phase === "playing" && mode === "easy" && st.lastJudge?.ok !== false) {
            setMcOpts(mcOptions(currentEquation(st)));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [st?.idx, st?.lastJudge?.ok]);

    /* 游戏时钟 */
    useEffect(() => {
        if (phase !== "playing") return;
        const t = setInterval(() => setSt((prev) => (prev && prev.phase === "playing" ? tick(prev, 0.5) : prev)), 500);
        return () => clearInterval(t);
    }, [phase]);

    /* 结算与提交(win/lose 时触发一次) */
    useEffect(() => {
        if (!st || st.phase === "playing" || submittedRef.current) return;
        submittedRef.current = true;
        setPhase("result");
        const time = Math.max(1, Math.ceil(st.elapsed));
        const info: ResultInfo = {
            win: st.phase === "win",
            score: st.score,
            time,
            mistakes: st.mistakes,
            toolsUsed: st.toolsUsed,
            skipped: true,
            surpassed: null,
            failed: false,
        };
        const nm = name.trim();
        if (!nm || skipRank) { setResInfo({ ...info }); return; }
        (async () => {
            try {
                const res = await fetch("/plgp/api/rank", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        mode, name: nm, score: st.score, time,
                        tools: st.toolsUsed, version: PLGP_VERSION, platform,
                    }),
                });
                const d = await res.json().catch(() => null);
                setResInfo({
                    ...info,
                    skipped: false,
                    surpassed: res.ok && typeof d?.surpassed === "number" ? d.surpassed : null,
                    failed: !res.ok,
                    failMsg: !res.ok ? (d?.msg ?? `提交失败(HTTP ${res.status})`) : undefined,
                });
            } catch {
                setResInfo({ ...info, failed: true, failMsg: "网络异常,请检查网络后重试" });
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [st?.phase]);

    /* 标准/困难: 物理键盘(数字/退格/回车提交/左右切换空位) */
    useEffect(() => {
        if (phase !== "playing" || mode === "easy") return;
        const onKey = (e: KeyboardEvent) => {
            setSt((prev) => {
                if (!prev || prev.phase !== "playing") return prev;
                const n = currentEquation(prev).coefs.length;
                const i = Math.min(selIdx, n - 1);
                if (/^[0-9]$/.test(e.key)) { e.preventDefault(); return appendDigit(prev, i, Number(e.key)); }
                if (e.key === "Backspace") { e.preventDefault(); return backspace(prev, i); }
                if (e.key === "Enter") { e.preventDefault(); return submit(prev); }
                if (e.key === "ArrowLeft") { setSelIdx((v) => (v - 1 + n) % n); return prev; }
                if (e.key === "ArrowRight") { setSelIdx((v) => (v + 1) % n); return prev; }
                return prev;
            });
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, mode, selIdx]);

    const doHint = () => setSt((prev) => (prev ? useHint(prev) : prev));
    const doSubmit = () => setSt((prev) => (prev ? submit(prev) : prev));
    const chooseOption = (opt: number[]) => {
        setSt((prev) => {
            if (!prev || prev.phase !== "playing") return prev;
            let s = prev;
            opt.forEach((v, i) => { s = setBlank(s, i, v); });
            return submit(s);
        });
    };

    /* 局内改昵称 */
    const onNameDraftChange = (v: string) => {
        setNameDraft(v);
        setNameTip(validateNickname(v));
    };
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
        if (phase === "playing") start(mode);   // 重开本局
    };
    /* 排行榜参与开关(v2.6.1): 二次确认后切换并重开本局 */
    const confirmRankPart = (participate: boolean) => {
        setSkipRank(!participate);
        storeSkipRank(!participate);
        if (phase === "playing") start(mode);
    };

    const result = phase === "result" ? resInfo : null;

    return (
        <div className="mx-auto min-h-dvh w-full max-w-2xl px-3 pb-10 pt-3">
            {/* 顶栏 */}
            <header className="mb-2 flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to="/">← 返回大厅</Link>
                </Button>
                <h1 className="flex-1 whitespace-nowrap text-center text-lg font-extrabold">配了个平</h1>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => start(mode)} aria-label="重新开始">⟳</Button>
            </header>

            {/* 难度 + 玩法 */}
            <div className="mb-2 flex items-center gap-2">
                <div className="flex flex-1 justify-center gap-1 rounded-full bg-muted p-1">
                    {PLGP_MODES.map(({ mode: m, label }) => (
                        <button
                            key={m}
                            onClick={() => { if (phase === "playing") start(m); else { setMode(m); setPhase("ready"); } }}
                            className={cn(
                                "flex-1 rounded-full px-2 py-1.5 text-sm font-semibold transition",
                                mode === m ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRulesOpen(true)} className="shrink-0">玩法</Button>
            </div>

            {/* 昵称行 + 排行开关 */}
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1">
                    <input
                        value={nameDraft}
                        maxLength={10}
                        placeholder="昵称"
                        onChange={(e) => onNameDraftChange(e.target.value)}
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

            {phase === "ready" && (
                <div className="space-y-4">
                    <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                        <div className="mb-2 text-4xl" aria-hidden>平</div>
                        <h2 className="text-lg font-bold">开始配平</h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            每局 {ROUND_TOTAL} 道方程式,{mode === "easy" ? "点选正确的系数组合。" : "把每个物质前的系数补齐。"}<br />
                            系数为 1 也要填;比例解(如 4/2/4 对 3/2/1)同样判错——必须最简整数比。<br />
                            归错扣血(共 3 点),「提示」每局 {HINT_LIMIT} 次并计入排名。
                        </p>
                        <Button className="mt-5" size="lg" onClick={() => start(mode)}>开始配平({ROUND_TOTAL} 题)</Button>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setRulesOpen(true)}>玩法介绍</Button>
                        <Button asChild variant="ghost" size="sm"><Link to="/hlgx/rank?game=plgp">查看排行榜</Link></Button>
                    </div>
                </div>
            )}

            {phase === "playing" && st && st.phase === "playing" && (() => {
                const eq = currentEquation(st);
                const n = eq.coefs.length;
                const allFilled = st.blanks.every((b) => b !== null);
                const judge = st.lastJudge;
                return (
                    <div className="space-y-3">
                        {/* 状态栏 */}
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-4 py-2 text-sm">
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{PLATFORM_LABEL[platform]}</span>
                            <span className="flex items-center gap-1" aria-label={`血量 ${Math.max(0, st.hp)}/3`}>
                                {[0, 1, 2].map((i) => <span key={i} aria-hidden>{i < Math.max(0, st.hp) ? "❤️" : "🤍"}</span>)}
                            </span>
                            <span className="tabular-nums font-mono">⏱ {fmtTime(Math.floor(st.elapsed))}</span>
                            <span>第 <b>{st.idx + 1}</b>/{st.deck.length} 题 · 得分 <b>{st.score}</b></span>
                        </div>

                        {/* 方程卡片 */}
                        <div className={cn(
                            "rounded-2xl border bg-card p-5 shadow-sm",
                            judge && !judge.ok ? "border-destructive/60" : "",
                        )}>
                            <p className="text-center text-xs text-muted-foreground">把系数补成最简整数比(为 1 也须填写)</p>
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-1 gap-y-3">
                                {eq.left.map((f, i) => (
                                    <span key={`l${i}`} className="flex items-center">
                                        <CoefCell st={st} i={i} editable={mode !== "easy"} selIdx={selIdx} setSelIdx={setSelIdx} />
                                        <span className="text-base font-bold"><FormulaText f={f} /></span>
                                        {i < eq.left.length - 1 && <span className="mx-1 text-muted-foreground">+</span>}
                                    </span>
                                ))}
                                <Arrow condition={eq.condition} reversible={eq.reversible} />
                                {eq.right.map((f, i) => (
                                    <span key={`r${i}`} className="flex items-center">
                                        <CoefCell st={st} i={eq.left.length + i} editable={mode !== "easy"} selIdx={selIdx} setSelIdx={setSelIdx} />
                                        <span className="text-base font-bold"><FormulaText f={f} /></span>
                                        {i < eq.right.length - 1 && <span className="mx-1 text-muted-foreground">+</span>}
                                    </span>
                                ))}
                            </div>
                            {judge && !judge.ok && (
                                <p className="mt-3 text-center text-xs font-semibold text-destructive">
                                    {judge.reason === "ratio"
                                        ? "是正确答案的比例解——请化为最简整数比!"
                                        : judge.reason === "incomplete"
                                            ? "还有空位没填,不能提交"
                                            : "配平错误,扣 1 血;填写已保留,改一改再交"}
                                </p>
                            )}
                            {eq.note && <p className="mt-2 text-center text-[11px] text-muted-foreground">💡 {eq.note}</p>}
                        </div>

                        {/* 作答区: 简单=选项 / 标准·困难=数字条 */}
                        {mode === "easy" ? (
                            <div className="grid grid-cols-3 gap-2">
                                {mcOpts.map((opt, oi) => (
                                    <button
                                        key={oi}
                                        onClick={() => chooseOption(opt)}
                                        className="rounded-xl border bg-card px-2 py-3 text-center shadow-sm transition hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                                    >
                                        <span className="block text-[10px] text-muted-foreground">{"ABC"[oi]}</span>
                                        <span className="mt-1 block font-mono text-sm font-bold">{opt.join(" · ")}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-center gap-2">
                                    <Button variant="outline" size="sm" disabled={st.hintsLeft <= 0} onClick={doHint} title="自动填入一个正确系数并锁定">
                                        💡 提示({st.hintsLeft})
                                    </Button>
                                    <Button size="sm" disabled={!allFilled} onClick={doSubmit}>提交本题</Button>
                                </div>
                                <div className="grid grid-cols-6 gap-1.5">
                                    {"1234567890".split("").map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setSt((prev) => (prev ? appendDigit(prev, Math.min(selIdx, n - 1), Number(d)) : prev))}
                                            className="h-11 rounded-lg border bg-card font-mono text-base font-bold shadow-sm transition hover:bg-muted active:scale-[0.97]"
                                        >
                                            {d}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setSt((prev) => (prev ? backspace(prev, Math.min(selIdx, n - 1)) : prev))}
                                        className="col-span-2 h-11 rounded-lg border bg-secondary font-bold shadow-sm transition hover:bg-muted active:scale-[0.97]"
                                    >
                                        ⌫
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {phase === "result" && result && (
                <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                    <p className="text-lg font-bold">{result.win ? "🎉 配平大师!" : "落败 · 血量耗尽"}</p>
                    <p className="mt-1 text-sm font-bold tracking-widest text-primary">{starsOf(result.mistakes)}</p>
                    <p className="mt-2 text-3xl font-extrabold text-primary">{result.score} / {ROUND_TOTAL} 题</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        用时 {fmtTime(result.time)} · 失误 {result.mistakes} 次 · 提示 {result.toolsUsed} 次
                    </p>
                    <div className="mt-3 text-sm">
                        {!name.trim() ? (
                            <p className="text-muted-foreground">未填写昵称,成绩未上榜</p>
                        ) : skipRank ? (
                            <p className="text-muted-foreground">已选择不参与排行榜,成绩未上榜</p>
                        ) : result.failed ? (
                            <p className="text-destructive">成绩提交失败: {result.failMsg ?? "未知原因"}</p>
                        ) : result.surpassed !== null ? (
                            <p className="font-semibold text-primary">超越 {result.surpassed} 名玩家</p>
                        ) : null}
                    </div>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Button asChild variant="outline"><Link to="/hlgx/rank?game=plgp">查看排行榜</Link></Button>
                        <Button onClick={() => start(mode)}>再来一局</Button>
                    </div>
                </div>
            )}

            <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>玩法介绍</DialogTitle>
                        <DialogDescription>三分钟看懂怎么玩,新手不迷路</DialogDescription>
                    </DialogHeader>
                    <PlgpRules />
                </DialogContent>
            </Dialog>

            {/* 改名二次确认 */}
            <NameConfirmDialog
                open={nameConfirmOpen}
                pending={nameDraft}
                current={name}
                onOpenChange={setNameConfirmOpen}
                onConfirm={confirmName}
            />

            <footer className="mt-8 text-center text-xs text-muted-foreground">配了个平 · {PLGP_VERSION}(仅供个人娱乐)</footer>
        </div>
    );
}

/** 系数格: 显示玩家填写值; 标准困难可点击选中; 提示锁定位带成功色与锁标记 */
function CoefCell({ st, i, editable, selIdx, setSelIdx }: {
    st: PlgpState;
    i: number;
    editable: boolean;
    selIdx: number;
    setSelIdx: (n: number) => void;
}) {
    const v = st.blanks[i];
    const locked = st.locked[i];
    return (
        <button
            onClick={() => editable && setSelIdx(i)}
            aria-label={`第 ${i + 1} 个系数`}
            className={cn(
                "relative mr-1 inline-flex h-8 w-9 shrink-0 items-center justify-center rounded-lg border font-mono text-base font-bold transition",
                locked
                    ? "border-success/60 bg-success/10 text-success"
                    : editable && selIdx === i
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "border-border bg-muted/40 text-foreground",
                editable && "cursor-pointer hover:border-primary/60",
            )}
            title={locked ? "提示已锁定" : undefined}
        >
            {v ?? ""}
            {locked && <span className="absolute -right-1 -top-1 text-[9px]" aria-hidden>🔒</span>}
        </button>
    );
}
