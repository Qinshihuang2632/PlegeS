/*
 * p了个s · 管理后台 · 错了个字数据采集与识别测试 (src/admin/pages/ClgzDataPage.tsx)
 * ================================================================================
 * 两个标签页(clgz_ml_plan.md M1/M5 落地):
 *   ①采集笔迹: 与游戏内同款手写框(HistoryingPad 复用), 逐字书写题库 163 字并标注五分类,
 *     样本存浏览器 IndexedDB, 导出 JSONL 存入仓库 clgz-character-data/samples/(gitignore, 不入 git);
 *     设备类型按登录设备自动判定(手游=手指/端游=鼠标, 可手动改触控笔), 并记录书写人代号。
 *   ②识别测试: 手写题库任一字 → 调 /clgz/api/ai(当前为腾讯 OCR) → 记录识别文本与是否命中,
 *     输出逐条日志与命中率统计(后续本地模型 ml-v1 上线后同一页面对比测试)。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Eraser, Play, Save, SkipForward, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { detectPlatform } from "@/game/platform";
import { HandwritingPad } from "@/game3/HandwritingPad";
import { judgeWithAi } from "@/game/clgzAi";
import {
    BANK_CHARS, CLGZ_LABELS, allSamples, clearSamples, countByChar, exportJl,
    newUid, parseJl, putSample, putSamples, totalCount,
    type ClgzDevice, type ClgzLabel, type ClgzSample,
} from "../clgzDataStore";

const WRITER_KEY = "clgz_ml_writer";

type Tab = "collect" | "test";

export function ClgzDataPage() {
    const [tab, setTab] = useState<Tab>("collect");
    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <header>
                <h1 className="text-xl font-extrabold">错了个字 · 数据采集与识别测试</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    攒训练数据(样本存本机, 导出后放入仓库 clgz-character-data/samples/)+ 测试当前识别对题库字的准确率
                </p>
            </header>
            <div className="flex gap-1 rounded-full bg-muted p-1">
                {([
                    { key: "collect", label: "采集笔迹" },
                    { key: "test", label: "识别测试" },
                ] as const).map(({ key, label }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={cn("flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                            tab === key ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                        {label}
                    </button>
                ))}
            </div>
            {tab === "collect" ? <CollectTab /> : <TestTab />}
        </div>
    );
}

/* 题库字格: 每字一格 + 样本数角标(collect 显示数量配色, test 仅选择) */
function CharGrid({ counts, selected, onSelect }: {
    counts: Map<string, number> | null;
    selected?: string;
    onSelect: (ch: string, word: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5 rounded-2xl border bg-card p-3 shadow-sm">
            {BANK_CHARS.map(({ ch, word }) => {
                const n = counts?.get(ch) ?? 0;
                return (
                    <button key={ch} title={word} onClick={() => onSelect(ch, word)}
                        className={cn(
                            "relative h-11 w-11 rounded-lg border text-xl font-bold transition",
                            selected === ch ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/60",
                        )}>
                        {ch}
                        {counts && (
                            <span className={cn(
                                "absolute -right-1 -top-1 min-w-4 rounded-full px-1 text-[9px] font-bold leading-4 text-white",
                                n === 0 ? "bg-destructive" : n < 10 ? "bg-amber-500" : "bg-success",
                            )}>{n}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function CollectTab() {
    const [writer, setWriter] = useState(() => localStorage.getItem(WRITER_KEY)?.trim() || "ps");
    const [device, setDevice] = useState<ClgzDevice>(() => detectPlatform() === "mobile" ? "finger" : "mouse");
    const [label, setLabel] = useState<ClgzLabel>("correct");
    const [cur, setCur] = useState(() => BANK_CHARS[0]);
    const [counts, setCounts] = useState<Map<string, number> | null>(null);
    const [total, setTotal] = useState(0);
    const [padKey, setPadKey] = useState(0);
    const [hasInk, setHasInk] = useState(false);
    const strokesRef = useRef<HandwritingPadStroke[]>([]);
    const [confirmClear, setConfirmClear] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const refreshCounts = useCallback(async () => {
        setCounts(await countByChar());
        setTotal(await totalCount());
    }, []);
    useEffect(() => { void refreshCounts(); }, [refreshCounts]);

    const jumpToLeast = (exclude?: string) => {
        if (!counts) return;
        let best: { ch: string; word: string } | null = null;
        let bestN = Infinity;
        for (const b of BANK_CHARS) {
            if (b.ch === exclude) continue;
            const n = counts.get(b.ch) ?? 0;
            if (n < bestN) { bestN = n; best = b; }
        }
        if (best) setCur(best);
    };

    const save = (advance: boolean) => {
        const strokes = strokesRef.current;
        if (!hasInk || strokes.length === 0) { toast.warning("请先在画框内书写"); return; }
        const w = writer.trim() || "unknown";
        localStorage.setItem(WRITER_KEY, w);
        const sample: ClgzSample = {
            uid: newUid({ char: cur.ch, label, writer: w, device }),
            char: cur.ch, word: cur.word, label, device, writer: w,
            canvasSize: 280, strokes, savedAt: new Date().toISOString(),
        };
        void putSample(sample).then(async () => {
            await refreshCounts();
            strokesRef.current = [];
            setHasInk(false);
            setPadKey((k) => k + 1);   // 重挂载清空画框
            if (advance) jumpToLeast(cur.ch);
            toast.success(`已保存「${cur.ch}」· ${CLGZ_LABELS.find((l) => l.key === label)?.zh}`);
        }).catch(() => toast.error("保存失败(IndexedDB 不可用?)"));
    };

    const doExport = async () => {
        const list = await allSamples();
        if (list.length === 0) { toast.warning("本地暂无样本"); return; }
        exportJl(list);
        toast.success(`已导出 ${list.length} 条 —— 请把下载的文件存入 clgz-character-data/samples/`);
    };

    const doImport = async (file: File) => {
        const text = await file.text();
        const { samples, bad } = parseJl(text);
        if (samples.length === 0) { toast.error("文件中没有合法样本"); return; }
        const n = await putSamples(samples);
        await refreshCounts();
        toast.success(`导入 ${n} 条${bad ? `,跳过坏行 ${bad}` : ""}(同 uid 覆盖, 不产生重复)`);
    };

    const doClear = async () => {
        await clearSamples();
        setConfirmClear(false);
        await refreshCounts();
        toast.success("本地样本库已清空(请确认已导出存档)");
    };

    return (
        <div className="space-y-4">
            {/* 元信息: 书写人 / 设备 / 标签 */}
            <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-3">
                <div className="space-y-1.5">
                    <Label htmlFor="ml-writer">书写人代号(按书写人划分训练/测试集)</Label>
                    <Input id="ml-writer" value={writer} maxLength={12} onChange={(e) => setWriter(e.target.value)} placeholder="ps" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="ml-device">设备(按登录设备自动判定)</Label>
                    <select id="ml-device" value={device} onChange={(e) => setDevice(e.target.value as ClgzDevice)}
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                        <option value="finger">手指(手机/平板触屏)</option>
                        <option value="stylus">触控笔</option>
                        <option value="mouse">鼠标(电脑)</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                        当前登录设备判定为{detectPlatform() === "mobile" ? "手游(触屏)" : "端游(键鼠)"}
                    </p>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="ml-label">样本标签</Label>
                    <select id="ml-label" value={label} onChange={(e) => setLabel(e.target.value as ClgzLabel)}
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                        {CLGZ_LABELS.map((l) => <option key={l.key} value={l.key}>{l.zh} —— {l.hint}</option>)}
                    </select>
                </div>
            </div>

            {/* 当前字 + 画框 */}
            <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">请用「{CLGZ_LABELS.find((l) => l.key === label)?.zh}」方式写这个字</p>
                <p className="my-1 text-5xl font-bold text-primary">{cur.ch}</p>
                <p className="mb-3 text-xs text-muted-foreground">语境: {cur.word}(已写 {counts?.get(cur.ch) ?? 0} 条)</p>
                <HandwritingPad
                    key={padKey}
                    target={cur.ch}
                    hideActions
                    onStrokesChange={(s) => { strokesRef.current = s; setHasInk(s.some((st) => st.points.length > 1)); }}
                />
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Button onClick={() => save(false)} disabled={!hasInk}><Save className="h-4 w-4" /> 保存本条</Button>
                    <Button variant="secondary" onClick={() => save(true)} disabled={!hasInk}>
                        <SkipForward className="h-4 w-4" /> 保存并跳到最少样本的字
                    </Button>
                    <Button variant="outline" onClick={() => { strokesRef.current = []; setHasInk(false); setPadKey((k) => k + 1); }} disabled={!hasInk}>
                        <Eraser className="h-4 w-4" /> 重写
                    </Button>
                </div>
            </div>

            {/* 库操作 */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4 shadow-sm">
                <span className="text-sm text-muted-foreground">本地样本库:<b className="text-foreground">{total}</b> 条 / 题库 {BANK_CHARS.length} 字</span>
                <div className="ml-auto flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void doExport()}><Download className="h-4 w-4" /> 导出 JSONL</Button>
                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> 导入 JSONL</Button>
                    <input ref={fileRef} type="file" accept=".jsonl,.json,.txt" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ""; }} />
                    {confirmClear ? (
                        <Button size="sm" variant="destructive" onClick={() => void doClear()}>确认清空?(再点一次)</Button>
                    ) : (
                        <Button size="sm" variant="ghost" onClick={() => setConfirmClear(true)}>清空本地库</Button>
                    )}
                </div>
            </div>

            {/* 题库字格 */}
            {counts === null ? (
                <div className="space-y-2"><Skeleton className="h-24 w-full" /></div>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">题库字格(角标=已存条数: 红 0 / 黄 &lt;10 / 绿 ≥10)</p>
                        <Button size="sm" variant="ghost" onClick={() => jumpToLeast()}>跳到最少样本的字</Button>
                    </div>
                    <CharGrid counts={counts} selected={cur.ch} onSelect={(ch, word) => setCur({ ch, word })} />
                </>
            )}
        </div>
    );
}

/* 识别测试: 手写 → /clgz/api/ai(当前=腾讯 OCR) → 识别文本/是否命中 + 命中率统计 */
interface TestRecord {
    target: string; ok: boolean; isTarget: boolean; recognized: string; msg: string; ms: number; at: string;
}

function TestTab() {
    const [target, setTarget] = useState(() => BANK_CHARS[0].ch);
    const [records, setRecords] = useState<TestRecord[]>([]);
    const [busy, setBusy] = useState(false);
    const [padKey, setPadKey] = useState(0);
    const b64Ref = useRef<string>("");

    const okCount = records.filter((r) => r.ok).length;
    const hitCount = records.filter((r) => r.ok && r.isTarget).length;
    const usable = useMemo(() => records.slice().reverse(), [records]);   // 最新在上

    const recognize = async (b64: string) => {
        setBusy(true);
        const t0 = performance.now();
        try {
            const d = await judgeWithAi(b64, target);
            setRecords((prev) => [...prev, {
                target, ok: d.ok === true, isTarget: d.isTarget === true,
                recognized: d.recognized ?? "", msg: d.msg ?? "", ms: Math.round(performance.now() - t0),
                at: new Date().toLocaleTimeString(),
            }]);
            setPadKey((k) => k + 1);   // 清空画框准备下一条
        } finally {
            setBusy(false);
        }
    };

    const exportReport = () => {
        const jl = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
        const blob = new Blob([jl], { type: "application/x-ndjson" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `clgz-ocr-test-${new Date().toISOString().slice(0, 10)}.jsonl`;
        a.click();
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
                <div className="mb-2 flex items-center justify-center gap-3">
                    <span className="text-sm text-muted-foreground">目标字:</span>
                    <Input value={target} maxLength={1}
                        onChange={(e) => setTarget(e.target.value.trim())}
                        className="h-12 w-16 text-center text-2xl font-bold" aria-label="目标字" />
                    <span className="text-xs text-muted-foreground">{BANK_CHARS.find((b) => b.ch === target)?.word ?? "(题库外, 也可测)"}</span>
                </div>
                <HandwritingPad
                    key={padKey}
                    target={target}
                    onImage={(b64) => { b64Ref.current = b64; void recognize(b64); }}
                />
                {busy && <p className="mt-2 text-center text-xs font-semibold text-muted-foreground" role="status">识别中…(与玩家同一接口, 每 IP 每分钟限 20 次)</p>}
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm text-sm">
                <span>已测 <b>{records.length}</b> 条</span>
                <span>识别成功 <b>{okCount}</b></span>
                <span>命中目标 <b className={okCount && hitCount / okCount >= 0.9 ? "text-success" : "text-destructive"}>{hitCount}</b></span>
                <span>命中率 <b>{okCount ? `${Math.round((hitCount / okCount) * 100)}%` : "—"}</b></span>
                <Button size="sm" variant="outline" className="ml-auto" onClick={exportReport} disabled={records.length === 0}>
                    <Download className="h-4 w-4" /> 导出报告
                </Button>
            </div>

            {usable.length > 0 && (
                <div className="space-y-1.5 rounded-2xl border bg-card p-4 shadow-sm">
                    <p className="mb-1 text-sm font-semibold">逐条记录(最新在上)</p>
                    {usable.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-sm">
                            <span className="w-8 text-center text-lg font-bold">{r.target}</span>
                            {r.ok ? (
                                r.isTarget
                                    ? <span className="font-semibold text-success">✓ 识别为「{r.recognized}」</span>
                                    : <span className="font-semibold text-destructive">✗ 识别为「{r.recognized || "(空)"}」</span>
                            ) : (
                                <span className="text-destructive">接口失败: {r.msg || "未知"}</span>
                            )}
                            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{r.ms}ms · {r.at}</span>
                        </div>
                    ))}
                </div>
            )}

            <CharGrid counts={null} selected={target} onSelect={(ch) => setTarget(ch)} />
            <p className="text-center text-xs text-muted-foreground">
                <Play className="mr-1 inline h-3 w-3" />写好后点画框下方「提交判定」即发起识别;同一目标字可多次书写观察稳定性
            </p>
        </div>
    );
}

/** 与 HandwritingPad 内部一致的笔迹类型(点序列) */
type HandwritingPadStroke = { points: { x: number; y: number }[] };
