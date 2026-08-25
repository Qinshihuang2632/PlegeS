/*
 * 配了个平 · 玩法介绍(人性化文案)
 * 大厅「玩法介绍」弹窗与局内「玩法」入口共用同一份内容, 保证文案一致
 */
import { PLGP_VERSION } from "./version";

export const PLGP_RULE_SECTIONS = [
    {
        icon: "🎯",
        title: "怎么玩",
        points: [
            "每局 8 道未配平的化学方程式,把每个物质前的系数补齐;",
            "系数为 1 也要填——规范书写从每一个「1」开始;",
            "简单难度是选择题:三组候选系数组合,点选正确的一组即可;",
            "标准/困难需要自己填数:点击系数空位,用键盘或屏幕数字条输入。",
        ],
    },
    {
        icon: "⚖️",
        title: "判定规则",
        points: [
            "所有空位填满才能提交;提交正确 → 得 1 分进入下一题;",
            "配错了会扣 1 点血(共 3 点),填写内容保留,可以直接改了再交;",
            "特别注意:如果填的是正确答案的同倍比例解(如 4/2/4 对应 3/2/1),同样判错——必须化成**最简整数比**!",
        ],
    },
    {
        icon: "🧰",
        title: "道具",
        points: [
            "「提示」每局 2 次:自动把一个空位/错位填成正确系数并锁定;",
            "提示的使用次数会计入排行榜(用得越少排名越靠前)。",
        ],
    },
    {
        icon: "📚",
        title: "题库与难度",
        points: [
            "题库来自高中化学课标经典反应 111 条(经质量守恒自动校验),按难度分三档:",
            "简单 32 条:燃烧、制气、中和等基础反应,选择题形式;",
            "标准 43 条:复分解/置换网络 + 钠氯硫氮入门;",
            "困难 36 条:浓酸氧化还原、电解、有机反应;部分题目带限量标注(如 Fe(足量)),括号内容不是系数位。",
        ],
    },
    {
        icon: "🏆",
        title: "排名规则",
        points: [
            "答完 8 题或血量归零即结算,通关失败都会上榜(不填昵称则不上榜);局内昵称旁有「☑ 参与排行」开关;",
            "排名按:答对题数多 → 用时短 → 提示使用少;",
            "星级只是结算展示:零失误 ★★★ / 失误一次 ★★ / 其余 ★;",
            "「版本」列显示本局配了个平的版本号。",
        ],
    },
];

export function PlgpRules({ compact = false }: { compact?: boolean }) {
    return (
        <div className={compact ? "space-y-3" : "space-y-5"}>
            {PLGP_RULE_SECTIONS.map((s) => (
                <section key={s.title}>
                    <h3 className="mb-1.5 flex items-center gap-2 text-sm font-bold text-foreground">
                        <span aria-hidden>{s.icon}</span>
                        {s.title}
                    </h3>
                    <ul className="space-y-1 text-[13px] leading-relaxed text-muted-foreground">
                        {s.points.map((p, i) => (
                            <li key={i} className="flex gap-1.5">
                                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/60" aria-hidden />
                                <span>{p}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
            {/* 玩法介绍也显示对应游戏版本号(约定: 任意游戏任意界面下方都显示该游戏版本) */}
            <p className="pt-2 text-center text-[11px] text-muted-foreground">配了个平 · {PLGP_VERSION}(仅供个人娱乐)</p>
        </div>
    );
}
