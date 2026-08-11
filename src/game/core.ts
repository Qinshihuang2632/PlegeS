/*
 * 化了个学 · 游戏核心逻辑 (src/game/core.ts) —— 纯逻辑, 无 DOM
 * ============================================================
 * 自 hualegexue/static/js/hlgx_hua.js 原样迁移(v2.1.0):
 *   - 分层: 7 层漏斗式堆叠, 第 i 层 i×i(自上而下 49/36/25/16/9/4/1),
 *     每层完全被上一层覆盖, 只有上层清空才逐步露出下层
 *   - 玩法: 点击未被遮挡方块 → 入消除槽; 「同类」= 物质类别相同
 *     点击槽内方块选中, 恰好 3 张同类点「消除选中」, 3 张不同类 → 扣 1 血
 *   - 胜负: win = 全部拾取 && 手牌槽无 3 张同类可消(最后一步消除也计入)
 *           lose = 槽满 && 无三消可能 → hp=0
 *   - 道具: 撤回/移出/洗牌 每局限 3 次
 * 所有判定逻辑(win/lose/消除/道具)与旧版逐字一致, 由 src/game/core.test.ts 锁定,
 * 任何行为改动都需同步更新测试。
 */
import { HLGX_CATS, HLGX_SUBSTANCES, type Category, type Substance } from "./substances";
/* ==================== 布局配置 ==================== */
export const TILE_W = 50;        // 方块边长 px
export const CELL = 58;          // 网格单元(含间隙)px
export const TOOL_LIMIT = 3;     // 每个道具每局最多使用次数
export const COLOR_COUNT = 8;    // 卡牌配色(位置决定): 同层相邻块颜色不同

/* 难度分级: 简单=槽10+5层 / 标准=槽10+7层 / 困难=槽8+8层(原「挑战」, v2.2.2 改名)
   挑战=槽8+全新布局(4 小金字塔 + 4 根 3×3 柱子 + 倒置 8 层金字塔, 14 层 368 块, v2.2.3 槽改8) */
export const EXTREME_LAYERS = [1, 2, 3, 3, 3, 3, 8, 7, 6, 5, 4, 3, 2, 1]; // 每层单元尺寸标注(布局见 buildExtremeSlots)

export const HLGX_DIFFICULTIES = {
    easy:      { label: "简单", tray: 10, layers: [1, 2, 3, 4, 5] },
    normal:    { label: "标准", tray: 10, layers: [1, 2, 3, 4, 5, 6, 7] },
    challenge: { label: "困难", tray: 8,  layers: [1, 2, 3, 4, 5, 6, 7, 8] },
    extreme:   { label: "挑战", tray: 8,  layers: EXTREME_LAYERS },
} as const;
export type Mode = keyof typeof HLGX_DIFFICULTIES;

export interface Slot { r: number; c: number; L: number }

export interface Tile {
    id: number;
    r: number; c: number; L: number;
    x: number; y: number;        // 缓存像素坐标(isBlocked 不再重复计算)
    sub: Substance;
    color: number;               // 位置决定配色(同层相邻不同色)
    removed: boolean;
    blocked: boolean;
}

/* 操作返回码: 供 UI 提示文案/音效使用(行为与旧版一致) */
export type PickResult = "ok" | "blocked" | "trayFull" | "noop";
export type ClearResult = "cleared" | "wrongSet" | "noop";
export type ToolResult = "done" | "limit" | "empty";

/* ==================== 工具函数 ==================== */
export function shuffleArr<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* 正计时格式化 mm:ss */
export function fmtTime(s: number): string {
    const m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? "0" + m : m) + ":" + (ss < 10 ? "0" + ss : ss);
}

/* 物质的全部可消除类别(主类别 + 附加类别)
 * 有机酸(醋酸/苯甲酸/甲酸/草酸/甘氨酸等)同时按「酸」与「有机物」消除:
 *   - 与无机酸(盐酸/硫酸…)3 张共享 acid → 可消
 *   - 与甲烷/乙醇等 3 张共享 organic → 也可消 */
export function catsOf(s: Substance): Category[] {
    return s.multi ? [s.c, ...s.multi] : [s.c];
}

/* ==================== 坐标 / 遮挡 / 配色 ==================== */
export function buildSlots(layers: number[]): Slot[] {
    const slots: Slot[] = [];
    layers.forEach((S, L) => {
        for (let r = 0; r < S; r++)
            for (let c = 0; c < S; c++)
                slots.push({ r, c, L });   // L: 0 = 顶层
    });
    return slots;
}

