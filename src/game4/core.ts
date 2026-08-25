/*
 * 分了个类 · 核心逻辑 (src/game4/core.ts) —— 纯逻辑, 无 DOM
 * =====================================================
 * 玩法(v1.0.0): 传送带式物质分类 ——
 *   物质卡按固定间隔从流水线右端出现(匀速左移入位), 流水线最多容纳 5 张;
 *   玩家把物质卡拖入 8 类按钮之一: 类别正确 → 得 1 分并移除卡牌;
 *   归错 → 扣 1 血(共 3 血), 卡牌留在流水线上;
 *   有机酸(醋酸/甲酸/草酸/苯甲酸/甘氨酸)按「酸」或「有机物」均算对(双类均可)。
 * 判负(两种): ① 血量归零;
 *   ② 「新卡该出现的时刻」流水线已满 5 张 —— 注意不是满 5 张立刻判负,
 *      玩家拥有整个出牌间隔的时间清理空位; 20 张全部出完后不再出牌, 也不会判负。
 * 判胜: 本局 20 张物质全部被正确分类。
 * 难度: 简单(类别均衡抽样, 间隔 7s) / 标准(均衡 + 30% 掺入易错物质, 间隔 5s)
 *       / 困难(全库 259 种随机, 间隔 3s)。
 * 「直接弹出下一张」(v1.1.0): 立即触发一次出牌时刻, 内置 1s 冷却防连点。
 */
import { HLGX_CATS, HLGX_SUBSTANCES, type Category, type Substance } from "../game/substances";

export type FlglMode = "easy" | "normal" | "hard";

export const BELT_CAPACITY = 5;   // 流水线容量(满载后新卡到点即判负)
export const ROUND_TOTAL = 20;    // 每局物质总数
export const SPAWN_NOW_CD = 1;    // 「直接弹出下一张」冷却(秒, 防误触连点)

export const FLGL_MODES: { mode: FlglMode; label: string }[] = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "hard", label: "困难" },
];

/** 出牌间隔(秒): 也即满载后留给玩家的清理时间(v1.1.0 三档各缩短 2s) */
export const FLGL_INTERVAL: Record<FlglMode, number> = { easy: 7, normal: 5, hard: 3 };

const CATS: Category[] = ["metal", "nonmetal", "oxide", "acid", "base", "salt", "organic", "mix"];

/** 易错物质清单(标准难度 30% 概率掺入): 混合物易错 / 同素异形体 / 溶液与纯净物对应 */
export const TRICKY_NAMES = new Set([
    "盐酸", "氨水", "水玻璃", "漂白液", "王水", "稀硫酸", "酒精", "生铁", "钢", "青铜",
    "黄铜", "硬铝", "18K金", "普通玻璃", "水泥", "陶瓷", "石灰石", "漂白粉", "碱石灰", "铝热剂",
    "石油", "煤", "天然气", "汽油", "煤油", "柴油", "石蜡", "焦炉煤气", "煤焦油", "润滑油",
    "氯化氢", "一水合氨", "金刚石", "石墨烯", "富勒烯", "红磷", "白磷", "云", "雾", "烟",
    "泥水", "油水混合物", "氢氧化铁胶体", "有色玻璃",
]);
export const TRICKY_POOL = HLGX_SUBSTANCES.filter((s) => TRICKY_NAMES.has(s.n));

const BY_CAT: Record<Category, Substance[]> = Object.fromEntries(
    CATS.map((c) => [c, HLGX_SUBSTANCES.filter((s) => s.c === c)]),
) as Record<Category, Substance[]>;

/** 该物质可接受的类别集合 = 主类 + multi(有机酸双身份) */
export function acceptCats(s: Substance): Set<Category> {
    return new Set<Category>(s.multi ? [s.c, ...s.multi] : [s.c]);
}

/** 归错时的教育提示: 告知正确类别 */
export function wrongHint(sub: Substance): string {
    const labels = [...acceptCats(sub)].map((c) => HLGX_CATS[c].label);
    return `「${sub.n}」属于 ${labels.join(" / ")}${labels.length > 1 ? "(双类均可)" : ""}`;
}

function pickUnused(list: Substance[], used: Set<string>, rng: () => number): Substance | null {
    for (let t = 0; t < 30; t++) {
        const s = list[Math.floor(rng() * list.length)];
        if (s && !used.has(s.n)) return s;
    }
    return list.find((s) => !used.has(s.n)) ?? null;
}

/**
 * 构建一局的 20 张物质(顺序即出牌顺序)。
 * 简单/标准: 前 16 张按 8 类两轮洗牌保证均衡(每类恰 2 张), 后 4 张随机类别;
 * 标准: 每张 30% 概率改为从易错池抽取; 困难: 完全随机。
 * rng 可注入(测试用)。
 */
export function buildDeck(mode: FlglMode, rng: () => number = Math.random): Substance[] {
    const used = new Set<string>();
    const deck: Substance[] = [];
    let seq: Category[];
    if (mode === "hard") {
        seq = Array.from({ length: ROUND_TOTAL }, () => CATS[Math.floor(rng() * CATS.length)]);
    } else {
        const two: Category[] = [...CATS, ...CATS];
        for (let i = two.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [two[i], two[j]] = [two[j], two[i]];
        }
        seq = [...two, ...Array.from({ length: ROUND_TOTAL - two.length }, () => CATS[Math.floor(rng() * CATS.length)])];
    }
    for (const cat of seq) {
        const list = mode === "normal" && rng() < 0.3 && TRICKY_POOL.length > 0 ? TRICKY_POOL : BY_CAT[cat];
        const s = pickUnused(list, used, rng);
        if (s) { used.add(s.n); deck.push(s); }
    }
    while (deck.length < ROUND_TOTAL) {
        const s = pickUnused(HLGX_SUBSTANCES, used, rng) ?? HLGX_SUBSTANCES[deck.length % HLGX_SUBSTANCES.length];
        if (!used.has(s.n)) { used.add(s.n); deck.push(s); }
    }
    return deck;
}

