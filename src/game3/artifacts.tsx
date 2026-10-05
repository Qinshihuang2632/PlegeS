/*
 * 错了个字 · 图示题素材 (src/game3/artifacts.tsx)
 * =============================================
 * v1.2.0 玩法升级: 能图示的条目用图片展示(不展示名称与目标字), 玩家凭记忆写出名称中的字,
 * 而非对照题干抄写。统一教科书线稿风格(viewBox 200×200, currentColor 描边)。
 * 键 = 题库 word 字段; 未收录的条目仍走原文字题干。
 */
import type { ReactNode } from "react";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const CLGZ_ARTIFACTS: Record<string, ReactNode> = {
    /* ---------------- 化学 · 仪器与装置 ---------------- */
    锥形瓶: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M86 28 L114 28 L114 72 L146 166 Q148 172 140 172 L60 172 Q52 172 54 166 L86 72 Z" />
            <path d="M78 28 L122 28" />
            <path d="M66 140 L134 140 L146 166 Q148 172 140 172 L60 172 Q52 172 54 166 L66 140 Z" fill="currentColor" opacity="0.15" stroke="none" />
            <path d="M66 140 L134 140" />
        </svg>
    ),
    坩埚: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M62 88 L138 88 L128 152 Q100 168 72 152 Z" />
            <path d="M54 74 Q100 58 146 74" />
            <path d="M96 58 Q100 46 108 56" />
            <path d="M84 120 L116 120" opacity="0.5" />
        </svg>
    ),
    蒸发皿: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M36 96 L164 96" />
            <path d="M40 100 Q46 158 100 164 Q154 158 160 100" />
            <path d="M62 128 Q100 146 138 128" opacity="0.4" />
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
    过滤: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M56 32 L144 32 L106 84 L94 84 Z" />
            <path d="M100 84 L100 128" />
            <path d="M64 46 L136 46" strokeDasharray="8 8" opacity="0.6" />
            <path d="M64 126 L64 176 L142 176 L142 140" />
            <path d="M142 126 L142 140" opacity="0.4" />
            <path d="M78 158 L128 158" opacity="0.4" />
        </svg>
    ),
    蒸馏: (
        <svg viewBox="0 0 200 200" {...S}>
            <circle cx="62" cy="126" r="30" />
            <path d="M62 96 L62 74 L84 74" />
            <path d="M84 74 L138 118" />
            <path d="M138 118 L138 132" />
            <circle cx="150" cy="150" r="20" />
            <path d="M40 170 Q62 182 84 170" opacity="0.5" />
        </svg>
    ),
    苯环: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M100 28 L153 60 L153 132 L100 164 L47 132 L47 60 Z" />
            <circle cx="100" cy="96" r="34" />
        </svg>
    ),

    /* ---------------- 生物 · 标本 ---------------- */
    蚕茧: (
        <svg viewBox="0 0 200 200" {...S}>
            <ellipse cx="100" cy="102" rx="58" ry="72" transform="rotate(18 100 102)" />
            <path d="M64 62 Q100 78 140 60" opacity="0.55" />
            <path d="M54 92 Q100 108 148 90" opacity="0.55" />
            <path d="M56 122 Q100 138 146 120" opacity="0.55" />
            <path d="M70 150 Q100 164 132 148" opacity="0.55" />
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
    草履虫: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M46 100 C46 62 88 44 128 54 C164 64 170 130 136 152 C98 172 46 146 46 100 Z" />
            <ellipse cx="108" cy="102" rx="20" ry="13" opacity="0.6" />
            <circle cx="76" cy="88" r="5" opacity="0.6" />
            <path d="M40 78 L28 72 M38 100 L24 100 M40 122 L28 130 M56 146 L48 158 M96 166 L94 180 M132 158 L140 170 M158 132 L170 138 M162 84 L174 78" strokeWidth="4" />
        </svg>
    ),

    /* ---------------- 数学 · 图形 ---------------- */
    菱形: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M100 24 L168 100 L100 176 L32 100 Z" />
        </svg>
    ),
    矩形: (
        <svg viewBox="0 0 200 200" {...S}>
            <rect x="36" y="58" width="128" height="84" />
        </svg>
    ),
    梯形: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M64 52 L136 52 L168 148 L32 148 Z" />
        </svg>
    ),
    棱柱: (
        <svg viewBox="0 0 200 200" {...S}>
            <rect x="48" y="86" width="88" height="66" />
            <path d="M48 86 L76 58 L164 58 L136 86 M164 58 L164 124 L136 150" />
        </svg>
    ),
    圆锥: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M100 28 L48 152 M100 28 L152 152" />
            <ellipse cx="100" cy="152" rx="52" ry="15" />
        </svg>
    ),
    椭圆: (
        <svg viewBox="0 0 200 200" {...S}>
            <ellipse cx="100" cy="100" rx="64" ry="38" />
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
    弦长: (
        <svg viewBox="0 0 200 200" {...S}>
            <circle cx="100" cy="100" r="62" />
            <path d="M56 66 L144 66" />
            <path d="M100 100 L100 66" strokeDasharray="7 7" strokeWidth="4" />
            <circle cx="100" cy="100" r="4" fill="currentColor" />
        </svg>
    ),
    圆心: (
        <svg viewBox="0 0 200 200" {...S}>
            <circle cx="100" cy="100" r="62" />
            <path d="M100 100 L162 100" strokeWidth="4" />
            <circle cx="100" cy="100" r="7" fill="currentColor" stroke="none" />
        </svg>
    ),
    直径: (
        <svg viewBox="0 0 200 200" {...S}>
            <circle cx="100" cy="100" r="62" />
            <path d="M38 100 L162 100" />
            <circle cx="100" cy="100" r="5" fill="currentColor" stroke="none" />
        </svg>
    ),

    /* ---------------- 物理 · 器材与图示 ---------------- */
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
    滑轮: (
        <svg viewBox="0 0 200 200" {...S}>
            <path d="M100 22 L100 46" />
            <circle cx="100" cy="68" r="22" />
            <circle cx="100" cy="68" r="5" fill="currentColor" stroke="none" />
            <path d="M78 68 L58 138 M122 68 L142 138" />
            <rect x="48" y="138" width="20" height="26" />
            <rect x="132" y="138" width="20" height="26" />
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
    磁场: (
        <svg viewBox="0 0 200 200" {...S}>
            <rect x="58" y="82" width="84" height="40" />
            <path d="M100 82 L100 122" />
            <text x="79" y="111" fontSize="24" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle">N</text>
            <text x="121" y="111" fontSize="24" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle">S</text>
            <path d="M74 82 C74 34 126 34 126 82" strokeWidth="4" opacity="0.6" />
            <path d="M74 122 C74 170 126 170 126 122" strokeWidth="4" opacity="0.6" />
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
