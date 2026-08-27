/*
 * p了个s · 管理后台榜单管理 API(全部需管理会话)
 * 支持三款游戏独立榜单(化了个学 hlgx / 英了个语 ylgy / 错了个字 clgz):
 *   GET    /admin/api/rank?game=X&mode=Y[&q=昵称关键字]   → 榜单(含管理索引 key, 可搜索)
 *   DELETE /admin/api/rank?game=X&key=N&mode=Y            → 单条删除(按存储数组索引)
 *   DELETE /admin/api/rank?game=X&mode=Y|all              → 清空该游戏单难度 / 该游戏全部
 * 每次删除/清榜都写审计日志(带游戏标识)。
 */
import { MODES as HLGX_MODES, sortRank, fmtDate, json } from "../../_lib/ranklib.js";
import { verifySession, unauthorized, csrfGuard } from "../../_lib/auth.js";
import { clientIp } from "../../_lib/ratelimit.js";
import { appendAudit } from "../../_lib/audit.js";

/* 各游戏: KV 键前缀 + 可选难度 + 排序规则 */
const YLGY_MODES = ["easy", "normal", "hard"];
const CLGZ_MODES = ["all"];
const FLGL_MODES = ["easy", "normal", "hard"];
const PLGP_MODES = ["easy", "normal", "hard"];

/** 得分制排序(错了个字/分了个类): 得分↓ → 用时↑ */
function clgzCmpKey(e) {
    return [-(e.score | 0), e.time | 0];
}
function clgzSort(entries) {
    return [...entries].sort((a, b) => {
        const ka = clgzCmpKey(a), kb = clgzCmpKey(b);
        for (let i = 0; i < ka.length; i++) {
            if (ka[i] !== kb[i]) return ka[i] - kb[i];
        }
        return 0;
    });
}

/** 配了个平排序: 得分↓ → 用时↑ → 提示使用↑ */
function plgpCmpKey(e) {
    return [-(e.score | 0), e.time | 0, e.tools | 0];
}
function plgpSort(entries) {
    return [...entries].sort((a, b) => {
        const ka = plgpCmpKey(a), kb = plgpCmpKey(b);
        for (let i = 0; i < ka.length; i++) {
            if (ka[i] !== kb[i]) return ka[i] - kb[i];
        }
        return 0;
    });
}

const GAMES = {
    hlgx: { label: "化了个学", modes: HLGX_MODES, prefix: "", sort: sortRank },
    ylgy:   { label: "英了个语", modes: YLGY_MODES, prefix: "ylgy:", sort: sortRank },
    clgz: { label: "错了个字", modes: CLGZ_MODES, prefix: "clgz:", sort: clgzSort },
    flgl: { label: "分了个类", modes: FLGL_MODES, prefix: "flgl:", sort: clgzSort },
    plgp: { label: "配了个平", modes: PLGP_MODES, prefix: "plgp:", sort: plgpSort },
};

async function loadMode(env, game, mode) {
    const raw = await env.RANKINGS.get(game.prefix + mode);
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}
async function saveMode(env, game, mode, list) {
    await env.RANKINGS.put(game.prefix + mode, JSON.stringify(list));
}

async function authed(env, request) {
    return await verifySession(env, request);
}

function parseGame(url) {
    const g = url.searchParams.get("game") || "hlgx";
    return GAMES[g] ? { key: g, ...GAMES[g] } : null;
}

export async function onRequestGet({ request, env }) {
    if (!(await authed(env, request))) return unauthorized();
    const url = new URL(request.url);
    const game = parseGame(url);
    if (!game) return json({ ok: false, msg: "参数错误" }, 400);
    const mode = url.searchParams.get("mode") || game.modes[0];
    if (!game.modes.includes(mode)) return json({ ok: false, msg: "参数错误" }, 400);

    const raw = await loadMode(env, game, mode);
    const sorted = game.sort(raw);
    const rank = sorted.map((e) => ({ ...e, key: raw.indexOf(e) }));
    const q = (url.searchParams.get("q") || "").trim();
    const filtered = q ? rank.filter((e) => String(e.name).includes(q)) : rank;
    return json({ game: game.key, mode, total: raw.length, rank: filtered });
}

export async function onRequestDelete({ request, env }) {
    const sess = await authed(env, request);
    if (!sess) return unauthorized();
    const csrf = csrfGuard(request);   // v2.8.0: 跨站请求防护
    if (csrf) return csrf;
    const ip = clientIp(request);
    const url = new URL(request.url);
    const game = parseGame(url);
    if (!game) return json({ ok: false, msg: "参数错误" }, 400);
    const mode = url.searchParams.get("mode") || "";
    const key = url.searchParams.get("key");

    /* 单条删除 */
    if (key !== null) {
        if (!game.modes.includes(mode)) return json({ ok: false, msg: "参数错误" }, 400);
        const raw = await loadMode(env, game, mode);
        const i = Number.parseInt(key, 10);
        if (!Number.isInteger(i) || i < 0 || i >= raw.length) {
            return json({ ok: false, msg: "记录不存在" }, 404);
        }
        // v2.8.0 竞态防护: 前端附带期望删除的昵称/日期, 不匹配说明榜单已被并发修改,
        // 拒绝执行并提示刷新(防两个管理员同时删不同记录时互相覆盖误删)
        const expectName = url.searchParams.get("name");
        const expectDate = url.searchParams.get("date");
        const cur = raw[i];
        if ((expectName !== null && cur.name !== expectName) || (expectDate !== null && cur.date !== expectDate)) {
            return json({ ok: false, msg: "榜单已变化,请刷新后重试" }, 409);
        }
        const [removed] = raw.splice(i, 1);
        await saveMode(env, game, mode, raw);
        await appendAudit(env, {
            actor: "admin", action: "rank_delete_one", ip,
            detail: `${game.label} ${mode} 删除 ${removed.name}(${removed.hp}/${removed.time}/${removed.tools}${removed.score !== undefined ? "/" + removed.score + "分" : ""})`,
        });
        return json({ ok: true, msg: `已删除 ${removed.name} 的记录` });
    }

    /* 清空该游戏单难度(若该游戏只有一个难度且 mode 即该难度, 与清空全部等价) */
    if (game.modes.includes(mode)) {
        if (mode === "all") {
            // 单难度游戏(错了个字)的「全部」= 清空唯一难度, 走全部分支文案
            let total = 0;
            for (const m of game.modes) {
                total += (await loadMode(env, game, m)).length;
                await saveMode(env, game, m, []);
            }
            await appendAudit(env, { actor: "admin", action: "rank_clear_all", ip, detail: `${game.label} 清空全部 ${total} 条` });
            return json({ ok: true, msg: `已清空 ${game.label} 全部榜单` });
        }
        const count = (await loadMode(env, game, mode)).length;
        await saveMode(env, game, mode, []);
        await appendAudit(env, { actor: "admin", action: "rank_clear_mode", ip, detail: `${game.label} ${mode} 清空 ${count} 条` });
        return json({ ok: true, msg: `已清空 ${game.label} ${mode} 榜单` });
    }
    /* 清空该游戏全部难度 */
    if (mode === "all") {
        let total = 0;
        for (const m of game.modes) {
            total += (await loadMode(env, game, m)).length;
            await saveMode(env, game, m, []);
        }
        await appendAudit(env, { actor: "admin", action: "rank_clear_all", ip, detail: `${game.label} 清空全部 ${total} 条` });
        return json({ ok: true, msg: `已清空 ${game.label} 全部榜单` });
    }
    return json({ ok: false, msg: "参数错误" }, 400);
}
