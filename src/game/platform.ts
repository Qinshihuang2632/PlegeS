/*
 * 化了个学 · 平台检测(手游/端游)
 * 手游(mobile)= 触屏为主的设备(手机/平板/触屏笔记本);
 * 端游(desktop)= 键鼠为主的设备。榜单按平台分开, 成绩互不混排。
 */
export type Platform = "mobile" | "desktop";

export const PLATFORM_LABEL: Record<Platform, string> = {
    mobile: "手游",
    desktop: "端游",
};

export function detectPlatform(): Platform {
    if (typeof window === "undefined") return "desktop";
    try {
        // 粗指针(触屏)优先, 其次多点触控, 最后 UA 兜底
        if (window.matchMedia?.("(pointer: coarse)").matches) return "mobile";
        if (navigator.maxTouchPoints > 1) return "mobile";
        if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return "mobile";
    } catch {
        /* 检测失败降级端游 */
    }
    return "desktop";
}