/* 挑战模式(extreme)布局 —— 放弃单一金字塔, 三层结构(v2.2.2):
 *   第一楼层: 4 个相同的 3 层小金字塔(1×1, 2×2, 3×3)对称分布在四角
 *   第二楼层: 接在小金字塔下方的 4 根 3×3「柱子」(3 层)
 *   第三楼层: 倒置的 8 层金字塔(8×8 在顶, 1×1 在底, 居中)
 *   二三楼层联系: 4 根柱子的 3×3 底面恰好盖住 8×8 层的四角 3×3 区域
 *   总槽数 = 4×14(小金字塔) + 4×27(柱子) + 204(倒置金字塔) = 368
 * 四角 3×3 区域(基准 8×8 网格): 左上(0-2,0-2) 右上(0-2,5-7) 左下(5-7,0-2) 右下(5-7,5-7) */
export function buildExtremeSlots(): Slot[] {
    const corners = [{ r: 0, c: 0 }, { r: 0, c: 5 }, { r: 5, c: 0 }, { r: 5, c: 5 }];
    const slots: Slot[] = [];
    // 第一楼层: 4 个正金字塔(1×1 尖端 → 2×2 → 3×3, 逐层向右下收, 与困难模式金字塔一致)
    // 2×2 取 3×3 区域右下角, 尖端位于 2×2 左上角 —— 偏移方向统一, 正金字塔投影
    for (const p of corners) slots.push({ r: p.r + 1, c: p.c + 1, L: 0 });
    for (const p of corners)
        for (let dr = 1; dr < 3; dr++)
            for (let dc = 1; dc < 3; dc++)
                slots.push({ r: p.r + dr, c: p.c + dc, L: 1 });
    for (const p of corners)
        for (let dr = 0; dr < 3; dr++)
            for (let dc = 0; dc < 3; dc++)
                slots.push({ r: p.r + dr, c: p.c + dc, L: 2 });
    // 第二楼层: 4 根 3×3 柱子(3 层), 与小金字塔同区域
    for (let L = 3; L <= 5; L++)
        for (const p of corners)
            for (let dr = 0; dr < 3; dr++)
                for (let dc = 0; dc < 3; dc++)
                    slots.push({ r: p.r + dr, c: p.c + dc, L });
    // 第三楼层: 倒置 8 层金字塔(8×8 在顶被柱子遮挡, 逐层缩小至 1×1)
    for (let S = 8; S >= 1; S--) {
        const L = 6 + (8 - S);
        for (let r = 0; r < S; r++)
            for (let c = 0; c < S; c++)
                slots.push({ r, c, L });
    }
    return slots;
}

/* 各层在棋盘内同心居中, 构成正金字塔;
   挑战布局(14 层): L<7 的四角区域/8×8 层以 8×8 为基准不居中, L≥7 的倒置层居中 */
export function slotXY(s: Slot, layers: number[]): { x: number; y: number } {
    const S = layers[s.L];
    const max = Math.max(...layers);
    const isExtreme = layers.length >= 14;
    const base = isExtreme && s.L < 7 ? 0 : ((max - S) * CELL) / 2;
    return { x: base + s.c * CELL, y: base + s.r * CELL };
}

/* 纯算术重叠判断 */
export function overlapXY(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    return a.x < b.x + TILE_W && a.x + TILE_W > b.x &&
           a.y < b.y + TILE_W && a.y + TILE_W > b.y;
}

/* 位置决定颜色: 同层相邻块(±1格)必然不同色, 叠层也不同色; 对任意棋盘宽都成立 */
export function slotColorIdx(r: number, c: number, L: number): number {
    return (r + c + L) % COLOR_COUNT;
}

/* ==================== 生成方块物质序列 ====================
 * 按各类物质数量等比分配卡牌(取3的倍数), 保证任意物质出现概率近似相等,
 * 总数=棋盘槽数, 且各类卡牌数≡0或≡2(mod3)避免剩1张卡死
 */
