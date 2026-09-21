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
import { PLATFORM_VERSION } from "@/version";
import { CLGZ_VERSION } from "@/game3/version";

export interface UpdateItem {
    tag: string;      // 游戏/平台名
    version: string;
    text: string;     // 玩家视角的一句话说明
}

export const UPDATE_SEEN_KEY = "hlgx_update_seen";

export const UPDATE_ITEMS: UpdateItem[] = [
    // 维护约定严格执行: 只列「本批」改动, 旧批条目清除 —— 否则弹窗与上一批几乎相同, 玩家会以为日志没更新
    { tag: "错了个字", version: CLGZ_VERSION, text: "AI 手写识别成为唯一判定:识别更准了,并移除旧的字形重合度比对(不再提示「太潦草了」);手机端顶栏布局优化。" },
    { tag: "平台", version: PLATFORM_VERSION, text: "主界面六款游戏的简介全面更新至现版本,新玩法(草稿模式、方位按键、同年并列、错题回看)一眼可见。" },
];

function hashId(str: string): string {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return "u" + h.toString(36);
}

export const UPDATE_ID = hashId(JSON.stringify(UPDATE_ITEMS));
