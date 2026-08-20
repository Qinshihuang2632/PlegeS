/*
 * 错了个字 · 手写识别核心(手写输入法式, 仅核对字形)
 * =================================================
 * 与 v1.0.0 的差异: 不再用「SVG 字形渲染 + 像素重叠」比对(正确书写
 * 覆盖率仅 ~0.2, 因为手写笔画粗细/位置与印刷字形差异大)。
 *
 * 新方案(模仿手写输入法):
 *   1. 归一化 —— 取墨迹包围盒, 缩放平移填满标准网格(玩家写大/写小/
 *      写偏都容忍, 与输入法自动缩放一致);
 *   2. 形态学膨胀 —— 墨迹与标准字形都膨胀 r 像素, 抹平笔画粗细、
 *      连笔/断笔差异(输入法同样对距离做容差);
 *   3. 仅字形覆盖判定 —— 墨迹覆盖标准字形比例(cover)与墨迹落在
 *      字形外比例(stray), 不比较笔画数/方向/SVG 路径。
 *
 * 判定: 写对且写规范 → cover 高 & stray 低 → 得分;
 *       潦草/乱画 → stray 高; 写错字/漏笔画 → cover 低。
 */

export interface Stroke {
    points: { x: number; y: number }[];
}

export interface MatchResult {
    cover: number;    // 墨迹覆盖标准字形像素比例 0~1
    stray: number;    // 墨迹落在字形外比例 0~1
    score: number;    // cover - 0.5*stray
    pass: boolean;
    reason: "ok" | "too_faint" | "too_messy" | "wrong_char" | "empty";
}

/** 判定阈值(常量, 便于按实测调整) */
export const THRESHOLDS = {
    /** 标准字形像素的最小墨迹覆盖率: 低于此 = 没写到该字(写错/漏笔画/只写部分) */
    minCover: 0.55,
    /** 墨迹落在字形外的最大比例: 高于此 = 太潦草/乱画 */
    maxStray: 0.5,
    /** 原始墨迹面积与原始字形面积的最大比值: 高于此 = 潦草涂鸦/笔画乱飞(面积膨胀过大) */
    maxAreaRatio: 2.2,
} as const;

/** 归一化网格边长(识别精度与性能平衡) */
export const GRID = 56;
/** 墨迹膨胀半径(像素): 抹平笔画粗细差异 */
export const DILATE_R = 2;
/** 模板膨胀半径(像素): 与墨迹对称容差 —— 模板不膨胀时手写粗笔画
 *  边缘会大量落在细印刷字形外导致 stray 超标(实测写「焰」cover 0.96
 *  却因 stray 不通过), 模板膨胀 3 使模板笔画宽度接近手写粗笔画,
 *  判定退化为纯字形结构比对。 */
export const TEMPLATE_DILATE_R = 3;

/**
 * 形态学膨胀: 每个墨迹像素向外扩展 r 像素。
 * 作用: 手写笔画粗/细、连笔/断笔差异在此被抹平, 只保留字形骨架区域。
 */
export function dilate(bitmap: Uint8Array, size: number, r = DILATE_R): Uint8Array {
    const out = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (!bitmap[y * size + x]) continue;
            const x0 = Math.max(0, x - r), x1 = Math.min(size - 1, x + r);
            const y0 = Math.max(0, y - r), y1 = Math.min(size - 1, y + r);
            for (let yy = y0; yy <= y1; yy++)
                for (let xx = x0; xx <= x1; xx++) out[yy * size + xx] = 1;
        }
    }
    return out;
}

/**
 * 归一化: 把 srcSize 位图中的墨迹(包围盒)缩放平移填满 gridSize 网格。
 * 无墨迹时返回空图。这一步让「写小/写偏」不再影响判定。
 */
export function normalizeBitmap(
    bitmap: Uint8Array,
    srcSize: number,
    gridSize = GRID,
): Uint8Array {
    let minX = srcSize, minY = srcSize, maxX = -1, maxY = -1;
    for (let y = 0; y < srcSize; y++) {
        for (let x = 0; x < srcSize; x++) {
            if (bitmap[y * srcSize + x]) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) return new Uint8Array(gridSize * gridSize);
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    // 等比缩放(取宽高比更宽松的), 留 8% 边距避免顶格
    const scale = (gridSize * 0.84) / Math.max(bw, bh);
    const out = new Uint8Array(gridSize * gridSize);
    const offX = (gridSize - bw * scale) / 2;
    const offY = (gridSize - bh * scale) / 2;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (!bitmap[y * srcSize + x]) continue;
            const gx = Math.round(offX + (x - minX) * scale);
            const gy = Math.round(offY + (y - minY) * scale);
            if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) out[gy * gridSize + gx] = 1;
        }
    }
    return out;
}

/**
 * 核心判定: 归一化后的模板字形 与 归一化+膨胀后的墨迹 做覆盖比对。
 * areaRatio: 原始(归一化前)墨迹像素数 / 原始模板像素数 —— 必须在
 * 归一化前计算: 归一化会把墨迹包围盒填满网格, 潦草涂鸦(包围盒大)归一化后
 * 面积比反而接近 1, 失去残缺/潦草区分度。
 */
