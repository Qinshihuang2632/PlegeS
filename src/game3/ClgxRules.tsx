/*
 * 错了个字 · 玩法介绍(人性化文案)
 * 大厅「玩法介绍」弹窗与局内「玩法」入口共用同一份内容, 保证文案一致
 */
import { CLGX_VERSION } from "./version";

export const CLGX_RULE_SECTIONS = [
    {
        icon: "✍️",
        title: "怎么玩",
        points: [
            "开局先选考察科目(可单选,也可化学+生物多选);",
            "系统给出提示词(如「锥形瓶」),要求写出其中的某个字;",
            "在下方面框内**手写**这个字(类似你画我猜的画框,不经过键盘)——考察的是你真正会写这个字,而不是认识它;",
            "写好后点「提交判定」,字写对且不潦草就得分;",
            "认不出/写不出的字可以跳过,不影响继续作答。",
        ],
    },
    {
        icon: "📝",
        title: "书写判定",
        points: [
            "判定原理: 你的墨迹与标准字形做像素重合度比对;",
            "写得对、写在框内 → 重合度高 → 得分;",
            "写字潦草、笔画乱飞、写错字 → 重合度低 → 不得分(所以请写规范);",
            "支持鼠标(电脑)和手指/触控笔(手机平板)直接书写。",
        ],
    },
    {
        icon: "📚",
        title: "考察内容",
        points: [
            "覆盖高中各科易写错的字: 化学仪器与物质名(锥形瓶/坩埚/羧基)、生物术语(睾丸/吞噬/哺乳)、语文高频易错字(羸弱/窠臼/斡旋)、数学(菱形/椭圆/幂函数)、物理(砝码/衍射/惯性)、史地(嬴政/张骞/莫高窟);",
            "每局 8 题, 写对 1 字得 1 分;",
            "字库清单可在项目 docs/clgx_characters.md 查看。",
        ],
    },
    {
        icon: "🏆",
        title: "排名规则",
        points: [
            "按 得分多 → 用时短 排序, 同分用时短者靠前;",
            "未填昵称时成绩不上榜;",
            "排行榜「版本」列显示对局时游戏版本。",
        ],
    },
];

export function ClgxRules({ compact = false }: { compact?: boolean }) {
    return (
        <div className={compact ? "space-y-3" : "space-y-5"}>
            {CLGX_RULE_SECTIONS.map((s) => (
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
            <p className="pt-2 text-center text-[11px] text-muted-foreground">错了个字 · {CLGX_VERSION}(仅供个人娱乐)</p>
        </div>
    );
}
