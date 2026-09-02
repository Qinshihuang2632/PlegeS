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
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MEANING_HINT_LIMIT, HINT_LIMIT, meaningOf, YlgyGame, type YlgyMode } from "./core";
import { fmtTime } from "@/game/core";
import { detectPlatform } from "@/game/platform";
import { YLGY_VERSION } from "./version";
import { YlgyRules } from "./YlgyRules";
import { NameConfirmDialog, validateNickname } from "@/game/NameConfirmDialog";
import { RankPartToggle, readSkipRank, storeSkipRank } from "@/game/RankPartToggle";
import { NameEntryDialog, storedIdentity } from "@/game/NameEntryDialog";
import { HLGX_Audio } from "@/game/audio";
import { fetchRankToken } from "@/lib/rankToken";
import { reportPlayLog } from "@/game/playlog";

const NAME_KEY = "hlgx_name";   // 平台昵称(与化了个学共享)

/** AI 单词检测结果(v1.6.0): ok=false 表示 AI 不可用(前端降级词库判定) */
interface AiCheckResult {
    ok: boolean;
    isWord?: boolean;
    pos?: string;
    zh?: string;
    msg?: string;
}

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

/* v1.6.1: 局内键盘按真实 QWERTY 布局分行, 不再按字母表顺序 */
const KB_ROWS = ["qwertyuiop".split(""), "asdfghjkl".split(""), "zxcvbnm".split("")];

