/*
 * 化了个学 · 音效 (Web Audio 合成, 无需音频文件)
 * 自旧版 hlgx_hua.js 原样迁移
 */
export const HLGX_Audio = (() => {
    let ctx: AudioContext | null = null;
    let muted = false;

    function ac(): AudioContext | null {
        if (muted) return null;
        if (typeof window === "undefined") return null;
        if (!ctx) {
            const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        if (ctx.state === "suspended") void ctx.resume();
        return ctx;
    }

    function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
        const c = ac();
        if (!c) return;
        const t0 = c.currentTime + delay;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.connect(g);
        g.connect(c.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.02);
    }

    return {
        setMuted(m: boolean) { muted = m; if (m && ctx) void ctx.suspend(); },
        isMuted() { return muted; },
        click()  { tone(900, 0.05, "triangle", 0.10); },                                  // 点击方块
        skill()  { tone(520, 0.12, "sine", 0.12); tone(860, 0.14, "sine", 0.10, 0.05); }, // 使用技能
        clear()  { tone(660, 0.12, "sine", 0.14); tone(990, 0.18, "sine", 0.12, 0.07); }, // 消除
        win()    { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "sine", 0.13, i * 0.13)); },
        lose()   { [392, 330, 262].forEach((f, i) => tone(f, 0.22, "triangle", 0.13, i * 0.16)); },
    };
})();
