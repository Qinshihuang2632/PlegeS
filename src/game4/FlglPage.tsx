/*
 * 分了个类 · 游戏页 (/flgl)
 * ========================
 * 玩法: 传送带式物质分类(类似植物大战僵尸的传送带)——物质卡从右向左匀速进入,
 *       传送带位于屏幕偏上方、最多容纳 5 张;玩家拖动物质卡,放入屏幕中间的
 *       类别按钮(随难度增减: 简单 6 / 标准 7 / 困难 8)完成分类。归对得分,归错扣血;
 *       新卡该出现时传送带满载 → 直接判负。
 * 榜单: 独立 API /flgl/api/rank, 排序 正确数↓ → 用时↑。
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/game/core";
import { detectPlatform, PLATFORM_LABEL, type Platform } from "@/game/platform";
import { NameConfirmDialog, validateNickname } from "@/game/NameConfirmDialog";
import { HLGX_CATS, type Category, type Substance } from "@/game/substances";
import { HLGX_Audio } from "@/game/audio";
import { FlglRules } from "./FlglRules";
import { FLGL_VERSION } from "./version";
import { RankPartToggle, readSkipRank, storeSkipRank } from "@/game/RankPartToggle";
import { NameEntryDialog, storedIdentity } from "@/game/NameEntryDialog";
import { fetchRankToken } from "@/lib/rankToken";
import {
    BELT_CAPACITY, CATS_OF, FLGL_INTERVAL, ROUND_TOTAL, judge, newGame, spawnNow, tick, wrongHint,
    type FlglCard, type FlglMode, type FlglState,
} from "./core";

const NAME_KEY = "hlgx_name";   // 平台昵称(三游戏共享)

const MODE_TABS: { mode: FlglMode; label: string }[] = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "hard", label: "困难" },
];

/* 分类按钮按难度动态生成(v1.1.5): 简单 6 类(无有机物/混合物)、标准 7 类(无混合物)、困难 8 类 */
const CAT_LIST_OF = (mode: FlglMode): [Category, { label: string; color: string }][] =>
    CATS_OF[mode].map((c) => [c, HLGX_CATS[c]] as [Category, { label: string; color: string }]);

interface ResultInfo {
    win: boolean;
    loseReason?: "hp" | "overflow";
    score: number;
    time: number;
    mistakes: number;
    skipped?: boolean;   // 未填昵称或选择不参与排行, 成绩未上传
    surpassed: number | null;
    failed: boolean;
    failMsg?: string;
}

const LOSE_TEXT: Record<"hp" | "overflow", string> = {
    hp: "血量耗尽——归错 3 次",
    overflow: "传送带溢出——新卡出现时已满载",
};

/** 化学式仅在有内容时显示(混合物等无固定化学式不显示) */
function Formula({ sub }: { sub: Substance }) {
    if (!sub.f || sub.f === "—") return null;
    return <span className="mt-0.5 text-[9px] leading-none text-muted-foreground">{sub.f}</span>;
}

