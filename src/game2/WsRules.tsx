/*
 * 英了个语 · 玩法介绍(人性化文案)
 * 大厅「玩法介绍」弹窗与局内「玩法」入口共用同一份内容, 保证文案一致
 */

export const WS_RULE_SECTIONS = [
    {
        icon: "🎯",
        title: "怎么玩",
        points: [
            "横竖单词交叉成一张拼图:每行、每列都是一个单词,相交处共享同一个字母;",
            "点击带边框的空格,输入一个字母(桌面直接用键盘,手机点下方字母条);",
            "一个单词填满后自动校验:是词库单词就不动,填错了会扣 1 点血并标红;",
            "灰色格子不是单词成分,不需要也不能填写;",
            "把棋盘上所有空格都填对 → 通关!",
        ],
    },
    {
        icon: "🧰",
        title: "道具(每局有限次数)",
        points: [
            "填空提示(每局 2 次):自动在某个空格填上一个正确的字母;",
            "含义提示(每局 1 次):圈出一个未填完的单词并显示它的中文释义,7 秒后自动消失;",
            "提示能救命,但也影响排名(技能使用次数越少,排名越靠前)。",
        ],
    },
    {
        icon: "❤️",
        title: "血量与胜负",
        points: [
            "共 3 点血量,填出一个非法单词扣 1 点血;",
            "血量归零 → 失败;全部空格填对 → 通关;",
            "失败也会上榜(只要填过字母),排名按血量→填对数→用时→技能次数。",
        ],
    },
    {
        icon: "📚",
        title: "难度与词库",
        points: [
            "简单:4 个 4 字母基础词,首词全提示,其余词各留 2 个字母;",
            "标准:6 个 5 字母进阶词——2 个全提示、2 个留 3 个字母、2 个留 2 个字母;",
            "困难:8 个 5 字母课标难词——1 个全提示、2 个留 3 个字母、5 个留 2 个字母;",
            "词库来自高考课标 3500 词,交叉共享字母,同一局内单词不重复。",
        ],
    },
    {
        icon: "🏆",
        title: "排名规则",
        points: [
            "通关或失败都会上榜(不填昵称则不上榜);",
            "排名按:剩余血量多 → 填写字母数多 → 用时短 → 技能使用次数少;",
            "「版本」列显示本局英了个语的版本号,不同版本难度有别,方便横向比较。",
        ],
    },
];

export function WsRules({ compact = false }: { compact?: boolean }) {
    return (
        <div className={compact ? "space-y-3" : "space-y-5"}>
            {WS_RULE_SECTIONS.map((s) => (
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
        </div>
    );
}