/*
 * 化了个学 · 玩法介绍(人性化文案)
 * 大厅「玩法介绍」弹窗与游戏页新手引导共用同一份内容, 保证文案一致
 */
import { APP_VERSION } from "@/version";

export const RULE_SECTIONS = [
    {
        icon: "🎯",
        title: "怎么玩",
        points: [
            "点击棋盘上「没有被压住」的卡牌,它会滑入底部的手牌槽;",
            "手牌槽里凑齐 3 张同类卡牌,点「消除选中」即可消掉;",
            "「同类」指按分类标准属于同一类,与化学式无关;",
            "分类标准共 8 类: 金属单质、非金属单质、有机物、酸、碱、盐、氧化物、混合物(金属单质与非金属单质是两类,不能互消);",
            "「混合物」指无固定化学式的物质,如盐酸、氨水、合金、玻璃、石油等;",
            "有机酸是「双身份」: 既能按「酸」消除,也能按「有机物」消除;",
            "注意: 卡牌会被上面的牌压住,优先消掉压着别的牌的牌,才能露出下面。",
        ],
    },
    {
        icon: "🧰",
        title: "道具(每局各 3 次)",
        points: [
            "撤回: 把槽内最后一张卡放回棋盘(原位被占会自动挪到空位);",
            "移出: 把槽内最前面 3 张卡放回棋盘空位;",
            "洗牌: 打乱场上剩余卡牌的物质,让死局起死回生。",
        ],
    },
    {
        icon: "❤️",
        title: "血量与胜负",
        points: [
            "共 3 点血量。误选 3 张不同类的卡点「消除选中」,扣 1 点血;",
            "手牌槽塞满(标准 10 张)又凑不出三消 → 立即失败,血量清零;",
            "全部卡牌拾取完,且手牌槽没有可消的三消组合 → 通关(最后一步消除也算)。",
        ],
    },
    {
        icon: "🏆",
        title: "排名规则",
        points: [
            "通关或失败都会上榜(可勾选「不参与排行榜」);",
            "排名按: 剩余血量多 → 用时短 → 技能用得少;",
            "越早学会用道具救场,通关率越高。",
        ],
    },
];

export function GameRules({ compact = false }: { compact?: boolean }) {
    return (
        <div className={compact ? "space-y-3" : "space-y-5"}>
            {RULE_SECTIONS.map((s) => (
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
            <p className="pt-2 text-center text-[11px] text-muted-foreground">化了个学 · {APP_VERSION}(仅供个人娱乐)</p>
        </div>
    );
}
