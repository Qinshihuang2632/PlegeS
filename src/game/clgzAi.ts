/*
 * 错了个字 · AI 手写识别前端接口 (src/game/clgzAi.ts)
 * ====================================================
 * v1.1.0: 提交手写卡面图 → /clgz/api/ai(腾讯云通用手写体识别) → 判定结果。
 * v1.1.1: 多尺寸变体重试 —— 单个大字占满整图时通用 OCR 常检测不到文本区域,
 *   自动按 100%/60%/40% 三种占比把字放在白底中央分别识别, 任一识别出文本即用。
 * v1.1.4: AI 识别为唯一判定(像素重合度判定已删除)。OCR 不可用(ok:false)时
 *   调用方提示「AI 识别暂不可用」, 不再回退任何本地判定。
 */
export interface ClgzAiResult {
    ok: boolean;          // false = OCR 不可用(调用方提示暂不可用)
    isTarget?: boolean;   // true = 识别结果包含目标字(写对)
    recognized?: string;  // AI 识别出的文本(可能为空 = 难以辨认)
    msg?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("image load failed"));
        img.src = src;
    });
}

export async function fetchOcrEnabled(): Promise<boolean> {
    try {
        const res = await fetch("/clgz/api/ai-config");
        const d = await res.json();
        return d?.enabled === true;
    } catch {
        return false;
    }
}

export async function judgeWithAi(imageBase64: string, target: string): Promise<ClgzAiResult> {
    try {
        const res = await fetch("/clgz/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: imageBase64, target }),
        });
        return await res.json();
    } catch {
        return { ok: false, msg: "网络异常" };
    }
}

/** 多尺寸变体判定: 依次以 100% / 60% / 40% 占比把字放在白底中央识别,
    返回第一个识别出文本的结果; 全部为空则返回空文本结果(前端按难辨认提示) */
export async function judgeWithAiVariants(base64: string, target: string): Promise<ClgzAiResult> {
    const img = await loadImage("data:image/png;base64," + base64);
    for (const scale of [1, 0.6, 0.4]) {
        const cv = document.createElement("canvas");
        cv.width = 560;
        cv.height = 560;
        const ctx = cv.getContext("2d");
        if (!ctx) break;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 560, 560);
        const w = 560 * scale;
        const h = 560 * scale;
        ctx.drawImage(img, (560 - w) / 2, (560 - h) / 2, w, h);
        const b64 = cv.toDataURL("image/png").split(",")[1];
        const d = await judgeWithAi(b64, target);
        if (d.ok && (d.recognized ?? "").length > 0) return d;
        // 识别为空(接口异常或仍难辨认) → 尝试下一变体
    }
    return { ok: true, isTarget: false, recognized: "" };
}
