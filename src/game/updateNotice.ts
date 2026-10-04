/*
 * 平台更新日志(玩家弹窗数据源) (src/game/updateNotice.ts)
 * ========================================================
 * 约定(2026-09-05 确立, 见 docs/CONVENTIONS.md「常规更新路径」):
 *   每次更新(平台或任意游戏)在 git 同步前, 由模型生成本文件的「玩家视角」更新条目
 *   交用户检查确认; 玩家打开平台时若 UPDATE_ID 变化则弹一次更新日志, 关闭后不再弹。
 * UPDATE_ID(v2.9.5 修复) = 「日志内容哈希」—— 条目不变则不重复弹(旧版按版本拼接,
 *   版本一变就重弹, 即使日志内容与上次完全相同)。
 * 维护方式: 每次更新重写 UPDATE_ITEMS 为「本批」改动(玩家视角, 不写内部术语), 旧条目清除。
 */
import { MLGX_VERSION } from "@/game6/version";

export interface UpdateItem {
    tag: string;      // 游戏/平台名
    version: string;
    text: string;     // 玩家视角的一句话说明
}

export const UPDATE_SEEN_KEY = "hlgx_update_seen";

export const UPDATE_ITEMS: UpdateItem[] = [
    // 维护约定严格执行: 只列「本批」改动, 旧批条目清除
    { tag: "默了个写", version: MLGX_VERSION, text: "两处玩法优化:飞花令改为「缺字判断」(每句藏一字,凭记忆勾选,不再考验眼力);情景拼句不再提示字数,标点直接给出,考真正的句读记忆。" },
];
function hashId(str: string): string {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return "u" + h.toString(36);
}

export const UPDATE_ID = hashId(JSON.stringify(UPDATE_ITEMS));