export function buildStack(total: number): Substance[] {
    const cats = Object.keys(HLGX_CATS) as Category[];
    const byCat: Record<string, Substance[]> = {};
    cats.forEach(c => { byCat[c] = HLGX_SUBSTANCES.filter(s => s.c === c); });
    // 各类卡牌数 ∝ 该类物质数, 取3的倍数
    const counts: Record<string, number> = {};
    cats.forEach(c => {
        let n = Math.round(total * byCat[c].length / HLGX_SUBSTANCES.length);
        n = Math.round(n / 3) * 3;
        if (n < 3) n = 3;
        counts[c] = n;
    });
    // 轮流微调差额, 使总和=TOTAL且各类≡0或≡2(mod3), 永不≡1(避免剩1张卡死)
    const order = [...cats].sort((a, b) => byCat[b].length - byCat[a].length);
    const N = order.length;
    let diff = total - Object.values(counts).reduce((a, b) => a + b, 0);
    let idx = 0;
    while (diff < 0) {                       // 负差: 轮流减3
        let c = order[idx % N], guard = 0;
        while (counts[c] <= 3 && guard < N) { idx++; c = order[idx % N]; guard++; }
        if (counts[c] > 3) { counts[c] -= 3; diff += 3; idx++; }
        else break;
    }
    while (diff > 0) {                       // 正差: 轮流加3/2
        const c = order[idx % N];
        if (diff >= 3) { counts[c] += 3; diff -= 3; idx++; }
        else if (diff === 2) { counts[c] += 2; diff = 0; }
        else {                               // diff===1: 加2+2(净4)再从某类借3(净1)
            counts[order[idx % N]] += 2;
            counts[order[(idx + 1) % N]] += 2;
            const src = order.find(x => counts[x] > 3);
            counts[src || order[2]] -= 3;
            diff = 0;
        }
    }
    if (diff < 0) counts[order[0]] += diff;  // 极边缘兜底(仅保证总数正确)
    // 组卡: 每类随机洗牌后循环取物质(各物质出现近似均匀), 再全局打散
    const stack: Substance[] = [];
    cats.forEach(c => {
        const list = shuffleArr([...byCat[c]]);
        for (let k = 0; k < counts[c]; k++) stack.push(list[k % list.length]);
    });
    shuffleArr(stack);
    return stack;
}

/* ==================== 游戏状态机 ==================== */
export class HuaGame {
    mode: Mode = "normal";
    layers: number[] = [...HLGX_DIFFICULTIES.normal.layers];
    trayMax: number = HLGX_DIFFICULTIES.normal.tray;

    tiles: Tile[] = [];
    tray: Tile[] = [];
    selected: Tile[] = [];
    gameOver = false;
    win = false;
    hp = 3;                                  // 剩余血量(上限3)
    clears = 0;                              // 成功消除组数(排行榜排名依据之一, v2.2.0)
    toolUsed = { undo: 0, out: 0, shuffle: 0 };
    settled = false;                         // 结算是否已处理
    result: { win: boolean; remain: number; tools: number; clears: number } | null = null;

    private tilesByLayer: Tile[][] = [];
    private listener: (() => void) | null = null;

    constructor(mode: Mode = "normal") {
        this.applyMode(mode);
        this.newGame();
    }

    /* React 订阅: 每次状态变更后回调(用于触发重渲染) */
    onChange(fn: () => void) { this.listener = fn; }
    private emit() { this.listener?.(); }

    applyMode(mode: Mode) {
        const d = HLGX_DIFFICULTIES[mode];
        this.mode = mode;
        this.layers = [...d.layers];
        this.trayMax = d.tray;
    }

    /* 棋盘尺寸(px) = 所有方块最大外延 + 边距 */
    get boardW(): number {
        let m = 0;
        for (const t of this.tiles) m = Math.max(m, t.x + TILE_W);
        return m + 20;
    }
    get boardH(): number {
        let m = 0;
        for (const t of this.tiles) m = Math.max(m, t.y + TILE_W);
        return m + 20;
    }
    get remaining(): number {
        return this.tiles.filter(x => !x.removed).length;
    }

    /* ---- 新开一局 ---- */
    newGame() {
        this.tiles = []; this.tray = []; this.selected = [];
        this.gameOver = false; this.win = false;
        this.toolUsed = { undo: 0, out: 0, shuffle: 0 };
        this.hp = 3;
        this.clears = 0;
        this.settled = false;
        this.result = null;

        const slots = this.mode === "extreme" ? buildExtremeSlots() : buildSlots(this.layers);
        const stack = buildStack(slots.length);
        shuffleArr(stack);                    // 打散到各层

        this.tiles = slots.map((slot, i) => {
            const pos = slotXY(slot, this.layers);
            return {
                id: i, r: slot.r, c: slot.c, L: slot.L,
                x: pos.x, y: pos.y,           // 缓存坐标
                sub: stack[i], color: slotColorIdx(slot.r, slot.c, slot.L),
                removed: false, blocked: false,
            };
        });
        this.rebuildLayers();
        this.refreshBlocked();
        this.emit();
    }

