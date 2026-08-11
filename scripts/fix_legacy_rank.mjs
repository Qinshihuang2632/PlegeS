/*
 * 化了个学 · 旧排行榜记录修正 (fix_legacy_rank.mjs) —— 一次性数据迁移
 * ==============================================================
 * 用法: node scripts/fix_legacy_rank.mjs [--write]
 * 读取 .wrangler/kv-migrate/{mode}-raw.json(由 GET 接口导出的全量榜单),
 * 对 v2.2.0 之前的旧记录(v2.2.1 规则):
 *   1) 通关记录(hp>0)补「大约消除组数」= 该难度全部卡牌数 / 3 向下取整
 *      (easy 55→18 / normal 140→46 / challenge 204→68)
 *   2) 0 心失败记录不填组数(排序时按「用时越长越靠前」, 见 ranklib.cmpKey)
 *   3) 按上榜日期推断通关版本: 08-09 → ≤v2.0.2; 08-10 → ≤v2.1.8;
 *      08-11 凌晨(v2.2.0 部署前) → v2.1.9
 *   4) 按新排序规则重排后输出 {mode}-fixed.json; --write 时由调用方 wrangler kv put 写回
 */
import { readFileSync, writeFileSync } from "node:fs";
import { sortRank } from "../functions/_lib/ranklib.js";

const CARDS = { easy: 55, normal: 140, challenge: 204 };   // 各难度卡牌总数
const MODES = ["easy", "normal", "challenge"];
const DIR = new URL("../.wrangler/kv-migrate/", import.meta.url);

/* 按上榜日期推断通关版本(v2.2.1): 范围过大或无法判断时写「不超过 x.y.z」 */
function inferVersion(date) {
    if (typeof date !== "string") return "旧版";
    if (date.startsWith("2026-08-09")) return "≤v2.0.2";   // 当日发布 v2.0.0~v2.0.2 共 4 版
    if (date.startsWith("2026-08-10")) return "≤v2.1.8";   // 当日发布 v2.1.0~v2.1.8 共 8 版
    if (date.startsWith("2026-08-11")) return "v2.1.9";    // v2.2.0 部署前的凌晨记录
    return "旧版";
}

const out = {};
for (const mode of MODES) {
    const raw = JSON.parse(readFileSync(new URL(`${mode}-raw.json`, DIR), "utf-8"));
    const fixed = (raw.rank || []).map((e) => {
        const c = { ...e };
        if (c.clears === undefined && (c.hp | 0) > 0) {
            c.clears = Math.floor(CARDS[mode] / 3);   // 通关 ≈ 消完全部卡牌
        }
        if (c.version === undefined) {
            c.version = inferVersion(c.date);
        }
        return c;
    });
    out[mode] = sortRank(fixed);
    writeFileSync(new URL(`${mode}-fixed.json`, DIR), JSON.stringify(out[mode], null, 2), "utf-8");
    console.log(`== ${mode} (${out[mode].length} 条) ==`);
    for (const e of out[mode]) {
        console.log(`  ${e.name} | hp${e.hp} | ${e.time}s | clears=${e.clears ?? "—(0心无数据,按用时降序)"} | ${e.version}`);
    }
}
console.log("\n修正文件已生成: .wrangler/kv-migrate/{mode}-fixed.json");
console.log("确认无误后执行: npx wrangler kv key put <mode> --path=.wrangler/kv-migrate/<mode>-fixed.json --binding=RANKINGS --remote");
