/*
 * 化了个学 · 消除小游戏页面 (/hlgx/hua)
 * ======================================
 * 行为与旧版一致(核心逻辑在 core.ts, 由 Vitest 锁定), 新增:
 *   - 新手引导(首次进入, 可跳过/不再显示)
 *   - 道具人性化 tooltip、手牌槽可消除高亮、结算文案解释排名规则
 *   - 全部弹窗带「✕」关闭; 非首页带「返回大厅」
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { HLGX_Audio } from "./audio";
import { hasBadWord } from "./badwords";
import { NameConfirmDialog } from "./NameConfirmDialog";
import { fmtTime, TOOL_LIMIT, type Mode, type Tile } from "./core";
import { detectPlatform, PLATFORM_LABEL } from "./platform";
import { APP_VERSION } from "@/version";
import { BoardTile, TrayCell } from "./game-ui";
import { GameRules } from "./GameRules";
import { useGame } from "./useGame";

const TUTORIAL_KEY = "hlgx_tutorial_done_v1";

/* 昵称记忆: 刷新/重进后预填上次输入, 无需重新打字(localStorage, 隐私模式降级为空) */
const NAME_STORAGE_KEY = "hlgx_name";
const RANK_SKIP_KEY = "hlgx_skip_rank";   // v2.2.7: 记住「不参与排行榜」选择
function readStoredName(): string {
    try { return localStorage.getItem(NAME_STORAGE_KEY) ?? ""; } catch { return ""; }
}
function storeName(raw: string) {
    try { localStorage.setItem(NAME_STORAGE_KEY, raw); } catch { /* 隐私模式忽略 */ }
}
function readStoredSkip(): boolean {
    try { return localStorage.getItem(RANK_SKIP_KEY) === "1"; } catch { return false; }
}
function storeSkip(v: boolean) {
    try { localStorage.setItem(RANK_SKIP_KEY, v ? "1" : "0"); } catch { /* 隐私模式忽略 */ }
}

const MODE_TABS: { mode: Mode; label: string }[] = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "challenge", label: "困难" },
    { mode: "extreme", label: "挑战" },
];

interface ResultInfo {
    win: boolean;
    remain: number;
    tools: number;
    time: number;
    surpassed: number | null;
    failed: boolean;
    failMsg?: string;      // 提交失败原因(后端 msg 或网络异常描述)
    skipped?: boolean;     // 未参与排行(未填昵称/勾选了不参与排行榜)
}