    /* ---- 遮挡 ---- */
    private rebuildLayers() {
        this.tilesByLayer = [];
        this.layers.forEach(() => this.tilesByLayer.push([]));
        this.tiles.forEach(t => this.tilesByLayer[t.L].push(t));
    }

    /* 像素遮挡解锁: 只要被任何更上层方块盖住就不可点, 盖住它的方块被取走即解锁
       加速: 坐标已缓存, 遮挡只查更上层分组, 跳过已移除块
       (v2.2.5 恢复: 挑战模式同样使用遮挡关系, 不做层间整层锁定) */
    isBlocked(t: Tile): boolean {
        const pa = { x: t.x, y: t.y };
        for (let L = 0; L < t.L; L++) {
            for (const o of this.tilesByLayer[L]) {
                if (o.removed) continue;
                if (overlapXY(pa, { x: o.x, y: o.y })) return true;
            }
        }
        return false;
    }

    private refreshBlocked() {
        for (const t of this.tiles) {
            if (t.removed) continue;
            t.blocked = this.isBlocked(t);    // 仅状态变化时 UI 才需要动
        }
    }

    /* ---- 点击方块入槽 ---- */
    pickTile(t: Tile): PickResult {
        if (t.removed || this.gameOver || this.win) return "noop";
        if (this.isBlocked(t)) return "blocked";
        if (this.tray.length >= this.trayMax) return "trayFull";

        t.removed = true;
        this.tray.push(t);
        this.refreshBlocked();
        this.checkWin();
        this.checkLose();
        this.emit();
        return "ok";
    }

    /* ---- 手牌区: 选择与手动消除 ---- */
    toggleSelect(t: Tile) {
        if (this.gameOver || this.win) return;
        const i = this.selected.indexOf(t);
        if (i >= 0) { this.selected.splice(i, 1); } else { this.selected.push(t); }
        this.emit();
    }

    clearSelected(): ClearResult {
        if (this.gameOver || this.win || this.selected.length !== 3) return "noop";
        // 3 张牌需存在共同类别(有机酸等双类别物质可与两类分别配对)
        let common = catsOf(this.selected[0].sub);
        for (let i = 1; i < this.selected.length && common.length > 0; i++) {
            const cs = catsOf(this.selected[i].sub);
            common = common.filter((c) => cs.includes(c));
        }
        if (common.length === 0) {
            // 3 张无共同类别 → 扣 1 血, 不消除
            this.hp--;
            this.selected = [];
            this.emit();
            if (this.hp <= 0) this.lose();
            return "wrongSet";
        }
        const sel = this.selected;
        this.tray = this.tray.filter(x => !sel.includes(x));
        this.selected = [];
        this.clears++;                         // 成功消除一组(v2.2.0 计入排行榜)
        this.refreshBlocked();
        this.checkWin();
        this.checkLose();
        this.emit();
        return "cleared";
    }

    /* ---- 道具(每局限3次) ---- */
    /* 撤回: 槽内最后一块放回棋盘(原位被占则随机挪到空位) */
    undo(): ToolResult {
        if (this.gameOver || this.win || this.tray.length === 0) return "empty";
        if (this.toolUsed.undo >= TOOL_LIMIT) return "limit";
        this.toolUsed.undo++;
        const t = this.tray.pop()!;
        this.selected = this.selected.filter(x => x !== t);
        const occupied = this.tiles.some(x => !x.removed && x !== t && x.r === t.r && x.c === t.c && x.L === t.L);
        if (occupied) {
            const free = this.tiles.filter(x => x.removed && !this.tray.includes(x) && !this.selected.includes(x));
            if (free.length === 0) {
                // 无空位可回 → 放回槽内(次数已消耗, 与旧版一致)
                this.tray.push(t);
                this.emit();
                return "done";
            }
            const s = free[Math.floor(Math.random() * free.length)];
            t.r = s.r; t.c = s.c; t.L = s.L;
            t.x = s.x; t.y = s.y;             // 同步缓存坐标
            t.color = slotColorIdx(s.r, s.c, s.L);
        }
        t.removed = false;
        this.rebuildLayers();                 // 层级可能变化, 重建分组索引
        this.refreshBlocked();                // 放回的卡需重算遮挡状态(v2.2.0 修复)
        this.emit();
        return "done";
    }