export interface FlglCard {
    id: number;      // 局内唯一编号(拖拽/判定用)
    sub: Substance;  // 物质(f 化学式 / n 名称 / c 主类 / multi 附加类)
}

export type FlglPhase = "playing" | "win" | "lose";
export type LoseReason = "hp" | "overflow";

/** 最近一次判定(界面反馈用: 闪烁类别按钮 / 显示教育提示) */
export interface FlglJudge {
    id: number;
    cat: Category;   // 玩家选择的类别
    ok: boolean;
    sub: Substance;
}

export interface FlglState {
    phase: FlglPhase;
    mode: FlglMode;
    deck: Substance[];      // 本局 20 张(顺序即出牌顺序)
    belt: FlglCard[];       // 流水线上的卡(下标 0 = 最左)
    spawned: number;        // 已出现张数
    nextId: number;
    spawnIn: number;        // 距下一张出现还有几秒(≤0 → 出牌时刻)
    spawnCd: number;        // 「直接弹出下一张」剩余冷却秒数(v1.1.0)
    elapsed: number;        // 已进行秒数
    score: number;          // 正确分类数
    hp: number;             // 剩余血量(初始 3)
    mistakes: number;       // 归错次数(结算展示)
    loseReason?: LoseReason;
    lastJudge?: FlglJudge;
}

export function newGame(mode: FlglMode, rng: () => number = Math.random): FlglState {
    return {
        phase: "playing",
        mode,
        deck: buildDeck(mode, rng),
        belt: [],
        spawned: 0,
        nextId: 1,
        spawnIn: 0,   // 首张立刻出现(tick 后入带)
        spawnCd: 0,
        elapsed: 0,
        score: 0,
        hp: 3,
        mistakes: 0,
    };
}

/** 推进 dt 秒: 计时 + 冷却递减 + 出牌时刻处理(满载判负 / 出牌并重置间隔) */
export function tick(st: FlglState, dt: number): FlglState {
    if (st.phase !== "playing") return st;
    let { spawnIn, spawned, belt, nextId, elapsed } = st;
    const spawnCd = Math.max(0, st.spawnCd - dt);
    let phase: FlglPhase = st.phase;
    let loseReason = st.loseReason;
    elapsed += dt;
    spawnIn -= dt;
    if (spawnIn <= 0 && spawned < st.deck.length) {
        if (belt.length >= BELT_CAPACITY) {
            // 用户规则: 不是满 5 张立刻判负 —— 拖到「新卡该出现」这一刻才判负
            phase = "lose";
            loseReason = "overflow";
        } else {
            belt = [...belt, { id: nextId, sub: st.deck[spawned] }];
            nextId += 1;
            spawned += 1;
            spawnIn = FLGL_INTERVAL[st.mode];
        }
    }
    return { ...st, phase, loseReason, spawnIn, spawned, belt, nextId, elapsed, spawnCd };
}

/**
 * 「直接弹出下一张」(v1.1.0): 立即触发一次出牌时刻。
 * 冷却中(spawnCd > 0)/已出完/非进行中 → 原样返回(界面按钮同步置灰);
 * 满载时点击 = 新卡到达时刻 → 按规则判负(overflow);否则出牌并重置出牌间隔与冷却。
 */
export function spawnNow(st: FlglState): FlglState {
    if (st.phase !== "playing" || st.spawnCd > 0 || st.spawned >= st.deck.length) return st;
    const base = { ...st, spawnCd: SPAWN_NOW_CD };
    if (st.belt.length >= BELT_CAPACITY) {
        return { ...base, phase: "lose", loseReason: "overflow" as LoseReason };
    }
    return {
        ...base,
        belt: [...st.belt, { id: st.nextId, sub: st.deck[st.spawned] }],
        nextId: st.nextId + 1,
        spawned: st.spawned + 1,
        spawnIn: FLGL_INTERVAL[st.mode],
    };
}

/** 把某张卡判入 cat: 正确 → 移除+得分(全部正确 → win);错误 → 扣血(归零 → lose), 卡牌保留 */
export function judge(st: FlglState, cardId: number, cat: Category): FlglState {
    if (st.phase !== "playing") return st;
    const card = st.belt.find((c) => c.id === cardId);
    if (!card) return st;
    const ok = acceptCats(card.sub).has(cat);
    if (!ok) {
        const hp = st.hp - 1;
        return {
            ...st,
            hp,
            mistakes: st.mistakes + 1,
            phase: hp <= 0 ? "lose" : "playing",
            loseReason: hp <= 0 ? "hp" : st.loseReason,
            lastJudge: { id: cardId, cat, ok: false, sub: card.sub },
        };
    }
    const belt = st.belt.filter((c) => c.id !== cardId);
    const score = st.score + 1;
    return {
        ...st,
        belt,
        score,
        phase: score >= st.deck.length ? "win" : "playing",
        lastJudge: { id: cardId, cat, ok: true, sub: card.sub },
    };
}
