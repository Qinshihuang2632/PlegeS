/*
 * 错了个字 · 游戏页 (/clgz)
 * ========================
 * 玩法: 局内选择科目(可单选/多选) → 随机抽取该科目范围内的字 →
 *       玩家在画框内手写该字(不经过键盘) → 字形匹配判定对错。
 * 计分: 每字 1 分; 手写正确(与标准字形匹配)得 1 分, 潦草/写错不得分。
 * 榜单: 独立 API /clgz/api/rank, 排序 得分↓ → 用时↑ → 提交早者优先。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CLGZ_SUBJECTS, charsOfSubjects, type ClgzChar } from "./chars";
import { HandwritingPad } from "./HandwritingPad";
import { ClgzRules } from "./ClgzRules";
import { detectPlatform } from "@/game/platform";
import { CLGZ_VERSION } from "./version";

const ROUNDS = 8;   // 每局题数

interface ResultInfo {
    score: number;
    time: number;
    surpassed: number | null;
    failed: boolean;
    failMsg?: string;
}

export function ClgzPage() {
    const [subjects, setSubjects] = useState<string[]>(["chem"]);
    const [phase, setPhase] = useState<"select" | "play" | "result">("select");
    const [queue, setQueue] = useState<ClgzChar[]>([]);
    const [idx, setIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [wrong, setWrong] = useState<string[]>([]);
    const [result, setResult] = useState<ResultInfo | null>(null);
    const [rulesOpen, setRulesOpen] = useState(false);
    const startAtRef = useRef(0);
    const submittedRef = useRef(false);
    const [elapsed, setElapsed] = useState(0);

    const cur = queue[idx];

    // 随机抽取 ROUNDS 个字(打乱顺序)
    const startGame = () => {
        const pool = charsOfSubjects(subjects);
        if (pool.length === 0) return;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        setQueue(shuffled.slice(0, Math.min(ROUNDS, shuffled.length)));
        setIdx(0);
        setScore(0);
        setWrong([]);
        setResult(null);
        submittedRef.current = false;
        startAtRef.current = Date.now();
        setElapsed(0);
        setPhase("play");
    };

    // 计时
    useEffect(() => {
        if (phase !== "play") return;
        const t = setInterval(() => setElapsed(Math.floor((Date.now() - startAtRef.current) / 1000)), 500);
        return () => clearInterval(t);
    }, [phase]);

    const next = (got: boolean) => {
        if (got) setScore((s) => s + 1);
        else setWrong((w) => [...w, cur.ch]);
        if (idx + 1 >= queue.length) finish();
        else setIdx((i) => i + 1);
    };

    const finish = async () => {
        const time = Math.floor((Date.now() - startAtRef.current) / 1000);
        setElapsed(time);
        setPhase("result");
        const finalScore = score + (idx + 1 >= queue.length ? 0 : 0);   // 分数已累计
        setScore(finalScore);
        const name = localStorage.getItem("hlgx_name")?.trim() || "";
        if (!name) {
            setResult({ score: finalScore, time, surpassed: null, failed: false });
            return;
        }
        try {
            const res = await fetch("/clgz/api/rank", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: "all",
                    name,
                    score: finalScore,
                    time,
                    version: CLGZ_VERSION,
                    platform: detectPlatform(),
                }),
            });
            const d = await res.json().catch(() => null);
            setResult({
                score: finalScore, time,
                surpassed: res.ok && typeof d?.surpassed === "number" ? d.surpassed : null,
                failed: !res.ok,
                failMsg: !res.ok ? (d?.msg ?? `提交失败(HTTP ${res.status})`) : undefined,
            });
        } catch {
            setResult({ score: finalScore, time, surpassed: null, failed: true, failMsg: "网络异常,请检查网络后重试" });
        }
    };

    const total = useMemo(() => charsOfSubjects(subjects).length, [subjects]);

    return (
        <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-8 pt-6 sm:pt-10">
            <header className="mb-6 flex items-center justify-between">
                <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← 返回大厅</Link>
                <h1 className="text-xl font-bold">错了个字</h1>
                <div className="w-16 text-right" aria-hidden />
            </header>

            {phase === "select" && (
                <div className="space-y-5">
                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <h2 className="mb-1 text-lg font-bold">选择考察科目</h2>
                        <p className="mb-4 text-sm text-muted-foreground">可单选或多选,所选科目共 {total} 字,每局随机抽 {Math.min(ROUNDS, total)} 字。</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {CLGZ_SUBJECTS.map((s) => {
                                const on = subjects.includes(s.key);
                                return (
                                    <button
                                        key={s.key}
                                        onClick={() => setSubjects((prev) => on ? prev.filter((k) => k !== s.key) : [...prev, s.key])}
                                        className={cn(
                                            "rounded-xl border p-3 text-left transition",
                                            on ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/50",
                                        )}
                                    >
                                        <p className="font-semibold">{s.label}<span className="ml-2 text-xs font-normal text-muted-foreground">{s.chars.length} 字</span></p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
                                    </button>
                                );
                            })}
                        </div>
                        <Button className="mt-5 w-full" size="lg" onClick={startGame} disabled={subjects.length === 0}>
                            开始手写({Math.min(ROUNDS, total)} 题)
                        </Button>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setRulesOpen(true)}>玩法介绍</Button>
                        <Button asChild variant="ghost" size="sm"><Link to="/hlgx/rank?game=clgz">查看排行榜</Link></Button>
                    </div>
                </div>
            )}

            {phase === "play" && cur && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2 text-sm">
                        <span>第 {idx + 1} / {queue.length} 题</span>
                        <span>得分 {score}</span>
                        <span>⏱ {elapsed}s</span>
                    </div>
                    <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
                        <p className="text-sm text-muted-foreground">请写出「{cur.word}」中的这个字</p>
                        <p className="my-2 text-6xl font-bold tracking-widest text-primary">{cur.ch}</p>
                        <p className="text-xs text-muted-foreground">在下方画框内手写(请写规范,潦草不得分)</p>
                    </div>
                    <HandwritingPad target={cur.ch} onResult={(r) => { if (r.pass) setTimeout(() => next(true), 300); }} />
                    <Button variant="outline" className="w-full" onClick={() => next(false)}>
                        认不出/写不出,下一题
                    </Button>
                </div>
            )}

            {phase === "result" && result && (
                <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                    <p className="text-lg font-bold">本局完成</p>
                    <p className="mt-2 text-3xl font-extrabold text-primary">{result.score} / {queue.length} 题</p>
                    <p className="mt-1 text-sm text-muted-foreground">用时 {result.time}s · 手写正确 {result.score} 字</p>
                    {wrong.length > 0 && (
                        <div className="mx-auto mt-3 max-w-sm rounded-lg bg-muted/40 p-3 text-left">
                            <p className="text-xs font-semibold text-muted-foreground">写错/未写出的字:</p>
                            <p className="mt-1 text-sm">{wrong.map((w) => `「${w}」`).join(" ")}</p>
                        </div>
                    )}
                    <div className="mt-3 text-sm">
                        {result.failed ? (
                            <p className="text-destructive">成绩提交失败: {result.failMsg ?? "未知原因"}</p>
                        ) : result.surpassed !== null ? (
                            <p className="font-semibold text-primary">超越 {result.surpassed} 名玩家</p>
                        ) : (
                            <p className="text-muted-foreground">未填写昵称,成绩未上榜</p>
                        )}
                    </div>
                    <div className="mt-5 flex justify-center gap-2">
                        <Button asChild variant="outline"><Link to="/hlgx/rank?game=clgz">查看排行榜</Link></Button>
                        <Button onClick={() => setPhase("select")}>再来一局</Button>
                    </div>
                </div>
            )}

            <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>玩法介绍</DialogTitle>
                        <DialogDescription>三分钟看懂怎么玩,新手不迷路</DialogDescription>
                    </DialogHeader>
                    <ClgzRules />
                </DialogContent>
            </Dialog>

            <footer className="mt-8 text-center text-xs text-muted-foreground">错了个字 · {CLGZ_VERSION}(仅供个人娱乐)</footer>
        </div>
    );
}
