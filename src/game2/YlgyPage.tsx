/*
 * p了个s · 英了个语 页面 (src/game2/YlgyPage.tsx)
 * =============================================
 * 交叉单词网格: 横竖单词交叉成自由图形, 相交处共享字母;
 * 挖空部分格形成关卡, 玩家补全; 每个词(横/竖)填满时校验是否词库单词, 非法扣血。
 * 网格自适应容器宽度(格子始终等比方块), 高难度也不挤压溢出。
 * 桌面物理键盘 + 移动端屏幕字母条双输入; 爱心血量; 提示道具(每局 2 次)。
 * 排行榜移至主界面与「化了个学」共用(见 /hlgx/rank)。
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MEANING_HINT_LIMIT, HINT_LIMIT, meaningOf, YlgyGame, type YlgyMode } from "./core";
import { fmtTime } from "@/game/core";
import { detectPlatform } from "@/game/platform";
import { YLGY_VERSION } from "./version";
import { YlgyRules } from "./YlgyRules";
import { NameConfirmDialog, validateNickname } from "@/game/NameConfirmDialog";

const NAME_KEY = "hlgx_name";   // 平台昵称(与化了个学共享)

function readName(): string {
    try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
}
function storeName(v: string) {
    try { localStorage.setItem(NAME_KEY, v); } catch { /* 隐私模式忽略 */ }
}

const MODE_TABS: { mode: YlgyMode; label: string }[] = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "hard", label: "困难" },
];

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

