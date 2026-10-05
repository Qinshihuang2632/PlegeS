/*
 * 错了个字 · 图示题素材 (src/game3/artifacts.tsx)
 * =============================================
 * v1.2.0 玩法升级: 能图示的条目用图片展示(不展示名称与目标字), 玩家凭记忆写出名称中的字,
 * 而非对照题干抄写。
 * v1.2.1 素材升级: 15 个条目改用 Wikimedia Commons 标准图(自由许可, 见 public/img/clgz/CREDITS.txt);
 * 其余 12 个条目保留手绘 SVG(教科书线稿风格)。
 * 键 = 题库 word 字段; 未收录的条目仍走原文字题干。
 */
import type { ReactNode } from "react";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Wikimedia Commons 标准图(本地化存储, 经特殊文件路径渲染) */
const IMG = (name: string): ReactNode => (
    <img src={`/img/clgz/${name}.png`} alt="" loading="lazy" className="h-full w-full object-contain" />
);

export const CLGZ_ARTIFACTS: Record<string, ReactNode> = {
    /* ---------------- Commons 标准图 ---------------- */
    锥形瓶: IMG("conical-flask"),
    蒸发皿: IMG("evaporating-dish"),
    过滤: IMG("filtration"),
    蒸馏: IMG("distillation"),
    苯环: IMG("benzene-ring"),
    蚕茧: IMG("cocoon"),
    草履虫: IMG("paramecium"),
    梯形: IMG("trapezoid"),
    圆锥: IMG("cone"),
    椭圆: IMG("ellipse"),
    弦长: IMG("chord"),
    直径: IMG("diameter"),
    矩形: IMG("rectangle"),
    磁场: IMG("magnet"),
    滑轮: IMG("pulley"),

    /* ---------------- 手绘 SVG(教科书线稿) ---------------- */
    坩埚: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M62 88 L138 88 L128 152 Q100 168 72 152 Z" />
            <path d="M54 74 Q100 58 146 74" />
            <path d="M96 58 Q100 46 108 56" />
            <path d="M84 120 L116 120" opacity="0.5" />
        </svg>
    ),
    镊子: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M94 26 C90 90 80 140 66 176" />
            <path d="M106 26 C110 90 120 140 134 176" />
            <path d="M94 26 Q100 16 106 26" />
            <path d="M97 60 L103 60" opacity="0.5" />
            <path d="M91 92 L109 92" opacity="0.5" />
        </svg>
    ),
    蛹期: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M104 26 C64 52 52 108 74 152 C84 172 116 172 126 152 C148 108 138 54 104 26 Z" />
            <path d="M76 108 Q100 120 126 108" opacity="0.55" />
            <path d="M72 134 Q100 146 130 134" opacity="0.55" />
            <path d="M84 62 Q100 72 118 62" opacity="0.55" />
        </svg>
    ),
    菱形: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M100 24 L168 100 L100 176 L32 100 Z" />
        </svg>
    ),
    棱柱: (
        <svg viewBox="0 0 200 200" {...S}>
            <rect x="48" y="86" width="88" height="66" />
            <path d="M48 86 L76 58 L164 58 L136 86 M164 58 L164 124 L136 150" />
        </svg>
    ),
    抛物线: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M36 28 L36 168 L172 168" />
            <path d="M46 44 Q104 210 162 44" />
        </svg>
    ),
    弧长: (
        <svg viewBox="0 0 200 200" {...S}>
            <circle cx="100" cy="100" r="62" opacity="0.45" />
            <path d="M124 42 A62 62 0 0 1 124 158" strokeWidth="10" />
            <path d="M100 100 L124 42 M100 100 L124 158" strokeWidth="4" />
        </svg>
    ),
    圆心: (
        <svg viewBox="0 0 200 200" {...S}>
            <circle cx="100" cy="100" r="62" />
            <path d="M100 100 L162 100" strokeWidth="4" />
            <circle cx="100" cy="100" r="7" fill="currentColor" stroke="none" />
        </svg>
    ),
    砝码: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M72 88 L128 88 L118 168 L82 168 Z" />
            <path d="M84 88 Q84 62 100 62 Q116 62 116 88" />
            <circle cx="100" cy="48" r="12" />
        </svg>
    ),
    杠杆: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M30 88 L170 100" />
            <path d="M100 96 L84 142 L116 142 Z" />
            <path d="M36 92 L36 116 M62 94 L62 112" strokeWidth="4" />
            <circle cx="36" cy="128" r="14" />
            <circle cx="62" cy="130" r="10" />
            <path d="M36 116 L36 118 M62 112 L62 124" strokeWidth="4" />
        </svg>
    ),
    弹簧: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M100 20 L100 38" />
            <path d="M100 38 L74 54 L126 70 L74 86 L126 102 L74 118 L126 134 L100 148" />
            <path d="M100 148 L100 176" />
            <path d="M72 176 L128 176" />
        </svg>
    ),
    焦点: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M104 34 C76 66 76 134 104 166 C132 134 132 66 104 34 Z" />
            <path d="M28 78 L92 78 L146 102" strokeWidth="4" />
            <path d="M28 100 L92 100 L146 102" strokeWidth="4" />
            <path d="M28 122 L92 122 L146 102" strokeWidth="4" />
            <circle cx="152" cy="102" r="6" fill="currentColor" stroke="none" />
        </svg>
    ),
};
