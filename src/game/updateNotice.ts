/*
 * 平台更新日志(玩家弹窗数据源) (src/game/updateNotice.ts)
 * ========================================================
 * 约定(2026-09-05 确立, 见 docs/CONVENTIONS.md「常规更新路径」):
 *   每次更新(平台或任意游戏)在 git 同步前, 由模型生成本文件的「玩家视角」更新条目
 *   交用户检查确认; 玩家打开平台时若 UPDATE_ID 变化则弹一次更新日志, 关闭后不再弹。
 * UPDATE_ID = 平台版本 + 各在线游戏版本拼接 —— 任一版本变化即视为一次新更新。
 * 维护方式: 每次更新重写 UPDATE_ITEMS 为「本批」改动(玩家视角, 不写内部术语), 旧条目清除。
 */
import { APP_VERSION, PLATFORM_VERSION } from "@/version";
import { YLGY_VERSION } from "@/game2/version";
import { FLGL_VERSION } from "@/game4/version";
import { PLGP_VERSION } from "@/game5/version";
import { LLGS_VERSION } from "@/game7/version";

export interface UpdateItem {
    tag: string;      // 游戏/平台名
    version: string;
    text: string;     // 玩家视角的一句话说明
}

export const UPDATE_SEEN_KEY = "hlgx_update_seen";

export const UPDATE_ID = [
    PLATFORM_VERSION,
    APP_VERSION,
    YLGY_VERSION,
    FLGL_VERSION,
    LLGS_VERSION,
].join("|");

export const UPDATE_ITEMS: UpdateItem[] = [
    { tag: "历了个史", version: LLGS_VERSION, text: "交互重做:点选卡牌后用方位按键移动(更好按);困难模式支持同年事件上下并列;题库扩充至 240 条。" },
    { tag: "化了个学", version: APP_VERSION, text: "手游棋盘显示修复(左右对称居中)、卡片稍大、卡面文字明显放大,长名称分行显示更清楚。" },
    { tag: "英了个语", version: YLGY_VERSION, text: "新增草稿模式:拿不准的字母先打草稿(不触发判定),确定后再正式填写;手机端适配与键盘布局优化。" },
    { tag: "配了个平", version: PLGP_VERSION, text: "结算新增错题展示;方程式字体统一放大并自适应不超出卡面;快速通关提交间隔缩短至 30 秒。" },
    { tag: "分了个类", version: FLGL_VERSION, text: "卡牌加宽加高、文字放大更好认;修复传送带滚动闪烁;倒计时现在从卡片真正进入传送带才开始计算。" },
    { tag: "平台", version: PLATFORM_VERSION, text: "新增更新日志弹窗(每次更新只弹一次);特别鸣谢榜支持滑动翻看;主界面游戏卡重新排序并预留 3 个新游戏位置。" },
]