/*
 * p了个s · 英语单词数独 页面 (src/game2/WsPage.tsx)
 * =============================================
 * 难度切换(简单/标准/困难)、N×N 棋盘(每行每列拼成完整单词)、
 * 桌面物理键盘 + 移动端屏幕字母条双输入、血量/行校验/结算提交、
 * 内嵌榜单查看。昵称复用平台昵称(hlgx_name)。
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { WsGame, type WsMode } from "./core";
import { fmtTime } from "@/game/core";
import { detectPlatform } from "@/game/platform";
import { WS_VERSION } from "./version";

const NAME_KEY = "hlgx_name";   // 平台昵称(与化了个学共享)

function readName(): string {
    try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
}
function storeName(v: string) {
    try { localStorage.setItem(NAME_KEY, v); } catch { /* 隐私模式忽略 */ }
}

const MODE_TABS: { mode: WsMode; label: string }[] = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "hard", label: "困难" },
];

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

interface WsEntry {
    name: string; hp: number; time: number; tools: number;
    clears?: number; version?: string; date: string; platform?: string;
}

export function WsPage() {
    const [game, setGame] = useState(() => new WsGame("easy"));
    const [tab, setTab] = useState<"play" | "rank">("play");
    const [curMode, setCurMode] = useState<WsMode>("easy");
    const [rankMode, setRankMode] = useState<WsMode>("easy");
    const [entries, setEntries] = useState<WsEntry[] | null>(null);
    const [name, setName] = useState(readName());
    const [elapsed, setElapsed] = useState(0);
    const [result, setResult] = useState<{ win: boolean; hp: number; time: number; surpassed: number | null } | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refresh = () => setGame(g => Object.assign(Object.create(Object.getPrototypeOf(g)), g));

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - game.startAt) / 1000)), 500);
    };

    useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

    const newGame = (m: WsMode) => {
        setCurMode(m);
        setResult(null);
        const g = new WsGame(m);
        setGame(g);
        setElapsed(0);
        startTimer();
    };

    useEffect(() => { startTimer(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    useEffect(() => {
        if (!game.gameOver || result) return;
        if (timerRef.current) clearInterval(timerRef.current);
        const time = Math.floor((Date.now() - game.startAt) / 1000);
        setElapsed(time);
        setResult({ win: game.win, hp: game.hp, time, surpassed: null });
        // 提交成绩
        const n = name.trim();
        if (n) {
            fetch("/ws/api/rank", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: game.mode, name: n, hp: game.hp, time,
                    tools: 0, clears: game.fills, version: WS_VERSION,
                    platform: detectPlatform(),
                }),
            }).then(r => r.json()).then(d => {
                setResult(prev => prev && { ...prev, surpassed: typeof d.surpassed === "number" ? d.surpassed : null });
            }).catch(() => { /* 提交失败忽略 */ });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.gameOver]);

    const loadRank = (m: WsMode) => {
        setRankMode(m);
        setEntries(null);
        fetch(`/ws/api/rank?mode=${m}`).then(r => r.json()).then(d => setEntries(d.rank ?? []))
            .catch(() => setEntries([]));
    };

    useEffect(() => { if (tab === "rank") loadRank(rankMode); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, rankMode]);

    const onCell = (r: number, c: number) => {
        if (game.gameOver || game.win || game.rowDone[r] || game.puzzle[r][c] !== null) return;
        game.selected = { r, c };
        refresh();
    };

    const typeChar = (ch: string) => {
        if (game.gameOver || game.win || !game.selected) return;
        const { r, c } = game.selected;
        if (ch === "⌫") { game.erase(r, c); refresh(); return; }
        if (game.fill(r, c, ch)) {
            // 自动跳到下一个空格
            for (let rr = 0; rr < game.N; rr++) {
                for (let cc = 0; cc < game.N; cc++) {
                    if (game.grid[rr][cc] === null && game.puzzle[rr][cc] === null) {
                        game.selected = { r: rr, c: cc };
                        break;
                    }
                }
                if (game.selected && game.grid[game.selected.r][game.selected.c] === null) break;
            }
            refresh();
        }
    };

    // 物理键盘
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Backspace") { e.preventDefault(); typeChar("⌫"); return; }
            if (/^[a-zA-Z]$/.test(e.key)) typeChar(e.key.toLowerCase());
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game]);

    const board = game.grid;
    const done = game.rowDone;

    return (
        <div className="mx-auto min-h-dvh w-full max-w-lg px-3 pb-10 pt-3">
            <header className="mb-3 flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to="/">← 返回大厅</Link>
                </Button>
                <h1 className="flex-1 text-center text-lg font-extrabold">单词数独</h1>
                <div className="w-16" aria-hidden />
            </header>

            {/* 游戏/榜单 切换 */}
            <div className="mb-2 flex justify-center gap-1 rounded-full bg-muted p-1">
                {(["play", "rank"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={cn("flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                            tab === t ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                        {t === "play" ? "游戏" : "排行榜"}
                    </button>
                ))}
            </div>

            {tab === "rank" ? (
                <div>
                    <div className="mb-2 flex justify-center gap-1 rounded-full bg-secondary/60 p-1">
                        {MODE_TABS.map(({ mode, label }) => (
                            <button key={mode} onClick={() => loadRank(mode)}
                                className={cn("flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                                    rankMode === mode ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {entries === null ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">加载中…</p>
                    ) : entries.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">暂无记录,快来创造第一条吧</p>
                    ) : (
                        <div className="space-y-2">
                            {entries.map((e, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
                                    <span className="w-8 text-center text-lg">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{e.name}</p>
                                        <p className="text-xs text-muted-foreground">{e.date}</p>
                                    </div>
                                    <div className="text-right text-xs leading-relaxed">
                                        <p>❤ {e.hp} · ⏱ {fmtTime(e.time)}</p>
                                        <p className="text-muted-foreground">填写 {(e.clears ?? 0)} 字母 · {e.version || "旧版"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {/* 难度 + 昵称 */}
                    <div className="mb-2 flex items-center gap-2">
                        <div className="flex flex-1 justify-center gap-1 rounded-full bg-muted p-1">
                            {MODE_TABS.map(({ mode, label }) => (
                                <button key={mode} onClick={() => newGame(mode)}
                                    className={cn("flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                                        curMode === mode ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <input
                            value={name}
                            maxLength={10}
                            placeholder="昵称"
                            onChange={(e) => { setName(e.target.value); storeName(e.target.value); }}
                            className="w-24 rounded-lg border bg-card px-2 py-1.5 text-sm outline-none focus:border-primary"
                        />
                    </div>

                    {/* 状态栏 */}
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>血量 {game.hp}/3</span>
                        <span>用时 {fmtTime(elapsed)}</span>
                        <span>待填 {game.remainingBlanks}</span>
                    </div>

                    {/* 规则提示 */}
                    <p className="mb-2 text-center text-xs text-muted-foreground">
                        每行、每列都要拼成一个完整单词;填满的非法行会扣血
                    </p>

                    {/* 棋盘 */}
                    <div className="mx-auto w-fit rounded-2xl border bg-card p-2 shadow-sm">
                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${game.N}, minmax(0, 1fr))` }}>
                            {board.map((row, r) =>
                                row.map((v, c) => {
                                    const isFixed = game.puzzle[r][c] !== null;
                                    const isSel = game.selected?.r === r && game.selected?.c === c;
                                    return (
                                        <button
                                            key={`${r}-${c}`}
                                            onClick={() => onCell(r, c)}
                                            className={cn(
                                                "flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold uppercase transition sm:h-14 sm:w-14",
                                                isFixed
                                                    ? "border-transparent bg-muted text-muted-foreground"
                                                    : done[r]
                                                        ? "border-transparent bg-success/15 text-success"
                                                        : game.rowBad[r]
                                                            ? "border-transparent bg-destructive/15 text-destructive"
                                                            : "border bg-card shadow-sm hover:bg-muted",
                                                isSel && "ring-2 ring-primary",
                                            )}
                                        >
                                            {v ?? ""}
                                        </button>
                                    );
                                }),
                            )}
                        </div>
                    </div>

                    {/* 屏幕字母条(触屏友好) */}
                    <div className="mx-auto mt-3 flex max-w-md flex-wrap justify-center gap-1">
                        {LETTERS.map(ch => (
                            <button key={ch} onClick={() => typeChar(ch)}
                                className="h-9 min-w-8 rounded-md border bg-card px-1.5 text-sm font-semibold uppercase shadow-sm transition hover:bg-muted">
                                {ch}
                            </button>
                        ))}
                        <button onClick={() => typeChar("⌫")}
                            className="h-9 min-w-10 rounded-md border bg-secondary px-2 text-sm font-semibold transition hover:bg-muted">
                            退格
                        </button>
                    </div>

                    <p className="mt-3 text-center text-xs text-muted-foreground">
                        {game.win ? "已通关" : game.gameOver ? "已失败" : "点击格子后输入字母(支持物理键盘)"}
                    </p>
                </div>
            )}

            {/* 结算弹窗 */}
            <Dialog open={result !== null} onOpenChange={(o) => { if (!o) setResult(null); }}>
                {result && (
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-xl">{result.win ? "通关啦!" : "挑战失败"}</DialogTitle>
                            <DialogDescription>
                                {result.win
                                    ? "每行每列都拼成了完整单词!"
                                    : `血量耗尽——剩余待填 ${game.remainingBlanks} 格`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-xl bg-muted p-3 text-center text-sm leading-relaxed">
                            <p>用时 {fmtTime(result.time)} · 剩余血量 {result.hp} · 填写 {game.fills} 字母</p>
                            {result.surpassed !== null && (
                                <p className="mt-1.5 font-semibold text-primary">超越 {result.surpassed} 名玩家</p>
                            )}
                            {!name.trim() && <p className="mt-1.5 text-xs text-destructive">未填写昵称,成绩未上榜</p>}
                        </div>
                        <div className="flex justify-between gap-2">
                            <Button variant="ghost" onClick={() => { setResult(null); setTab("rank"); }}>查看榜单</Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => { setResult(null); }}>关闭</Button>
                                <Button onClick={() => newGame(curMode)}>再来一局</Button>
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            <footer className="mt-8 text-center text-xs text-muted-foreground">p了个s · 单词数独 · {WS_VERSION}</footer>
        </div>
    );
}