export function YlgyPage() {
    const [game, setGame] = useState(() => new YlgyGame("easy"));
    const [curMode, setCurMode] = useState<YlgyMode>("easy");
    const [name, setName] = useState(readName());   // 当前生效昵称
    const [nameDraft, setNameDraft] = useState(readName());   // 输入框编辑值(未确认)
    const [nameTip, setNameTip] = useState("");
    const [nameConfirmOpen, setNameConfirmOpen] = useState(false);
    /* 排行榜参与(v2.6.1): 有昵称 且 未勾选跳过(hlgx_skip_rank) 才上榜 */
    const [skipRank, setSkipRank] = useState(() => readSkipRank());
    const rankActive = !!name.trim() && !skipRank;
    /* 首次进入昵称弹窗(v1.5.2): 本机从未填过昵称且未勾选不参与时弹出; 弹窗期间暂停计时(见 startTimer) */
    const navigate = useNavigate();
    const [entryOpen, setEntryOpen] = useState(() => !storedIdentity());
    const entryOpenRef = useRef(entryOpen);
    const [elapsed, setElapsed] = useState(0);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [muted, setMuted] = useState(HLGX_Audio.isMuted());
    const [meaningTip, setMeaningTip] = useState<{ wi: number; meaning: { pos: string; zh: string } } | null>(null);
    const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const badFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);   // v1.5.4: 错误格闪红 2s 后重绘
    const rankTokenRef = useRef("");   // v2.8.0: 一次性成绩提交凭证(开局申领, 提交时携带)

    /* v1.6.0 AI 单词检测: 填满的词与参考答案不同时, 调 /ylgy/api/ai(DeepSeek)判断是否真实单词。
       aiTip: 合法但非参考答案词的释义提示(不锁定, 可删改); aiChecking: 检测进行中;
       aiCache: 词 → 检测结果缓存(避免同词重复消耗 AI); aiPending: 进行中的词内容(防过期结果) */
    const [aiTip, setAiTip] = useState<string | null>(null);
    const aiTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [aiChecking, setAiChecking] = useState(false);
    const aiCacheRef = useRef<Map<string, AiCheckResult | null>>(new Map());
    const gameRef = useRef(game);
    gameRef.current = game;

    const clearMeaningTip = () => {
        if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
        setMeaningTip(null);
    };
    const [result, setResult] = useState<{ win: boolean; hp: number; time: number; surpassed: number | null; failed: boolean; failMsg?: string; skipped?: boolean } | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refresh = () => setGame(g => Object.assign(Object.create(Object.getPrototypeOf(g)), g));

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            // v1.5.2: 首次昵称弹窗打开期间暂停计时 —— 把开局时间戳同步前移, 玩家不会被弹窗耗时的计入用时
            if (entryOpenRef.current) game.startAt += 500;
            setElapsed(Math.floor((Date.now() - game.startAt) / 1000));
        }, 500);
    };

    useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

    const newGame = (m: YlgyMode) => {
        setCurMode(m);
        setResult(null);
        const g = new YlgyGame(m);
        setGame(g);
        setElapsed(0);
        startTimer();
        // v2.8.0: 开局申领成绩提交凭证(失败不阻塞游戏, 提交时补领)
        rankTokenRef.current = "";
        void fetchRankToken("ylgy", m).then((t) => { rankTokenRef.current = t; });
        // v1.6.0: 清理上一局的 AI 检测状态与提示
        setAiTip(null);
        setAiChecking(false);
        if (aiTipTimerRef.current) clearTimeout(aiTipTimerRef.current);
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

    /* 排行榜参与开关(v2.6.1): 二次确认后切换参与状态并重开本局(昵称保留) */
    const confirmRankPart = (participate: boolean) => {
        setSkipRank(!participate);
        storeSkipRank(!participate);
        newGame(curMode);   // 重启本局(同难度重新生成)
    };

    /* 首次进入昵称弹窗: 同步 ref 供计时暂停判断; 确认后直接开始当前局(无需重开) */
    useEffect(() => { entryOpenRef.current = entryOpen; }, [entryOpen]);
    const confirmEntry = (n: string, skip: boolean) => {
        if (n) {
            setName(n);
            setNameDraft(n);
            storeName(n);
        }
        setSkipRank(skip);
        storeSkipRank(skip);
        setEntryOpen(false);
    };

    useEffect(() => {
        startTimer();
        // v2.8.0: 首局(组件初始化即开局)也要申领成绩提交凭证
        void fetchRankToken("ylgy", "easy").then((t) => { rankTokenRef.current = t; });
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, []);

    useEffect(() => {
        if (!game.gameOver || result) return;
        if (timerRef.current) clearInterval(timerRef.current);
        const time = Math.floor((Date.now() - game.startAt) / 1000);
        setElapsed(time);
        setResult({ win: game.win, hp: game.hp, time, surpassed: null, failed: false });
        const n = name.trim();
        if (n && !skipRank) {
            void submitScore(game, time);
        } else {
            setResult({ win: game.win, hp: game.hp, time, surpassed: null, failed: false, skipped: true });
            // v2.8.5: 未参与排行榜的游玩也上报记录(后台查看, 静默失败)
            void reportPlayLog({
                game: "ylgy", mode: game.mode, name: n || undefined,
                win: game.win, score: game.fills, time,
                tools: game.hints + game.meaningHints, version: YLGY_VERSION,
            });
        }
        // v1.5.2 音效: 通关/通关失败
        if (game.win) HLGX_Audio.win();
        else HLGX_Audio.lose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.gameOver]);

    /* 提交成绩(独立函数, 结算窗「重试提交」复用) */
    const submitScore = async (g: YlgyGame, time: number) => {
        const nm = name.trim();
        if (!nm) return;
        try {
            // v2.8.0: 携带开局申领的一次性凭证; 缺失时补领(如开局时离线)
            let token = rankTokenRef.current;
            if (!token) {
                token = await fetchRankToken("ylgy", g.mode);
                rankTokenRef.current = token;
            }
            const res = await fetch("/ylgy/api/rank", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: g.mode, name: nm, hp: g.hp, time,
                    tools: g.hints + g.meaningHints,   // 使用次数(与化了个学一致, 用得少排名靠前)
                    clears: g.fills, version: YLGY_VERSION,
                    platform: detectPlatform(),
                    token,
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

    /* v1.6.0: 展示 AI 释义提示(合法但非参考答案词), 8 秒后自动消除 */
    const showAiTip = (msg: string) => {
        if (aiTipTimerRef.current) clearTimeout(aiTipTimerRef.current);
        setAiTip(msg);
        aiTipTimerRef.current = setTimeout(() => setAiTip(null), 8000);
    };

    /* v1.6.0: AI 检测结果应用。
       真实单词(非参考答案) → 仅展示释义提示, 不锁定不扣血, 玩家可删掉重填;
       非真实单词 → 非法处理(扣血 + 红 2 秒);
       AI 不可用(ok=false) → 降级词库判定: 词库词按合法锁定(旧行为), 否则扣血。 */
    const applyAiResult = (wi: number, word: string, result: AiCheckResult | null) => {
        setAiChecking(false);
        const g = gameRef.current;
        if (g.gameOver || g.wordDone[wi]) return;
        // 结果应用前再校验该词当前内容(检测期间玩家可能已修改)
        const now = g.wordCells(wi).map(([rr, cc]) => g.grid[rr][cc]).join("").toLowerCase();
        if (now !== word) return;
        if (result && result.ok && result.isWord === true) {
            showAiTip(`本单词释义为 ${(result.pos ?? "").trim()} ${(result.zh ?? "").trim()}。但「${word}」不符合本局参考答案,可能导致其他交叉单词无法正确填出,请更换答案(该词未被锁定,可删除重填)。`);
            return;
        }
        const isLegal = !!(result && result.ok) ? result!.isWord === true : g.isDictWord(word);
        const hpBefore = g.hp;
        g.confirmWord(wi, isLegal);
        if (g.hp < hpBefore) {
            HLGX_Audio.wrong();
            badFlashTimerRef.current && clearTimeout(badFlashTimerRef.current);
            badFlashTimerRef.current = setTimeout(() => refresh(), 2000);
        }
        refresh();
    };

    /* v1.6.0: 对「填满且未完成」的词发起 AI 检测(带结果缓存与过期丢弃) */
    const scheduleAiCheck = (wi: number) => {
        const g = gameRef.current;
        if (g.gameOver || g.win || g.wordDone[wi]) return;
        const cells = g.wordCells(wi);
        if (cells.some(([rr, cc]) => g.grid[rr][cc] === null)) return;
        const word = cells.map(([rr, cc]) => g.grid[rr][cc]).join("").toLowerCase();
        if (!word) return;
        const cached = aiCacheRef.current.get(word);
        if (cached !== undefined) { applyAiResult(wi, word, cached); return; }
        setAiChecking(true);
        void (async () => {
            let result: AiCheckResult | null = null;
            try {
                const resp = await fetch("/ylgy/api/ai", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ word }),
                });
                result = await resp.json();
            } catch { result = null; }
            aiCacheRef.current.set(word, result);
            // 检测期间开局换局 / 玩家修改该词 → 丢弃过期结果
            const cur = gameRef.current;
            if (cur !== g || cur.wordDone[wi]) { setAiChecking(false); return; }
            applyAiResult(wi, word, result);
        })();
    };

    const typeChar = (ch: string) => {
        if (game.gameOver || game.win || !game.selected) return;
        clearMeaningTip();   // 输入行为消除含义提示
        const { r, c } = game.selected;
        if (ch === "⌫") { game.erase(r, c); refresh(); return; }
        // v1.6.0 音效: 完成词数变化判断 答对(填出参考答案词); 扣血改由 AI 检测回调处理
        const doneBefore = game.wordDone.filter(Boolean).length;
        if (game.fill(r, c, ch)) {
            if (game.wordDone.filter(Boolean).length > doneBefore) HLGX_Audio.correct();
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
            // v1.6.0: 刚好被这次输入填满、且未完成的词(= 非参考答案) → 异步 AI 检测
            for (let wi = 0; wi < game.words.length; wi++) {
                if (game.wordDone[wi]) continue;
                const cells = game.wordCells(wi);
                if (!cells.some(([rr, cc]) => rr === r && cc === c)) continue;
                if (cells.some(([rr, cc]) => game.grid[rr][cc] === null)) continue;
                scheduleAiCheck(wi);
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
    //   v2.8.0: 仅开发环境注册(生产构建移除, 防玩家控制台直接看答案)
    useEffect(() => {
        if (!import.meta.env.DEV) return;
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
                <div className="w-12" aria-hidden />
            </div>
            </header>

            {/* 难度 + 玩法入口 */}
            <div className="mb-2 flex items-center gap-2">
                <div className="flex flex-1 justify-center gap-1 rounded-full bg-muted p-1">
                    {MODE_TABS.map(({ mode, label }) => (
                        <button key={mode} onClick={() => newGame(mode)}
                            className={cn("flex-1 rounded-full px-2 py-1.5 text-sm font-semibold transition",
                                curMode === mode ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                            {label}
                        </button>
                    ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRulesOpen(true)} className="shrink-0">
                    玩法
                </Button>
            </div>

            {/* 昵称行: 输入 + 二次确认 + 排行参与开关 + 错误提示(独占一行, 窄屏自动换行, v1.6.1) */}
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
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
                    <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" onClick={requestNameConfirm} aria-label="确认修改昵称">✓</Button>
                </div>
                <RankPartToggle active={rankActive} onConfirmedChange={confirmRankPart} />
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
            <p className="mb-2 text-center text-xs leading-relaxed text-muted-foreground">
                横竖单词交叉拼图:每行/每列都是一个单词,相交处共享字母;灰色格不是单词成分;填出的词若与本局答案不同,AI 会判断它是否为真实单词(真实则提示可换答案,非真实才扣血)
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
                            // v1.5.4: 错误格只闪红 2 秒, 之后恢复无色(仍可修改再重试); 正确格常绿
                            const isBad = wi >= 0 && game.wordBad[wi] && (game.wordBadAt[wi] ?? 0) > Date.now() - 2000;
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
            {/* v1.6.0 AI 单词检测: 检测中 / 释义提示(合法但非参考答案, 不锁定可删改) */}
            {aiChecking && (
                <p className="mx-auto mt-2 max-w-md text-center text-sm font-semibold text-muted-foreground" role="status">
                    AI 检测中…
                </p>
            )}
            {aiTip && (
                <p className="mx-auto mt-2 max-w-md rounded-lg bg-amber-500/10 px-3 py-2 text-center text-sm font-semibold leading-relaxed text-amber-600">
                    {aiTip}
                </p>
            )}

            {/* 屏幕键盘(QWERTY 布局, v1.6.1: 三行贴近真实键盘, 末行附退格) */}
            <div className="mx-auto mt-3 w-full max-w-md space-y-1.5">
                {KB_ROWS.map((row, ri) => (
                    <div key={ri} className="flex justify-center gap-1">
                        {ri === 2 && (
                            <button onClick={() => typeChar("⌫")}
                                className="h-10 min-w-9 flex-1 max-w-12 rounded-md border bg-secondary text-[11px] font-semibold transition hover:bg-muted sm:text-sm">
                                退格
                            </button>
                        )}
                        {row.map(ch => (
                            <button key={ch} onClick={() => typeChar(ch)}
                                className="h-10 min-w-0 flex-1 max-w-9 rounded-md border bg-card text-sm font-semibold shadow-sm transition hover:bg-muted sm:max-w-11">
                                {ch}
                            </button>
                        ))}
                    </div>
                ))}
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
                            {!name.trim() ? (
                                <p className="mt-1.5 text-xs text-destructive">未填写昵称,成绩未上榜</p>
                            ) : result.skipped && (
                                <p className="mt-1.5 text-xs text-destructive">已选择不参与排行榜,成绩未上榜</p>
                            )}
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

            {/* 首次进入昵称弹窗(✕/返回大厅 = 放弃进入; 确认后直接开始当前局) */}
            <NameEntryDialog
                open={entryOpen}
                gameName="英了个语"
                onDismiss={() => navigate("/")}
                onConfirm={confirmEntry}
            />

            <footer className="mt-8 text-center text-xs text-muted-foreground">英了个语 · {YLGY_VERSION}(仅供个人娱乐)</footer>
        </div>
    );
}
