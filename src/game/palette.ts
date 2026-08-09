/*
 * 化了个学 · 卡牌配色(位置决定) —— 与旧版 hlgx_style.css 一致
 * 8 色渐变, 同层相邻块必然不同色(见 core.ts slotColorIdx)
 */
export const TILE_COLORS = [
    "linear-gradient(145deg, #f43f5e, #be123c)", // 0 玫红
    "linear-gradient(145deg, #fb923c, #c2410c)", // 1 橙
    "linear-gradient(145deg, #eab308, #a16207)", // 2 金黄
    "linear-gradient(145deg, #4ade80, #15803d)", // 3 绿
    "linear-gradient(145deg, #22d3ee, #0e7490)", // 4 青
    "linear-gradient(145deg, #60a5fa, #1d4ed8)", // 5 蓝
    "linear-gradient(145deg, #a78bfa, #6d28d9)", // 6 紫
    "linear-gradient(145deg, #f472b6, #be185d)", // 7 粉
];
