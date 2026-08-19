/*
 * 错了个字 · 手写识别核心(无键盘, 类似「你画我猜」画框)
 * =====================================================
 * 思路: 玩家在画框内手写目标字 → 系统把该字的「标准字形」渲染到同一
 * 画布网格 → 计算玩家墨迹与标准字形的像素重叠度。
 * 判定原则: 写对了且写在框内(与标准字形重叠度高)才得分,
 *           写字潦草 / 写错字 / 笔画乱飞 → 重叠度低 → 不得分。
 *
 * 判定公式:
 *   cover  = 玩家墨迹覆盖标准字形像素的比例(越高越「写到该字上」)
 *   stray  = 玩家墨迹落在标准字形之外的像素比例(越高越「乱画」)
 *   得分  = cover - 0.5 * stray   (写对+不潦草 → 接近 1; 乱画 → 负值)
 *   判过  = cover >= 0.45 && stray <= 0.5   (可调阈值)
 *
 * 本模块只做像素计算, 与 React/Canvas 解耦, 便于单测。
 */

export interface Stroke {
    points: { x: number; y: number }[];
}

export interface MatchResult {
    cover: number;    // 墨迹覆盖标准字形比例 0~1
    stray: number;    // 墨迹落在字形外比例 0~1
    score: number;    // cover - 0.5*stray
    pass: boolean;
    /** 判定失败原因(用于提示玩家) */
    reason: "ok" | "too_faint" | "too_messy" | "wrong_char" | "empty";
}

/** 判定阈值(常量, 便于调整) */
export const THRESHOLDS = {
    /** 标准字形像素的最小墨迹覆盖率: 低于此 = 没写到该字(写错/漏笔画) */
    minCover: 0.45,
    /** 墨迹落在字形外的最大比例: 高于此 = 太潦草/乱画 */
    maxStray: 0.5,
} as const;

/**
 * 把「标准字形」渲染到像素网格(由调用方用 Canvas fillText 生成字形后传入)。
 * 此处输入: 字形位图 data(0/1) 与 墨迹位图 ink(0/1), 尺寸需一致。
 */
export function matchInk(
    template: Uint8Array,   // 标准字形像素(1=字形)
    ink: Uint8Array,        // 玩家墨迹像素(1=墨迹)
    size: number,           // 边长(正方形)
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
    // 空手/全空
    if (inkPx < 5) return { cover: 0, stray: 1, score: -1, pass: false, reason: "empty" };
    if (templatePx === 0) return { cover: 0, stray: 1, score: -1, pass: false, reason: "wrong_char" };

    const cover = overlapPx / templatePx;     // 写到字形上的比例
    const stray = (inkPx - overlapPx) / inkPx; // 写在字形外的比例
    const score = cover - 0.5 * stray;

    let pass = false, reason: MatchResult["reason"] = "wrong_char";
    if (cover >= THRESHOLDS.minCover && stray <= THRESHOLDS.maxStray) {
        pass = true;
        reason = "ok";
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
        // 墨迹: 不透明 且 不是白色/浅色
        if (a >= threshold && lum < 230) out[i] = 1;
    }
    return out;
}

/**
 * 从墨迹笔画序列渲染 0/1 像素图(用于测试, 不依赖 Canvas)。
 * 每段笔画按点连线, 线宽 lineWidth 像素。
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

/**
 * 生成目标字的标准字形像素图(用于测试: 简单地把字形画成实心方块占位,
 * 生产环境由 Canvas fillText 真实渲染)。
 * NOTE: 仅测试用占位实现, 生产使用 drawTemplate 渲染真实字体字形。
 */
export function renderTemplatePlaceholder(size: number): Uint8Array {
    // 中心 60% 区域为字形(近似汉字方块)
    const out = new Uint8Array(size * size);
    const m = Math.floor(size * 0.2), M = Math.floor(size * 0.8);
    for (let y = m; y < M; y++)
        for (let x = m; x < M; x++) out[y * size + x] = 1;
    return out;
}