export function HuaPage() {
    const navigate = useNavigate();
    const { game, elapsed, stopTimer, startTimer } = useGame();
    const platform = detectPlatform();   // 手游/端游: 提交与展示用

    /* ---- 通用 UI 状态 ---- */
    const [muted, setMuted] = useState(false);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [shakeId, setShakeId] = useState<number | null>(null);
    const [scale, setScale] = useState(1);
    const boardRef = useRef<HTMLDivElement>(null);
    const trayRef = useRef<HTMLDivElement>(null);
    const [cellSize, setCellSize] = useState(44);

    /* ---- 昵称/开局 ---- */
    const [nameOpen, setNameOpen] = useState(false);
    const [nameDialogMode, setNameDialogMode] = useState<"first" | "change">("first");   // v2.2.7: 首次输入/更换昵称
    const [name, setName] = useState<string>(() => readStoredName());   // 预填上次输入
    const [headerName, setHeaderName] = useState<string>(() => readStoredName());   // 局内昵称输入框(编辑值)
    const [headerNameTip, setHeaderNameTip] = useState("");
    const [nameConfirmOpen, setNameConfirmOpen] = useState(false);   // v2.3.9: 局内改昵称二次确认
    const [skipRank, setSkipRank] = useState(false);
    const [rankActive, setRankActive] = useState(false);   // v2.4.2: 局内是否参与排行(防「记住的勾选」静默不上榜)
    const [nameTip, setNameTip] = useState("");
    const playerNameRef = useRef<string | null>(null);
    const inRankRef = useRef(false);
    const nameChangeRestartRef = useRef(false);   // v2.3.2: 结算页换名确认→开新局; 局内换名→不重开,只更新默认昵称

    /* ---- 新手引导(首次进入) ---- */
    const [tutorialOpen, setTutorialOpen] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [tutorialSkipAlways, setTutorialSkipAlways] = useState(false);

    /* ---- 结算 ---- */
    const [resultInfo, setResultInfo] = useState<ResultInfo | null>(null);
    const submittedRef = useRef(false);
    const audioPlayedRef = useRef(false);
    const elapsedRef = useRef(0);
    elapsedRef.current = elapsed;

    const TUTORIAL_STEPS = [
        {
            icon: "🎯",
            title: "怎么玩",
            body: "点击棋盘上「没有被压住」的卡牌,它会滑入底部手牌槽。槽里凑齐 3 张同类卡牌,点「消除选中」即可消掉。「同类」指物质类别相同,与化学式无关。",
        },
        {
            icon: "🧰",
            title: "道具救场",
            body: "卡关时用道具:撤回(最后一张放回棋盘)、移出(移除当前选中的至多 3 张卡,无伤消除)、洗牌(打乱场上卡牌)。每种每局最多 3 次,优先救急用。",
        },
        {
            icon: "❤️",
            title: "胜负规则",
            body: "全部卡牌拾取完、且手牌槽没有可消的三消组合 → 通关(最后一步消除也算)。误选 3 张不同类会扣 1 点血;手牌槽满了又凑不出三消 → 失败。",
        },
    ];

    /* 首次进入 → 新手引导 / 昵称窗; 已记住昵称 → 直接开局, 不再询问(v2.2.7) */
    useEffect(() => {
        const seen = localStorage.getItem(TUTORIAL_KEY) === "1";
        const saved = readStoredName();
        const savedSkip = readStoredSkip();
        if (saved || savedSkip) {
            playerNameRef.current = saved || null;
            inRankRef.current = !!saved && !savedSkip;
            setSkipRank(savedSkip);
            setRankActive(!!saved && !savedSkip);
            setHeaderName(saved);   // v2.3.6: 局内输入框预填当前昵称
            if (!seen) setTutorialOpen(true);
            else beginPlay();
        } else {
            setNameOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const closeTutorial = () => {
        localStorage.setItem(TUTORIAL_KEY, "1");
        setTutorialOpen(false);
        if (playerNameRef.current || readStoredSkip()) beginPlay();
        else setNameOpen(true);
    };

    /* 棋盘缩放适配小屏: 7×7 底层几乎占满容器宽(去掉内置 20px 边距, 仅留 2px 呼吸空间) */
    useEffect(() => {
        const el = boardRef.current;
        if (!el) return;
        const update = () => setScale(Math.min(1, (el.clientWidth - 2) / Math.max(1, game.boardW - 20)));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [game]);

    /* 手牌槽单格尺寸: 两行排布(10→5+5, 8→4+4), 按行宽计算, 卡牌更大易点 */
    useEffect(() => {
        const el = trayRef.current;
        if (!el) return;
        const rowCols = Math.ceil(game.trayMax / 2);   // 每行格子数
        const update = () => {
            const gaps = 6 * (rowCols - 1);
            setCellSize(Math.max(28, Math.min(56, Math.floor((el.clientWidth - gaps) / rowCols))));
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [game.trayMax]);

    /* ---- 开局流程(昵称校验, 与旧版契约一致) ---- */
    const beginPlay = () => {
        setNameOpen(false);
        setNameTip("");
        game.newGame();
        startTimer();
    };

    const confirmName = () => {
        const n = name.trim();
        if (skipRank) {
            playerNameRef.current = null;
            inRankRef.current = false;
            setRankActive(false);
            storeSkip(true);                 // v2.2.7: 记住选择, 下次直接开局
            finishNameDialog();
            return;
        }
        if (!n) { setNameTip("请输入昵称,或勾选「不参与排行榜」"); return; }
        // 字数限制 + 违禁字检测(前端拦截, 后端同样强制拒绝)
        if ([...n].length > 10) { setNameTip("昵称最多 10 个字"); return; }
        if (hasBadWord(n)) { setNameTip("昵称包含违禁词,请更换"); return; }
        // v2.1.6: 同名昵称放开(靠上榜时间区分玩家), 不再查重/自动加序列号
        playerNameRef.current = n;
        inRankRef.current = true;
        setRankActive(true);
        storeName(n);
        storeSkip(false);
        setHeaderName(n);      // v2.3.6: 同步局内实时输入框
        setHeaderNameTip("");
        finishNameDialog();
    };

    /* 首次确认 → 开新局; 更换昵称 → 按来源决定: 结算页换名重开一局, 局内换名不打断当前局 */
    const finishNameDialog = () => {
        if (nameDialogMode === "first" || nameChangeRestartRef.current) beginPlay();
        else setNameOpen(false);
        nameChangeRestartRef.current = false;
    };

    /* 局内改名(v2.3.9): 输入框编辑(实时校验) → ✓ 二次确认弹窗 → 保存并重启本局 */
    const commitHeaderName = (v: string) => {
        setHeaderName(v);
        setHeaderNameTip("");
        const n = v.trim();
        if (!n) return;   // 空输入不生效(需通过确认流程清空)
        if ([...n].length > 10) { setHeaderNameTip("昵称最多 10 个字"); return; }
        if (hasBadWord(n)) { setHeaderNameTip("昵称包含违禁词,请更换"); return; }
    };
    const requestNameConfirm = () => {
        const n = headerName.trim();
        if (!n) { setHeaderNameTip("昵称不能为空"); return; }
        if ([...n].length > 10) { setHeaderNameTip("昵称最多 10 个字"); return; }
        if (hasBadWord(n)) { setHeaderNameTip("昵称包含违禁词,请更换"); return; }
        if (n === (playerNameRef.current ?? readStoredName() ?? "")) { setHeaderNameTip("昵称未变化"); return; }
        setNameConfirmOpen(true);
    };
    const confirmHeaderName = () => {
        const n = headerName.trim();
        playerNameRef.current = n;
        inRankRef.current = true;
        setRankActive(true);
        storeName(n);
        storeSkip(false);
        setNameConfirmOpen(false);
        setHeaderNameTip("");
        restart();   // 重启本局(同难度重新生成)
    };

    /* 局内/结算页「更换昵称」入口(v2.3.2): 预填当前默认昵称, 打开更换窗 */
    const openNameChange = () => {
        setNameTip("");
        setName(playerNameRef.current ?? readStoredName());
        setHeaderName(playerNameRef.current ?? readStoredName());   // v2.3.6
        setSkipRank(!inRankRef.current);
        setNameDialogMode("change");
        setNameOpen(true);
    };

    /* ---- 棋盘交互 ---- */
    const onPick = (t: Tile) => {
        if (game.gameOver || game.win) return;
        const r = game.pickTile(t);
        if (r === "ok") HLGX_Audio.click();
        else if (r === "blocked") {
            setShakeId(t.id);
            setTimeout(() => setShakeId((v) => (v === t.id ? null : v)), 300);
        } else if (r === "trayFull") {
            toast("手牌槽已满:先选中同类物质点「消除选中」,或用道具腾位置");
        }
    };

    const onClear = () => {
        const r = game.clearSelected();
        if (r === "wrongSet") {
            HLGX_Audio.hurt();
            toast(`不是同类!扣除 1 点血量(剩 ${Math.max(0, game.hp)})`, {
                className: "bg-destructive text-destructive-foreground",
            });
        } else if (r === "cleared") HLGX_Audio.clear();
    };

    const useTool = (tool: "undo" | "out" | "shuffle") => {
        const r = tool === "undo" ? game.undo() : tool === "out" ? game.moveOut() : game.shuffleTiles();
        if (r === "limit") toast(`${TOOL_LIMIT} 次已用完,本局不能再用了`);
        else if (r === "empty") toast(tool === "out" ? "请先选中要移出的卡牌" : "手牌槽是空的,先拾取卡牌吧");
        else if (tool === "undo") HLGX_Audio.undo();
        else if (tool === "out") HLGX_Audio.out();
        else HLGX_Audio.shuffle();
    };

    /* ---- 结算: 提交成绩 + 展示 ---- */
    const submitScore = useCallback(async (time: number) => {
        const r = game.result;
        if (!r) return;
        if (!inRankRef.current || !playerNameRef.current) {
            setResultInfo({ win: r.win, remain: r.remain, tools: r.tools, time, surpassed: null, failed: false, skipped: true });
            return;
        }
        try {
            const res = await fetch("/hlgx/api/rank", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: game.mode,
                    name: playerNameRef.current,
                    hp: Math.max(0, game.hp),
                    time,
                    tools: r.tools,
                    clears: r.clears,          // 成功消除组数(v2.2.0 排名依据)
                    version: APP_VERSION,      // 通关版本(v2.2.0 便于跨版本比较)
                    platform,
                }),
            });
            const data = await res.json().catch(() => null);
            // 非 2xx(限频 429 / 校验 400 等)也是失败: 显示后端原因, 便于重试
            if (!res.ok) {
                setResultInfo({
                    win: r.win, remain: r.remain, tools: r.tools, time,
                    surpassed: null, failed: true,
                    failMsg: data && typeof data.msg === "string" ? data.msg : `提交失败(HTTP ${res.status})`,
                });
                return;
            }
            setResultInfo({
                win: r.win, remain: r.remain, tools: r.tools, time,
                surpassed: data && typeof data.surpassed === "number" ? data.surpassed : null,
                failed: false,
            });
        } catch {
            setResultInfo({ win: r.win, remain: r.remain, tools: r.tools, time, surpassed: null, failed: true, failMsg: "网络异常,请检查网络后重试" });
        }
    }, [game]);

    useEffect(() => {
        const r = game.result;
        if (!r) return;
        if (!audioPlayedRef.current) {
            audioPlayedRef.current = true;
            if (r.win) HLGX_Audio.win(); else HLGX_Audio.lose();
        }
        if (submittedRef.current) return;
        submittedRef.current = true;
        stopTimer();
        void submitScore(elapsedRef.current);
    }, [game, game.result, stopTimer, submitScore]);

    /* ---- 再来一局 / 换难度(v2.2.7: 不再弹昵称窗, 沿用已记住昵称) ---- */
    const restart = (m?: Mode) => {
        if (m) game.applyMode(m);
        game.newGame();
        startTimer();
        setResultInfo(null);
        submittedRef.current = false;
        audioPlayedRef.current = false;
        setNameTip("");
        setHeaderName(playerNameRef.current ?? name);   // v2.3.6: 同步局内输入框
        setName(playerNameRef.current ?? name);
    };

    /* ---- 渲染 ---- */
    const toolLeft = (k: keyof typeof game.toolUsed) => TOOL_LIMIT - game.toolUsed[k];
    const trayHasTriple = game.canEliminate();

    /* 昵称字数(按码点计, 与后端一致)与违禁字实时检测 */
    const nameCount = [...name].length;
    const nameTooLong = nameCount > 10;
    const nameBad = name.length > 0 && hasBadWord(name);

    return (
        <div className="mx-auto min-h-dvh w-full max-w-2xl px-3 pb-10 pt-3">
            {/* 顶栏: 返回大厅 / 标题 / 静音+重开(v2.3.10: 标题独占一行, 玩法/昵称移到下方行, 移动端不再挤压成竖排 —— 与英了个语同构) */}
            <header className="mb-2 flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to="/">← 返回大厅</Link>
                </Button>
                <h1 className="flex-1 whitespace-nowrap text-center text-lg font-extrabold">化了个学</h1>
                <div className="flex shrink-0 items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMuted(!muted); HLGX_Audio.setMuted(!muted); }} aria-label="静音开关">
                                {muted ? "🔇" : "🔊"}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{muted ? "已静音" : "音效"}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => restart()} aria-label="重新开始">⟳</Button>
                        </TooltipTrigger>
                        <TooltipContent>重新开始</TooltipContent>
                    </Tooltip>
                </div>
            </header>

            {/* 难度切换 + 玩法入口(与英了个语同构: 玩法在难度行右侧) */}
            <div className="mb-2 flex items-center gap-2">
                <div className="flex flex-1 justify-center gap-1 rounded-full bg-muted p-1">
                    {MODE_TABS.map(({ mode, label }) => (
                        <button
                            key={mode}
                            onClick={() => restart(mode)}
                            className={cn(
                                "flex-1 rounded-full px-2 py-1.5 text-sm font-semibold transition",
                                game.mode === mode
                                    ? "bg-card text-foreground shadow"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRulesOpen(true)} className="shrink-0">
                    玩法
                </Button>
            </div>

            {/* 昵称行: 输入 + 二次确认 + 状态提示(独占一行, 窄屏自动换行) */}
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1">
                    <input
                        value={headerName}
                        maxLength={10}
                        placeholder="昵称"
                        onChange={(e) => commitHeaderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") requestNameConfirm(); }}
                        className="w-24 rounded-lg border bg-card px-2 py-1 text-sm outline-none focus:border-primary"
                        aria-label="当前昵称,点击直接修改"
                        title="当前昵称,修改后需二次确认并重开本局"
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={requestNameConfirm} aria-label="确认修改昵称">✓</Button>
                </div>
                {headerNameTip && (
                    <span className="text-xs font-semibold text-destructive">{headerNameTip}</span>
                )}
                {!rankActive && !headerNameTip && (
                    <span className="text-[10px] font-semibold text-muted-foreground" title="未填写昵称或勾选了「不参与排行榜」,本局成绩不上榜;输入昵称即可恢复">
                        未参与排行
                    </span>
                )}
            </div>

            {/* 状态栏: 平台 / 血量 / 计时 / 剩余 */}
            <div className="mb-3 flex items-center justify-center gap-4 text-sm">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground" title="榜单按平台分开,成绩只与本平台比较">
                    {PLATFORM_LABEL[platform]}
                </span>
                <span className="flex items-center gap-1" aria-label={`血量 ${Math.max(0, game.hp)}`}>
                    {[0, 1, 2].map((i) => (
                        <span key={i} aria-hidden>{i < Math.max(0, game.hp) ? "❤️" : "🤍"}</span>
                    ))}
                </span>
                <span className="tabular-nums font-mono">用时 {fmtTime(elapsed)}</span>
                <span className="text-muted-foreground">剩余 {game.remaining}</span>
            </div>

            {/* 棋盘(小屏自动缩放) */}
            <div ref={boardRef} className="relative mx-auto w-full" style={{ height: game.boardH * scale }}>
                <div
                    className="absolute left-1/2 top-0"
                    style={{
                        width: game.boardW,
                        height: game.boardH,
                        transform: `translateX(-50%) scale(${scale})`,
                        transformOrigin: "top center",
                    }}
                >
                    {game.tiles.map((t) => (
                        <BoardTile
                            key={t.id}
                            tile={t}
                            zIndex={10 + (game.layers.length - 1 - t.L)}
                            onClick={() => onPick(t)}
                            shake={shakeId === t.id}
                        />
                    ))}
                </div>
            </div>

            {/* 手牌槽 */}
            <div className="mt-4 rounded-2xl border bg-card p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        手牌槽 {game.tray.length}/{game.trayMax}
                    </span>
                    {trayHasTriple ? (
                        <span className="font-semibold text-success">凑够 3 张同类即可消除</span>
                    ) : (
                        <span>点击手牌选中,3 张同类点「消除选中」</span>
                    )}
                </div>
                {/* 手牌槽两行排布(填满第一行再排第二行) */}
                <div
                    ref={trayRef}
                    className="mx-auto flex flex-wrap items-start gap-1.5"
                    style={{ width: cellSize * Math.ceil(game.trayMax / 2) + 6 * (Math.ceil(game.trayMax / 2) - 1) }}
                >
                    {Array.from({ length: game.trayMax }).map((_, i) => {
                        const t = game.tray[i];
                        return t ? (
                            <TrayCell
                                key={t.id}
                                tile={t}
                                size={cellSize}
                                selected={game.selected.includes(t)}
                                onClick={() => { if (!game.gameOver && !game.win) game.toggleSelect(t); }}
                            />
                        ) : (
                            <div
                                key={"e" + i}
                                className="shrink-0 rounded-lg border border-dashed border-muted-foreground/25"
                                style={{ width: cellSize, height: cellSize }}
                            />
                        );
                    })}
                </div>
                <Button
                    className="mt-3 w-full"
                    size="lg"
                    disabled={game.selected.length !== 3 || game.gameOver || game.win}
                    onClick={onClear}
                >
                    {game.selected.length === 3 ? `消除选中(3)` : "消除选中"}
                </Button>
            </div>

            {/* 道具栏(带人性化提示) */}
            <div className="mt-3 grid grid-cols-3 gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="secondary" disabled={toolLeft("undo") <= 0} onClick={() => useTool("undo")}>
                            撤回({toolLeft("undo")})
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>把槽内最后一张卡放回棋盘(原位被占会自动挪到空位)</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="secondary" disabled={game.selected.length === 0 || toolLeft("out") <= 0} onClick={() => useTool("out")}>
                            移出({toolLeft("out")})
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>移除当前选中的至多 3 张卡(无伤消除,不扣血)</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="secondary" disabled={toolLeft("shuffle") <= 0} onClick={() => useTool("shuffle")}>
                            🔀 洗牌({toolLeft("shuffle")})
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>打乱场上剩余卡牌,死局救急</TooltipContent>
                </Tooltip>
            </div>

            <footer className="mt-8 text-center text-xs text-muted-foreground">化了个学 · {APP_VERSION}(仅供个人娱乐)</footer>

            {/* ---------- 弹窗 ---------- */}

            {/* 新手引导(首次进入, ✕/跳过/完成 均视为已看) */}
            <Dialog open={tutorialOpen} onOpenChange={(o) => { if (!o) closeTutorial(); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {TUTORIAL_STEPS[tutorialStep].icon} {TUTORIAL_STEPS[tutorialStep].title}
                        </DialogTitle>
                        <DialogDescription>
                            新手引导 {tutorialStep + 1}/{TUTORIAL_STEPS.length}
                        </DialogDescription>
                    </DialogHeader>
                    <p className="text-sm leading-relaxed text-muted-foreground">{TUTORIAL_STEPS[tutorialStep].body}</p>
                    <div className="flex justify-center gap-1.5">
                        {TUTORIAL_STEPS.map((_, i) => (
                            <span key={i} className={cn("h-1.5 w-4 rounded-full", i === tutorialStep ? "bg-primary" : "bg-muted-foreground/25")} />
                        ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                            <Checkbox
                                checked={tutorialSkipAlways}
                                onCheckedChange={(v) => setTutorialSkipAlways(v === true)}
                            />
                            不再显示
                        </label>
                        <div className="flex gap-2">
                            {tutorialStep > 0 && (
                                <Button variant="ghost" onClick={() => setTutorialStep(tutorialStep - 1)}>上一步</Button>
                            )}
                            {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
                                <>
                                    <Button variant="ghost" onClick={closeTutorial}>跳过</Button>
                                    <Button onClick={() => setTutorialStep(tutorialStep + 1)}>下一步</Button>
                                </>
                            ) : (
                                <Button onClick={closeTutorial}>开始游戏</Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 昵称窗(✕ = 首次未开局则返回大厅; 更换昵称则仅关闭, 保留当前局) */}
            <Dialog open={nameOpen} onOpenChange={(o) => { if (!o) { if (nameDialogMode === "change") setNameOpen(false); else navigate("/"); } }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{nameDialogMode === "change" ? "更换昵称" : "开始游戏"}</DialogTitle>
                        <DialogDescription>{nameDialogMode === "change" ? "更换后将用新昵称继续游戏" : "设置昵称后成绩将计入排行榜"}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="hlgx-name">昵称</Label>
                            <Input
                                id="hlgx-name"
                                value={name}
                                placeholder="输入昵称(最多 10 个字)"
                                autoFocus
                                onChange={(e) => { setName(e.target.value); setNameTip(""); }}
                                onKeyDown={(e) => { if (e.key === "Enter" && !nameTooLong && !nameBad) confirmName(); }}
                            />
                            {/* 字数计数 + 违禁字即时提示 */}
                            <div className="flex items-center justify-between text-xs">
                                <span className={nameBad || nameTooLong ? "font-semibold text-destructive" : "text-muted-foreground"}>
                                    {nameBad
                                        ? "⚠ 昵称包含违禁词,请更换"
                                        : nameTooLong
                                            ? "⚠ 昵称最多 10 个字"
                                            : "昵称长度"}
                                </span>
                                <span className={cn("tabular-nums", nameTooLong ? "font-semibold text-destructive" : "text-muted-foreground")}>
                                    {nameCount}/10
                                </span>
                            </div>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                            <Checkbox checked={skipRank} onCheckedChange={(v) => setSkipRank(v === true)} />
                            不参与排行榜
                        </label>
                        {nameTip && <p className="text-xs text-destructive">{nameTip}</p>}
                    </div>
                    <div className="flex justify-between gap-2">
                        <Button variant="ghost" onClick={() => { if (nameDialogMode === "change") setNameOpen(false); else navigate("/"); }}>
                            {nameDialogMode === "change" ? "取消" : "← 返回大厅"}
                        </Button>
                        <Button onClick={confirmName} disabled={nameTooLong || nameBad}>
                            {nameDialogMode === "change" ? "确认修改" : "确认开始"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 结算弹窗(✕ = 返回大厅) */}
            <Dialog open={resultInfo !== null} onOpenChange={(o) => { if (!o) navigate("/"); }}>
                {resultInfo && (
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-xl">
                                {resultInfo.win ? "通关啦!" : "挑战失败"}
                            </DialogTitle>
                            <DialogDescription>
                                {resultInfo.win
                                    ? "棋盘已清空且无三消组合,剩余手牌自动消除!"
                                    : "手牌槽已满且无 3 张同类可消,血量耗尽!"}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-xl bg-muted p-3 text-center text-sm leading-relaxed">
                            <p>
                                剩余卡牌 {resultInfo.remain} 块 · 用时 {fmtTime(resultInfo.time)} · 技能 {resultInfo.tools} 次
                            </p>
                            {resultInfo.failed ? (
                                <p className="mt-1.5 text-xs text-destructive">
                                    成绩提交失败: {resultInfo.failMsg ?? "未知原因"}。点下方「重试提交」再试一次
                                </p>
                            ) : resultInfo.skipped ? (
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                    未填写昵称或勾选了「不参与排行榜」,本局成绩未上榜
                                </p>
                            ) : (
                                resultInfo.surpassed !== null && (
                                    <p className="mt-1.5 font-semibold text-primary">超越 {resultInfo.surpassed} 名玩家</p>
                                )
                            )}
                        </div>
                        <div className="flex justify-between gap-2">
                            <Button variant="ghost" onClick={() => navigate("/")}>← 返回大厅</Button>
                            <div className="flex gap-2">
                                {resultInfo.failed && (
                                    <Button variant="secondary" onClick={() => void submitScore(resultInfo.time)}>重试提交</Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => { setResultInfo(null); nameChangeRestartRef.current = true; openNameChange(); }}
                                >
                                    更换昵称
                                </Button>
                                <Button onClick={() => restart()}>再来一局</Button>
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            {/* 玩法介绍(随时可回看) */}
            <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>玩法介绍</DialogTitle>
                        <DialogDescription>三分钟看懂怎么玩,新手不迷路</DialogDescription>
                    </DialogHeader>
                    <GameRules />
                </DialogContent>
            </Dialog>

            {/* 改名二次确认(确认后保存并重开本局) */}
            <NameConfirmDialog
                open={nameConfirmOpen}
                pending={headerName}
                current={playerNameRef.current ?? readStoredName() ?? ""}
                onOpenChange={setNameConfirmOpen}
                onConfirm={confirmHeaderName}
            />
        </div>
    );
}
