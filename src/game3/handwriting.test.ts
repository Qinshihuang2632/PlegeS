/*
 * 错了个字 · 手写识别核心测试(v1.0.1 手写输入法式算法)
 * 覆盖: 归一化(写小/写偏容忍)、膨胀(笔画粗细容忍)、字形覆盖判定
 */
import { describe, expect, it } from "vitest";
import {
    matchInk, renderStrokesToBitmap, renderTemplatePlaceholder,
    normalizeBitmap, dilate, GRID, TEMPLATE_DILATE_R,
    type Stroke,
} from "./handwriting";

const N = 64;

/** 模板: 中心 60% 区域(占位字形, 模拟标准字形) */
const tpl = renderTemplatePlaceholder(N);

/** 在中心区域画一个实心方块(模拟写对了) */
function centerBlock(strokeW = N * 0.6): Stroke[] {
    const x0 = (N - strokeW) / 2, x1 = (N + strokeW) / 2;
    const y0 = (N - strokeW) / 2, y1 = (N + strokeW) / 2;
    const pts: { x: number; y: number }[] = [];
    for (let y = y0; y <= y1; y += 3) {
        pts.push({ x: x0, y });
        pts.push({ x: x1, y });
    }
    for (let x = x0; x <= x1; x += 3) {
        pts.push({ x, y: y0 });
        pts.push({ x, y: y1 });
    }
    return [{ points: pts }];
}

/** 在左上角画同样大小的方块(模拟写偏了位置) */
function cornerBlock(strokeW = N * 0.6): Stroke[] {
    const x0 = 2, x1 = 2 + strokeW;
    const y0 = 2, y1 = 2 + strokeW;
    const pts: { x: number; y: number }[] = [];
    for (let y = y0; y <= y1; y += 3) {
        pts.push({ x: x0, y });
        pts.push({ x: x1, y });
    }
    for (let x = x0; x <= x1; x += 3) {
        pts.push({ x, y: y0 });
        pts.push({ x, y: y1 });
    }
    return [{ points: pts }];
}

/** 细横线(模拟写成了完全不同的形状) */
function thinLine(): Stroke[] {
    return [{ points: [{ x: N * 0.1, y: N / 2 }, { x: N * 0.9, y: N / 2 }] }];
}

/** 乱画: 全部在模板外的四角涂抹 + 中央短线 */
function messyStrokes(): Stroke[] {
    const corner = (cx: number, cy: number): Stroke => {
        const pts: { x: number; y: number }[] = [];
        for (let y = cy; y <= cy + 8; y += 2)
            for (let x = cx; x <= cx + 8; x += 2) pts.push({ x, y });
        return { points: pts };
    };
    return [
        corner(2, 2), corner(2, N - 10), corner(N - 10, 2), corner(N - 10, N - 10),
        { points: [{ x: N * 0.45, y: N / 2 }, { x: N * 0.55, y: N / 2 }] },
    ];
}

/** 只写一小条(约模板 1/6 面积, 模拟严重漏笔) */
function faintStrip(): Uint8Array {
    const ink = new Uint8Array(N * N);
    for (let y = Math.floor(N * 0.2); y < N * 0.8; y++)
        for (let x = Math.floor(N * 0.2); x < N * 0.3; x++) ink[y * N + x] = 1;
    return ink;
}

/** 画一个方框(模拟「口」字形) */
function boxStrokes(): Stroke[] {
    const m = N * 0.3, M = N * 0.7;
    const horiz = (y: number): Stroke => ({ points: [{ x: m, y }, { x: M, y }] });
    const vert = (x: number): Stroke => ({ points: [{ x, y: m }, { x, y: M }] });
    return [horiz(m), horiz(M), vert(m), vert(M)];
}

/** 细线方框模板(1px 笔画, 模拟印刷字形) */
function thinBoxTemplate(): Uint8Array {
    const t = new Uint8Array(N * N);
    const m = Math.floor(N * 0.3), M = Math.floor(N * 0.7);
    for (let x = m; x <= M; x++) { t[m * N + x] = 1; t[M * N + x] = 1; }
    for (let y = m; y <= M; y++) { t[y * N + m] = 1; t[y * N + M] = 1; }
    return t;
}

