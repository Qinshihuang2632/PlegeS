/*
 * 化了个学 · 卡牌/手牌 UI 组件(棋盘与手牌槽共用)
 */
import { cn } from "@/lib/utils";
import { TILE_W, type Tile } from "./core";
import { HLGX_DESC } from "./substances";
import { TILE_COLORS } from "./palette";

/* 化学式字号按长度自适应(与旧版一致) */
export function tileFontSize(f: string): number {
    const len = f.length;
    if (len <= 2) return 19;
    if (len <= 4) return 15;
    if (len <= 6) return 13;
    if (len <= 9) return 11;
    return 10;
}

/* 文字在卡牌宽度内的最大字号(v2.2.2): 按字符数收缩, 防换行/溢出; 留 4px 边距, 下限 6px */
function fitFont(text: string, base: number, maxW: number): number {
    const len = [...text].length;
    return Math.max(6, Math.min(base, Math.floor((maxW - 4) / len)));
}

/* 悬浮简介: 物质名 + 性质简介 + 层数(顶层为第 1 层, 往下递增, v2.2.6) */
export function substanceInfo(sub: Tile["sub"], layer = 1): string {
    return `${sub.n}: ${HLGX_DESC[sub.n] || "性质待补充"}(第 ${layer} 层)`;
}

/* 卡牌正面: 化学式 + 中文名 + 层数角标(size 缩小时字号按比例缩放)
   v2.2.0: 无固定化学式的混合物(f 为占位符 "—")不显示横线, 名称居中
   v2.2.2: 公式过长(>10 字符放不下)也省略; 名称/公式字号按字符数收缩,
   配合 nowrap 保证不换行、整体居中(修复「普通玻璃」断行、油水混合物偏左等)
   v2.2.6: 左上角显示层数角标(顶层=1), 悬浮简介同时显示层数 */
export function TileFace({ tile, size = TILE_W, className, onClick, title }: {
    tile: Tile;
    size?: number;
    className?: string;
    onClick?: () => void;
    title?: string;
}) {
    const k = size / TILE_W; // 缩放系数
    const f = tile.sub.f;
    const hasFormula = !!f && f !== "—" && [...f].length <= 10;
    const name = tile.sub.n;
    const fSize = hasFormula ? fitFont(f, tileFontSize(f), size) * k : 0;
    const nSize = fitFont(name, hasFormula ? 9 : 12.5, size) * k;
    const layer = tile.L + 1;   // 顶层(最先接触)为第 1 层
    return (
        <div
            className={cn("hlgx-tile", className)}
            style={{ width: size, height: size, background: TILE_COLORS[tile.color] }}
            title={title ?? substanceInfo(tile.sub, layer)}
            onClick={onClick}
        >
            {hasFormula && <span className="hlgx-tile-f" style={{ fontSize: fSize }}>{f}</span>}
            <span className="hlgx-tile-n" style={{ fontSize: nSize }}>{name}</span>
            <span className="hlgx-tile-layer" style={{ fontSize: Math.max(5.5, 7 * k) }}>{layer}</span>
        </div>
    );
}

/* 棋盘上的卡牌(绝对定位, 含遮挡/移除/抖动状态)
 * 注意: 定位层 wrapper 必须 pointer-events-none —— 卡牌被移除后视觉层已
 * pointer-events:none 可穿透, 若 wrapper 仍是 auto 会形成"幽灵容器"拦截
 * 其正下方已解锁卡牌的点击(同心金字塔中心坐标重合, z 更高的幽灵容器盖住目标)。
 * v2.2.8 加固: removed 时 wrapper 再显式加内联 pointerEvents:none(双保险,
 * 即使样式类被覆盖也绝不拦截) —— 视觉 QA 复验(qa-extreme.mjs 12/12 通过)。 */
export function BoardTile({ tile, zIndex, onClick, shake }: {
    tile: Tile;
    zIndex: number; // 顶层最大(与旧版一致: 10 + 总层数-1-L)
    onClick?: () => void;
    shake: boolean;
}) {
    return (
        <div
            className="pointer-events-none absolute"
            style={{
                left: tile.x,
                top: tile.y,
                width: tile.size,
                height: tile.size,
                zIndex,
                ...(tile.removed ? { pointerEvents: "none" as const } : {}),
            }}
        >
            <TileFace
                tile={tile}
                size={tile.size}   // 挑战模式大卡(150/75)字号/角标随之缩放
                onClick={onClick}
                className={cn(
                    "hlgx-tile-board",
                    tile.removed && "hlgx-tile-removed",
                    tile.blocked && "hlgx-tile-blocked",
                    shake && "hlgx-shake",
                )}
            />
        </div>
    );
}

/* 手牌槽单格(尺寸随容器自适应, 移动端不溢出) */
export function TrayCell({ tile, selected, onClick, size = 44 }: {
    tile: Tile;
    selected: boolean;
    onClick?: () => void;
    size?: number;
}) {
    return (
        <TileFace
            tile={tile}
            size={size}
            onClick={onClick}
            className={cn("hlgx-tray-cell", selected && "hlgx-tray-sel")}
        />
    );
}
