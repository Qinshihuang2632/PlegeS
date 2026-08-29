/*
 * 分了个类 · 玩法介绍(人性化文案)
 * 大厅「玩法介绍」弹窗与局内「玩法」入口共用同一份内容, 保证文案一致
 */
import { FLGL_VERSION } from "./version";

export const FLGL_RULE_SECTIONS = [
    {
        icon: "🎯",
        title: "怎么玩",
        points: [
            "传送带每隔一段时间送出一张物质卡(化了个学物质库 259 种),从右侧匀速进入;",
            "传送带最多堆积 5 张;按住物质卡,拖到下方对应的类别按钮上松手即完成分类;",
            "归对类别:物质离场,得 1 分;一局共 20 张,全部归对即通关;",
            "手机、电脑均可拖拽(按住卡片拖动即可)。",
        ],
    },
    {
        icon: "🚚",
        title: "传送带与判负",
        points: [
            "出牌间隔:简单 6 秒 / 标准 4.5 秒 / 困难 3 秒(传送带右上有下一张倒计时);",
            "卡牌匀速滑行(入场、左移补位速度一致,约每秒 2 个卡位),滑行途中就可以按住拖去分类,不必等它停稳;",
            "传送带堆积满 5 张时不会立刻输——你有整个出牌间隔的时间腾出空位;",
            "「新卡该出现的时刻」传送带仍是满的 → 直接落败(传送带溢出);",
            "归错类别扣 1 点血(共 3 点),血量归零同样落败;归错的卡会留在传送带上。",
        ],
    },
    {
        icon: "♻️",
        title: "双类别物质",
        points: [
            "有机酸(醋酸、甲酸、草酸、苯甲酸、甘氨酸)既是「酸」也是「有机物」——放两者之一都算对(与化了个学的双身份消除一致);",
            "归错时会提示该物质的正确类别,记住它,下次别再错!",
        ],
    },
    {
        icon: "📚",
        title: "难度与题库",
        points: [
            "下方分类按钮数量随难度变化:简单 6 个(无有机物、混合物)/ 标准 7 个(无混合物)/ 困难 8 个——不存在的类别不会出现在本局卡牌里;",
            "简单:6 大类别(无有机物、混合物)均衡出现,适合熟悉基础分类标准;",
            "标准:7 大类别(无混合物)均衡出现;",
            "困难:全部 8 类 259 种物质随机出现,出牌更快;",
            "分类标准与化了个学一致:金属单质 / 非金属单质 / 氧化物 / 酸 / 碱 / 盐 / 有机物 / 混合物。",
        ],
    },
    {
        icon: "🏆",
        title: "排名规则",
        points: [
            "通关或失败都会上榜(不填昵则不上榜);局内昵称旁有「☑ 参与排行」开关,点击二次确认后可不参与排行榜(重开本局,昵称保留);",
            "排名按:正确分类数多 → 用时短;",
            "「版本」列显示本局分了个类的版本号,不同版本难度有别,方便横向比较。",
        ],
    },
];

export function FlglRules({ compact = false }: { compact?: boolean }) {
    return (
        <div className={compact ? "space-y-3" : "space-y-5"}>
            {FLGL_RULE_SECTIONS.map((s) => (
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
            <p className="pt-2 text-center text-[11px] text-muted-foreground">分了个类 · {FLGL_VERSION}(仅供个人娱乐)</p>
        </div>
    );
}
