/*
 * 化了个学 · 排行榜共享逻辑 (Pages Functions 内部模块, 下划线开头 = 非路由)
 * =====================================================================
 * 迁移自 Flask hlgx_rank.py, 契约与原版一致, v2.2.0 扩展:
 *   - 排序规则(严格): hp 从大到小 → clears(成功消除组数)从大到小
 *     → time 从小到大 → tools 从小到大
 *     说明: clears 与剩余血量同为排名依据(v2.2.0)——0 心失败玩家中,
 *     坚持消除更多组数(耗时更久)者排前, 高于开局速败玩家
 *   - KV 存储: 一个 namespace(binding=RANKINGS), key=mode, value=榜单数组 JSON
 *   - 日期格式: YYYY-MM-DD HH:MM(固定 Asia/Shanghai 时区, 与原 Flask 本地时区行为一致)
 */
export const MODES = ["easy", "normal", "challenge"];

/* 排序键: hp 取负 → 血量多排前; clears 取负 → 消除组数多排前; 时间短排前; 技能少排前 */
export function cmpKey(e) {
    return [-(e.hp | 0), -(e.clears | 0), e.time | 0, e.tools | 0];
}

/* 字典序比较 a < b (数组比较, 等价 Python 元组比较) */
export function keyLess(a, b) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] < b[i];
    }
    return false;
}

export function sortRank(entries) {
    return [...entries].sort((a, b) => {
        const ka = cmpKey(a), kb = cmpKey(b);
        for (let i = 0; i < ka.length; i++) {
            if (ka[i] !== kb[i]) return ka[i] - kb[i];
        }
        return 0;
    });
}

/* 当前时间 → "YYYY-MM-DD HH:MM" (东八区, 与原 Flask 服务器本地时间行为对齐) */
export function fmtDate(d = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Shanghai",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(d);
    const p = (t) => parts.find((x) => x.type === t).value;
    return `${p("year")}-${p("month")}-${p("day")} ${p("hour")}:${p("minute")}`;
}

/* 数值夹取: 非法/缺失 → dflt (等价 Flask int()+max/min 夹取) */
export function clampInt(v, lo, hi, dflt = 0) {
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n)) return dflt;
    return Math.max(lo, Math.min(hi, n));
}

/* ---- KV 读写: binding = RANKINGS, key = mode ---- */
export async function loadMode(env, mode) {
    const raw = await env.RANKINGS.get(mode);
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

export async function saveMode(env, mode, list) {
    await env.RANKINGS.put(mode, JSON.stringify(list));
}

/* 合并三个难度的全部条目(扁平数组, 供查重/建议使用) */
export async function loadAll(env) {
    const out = [];
    for (const m of MODES) out.push(...(await loadMode(env, m)));
    return out;
}

/* 统一 JSON 响应 (中文 UTF-8) */
export function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
    });
}
