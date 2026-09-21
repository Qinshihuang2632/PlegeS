/*
 * 错了个字 · 手写板组件
 * ===================
 * 类似「你画我猜」的画框: 一个正方形 Canvas, 玩家用鼠标/手指直接书写,
 * 不经过键盘 —— 考察的是「正确字形」, 而不是「认识这个拼音对应的字」。
 *
 * v1.1.4: 移除像素重合度判定(字形比对/潦草检测全部删除), 本组件只负责
 *   采集笔迹并导出卡面 PNG, 对错完全由 AI 手写识别判定(见 ClgzPage)。
 * 书写时锁定页面滚动(overflow hidden), 避免手指书写时页面位移(v1.0.1)。
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Stroke {
    points: { x: number; y: number }[];
}

interface HandwritingPadProps {
    /** 目标字(用于空画布占位提示) */
    target: string;
    /** 网格尺寸(像素), 画框显示为方形 */
    size?: number;
    /** 提交时导出卡面 PNG(base64, 白底 2 倍放大, 供 AI 判定) */
    onImage?: (base64: string) => void;
}

export function HandwritingPad({ target, size = 280, onImage }: HandwritingPadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [writing, setWriting] = useState(false);

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

    const onDown = (e: React.PointerEvent) => {
        e.preventDefault();
        lockScroll();
        setWriting(true);
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

    /** 提交: 导出「白底 + 放大 2 倍」的卡面 PNG(透明底/田字格会干扰腾讯 OCR,
     * 原图 280px 也偏小) —— 白底重绘并放大到 560px 再交给 AI 手写识别 */
    const submit = () => {
        const cv = canvasRef.current;
        if (!cv || !onImage) return;
        const out = document.createElement("canvas");
        out.width = out.height = size * 2;
        const octx = out.getContext("2d");
        if (!octx) return;
        octx.fillStyle = "#ffffff";
        octx.fillRect(0, 0, out.width, out.height);
        octx.drawImage(cv, 0, 0, out.width, out.height);
        onImage(out.toDataURL("image/png").split(",")[1] ?? "");
    };

    const clear = () => {
        setStrokes([]);
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
                {strokes.length === 0 && (
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
        </div>
    );
}
