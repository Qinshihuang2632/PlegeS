/*
 * p了个s · 排行榜会话令牌(前端助手, v2.8.0 防刷榜)
 * =================================================
 * 每次开局向 /<game>/api/session 申领一次性令牌, 结算提交成绩时携带。
 * 服务端校验: 令牌真实存在 + IP 一致 + 实际经过时长 ≥ 上报用时, 通过后销毁。
 * 申领失败(如开局时离线)返回空串: 游戏照常进行, 提交时再补领
 * (补领的令牌服务端计时会偏短, 可能被「上报用时短于实际游戏时长」拒绝,
 *  结算窗「重试提交」稍候再试即可通过)。
 */
export async function fetchRankToken(game: string, mode: string): Promise<string> {
    try {
        const res = await fetch(`/${game}/api/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode }),
        });
        const d = await res.json().catch(() => null);
        return res.ok && typeof d?.token === "string" ? d.token : "";
    } catch {
        return "";
    }
}
