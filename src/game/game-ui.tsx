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

export function substanceInfo(sub: Tile["sub"]): string {
    return sub.n + ": " + (HLGX_DESC[sub.n] || "性质待补充");
}

/* 卡牌正面: 化学式 + 中文名(size 缩小时字号按比例缩放)
   v2.2.0: 无固定化学式的混合物(f 为占位符 "—")不显示横线,
   名称以稍大字号直接居中, 避免玩家看到横线就凑在一起当混合物消 */
export function TileFace({ tile, size = TILE_W, className, onClick, title }: {
    tile: Tile;
    size?: number;
    className?: string;
    onClick?: () => void;
    title?: string;
}) {
    const k = size / TILE_W; // 缩放系数
    const hasFormula = !!tile.sub.f && tile.sub.f !== "—";
    return (
        <div
            className={cn("hlgx-tile", className)}
            style={{ width: size, height: size, background: TILE_COLORS[tile.color] }}
            title={title ?? substanceInfo(tile.sub)}
            onClick={onClick}
        >
            {hasFormula && <span className="hlgx-tile-f" style={{ fontSize: tileFontSize(tile.sub.f) * k }}>{tile.sub.f}</span>}
            <span className="hlgx-tile-n" style={{ fontSize: (hasFormula ? 9 : 12.5) * k }}>{tile.sub.n}</span>
        </div>
    );
}

/* 棋盘上的卡牌(绝对定位, 含遮挡/移除/抖动状态)
 * 注意: 定位层 wrapper 必须 pointer-events-none —— 卡牌被移除后视觉层已
 * pointer-events:none 可穿透, 若 wrapper 仍是 auto 会形成"幽灵容器"拦截
 * 其正下方已解锁卡牌的点击(同心金字塔中心坐标重合, z 更高的幽灵容器盖住目标)。 */
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
                width: TILE_W,
                height: TILE_W,
                zIndex,
            }}
        >
            <TileFace
                tile={tile}
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