    /* 移出: 槽内最靠前3块放回棋盘 —— 原位空置者放回原位, 原位被占者挪到空槽
       v2.2.0 修复: 旧实现仅找「其它空槽」, 手牌槽里的卡都取自棋盘原位时
       空槽集合为空 → 整批退回且次数已消耗, 表现为「移出不生效」 */
    moveOut(): ToolResult {
        if (this.gameOver || this.win || this.tray.length === 0) return "empty";
        if (this.toolUsed.out >= TOOL_LIMIT) return "limit";
        this.toolUsed.out++;
        const take = this.tray.splice(0, Math.min(3, this.tray.length));
        this.selected = this.selected.filter(x => !take.includes(x));
        // 棋盘上仍被占据的位置(未移除的卡 + 仍在手牌槽/选中区的卡)
        const occupied = new Set(
            this.tiles.filter(x => !x.removed || this.tray.includes(x) || this.selected.includes(x))
                .map(x => x.r + "," + x.c + "," + x.L));
        // 可挪用的空槽: 已拾取、不在手牌槽/选中区、且非 take 自身
        const freeSlots = this.tiles.filter(x => x.removed && !this.tray.includes(x) && !take.includes(x) && !this.selected.includes(x));
        // 1) 原位空置的卡直接放回原位
        const toReloc: Tile[] = [];
        for (const t of take) {
            const key = t.r + "," + t.c + "," + t.L;
            if (!occupied.has(key)) {
                t.removed = false;
                occupied.add(key);
            } else {
                toReloc.push(t);
            }
        }
        // 2) 原位被占的卡挪到其它空槽(空槽不足则留在槽内, 顺序保持)
        shuffleArr(freeSlots);
        const stuck: Tile[] = [];
        for (const t of toReloc) {
            const s = freeSlots.shift();
            if (!s) { stuck.push(t); continue; }
            t.r = s.r; t.c = s.c; t.L = s.L;
            t.x = s.x; t.y = s.y;             // 同步缓存坐标
            t.removed = false;
            t.color = slotColorIdx(s.r, s.c, s.L);
        }
        if (stuck.length) this.tray.unshift(...stuck);
        this.rebuildLayers();
        this.refreshBlocked();                // 放回的卡需重算遮挡状态
        this.emit();
        return "done";
    }

    /* 洗牌: 打乱剩余方块的物质身份 */
    shuffleTiles(): ToolResult {
        if (this.gameOver || this.win) return "empty";
        if (this.toolUsed.shuffle >= TOOL_LIMIT) return "limit";
        this.toolUsed.shuffle++;
        const alive = this.tiles.filter(t => !t.removed);
        const subs = shuffleArr(alive.map(t => t.sub));
        alive.forEach((t, i) => { t.sub = subs[i]; });
        this.emit();
        return "done";
    }

    /* ---- 胜负判定(与旧版逐字一致, 勿改) ---- */
    /* 是否存在可消除组合: 某类别至少有 3 张(多类别物质按全部类别计数,
       如醋酸既计入 acid 也计入 organic) */
    canEliminate(): boolean {
        const counts: Record<string, number> = {};
        this.tray.forEach(x => {
            for (const cat of catsOf(x.sub)) counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.values(counts).some(c => c >= 3);
    }

    /* 过关 = 全部卡牌被拾取 且 手牌槽无 3 张同类可消(最后一次消除也纳入考察,
       拾取完还需完成手牌里的三消, 消除后仍有三消可能则继续消, 直到无三消组合才通关) */
    checkWin() {
        if (this.gameOver || this.win) return;
        if (this.tiles.every(x => x.removed) && !this.canEliminate()) {
            this.tray = [];
            this.selected = [];
            this.win = true;
            this.showWin();
        }
    }

    checkLose() {
        if (this.gameOver || this.win) return;
        if (this.tray.length >= this.trayMax && !this.canEliminate()) { this.lose(); }
    }

    lose() {
        this.hp = 0;                          // 槽满无三消 → 扣除剩余全部血量并立即失败
        this.gameOver = true;
        this.settle(false);
    }

    private showWin() {
        this.gameOver = true; this.win = true;
        this.settle(true);
    }

    private settle(isWin: boolean) {
        if (this.settled) return;
        this.settled = true;
        this.result = {
            win: isWin,
            remain: this.tiles.filter(x => !x.removed).length,
            tools: this.toolUsed.undo + this.toolUsed.out + this.toolUsed.shuffle,
            clears: this.clears,
        };
        this.emit();
    }
}
