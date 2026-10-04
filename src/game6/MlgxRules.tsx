/*
 * 默了个写 · 玩法介绍(人性化文案)
 * 大厅「玩法介绍」弹窗与游戏内共用同一份内容
 */
import { MLGX_VERSION } from "./version";

export const MLGX_RULE_SECTIONS = [
    {
        title: "怎么玩",
        points: [
            "每局 8 题,血量 3,答错扣血并立刻看到正确答案;",
            "全程点选,不经过键盘 —— 输入法帮不上忙,考的是真的记住了;",
            "三档难度:简单以句对选择为主,标准加入字池拼句与篇章复原,困难再排队飞花令;",
            "提示道具每局 2 次(排除错误选项/剔除干扰字块/提示首句等)。",
        ],
    },
    {
        title: "四种题型",
        points: [
            "句对匹配:给上句(或下句)4 选 1,干扰项多来自同篇同作者;",
            "字池拼句:按理解性题干从字块池拼出整句,不提示字数、标点直接给出,池里混着形近音近的易错字;",
            "篇章复原:把一段原文的 4 句乱序,按原文顺序点选;",
            "缺字飞花令:每句藏了一个字,凭记忆勾出缺的字恰为令字的句子。",
        ],
    },
    {
        title: "出题范围",
        points: [
            "高考考纲篇目:高中课标推荐背诵 72 篇 + 初中必背高频篇目;",
            "只考主旨句/关键句/写景抒情名句,全部按高考「理解性默写」模式出题;",
            "2017 年以来真题考过的篇目出现概率翻倍;初中篇目出现频率为高中的一半;",
            "记不住写法?去「错了个字」练手写。",
        ],
    },
    {
        title: "排名规则",
        points: [
            "按 得分多 → 用时短 排序(排行榜即将接入);",
            "未填昵称时成绩不上榜。",
        ],
    },
];

export function MlgxRules({ compact = false }: { compact?: boolean }) {
    return (
        <div className={compact ? "space-y-3" : "space-y-5"}>
            {MLGX_RULE_SECTIONS.map((s) => (
                <section key={s.title}>
                    <h3 className="mb-1.5 flex items-center gap-2 text-sm font-bold text-foreground">
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
            <p className="pt-2 text-center text-[11px] text-muted-foreground">默了个写 · {MLGX_VERSION}(仅供个人娱乐)</p>
        </div>
    );
}