export function YlgyPage() {
    const [game, setGame] = useState(() => new YlgyGame("easy"));
    const [curMode, setCurMode] = useState<YlgyMode>("easy");
    const [name, setName] = useState(readName());   // 当前生效昵称
    const [nameDraft, setNameDraft] = useState(readName());   // 输入框编辑值(未确认)
    const [nameTip, setNameTip] = useState("");
    const [nameConfirmOpen, setNameConfirmOpen] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [meaningTip, setMeaningTip] = useState<{ wi: number; meaning: { pos: string; zh: string } } | null>(null);
    const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearMeaningTip = () => {
        if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
        setMeaningTip(null);
    };
    const [result, setResult] = useState<{ win: boolean; hp: number; time: number; surpassed: number | null; failed: boolean; failMsg?: string } | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refresh = () => setGame(g => Object.assign(Object.create(Object.getPrototypeOf(g)), g));

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - game.startAt) / 1000)), 500);
    };

    useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

    const newGame = (m: YlgyMode) => {
        setCurMode(m);
        setResult(null);
        const g = new YlgyGame(m);
        setGame(g);
        setElapsed(0);
        startTimer();
    };

    /* 局内改昵称(v1.4.8): 输入框编辑(实时校验) → ✓ 二次确认弹窗 → 保存并重启本局 */
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
        storeName(n);
        setNameConfirmOpen(false);
        setNameTip("");
        newGame(curMode);   // 重启本局(同难度重新生成)
    };

    useEffect(() => { startTimer(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    useEffect(() => {
        if (!game.gameOver || result) return;
        if (timerRef.current) clearInterval(timerRef.current);
        const time = Math.floor((Date.now() - game.startAt) / 1000);
        setElapsed(time);
        setResult({ win: game.win, hp: game.hp, time, surpassed: null, failed: false });
        const n = name.trim();
        if (n) {
            void submitScore(game, time);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.gameOver]);

    /* 提交成绩(独立函数, 结算窗「重试提交」复用) */
    const submitScore = async (g: YlgyGame, time: number) => {
        const nm = name.trim();
        if (!nm) return;
        try {
            const res = await fetch("/ylgy/api/rank", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: g.mode, name: nm, hp: g.hp, time,
                    tools: g.hints + g.meaningHints,   // 使用次数(与化了个学一致, 用得少排名靠前)
                    clears: g.fills, version: YLGY_VERSION,
                    platform: detectPlatform(),
                }),
            });
            const d = await res.json().catch(() => null);
            // 非 2xx(限频 429 / 校验 400 等)也是失败: 显示后端原因, 便于重试
            setResult(prev => prev && {
                ...prev,
                surpassed: res.ok && typeof d?.surpassed === "number" ? d.surpassed : null,
                failed: !res.ok,
                failMsg: !res.ok ? (d?.msg ?? `提交失败(HTTP ${res.status})`) : undefined,
            });
        } catch {
            setResult(prev => prev && { ...prev, failed: true, failMsg: "网络异常,请检查网络后重试" });
        }
    };

    const onCell = (r: number, c: number) => {
        if (game.gameOver || game.win || !game.occupied[r][c] || game.puzzle[r][c] !== null) return;
        game.selected = { r, c };
        refresh();
    };

    const typeChar = (ch: string) => {
        if (game.gameOver || game.win || !game.selected) return;
        clearMeaningTip();   // 输入行为消除含义提示
        const { r, c } = game.selected;
        if (ch === "⌫") { game.erase(r, c); refresh(); return; }
        if (game.fill(r, c, ch)) {
            // 自动跳到下一个空格
            let moved = false;
            for (let rr = 0; rr < game.H && !moved; rr++) {
                for (let cc = 0; cc < game.W; cc++) {
                    if (game.occupied[rr][cc] && game.grid[rr][cc] === null && game.puzzle[rr][cc] === null) {
                        game.selected = { r: rr, c: cc };
                        moved = true;
                        break;
                    }
                }
            }
            refresh();
        }
    };

    const useHint = () => {
        if (game.hint()) refresh();
    };

    const useMeaningHint = () => {
        const t = game.meaningHint();
        if (!t) return;
        if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
        setMeaningTip(t);
        // 7 秒后自动消除(v1.4.1)
        tipTimerRef.current = setTimeout(() => setMeaningTip(null), 7000);
    };

    // 任何键盘按键(不含滑动屏幕) → 消除含义提示
    useEffect(() => {
        const onKey = () => clearMeaningTip();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    // 调试接口: 控制台执行 hlgxDebug() 导出当前局面快照, 方便反馈调试
    //   # = 灰格(非单词成分) | 大写 = 预填(给定) | 小写 = 已填 | . = 待填空格
    useEffect(() => {
        const dump = () => {
            const g = game;
            const ascii = Array.from({ length: g.H }, (_, r) =>
                Array.from({ length: g.W }, (_, c) => {
                    if (!g.occupied[r][c]) return "#";
                    const v = g.grid[r][c];
                    if (v === null) return ".";
                    return g.puzzle[r][c] !== null ? v.toUpperCase() : v.toLowerCase();
                }).join(" "),
            ).join("\n");
            const words = g.words.map((w, i) => ({
                i, word: w.word, dir: w.dir, r: w.r, c: w.c,
                done: g.wordDone[i], bad: g.wordBad[i],
            }));
            const snapshot = {
                mode: g.mode, H: g.H, W: g.W, hp: g.hp,
                fills: g.fills, hints: g.hints, blanks: g.totalBlanks,
                gameOver: g.gameOver, win: g.win,
                legend: "#=灰格 大写=预填 小写=已填 .=待填",
                ascii, words,
                puzzle: g.puzzle, grid: g.grid,
                occupied: g.occupied.map(row => row.map(x => (x ? 1 : 0))),
            };
            /* eslint-disable no-console */
            console.log("%c[英了个语] 当前局面", "color:#0a84ff;font-weight:bold");
            console.log(snapshot.ascii + "\n图例: " + snapshot.legend);
            console.table(snapshot.words);
            console.log("复制下面这一行发给我 ↓\n" + JSON.stringify(snapshot));
            /* eslint-enable no-console */
            return snapshot;
        };
        // hlgxAnswer(): 直接给出当前局完整答案(纯查看, 不改游戏状态)
        //   大写 = 预填(给定) | 小写 = 该格正确答案(待填) | # = 灰格
        const dumpAnswer = () => {
            const g = game;
            const ascii = Array.from({ length: g.H }, (_, r) =>
                Array.from({ length: g.W }, (_, c) => {
                    if (!g.occupied[r][c]) return "#";
                    const ans = g.cellAnswer(r, c);
                    return g.puzzle[r][c] !== null ? ans.toUpperCase() : ans.toLowerCase();
                }).join(" "),
            ).join("\n");
            const words = g.words.map(w => `${w.word}(${w.dir} r${w.r} c${w.c})`);
            const out = {
                mode: g.mode, H: g.H, W: g.W,
                legend: "大写=预填给定 小写=待填答案 #=灰格",
                solution: ascii, words,
            };
            /* eslint-disable no-console */
            console.log("%c[英了个语] 答案", "color:#15a35a;font-weight:bold");
            console.log(out.solution + "\n图例: " + out.legend);
            console.log("词表:", out.words.join("   "));
            console.log("复制这一行发给我 ↓\n" + JSON.stringify(out));
            /* eslint-enable no-console */
            return out;
        };
        const w = window as unknown as Record<string, unknown>;
        w.hlgxDebug = dump;
        w.__YLGY_DEBUG__ = dump;
        w.hlgxAnswer = dumpAnswer;
        w.__YLGY_ANSWER__ = dumpAnswer;
    }, [game]);

    return (
        <div className="mx-auto min-h-dvh w-full max-w-lg px-3 pb-10 pt-3">
            <header className="mb-3 flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to="/">← 返回大厅</Link>
                </Button>
                <h1 className="flex-1 text-center text-lg font-extrabold">英了个语</h1>
                <div className="w-16" aria-hidden />
            </header>

            {/* 难度 + 玩法 + 昵称(玩法入口在改名栏左侧) */}
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
                <Button variant="ghost" size="sm" onClick={() => setRulesOpen(true)} className="shrink-0">
                    玩法
                </Button>
                <div className="flex shrink-0 items-center gap-1">
                    <input
                        value={nameDraft}
                        maxLength={10}
                        placeholder="昵称"
                        onChange={(e) => onNameDraftChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") requestNameConfirm(); }}
                        className="w-24 rounded-lg border bg-card px-2 py-1.5 text-sm outline-none focus:border-primary"
                        aria-label="当前昵称,点击直接修改"
                        title="当前昵称,修改后需二次确认并重开本局"
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" onClick={requestNameConfirm} aria-label="确认修改昵称">✓</Button>
                </div>
            </div>
            {nameTip && (
                <p className="mb-2 text-center text-xs font-semibold text-destructive">{nameTip}</p>
            )}

            {/* 状态栏: 爱心血量 + 用时 + 待填 */}
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="text-base leading-none" aria-label={`血量 ${game.hp}/3`}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <span key={i} aria-hidden>{i < Math.max(0, game.hp) ? "❤️" : "🤍"}</span>
                    ))}
                </span>
                <span className="tabular-nums font-mono">用时 {fmtTime(elapsed)}</span>
                <span>待填 {game.totalBlanks}</span>
            </div>

            {/* 规则提示 */}
            <p className="mb-2 text-center text-xs text-muted-foreground">
                横竖单词交叉拼图:每行/每列都是一个单词,相交处共享字母;灰色格不是单词成分,填满的非法词会扣血
            </p>

            {/* 交叉单词网格(整个一张表格; v1.4.1: 未占用格保持浅色无边框,
                待填空格外框加粗加深+背景加深以提升区分) */}
            <div className="mx-auto w-full max-w-[26rem] rounded-2xl border bg-card p-2 shadow-sm">
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${game.W}, minmax(0, 1fr))` }}>
                    {game.occupied.flatMap((row, r) =>
                        row.map((occ, c) => {
                            if (!occ) {
                                return (
                                    <div
                                        key={`${r}-${c}`}
                                        className="aspect-square w-full rounded-lg bg-muted/30"
                                        aria-hidden
                                    />
                                );
                            }
                            const v = game.grid[r][c];
                            const isFixed = game.puzzle[r][c] !== null;
                            const isBlank = !isFixed && v === null;          // 待填空格
                            const isSel = game.selected?.r === r && game.selected?.c === c;
                            // 词状态: 属于任一完成词 → 绿; 任一非法词 → 红
                            const wi = game.words.findIndex(w => {
                                const cells: [number, number][] = [];
                                for (let s = 0; s < w.word.length; s++)
                                    cells.push(w.dir === "h" ? [w.r, w.c + s] : [w.r + s, w.c]);
                                return cells.some(([rr, cc]) => rr === r && cc === c);
                            });
                            const isDone = wi >= 0 && game.wordDone[wi];
                            const isBad = wi >= 0 && game.wordBad[wi];
                            // 含义提示蓝圈: 该格属于被提示的词 → 整词圈出
                            const inTip = meaningTip !== null && game.wordCells(meaningTip.wi).some(([rr, cc]) => rr === r && cc === c);
                            return (
                                <button
                                    key={`${r}-${c}`}
                                    onClick={() => onCell(r, c)}
                                    className={cn(
                                        "flex aspect-square w-full items-center justify-center rounded-lg border text-base font-bold transition sm:text-lg",
                                        isFixed
                                            ? "border-transparent bg-muted text-muted-foreground"
                                            : isDone
                                                ? "border-transparent bg-success/15 text-success"
                                                : isBad
                                                    ? "border-transparent bg-destructive/15 text-destructive"
                                                    : isBlank
                                                        ? "border-2 border-muted-foreground/60 bg-muted/50 shadow-sm hover:bg-muted/70"
                                                        : "border bg-card shadow-sm hover:bg-muted",
                                        isSel && "ring-2 ring-primary",
                                        inTip && "ring-2 ring-blue-500",
                                    )}
                                >
                                    {v ?? ""}
                                </button>
                            );
                        }),
                    )}
                </div>
            </div>

            {/* 道具: 提示 */}
            <div className="mt-3 flex justify-center">
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={HINT_LIMIT - game.hints <= 0 || game.gameOver}
                    onClick={useHint}
                >
                    填空提示({HINT_LIMIT - game.hints})
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={MEANING_HINT_LIMIT - game.meaningHints <= 0 || game.gameOver}
                    onClick={useMeaningHint}
                >
                    含义提示({MEANING_HINT_LIMIT - game.meaningHints})
                </Button>
            </div>
            {meaningTip && (
                <p className="mx-auto mt-2 max-w-md text-center text-sm font-semibold leading-relaxed text-blue-600">
                    含义提示: [{meaningTip.meaning.pos}] {meaningTip.meaning.zh}
                </p>
            )}

            {/* 屏幕字母条(触屏友好) */}
            <div className="mx-auto mt-3 flex max-w-md flex-wrap justify-center gap-1">
                {LETTERS.map(ch => (
                    <button key={ch} onClick={() => typeChar(ch)}
                        className="h-9 min-w-8 rounded-md border bg-card px-1.5 text-sm font-semibold shadow-sm transition hover:bg-muted">
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

            {/* 结算: 公布正确答案 + 逐词释义(玩家可查看, 不直接弹退出/再来一局) */}
            <Dialog open={result !== null} onOpenChange={(o) => { if (!o) setResult(null); }}>
                {result && (
                    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl">{result.win ? "通关啦!" : "挑战失败"}</DialogTitle>
                            <DialogDescription>
                                {result.win
                                    ? "每个单词都补全成了课标词汇!下方公布完整答案与释义"
                                    : `血量耗尽——正确答案与释义如下`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-xl bg-muted p-3 text-center text-sm leading-relaxed">
                            <p>用时 {fmtTime(result.time)} · 剩余血量 {result.hp} · 填写 {game.fills} 字母</p>
                            {result.failed ? (
                                <p className="mt-1.5 text-xs text-destructive">
                                    成绩提交失败: {result.failMsg ?? "未知原因"}。点下方「重试提交」再试一次
                                </p>
                            ) : (
                                result.surpassed !== null && (
                                    <p className="mt-1.5 font-semibold text-primary">超越 {result.surpassed} 名玩家</p>
                                )
                            )}
                            {!name.trim() && <p className="mt-1.5 text-xs text-destructive">未填写昵称,成绩未上榜</p>}
                        </div>

                        {/* 正确答案网格 */}
                        <div>
                            <h4 className="mb-2 text-sm font-bold">正确答案</h4>
                            <div className="mx-auto w-fit rounded-xl border bg-card p-1.5 shadow-sm">
                                <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${game.W}, minmax(0, 1fr))` }}>
                                    {game.occupied.flatMap((row, r) =>
                                        row.map((occ, c) => (
                                            <div
                                                key={`${r}-${c}`}
                                                className={cn(
                                                    "flex h-8 w-8 items-center justify-center rounded text-base font-bold sm:h-9 sm:w-9",
                                                    occ ? "bg-success/15 text-success" : "bg-muted/50",
                                                )}
                                            >
                                                {occ ? game.cellAnswer(r, c) : ""}
                                            </div>
                                        )),
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 逐词释义(词性 + 中文, 多词性全列) */}
                        <div>
                            <h4 className="mb-2 text-sm font-bold">单词解析({game.words.length})</h4>
                            <ul className="space-y-2">
                                {game.words.map((w, i) => (
                                    <li key={i} className="rounded-lg bg-muted/40 px-3 py-2">
                                        <p className="font-bold">{w.word} <span className="font-normal normal-case text-muted-foreground">{w.dir === "h" ? "横" : "竖"}</span></p>
                                        {(meaningOf(w.word) ?? []).map((m, j) => (
                                            <p key={j} className="text-xs leading-relaxed text-muted-foreground">
                                                <span className="font-semibold text-foreground">{m.pos}</span> {m.zh}
                                            </p>
                                        ))}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex justify-between gap-2">
                            <Button variant="ghost" onClick={() => { setResult(null); }}>关闭</Button>
                            <div className="flex gap-2">
                                {result.failed && (
                                    <Button variant="secondary" onClick={() => void submitScore(game, result.time)}>重试提交</Button>
                                )}
                                <Button asChild variant="outline" onClick={() => setResult(null)}>
                                    <Link to="/hlgx/rank?game=ylgy">查看排行榜</Link>
                                </Button>
                                <Button onClick={() => newGame(curMode)}>再来一局</Button>
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            {/* 玩法介绍(局内随时可回看) */}
            <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>玩法介绍</DialogTitle>
                        <DialogDescription>三分钟看懂怎么玩,新手不迷路</DialogDescription>
                    </DialogHeader>
                    <YlgyRules />
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

            <footer className="mt-8 text-center text-xs text-muted-foreground">英了个语 · {YLGY_VERSION}(仅供个人娱乐)</footer>
        </div>
    );
}