export function matchInk(
    template: Uint8Array,   // 标准字形位图(归一化, 已膨胀)
    ink: Uint8Array,        // 玩家墨迹位图(归一化, 已膨胀)
    size: number,           // 边长(正方形)
    areaRatio = 1,          // 原始墨迹面积/原始模板面积(默认 1 = 不约束)
): MatchResult {
    const total = size * size;
    let templatePx = 0, inkPx = 0, overlapPx = 0;
    for (let i = 0; i < total; i++) {
        if (template[i]) templatePx++;
        if (ink[i]) {
            inkPx++;
            if (template[i]) overlapPx++;
        }
    }
    if (inkPx < 5) return { cover: 0, stray: 1, score: -1, pass: false, reason: "empty" };
    if (templatePx === 0) return { cover: 0, stray: 1, score: -1, pass: false, reason: "wrong_char" };

    const cover = overlapPx / templatePx;     // 写到字形上的比例
    const stray = (inkPx - overlapPx) / inkPx; // 写在字形外的比例
    const score = cover - 0.5 * stray;

    let pass = false, reason: MatchResult["reason"] = "wrong_char";
    if (
        cover >= THRESHOLDS.minCover &&
        stray <= THRESHOLDS.maxStray &&
        areaRatio <= THRESHOLDS.maxAreaRatio
    ) {
        pass = true;
        reason = "ok";
    } else if (areaRatio > THRESHOLDS.maxAreaRatio) {
        reason = "too_messy";   // 墨迹面积膨胀过大: 潦草涂鸦
    } else if (cover < THRESHOLDS.minCover) {
        reason = cover < 0.2 ? "wrong_char" : "too_faint";
    } else {
        reason = "too_messy";
    }
    return { cover, stray, score, pass, reason };
}

/** 把 Canvas 位图数据(ImageData.data RGBA)转成 0/1 像素数组(有墨迹=1) */
export function bitmapFromImageData(
    data: Uint8ClampedArray,
    size: number,
    threshold = 64,       // alpha/亮度阈值: 低于此视为空白
): Uint8Array {
    const out = new Uint8Array(size * size);
    for (let i = 0; i < size * size; i++) {
        const a = data[i * 4 + 3];
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (a >= threshold && lum < 230) out[i] = 1;
    }
    return out;
}

/**
 * 从墨迹笔画序列渲染 0/1 像素图(测试与组件共用, 不依赖 Canvas)。
 */
export function renderStrokesToBitmap(
    strokes: Stroke[],
    size: number,
    lineWidth = 6,
): Uint8Array {
    const out = new Uint8Array(size * size);
    const put = (x: number, y: number) => {
        const ix = Math.round(x), iy = Math.round(y);
        if (ix >= 0 && ix < size && iy >= 0 && iy < size) out[iy * size + ix] = 1;
    };
    const fillDisc = (cx: number, cy: number, r: number) => {
        for (let dy = -r; dy <= r; dy++)
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r) put(cx + dx, cy + dy);
            }
    };
    const r = Math.max(1, Math.floor(lineWidth / 2));
    for (const s of strokes) {
        if (s.points.length === 0) continue;
        fillDisc(s.points[0].x, s.points[0].y, r);
        for (let i = 1; i < s.points.length; i++) {
            const a = s.points[i - 1], b = s.points[i];
            const dist = Math.hypot(b.x - a.x, b.y - a.y);
            const steps = Math.max(1, Math.ceil(dist));
            for (let t = 0; t <= steps; t++) {
                const x = a.x + ((b.x - a.x) * t) / steps;
                const y = a.y + ((b.y - a.y) * t) / steps;
                fillDisc(x, y, r);
            }
        }
    }
    return out;
}

/** 测试用占位模板: 中心 60% 方块 */
export function renderTemplatePlaceholder(size: number): Uint8Array {
    const out = new Uint8Array(size * size);
    const m = Math.floor(size * 0.2), M = Math.floor(size * 0.8);
    for (let y = m; y < M; y++)
        for (let x = m; x < M; x++) out[y * size + x] = 1;
    return out;
}

/* ==================== 调试快照(控制台) ====================
 * 在浏览器控制台执行 `__clgzSnapshot()` 可查看最近一次判定的
 * 墨迹/模板位图快照与判定详情, 用于调识别阈值与排障。
 */

export interface DebugSnapshot {
    target: string;
    size: number;
    ink: Uint8Array;      // 归一化后的墨迹位图(未膨胀)
    tpl: Uint8Array;      // 归一化后的模板位图(未膨胀)
    result: MatchResult;
}

let lastDebug: DebugSnapshot | null = null;

export function setLastDebug(s: DebugSnapshot | null) {
    lastDebug = s;
}
export function getLastDebug(): DebugSnapshot | null {
    return lastDebug;
}

/** 把 0/1 位图渲染成 ASCII 字符画(█ 为 1, · 为 0), 缩放到 maxW 宽 */
export function bitmapToAscii(bmp: Uint8Array, size: number, maxW = 40): string {
    const scale = Math.max(1, Math.ceil(size / maxW));
    const rows: string[] = [];
    for (let y = 0; y < size; y += scale) {
        let line = "";
        for (let x = 0; x < size; x += scale) {
            let on = false;
            for (let dy = 0; dy < scale && !on; dy++)
                for (let dx = 0; dx < scale; dx++) {
                    if (bmp[(y + dy) * size + (x + dx)]) { on = true; break; }
                }
            line += on ? "█" : "·";
        }
        rows.push(line);
    }
    return rows.join("\n");
}

