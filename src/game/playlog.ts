/*
 * 游玩记录上报 (src/game/playlog.ts)
 * =================================
 * v2.8.5: 未参与排行榜的游玩(未填昵称 / 勾选不参与)结算时上报一条游玩记录,
 * 供管理后台「游玩记录」页查看(按游玩时间排序的数据表)。静默失败, 不影响游戏。
 * 各游戏在结算的 skipped 分支调用。
 */
import { detectPlatform } from "./platform";

export interface PlayLogPayload {
    game: "hlgx" | "ylgy" | "flgl" | "plgp";
    mode: string;
    name?: string;
    win: boolean;
    score: number;   // 主成绩: 化了个学/英了个语=消除组数/填写字母数, 分了个类/配了个平=答对数
    time: number;
    tools?: number;
    version?: string;
}

export async function reportPlayLog(p: PlayLogPayload) {
    try {
        await fetch("/api/playlog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...p, platform: detectPlatform() }),
        });
    } catch { /* 静默: 上报失败不影响对局 */ }
}