/** 完整流程: 墨迹位图 → 归一化 → 膨胀; 模板 → 归一化 → 膨胀(对称容差) */
function judge(ink: Uint8Array) {
    const inkNorm = normalizeBitmap(ink, N, GRID);
    const tplNorm = normalizeBitmap(tpl, N, GRID);
    const inkDil = dilate(inkNorm, GRID);
    const tplDil = dilate(tplNorm, GRID, TEMPLATE_DILATE_R);
    return matchInk(tplDil, inkDil, GRID);
}

describe("归一化(normalizeBitmap)", () => {
    it("写偏: 角落的墨迹归一化后居中(位置容忍)", () => {
        const ink = renderStrokesToBitmap(cornerBlock(), N);
        const norm = normalizeBitmap(ink, N);
        // 归一化后墨迹应位于网格中部而非角落
        let minX = GRID, maxX = -1;
        for (let y = 0; y < GRID; y++)
            for (let x = 0; x < GRID; x++)
                if (norm[y * GRID + x]) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
        expect(minX).toBeGreaterThan(GRID * 0.05);
        expect(maxX).toBeLessThan(GRID * 0.95);
    });
});

describe("matchInk 判定(手写输入法式)", () => {
    it("写对(居中方块) → 通过", () => {
        const ink = renderStrokesToBitmap(centerBlock(), N);
        const r = judge(ink);
        expect(r.pass).toBe(true);
        expect(r.reason).toBe("ok");
        expect(r.cover).toBeGreaterThan(0.5);
    });

    it("写偏(角落方块) → 归一化后依然通过(位置容忍)", () => {
        const ink = renderStrokesToBitmap(cornerBlock(), N);
        const r = judge(ink);
        expect(r.pass).toBe(true);
        expect(r.cover).toBeGreaterThan(0.5);
    });

    it("写小(30% 方块) → 归一化放大后通过(大小容忍)", () => {
        const ink = renderStrokesToBitmap(centerBlock(N * 0.3), N);
        const r = judge(ink);
        expect(r.pass).toBe(true);
        expect(r.cover).toBeGreaterThan(0.5);
    });

    it("回归: 粗笔画正确书写(cover 高 stray 也高) → 模板膨胀后通过", () => {
        // 模拟用户实测 bug: 写「焰」cover 0.96 却不通过 —— 墨迹笔画粗(8px)
        // 而模板笔画细(1px), 墨迹边缘大量落在模板外 → stray 超标
        const tplBox = thinBoxTemplate();
        const ink = renderStrokesToBitmap(boxStrokes(), N, 8);   // 粗笔画(8px)
        // 对照: 模板不膨胀时(旧算法)判定
        const old = matchInk(tplBox, dilate(ink, N), N);
        // 新算法: 模板也膨胀(对称容差, 用模板专属半径)
        const r = matchInk(dilate(tplBox, N, TEMPLATE_DILATE_R), dilate(ink, N), N);
        expect(old.pass).toBe(false);                 // 旧算法不通过(复现 bug)
        expect(old.stray).toBeGreaterThan(0.5);       // 旧算法 stray 超标
        expect(r.pass).toBe(true);                    // 新算法通过
        expect(r.stray).toBeLessThanOrEqual(0.5);
    });

    it("空白(无墨迹) → 不通过, reason=empty", () => {
        const ink = new Uint8Array(N * N);
        const r = judge(ink);
        expect(r.pass).toBe(false);
        expect(r.reason).toBe("empty");
    });

    it("形状不同(细横线) → 不通过(字形不符)", () => {
        const ink = renderStrokesToBitmap(thinLine(), N);
        const r = judge(ink);
        expect(r.pass).toBe(false);
        expect(["wrong_char", "too_faint"]).toContain(r.reason);
        expect(r.cover).toBeLessThan(0.45);
    });

    it("乱画(墨迹与字形结构不符) → 不通过, cover 低", () => {
        const ink = renderStrokesToBitmap(messyStrokes(), N);
        const r = judge(ink);
        expect(r.pass).toBe(false);
        expect(r.cover).toBeLessThan(0.45);
        expect(["wrong_char", "too_faint"]).toContain(r.reason);
    });

    it("严重漏笔(只写一小条) → 不通过, reason=too_faint", () => {
        const r = judge(faintStrip());
        expect(r.pass).toBe(false);
        expect(r.reason).toBe("too_faint");
        expect(r.cover).toBeLessThan(0.45);
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