export function FlglPage() {
    const [phase, setPhase] = useState<"ready" | "playing" | "result">("ready");
    const [mode, setMode] = useState<FlglMode>("easy");
    const [st, setSt] = useState<FlglState | null>(null);
    const [result, setResult] = useState<ResultInfo | null>(null);
    const [platform] = useState<Platform>(() => detectPlatform());
    const [rulesOpen, setRulesOpen] = useState(false);
    const [muted, setMuted] = useState(HLGX_Audio.isMuted());

    /* 昵称(与三游戏一致: 编辑 → ✓ → 二次确认 → 保存并重开本局) */
    const [name, setName] = useState(() => localStorage.getItem(NAME_KEY)?.trim() || "");
    const [nameDraft, setNameDraft] = useState(() => localStorage.getItem(NAME_KEY)?.trim() || "");
    const [nameTip, setNameTip] = useState("");
    const [nameConfirmOpen, setNameConfirmOpen] = useState(false);
    /* 排行榜参与(v2.6.1): 有昵称 且 未勾选跳过(hlgx_skip_rank) 才上榜 */
    const [skipRank, setSkipRank] = useState(() => readSkipRank());
    const rankActive = !!name.trim() && !skipRank;
    /* 首次进入昵称弹窗(v1.1.2): 本机从未填过昵称且未勾选不参与时弹出(手游/端游一致) */
    const navigate = useNavigate();
    const [entryOpen, setEntryOpen] = useState(() => !storedIdentity());
    const confirmEntry = (n: string, skip: boolean) => {
        if (n) {
            setName(n);
            setNameDraft(n);
            try { localStorage.setItem(NAME_KEY, n); } catch { /* 隐私模式忽略 */ }
        }
        setSkipRank(skip);
        storeSkipRank(skip);
        setEntryOpen(false);
        start(mode);   // 确认即开局(与化了个学昵称窗「确认开始」一致)
    };

    /* 拖拽与反馈 */
    const [drag, setDrag] = useState<{ id: number; x: number; y: number; sub: Substance } | null>(null);
    const [hoverCat, setHoverCat] = useState<Category | null>(null);
    const hoverCatRef = useRef<Category | null>(null);
    const catRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [flash, setFlash] = useState<{ cat: Category; ok: boolean } | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* 卡牌入场动画(新卡从右端滑入) */
    const [enteredIds, setEnteredIds] = useState<number[]>([]);
    const knownIdsRef = useRef<Set<number>>(new Set());
    const beltRef = useRef<HTMLDivElement | null>(null);
    const submittedRef = useRef(false);
    const rankTokenRef = useRef("");   // v2.8.0: 一次性成绩提交凭证(开局申领, 提交时携带)

    const start = (m: FlglMode) => {
        setMode(m);
        setSt(newGame(m));
        setResult(null);
        setPhase("playing");
        setDrag(null);
        setHoverCat(null);
        hoverCatRef.current = null;
        setFlash(null);
        setEnteredIds([]);
        knownIdsRef.current = new Set();
        submittedRef.current = false;
        // v2.8.0: 开局申领成绩提交凭证(失败不阻塞游戏, 提交时补领)
        rankTokenRef.current = "";
        void fetchRankToken("flgl", m).then((t) => { rankTokenRef.current = t; });
    };

    /* 游戏时钟: 100ms 推进一次核心状态 */
    useEffect(() => {
        if (phase !== "playing") return;
        const t = setInterval(() => {
            setSt((prev) => (prev && prev.phase === "playing" ? tick(prev, 0.1) : prev));
        }, 100);
        return () => clearInterval(t);
    }, [phase]);

    /* 结算与提交(win/lose 时触发一次) */
    useEffect(() => {
        if (!st || st.phase === "playing" || submittedRef.current) return;
        submittedRef.current = true;
        // v1.1.2 音效: 通关/通关失败
        if (st.phase === "win") HLGX_Audio.win();
        else HLGX_Audio.lose();
        setPhase("result");
        setDrag(null);
        const time = Math.max(1, Math.ceil(st.elapsed));
        const info: ResultInfo = {
            win: st.phase === "win",
            loseReason: st.loseReason,
            score: st.score,
            time,
            mistakes: st.mistakes,
            surpassed: null,
            failed: false,
        };
        const nm = name.trim();
        if (!nm || skipRank) { setResult({ ...info, skipped: true }); return; }
        (async () => {
            try {
                // v2.8.0: 携带开局申领的一次性凭证; 缺失时补领(如开局时离线)
                let token = rankTokenRef.current;
                if (!token) {
                    token = await fetchRankToken("flgl", mode);
                    rankTokenRef.current = token;
                }
                const res = await fetch("/flgl/api/rank", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mode, name: nm, score: st.score, time, version: FLGL_VERSION, platform, token }),
                });
                const d = await res.json().catch(() => null);
                setResult({
                    ...info,
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

    /* 判定反馈: 类别按钮闪烁 + 归错提示 + 音效(v1.1.2 正确/答错) */
    useEffect(() => {
        const lj = st?.lastJudge;
        if (!lj) return;
        if (lj.ok) HLGX_Audio.correct();
        else HLGX_Audio.wrong();
        setFlash({ cat: lj.cat, ok: lj.ok });
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 650);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [st?.lastJudge]);

    /* 新卡入场: 首帧停在右端外, 下一帧滑入档位 */
    useEffect(() => {
        if (!st) return;
        const fresh = st.belt.map((c) => c.id).filter((id) => !knownIdsRef.current.has(id));
        if (fresh.length === 0) return;
        fresh.forEach((id) => knownIdsRef.current.add(id));
        const raf = requestAnimationFrame(() => setEnteredIds((prev) => [...prev, ...fresh]));
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [st?.belt]);

    /* 拖拽: 全局 pointer 跟踪 + 类别按钮命中检测 */
    useEffect(() => {
        if (!drag) return;
        const hitTest = (x: number, y: number): Category | null => {
            for (const [cat, el] of Object.entries(catRefs.current)) {
                if (!el) continue;
                const r = el.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return cat as Category;
            }
            return null;
        };
        const move = (e: PointerEvent) => {
            setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
            const hit = hitTest(e.clientX, e.clientY);
            hoverCatRef.current = hit;
            setHoverCat(hit);
        };
        const finish = () => {
            const hit = hoverCatRef.current;
            const d = drag;
            setDrag(null);
            setHoverCat(null);
            hoverCatRef.current = null;
            if (d && hit) doJudge(d.id, hit);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", finish);
        window.addEventListener("pointercancel", finish);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", finish);
            window.removeEventListener("pointercancel", finish);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drag !== null]);

    const doJudge = (id: number, cat: Category) => {
        setSt((prev) => (prev && prev.phase === "playing" ? judge(prev, id, cat) : prev));
    };

    const onCardPointerDown = (e: React.PointerEvent, card: FlglCard) => {
        if (phase !== "playing" || !st || st.phase !== "playing") return;
        e.preventDefault();
        setDrag({ id: card.id, x: e.clientX, y: e.clientY, sub: card.sub });
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

    /* 排行榜参与开关(v2.6.1): 二次确认后切换参与状态并重开本局(昵称保留) */
    const confirmRankPart = (participate: boolean) => {
        setSkipRank(!participate);
        storeSkipRank(!participate);
        if (phase === "playing") start(mode);   // 重开本局
    };

    const playing = phase === "playing" && st && st.phase === "playing";
    const lastWrongHint = st?.lastJudge && !st.lastJudge.ok ? wrongHint(st.lastJudge.sub) : "";

    return (
        <div className="mx-auto min-h-dvh w-full max-w-2xl px-3 pb-10 pt-3">
            {/* 顶栏: 返回 / 标题 / 重开(标题独占一行, v2.3.10 同构) */}
            <header className="mb-2 flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to="/">← 返回大厅</Link>
                </Button>
                <h1 className="flex-1 whitespace-nowrap text-center text-lg font-extrabold">分了个类</h1>
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

            {/* 难度切换 + 玩法入口 */}
            <div className="mb-2 flex items-center gap-2">
                <div className="flex flex-1 justify-center gap-1 rounded-full bg-muted p-1">
                    {MODE_TABS.map(({ mode: m, label }) => (
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

            {/* 昵称行 + 排行参与开关(v2.6.1) */}
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
                        <div className="mb-2 text-4xl" aria-hidden>类</div>
                        <h2 className="text-lg font-bold">开始分类</h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            每局 {ROUND_TOTAL} 张物质卡,传送带容量 {BELT_CAPACITY} 张(出牌间隔 {FLGL_INTERVAL[mode]} 秒)。<br />
                            拖动物质卡放入下方类别按钮;归错扣血(共 3 点),新卡出现时传送带满载则直接落败。
                        </p>
                        <Button className="mt-5" size="lg" onClick={() => start(mode)}>开始分类({ROUND_TOTAL} 张)</Button>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setRulesOpen(true)}>玩法介绍</Button>
                        <Button asChild variant="ghost" size="sm"><Link to="/hlgx/rank?game=flgl">查看排行榜</Link></Button>
                    </div>
                </div>
            )}

            {playing && st && (
                <div className="space-y-3">
                    {/* 状态栏 */}
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-4 py-2 text-sm">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground" title="榜单按平台分开,成绩只与本平台比较">{PLATFORM_LABEL[platform]}</span>
                        <span className="flex items-center gap-1" aria-label={`血量 ${Math.max(0, st.hp)}/3`}>
                            {[0, 1, 2].map((i) => <span key={i} aria-hidden>{i < Math.max(0, st.hp) ? "❤️" : "🤍"}</span>)}
                        </span>
                        <span className="tabular-nums font-mono">⏱ {fmtTime(Math.floor(st.elapsed))}</span>
                        <span>已分 <b>{st.score}</b>/{ROUND_TOTAL}</span>
                    </div>

                    {/* 传送带(屏幕偏上方): 满载后新卡到点即判负 */}
                    <div
                        ref={beltRef}
                        className={cn(
                            "relative h-24 overflow-hidden rounded-2xl border-2 transition-colors",
                            st.belt.length >= BELT_CAPACITY ? "border-destructive" : "border-border",
                        )}
                    >
                        {/* 底纹: 向左匀速滚动 */}
                        <div
                            className="absolute inset-0 rounded-2xl bg-muted/40"
                            style={{
                                backgroundImage: "repeating-linear-gradient(115deg, rgba(0,0,0,0.06) 0 14px, transparent 14px 28px)",
                                animation: "flgl-belt 0.8s linear infinite",
                            }}
                            aria-hidden
                        />
                        {st.spawned < st.deck.length && (
                            <span className="absolute right-2 top-1.5 z-10 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
                                下一张 {Math.max(0, Math.ceil(st.spawnIn))}s
                            </span>
                        )}
                        {st.belt.length >= BELT_CAPACITY && (
                            <span className="absolute left-2 top-1.5 z-10 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                                已满载!下一张出现前必须分类
                            </span>
                        )}
                        {st.belt.map((c, i) => (
                            <div
                                key={c.id}
                                onPointerDown={(e) => onCardPointerDown(e, c)}
                                className={cn(
                                    "absolute flex touch-none select-none flex-col items-center justify-center rounded-xl border bg-card px-1 text-center shadow-sm",
                                    drag?.id === c.id ? "opacity-40" : "cursor-grab border-border active:cursor-grabbing",
                                )}
                                style={{
                                    left: `${i * 20.6}%`,
                                    width: "17.6%",
                                    top: "50%",
                                    transform: `translate(${enteredIds.includes(c.id) ? 0 : (beltRef.current?.offsetWidth ?? 420)}px, -50%)`,
                                    /* 滑动时长按距离换算, 保证所有卡速度一致(约每秒行进 2 个卡片长, v1.1.5):
                                       入场 = 1 卡宽(17.6% 带宽) → 0.5s;
                                       补位 = 一格(20.6% 带宽 ≈ 1.17 卡宽) → 0.585s;
                                       v1.1.0 起卡牌挂载即响应 pointerdown, 滑行途中即可拖走分类 */
                                    transition: "left 0.585s linear, transform 0.5s linear",
                                }}
                                aria-label={`物质卡:${c.sub.n}`}
                            >
                                <span className="w-full break-words text-[11px] font-bold leading-tight">{c.sub.n}</span>
                                <Formula sub={c.sub} />
                            </div>
                        ))}
                    </div>

                    {/* 直接弹出下一张(v1.1.0): 冷却期间只闪出「防误触冷却」, 不显示秒数(v1.1.5) */}
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={st.spawnCd > 0 || st.spawned >= st.deck.length}
                            onClick={() => setSt((prev) => (prev ? spawnNow(prev) : prev))}
                            title="立即让下一张物质卡从右侧出现;传送带满载时点击会直接判负"
                        >
                            ⏩ 直接弹出下一张{st.spawnCd > 0 ? " · 防误触冷却" : ""}
                        </Button>
                    </div>

                    {/* 类别按钮(屏幕中间): 数量随难度 —— 简单 6 / 标准 7 / 困难 8 */}
                    <div className={cn("grid gap-2", st.mode === "easy" ? "grid-cols-3" : "grid-cols-4")}>
                        {CAT_LIST_OF(st.mode).map(([cat, info]) => {
                            const isFlash = flash?.cat === cat;
                            const isHover = hoverCat === cat;
                            return (
                                <button
                                    key={cat}
                                    ref={(el) => { catRefs.current[cat] = el; }}
                                    className={cn(
                                        "flex h-14 items-center justify-center rounded-xl border text-[13px] font-semibold transition sm:h-16 sm:text-sm",
                                        isFlash && (flash!.ok
                                            ? "border-success bg-success/15 text-success"
                                            : "border-destructive bg-destructive/10 text-destructive"),
                                        !isFlash && isHover && "scale-105 border-primary bg-primary/10 text-primary",
                                        !isFlash && !isHover && "border-border bg-card text-foreground hover:bg-muted/60",
                                    )}
                                >
                                    {info.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* 归错提示(教育反馈) */}
                    <p className={cn("min-h-5 text-center text-xs font-semibold", lastWrongHint ? "text-destructive" : "text-transparent")}>
                        {lastWrongHint || "占位"}
                    </p>
                </div>
            )}

            {phase === "result" && result && (
                <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                    <p className="text-lg font-bold">
                        {result.win ? "🎉 全部分类正确!" : `落败 · ${LOSE_TEXT[result.loseReason ?? "hp"]}`}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-primary">{result.score} / {ROUND_TOTAL} 张</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        用时 {fmtTime(result.time)} · 归错 {result.mistakes} 次
                    </p>
                    <div className="mt-3 text-sm">
                        {result.failed ? (
                            <p className="text-destructive">成绩提交失败: {result.failMsg ?? "未知原因"}</p>
                        ) : result.skipped ? (
                            <p className="text-muted-foreground">{name.trim() ? "已选择不参与排行榜,本局成绩未上榜" : "未填写昵称,成绩未上榜"}</p>
                        ) : result.surpassed !== null ? (
                            <p className="font-semibold text-primary">超越 {result.surpassed} 名玩家</p>
                        ) : null}
                    </div>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Button asChild variant="outline"><Link to="/hlgx/rank?game=flgl">查看排行榜</Link></Button>
                        <Button onClick={() => start(mode)}>再来一局</Button>
                    </div>
                </div>
            )}

            {/* 拖拽跟随的卡牌幽灵(固定定位, 不受容器裁剪) */}
            {drag && (
                <div
                    className="pointer-events-none fixed z-50 flex h-20 w-20 rotate-3 flex-col items-center justify-center rounded-xl border-2 border-primary bg-card px-1 text-center shadow-lg"
                    style={{ left: drag.x - 40, top: drag.y - 44 }}
                    aria-hidden
                >
                    <span className="w-full break-words text-[11px] font-bold leading-tight">{drag.sub.n}</span>
                    <Formula sub={drag.sub} />
                </div>
            )}

            <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>玩法介绍</DialogTitle>
                        <DialogDescription>三分钟看懂怎么玩,新手不迷路</DialogDescription>
                    </DialogHeader>
                    <FlglRules />
                </DialogContent>
            </Dialog>

            {/* 改名二次确认(确认后保存并重开本局) */}
            <NameConfirmDialog
                open={nameConfirmOpen}
                pending={nameDraft}
                current={name}
                onOpenChange={setNameConfirmOpen}
                onConfirm={confirmName}
            />

            {/* 首次进入昵称弹窗(✕/返回大厅 = 放弃进入) */}
            <NameEntryDialog
                open={entryOpen}
                gameName="分了个类"
                onDismiss={() => navigate("/")}
                onConfirm={confirmEntry}
            />

            <footer className="mt-8 text-center text-xs text-muted-foreground">分了个类 · {FLGL_VERSION}(仅供个人娱乐)</footer>
        </div>
    );
}
