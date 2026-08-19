/*
 * 错了个字 · 手写板组件
 * ===================
 * 类似「你画我猜」的画框: 一个正方形 Canvas, 玩家用鼠标/手指直接书写,
 * 不经过键盘 —— 考察的是「正确字形」, 而不是「认识这个拼音对应的字」。
 *
 * v1.0.1 识别算法升级(手写输入法式):
 *   - 归一化: 墨迹包围盒缩放填满标准网格(写小/写偏都容忍)
 *   - 膨胀: 抹平笔画粗细/连笔差异, 仅核对字形覆盖, 不再因 SVG/笔画判定
 *   - 书写时锁定页面滚动(overflow hidden), 避免手指书写时页面位移
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    bitmapFromImageData, dilate, matchInk, normalizeBitmap,
    GRID, TEMPLATE_DILATE_R, setLastDebug, getLastDebug, bitmapToAscii,
    type Stroke, type MatchResult,
} from "./handwriting";

interface HandwritingPadProps {
    /** 目标字(用于渲染标准字形对比) */
    target: string;
    /** 网格尺寸(像素), 画框显示为方形 */
    size?: number;
    onResult?: (r: MatchResult) => void;
}

const REASON_TEXT: Record<MatchResult["reason"], string> = {
    ok: "✓ 写对了!",
    empty: "还没有书写内容,请先写字",
    too_faint: "笔画太少 / 写得不完整,再试试",
    too_messy: "太潦草了,规范书写才能得分",
    wrong_char: "写的字与目标不一致",
};

export function HandwritingPad({ target, size = 280, onResult }: HandwritingPadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [writing, setWriting] = useState(false);
    const [result, setResult] = useState<MatchResult | null>(null);

    // 重画: 背景 + 已有笔画
    useEffect(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, size, size);
        // 淡色田字格背景(类似练字本)
        ctx.strokeStyle = "rgba(100,116,139,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(1, 1, size - 2, size - 2);
        ctx.beginPath();
        ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
        ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
        ctx.stroke();
        // 画笔画
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const s of strokes) {
            if (s.points.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(s.points[0].x, s.points[0].y);
            for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
            ctx.stroke();
        }
    }, [strokes, size]);

    const pos = (e: React.PointerEvent) => {
        const cv = canvasRef.current!;
        const rect = cv.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * size,
            y: ((e.clientY - rect.top) / rect.height) * size,
        };
    };

    /* 书写时锁定页面滚动(防止手指书写时页面位移/抖动), 抬起后恢复 */
    const lockScroll = () => {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
    };
    const unlockScroll = () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
    };
    useEffect(() => () => unlockScroll(), []);   // 组件卸载时确保恢复

    /* 调试快照: 控制台执行 __clgzSnapshot() 查看最近一次判定的位图/详情 */
    useEffect(() => {
        const w = window as unknown as Record<string, unknown>;
        w.__clgzSnapshot = () => {
            const d = getLastDebug();
            if (!d) { console.log("[clgz] 暂无判定数据,请先提交一次判定"); return; }
            console.log(`[clgz] 目标字「${d.target}」 判定: ${d.result.pass ? "通过 ✓" : "未通过 ✗"} (cover=${d.result.cover.toFixed(2)}, stray=${d.result.stray.toFixed(2)}, reason=${d.result.reason})`);
            console.log("[clgz] 标准字形(归一化后):\n" + bitmapToAscii(d.tpl, d.size));
            console.log("[clgz] 你的墨迹(归一化后):\n" + bitmapToAscii(d.ink, d.size));
            return d;
        };
        return () => { delete w.__clgzSnapshot; };
    }, []);

    const onDown = (e: React.PointerEvent) => {
        e.preventDefault();
        lockScroll();
        setWriting(true);
        setResult(null);
        onResult?.({ cover: 0, stray: 1, score: -1, pass: false, reason: "empty" });
        const p = pos(e);
        setStrokes((s) => [...s, { points: [p] }]);
    };
    const onMove = (e: React.PointerEvent) => {
        if (!writing) return;
        e.preventDefault();
        const p = pos(e);
        setStrokes((s) => {
            const last = s[s.length - 1];
            if (!last) return s;
            return [...s.slice(0, -1), { points: [...last.points, p] }];
        });
    };
    const onUp = () => {
        setWriting(false);
        unlockScroll();
    };

    /** 提交判定: 墨迹(归一化+膨胀) vs 标准字形(归一化), 仅字形覆盖比对 */
    const submit = () => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext("2d");
        if (!ctx) return;
        // 1) 墨迹位图(原始画布坐标)
        const inkImg = ctx.getImageData(0, 0, size, size);
        const inkRaw = bitmapFromImageData(inkImg.data, size);
        // 2) 标准字形位图: 用系统字体渲染到高分辨率离屏 canvas
        const tplSide = GRID * 2;
        const tpl = document.createElement("canvas");
        tpl.width = tpl.height = tplSide;
        const tctx = tpl.getContext("2d")!;
        tctx.clearRect(0, 0, tplSide, tplSide);
        tctx.fillStyle = "#000";
        tctx.font = `${Math.floor(tplSide * 0.66)}px "KaiTi","STKaiti","楷体","SimSun","宋体",serif`;
        tctx.textAlign = "center";
        tctx.textBaseline = "middle";
        tctx.fillText(target, tplSide / 2, tplSide / 2 + tplSide * 0.03);
        const tplImg = tctx.getImageData(0, 0, tplSide, tplSide);
        const tplRaw = bitmapFromImageData(tplImg.data, tplSide);
        // 3) 归一化: 墨迹与模板字形都填满标准网格(同语义比较)
        const inkNorm = normalizeBitmap(inkRaw, size, GRID);
        const tplNorm = normalizeBitmap(tplRaw, tplSide, GRID);
        // 4) 对称膨胀: 墨迹膨胀(抹平笔画粗细) + 模板也膨胀(避免手写粗笔画
        //    边缘落在细印刷字形外导致 stray 超标, 仅保留字形结构比对)
        const inkDil = dilate(inkNorm, GRID);
        const tplDil = dilate(tplNorm, GRID, TEMPLATE_DILATE_R);
        const r = matchInk(tplDil, inkDil, GRID);
        setLastDebug({ target, size: GRID, ink: inkNorm, tpl: tplNorm, result: r });
        setResult(r);
        onResult?.(r);
    };

    const clear = () => {
        setStrokes([]);
        setResult(null);
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={size}
                    height={size}
                    className="touch-none rounded-xl border-2 border-muted-foreground/40 bg-card shadow-sm"
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    onPointerLeave={onUp}
                    style={{ width: "min(78vw, 320px)", height: "min(78vw, 320px)" }}
                    aria-label="手写输入区: 用鼠标或手指在这里书写目标字"
                />
                {strokes.length === 0 && !result && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground/60">
                        在这里书写「{target}」
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clear} disabled={strokes.length === 0}>
                    清除重写
                </Button>
                <Button size="sm" onClick={submit} disabled={strokes.length === 0}>
                    提交判定
                </Button>
            </div>

            {result && (
                <p
                    className={
                        result.pass
                            ? "text-sm font-semibold text-success"
                            : "text-sm font-semibold text-destructive"
                    }
                >
                    {REASON_TEXT[result.reason]}
                    {!result.pass && result.reason !== "empty" && (
                        <span className="ml-1 font-normal text-muted-foreground">
                            (字形重合度 {result.cover.toFixed(2)})
                        </span>
                    )}
                </p>
            )}
        </div>
    );
}
