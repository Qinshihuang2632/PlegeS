/*
 * 错了个字 · 手写匹配核心测试
 * 覆盖: 匹配判定(写对/写错/潦草/空白)、位图转换、笔画渲染
 */
import { describe, expect, it } from "vitest";
import {
    matchInk, renderStrokesToBitmap, renderTemplatePlaceholder,
    type Stroke,
} from "./handwriting";

const N = 64;

/** 模板: 中心 60% 区域(占位字形, 模拟标准字形) */
const tpl = renderTemplatePlaceholder(N);

/** 在中心区域画一个实心方块(模拟写对了) */
function centerBlock(): Stroke[] {
    const pts: { x: number; y: number }[] = [];
    // 从左上到右下横线密集覆盖中心
    for (let y = N * 0.3; y <= N * 0.7; y += 3) {
        pts.push({ x: N * 0.3, y });
        pts.push({ x: N * 0.7, y });
    }
    return [{ points: pts }];
}

/** 在左上角角落画小块(模拟写错位置/字不在框中) */
function cornerBlock(): Stroke[] {
    const pts: { x: number; y: number }[] = [];
    for (let y = 2; y <= 10; y += 2) {
        pts.push({ x: 2, y });
        pts.push({ x: 10, y });
    }
    return [{ points: pts }];
}

/** 乱画: 全部在模板外的四角涂抹 + 对角线(墨迹几乎不进模板) */
function messyStrokes(): Stroke[] {
    const corner = (cx: number, cy: number): Stroke => {
        const pts: { x: number; y: number }[] = [];
        for (let y = cy; y <= cy + 8; y += 2)
            for (let x = cx; x <= cx + 8; x += 2) pts.push({ x, y });
        return { points: pts };
    };
    return [
        corner(2, 2), corner(2, N - 10), corner(N - 10, 2), corner(N - 10, N - 10),
        { points: [{ x: 2, y: N / 2 }, { x: N - 2, y: N / 2 }] },
    ];
}

describe("matchInk 判定", () => {
    it("写对(墨迹覆盖模板中心) → 通过", () => {
        const ink = renderStrokesToBitmap(centerBlock(), N);
        const r = matchInk(tpl, ink, N);
        expect(r.pass).toBe(true);
        expect(r.reason).toBe("ok");
        expect(r.cover).toBeGreaterThan(0.5);
    });

    it("空白(无墨迹) → 不通过, reason=empty", () => {
        const ink = new Uint8Array(N * N);
        const r = matchInk(tpl, ink, N);
        expect(r.pass).toBe(false);
        expect(r.reason).toBe("empty");
    });

    it("写错位置(角落小点) → 不通过, reason=wrong_char", () => {
        const ink = renderStrokesToBitmap(cornerBlock(), N);
        const r = matchInk(tpl, ink, N);
        expect(r.pass).toBe(false);
        expect(r.reason).toBe("wrong_char");
        expect(r.cover).toBeLessThan(THRESHOLDS_FOR_TEST.minCover);
    });

    it("乱画(墨迹大量在模板外) → 不通过, reason=too_messy", () => {
        const ink = renderStrokesToBitmap(messyStrokes(), N);
        const r = matchInk(tpl, ink, N);
        expect(r.pass).toBe(false);
        expect(["too_messy", "wrong_char"]).toContain(r.reason);
        expect(r.stray).toBeGreaterThan(0.5);
    });

    it("覆盖一部分(半写) → 不通过, reason=too_faint", () => {
        // 只覆盖模板左半(cover 约 0.3~0.4, 未达 minCover)
        const ink = new Uint8Array(N * N);
        for (let y = Math.floor(N * 0.2); y < N * 0.8; y++)
            for (let x = Math.floor(N * 0.2); x < N * 0.45; x++) ink[y * N + x] = 1;
        const r = matchInk(tpl, ink, N);
        expect(r.pass).toBe(false);
        expect(r.reason).toBe("too_faint");
    });
});

describe("renderStrokesToBitmap", () => {
    it("渲染笔画后墨迹非空", () => {
        const ink = renderStrokesToBitmap(centerBlock(), N);
        expect(ink.some((v) => v === 1)).toBe(true);
    });
    it("空笔画 → 全空", () => {
        const ink = renderStrokesToBitmap([], N);
        expect(ink.every((v) => v === 0)).toBe(true);
    });
});

// 供测试引用的阈值(与实现保持一致的断言用)
import { THRESHOLDS as THRESHOLDS_FOR_TEST } from "./handwriting";
