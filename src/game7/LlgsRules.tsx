/*
 * 历了个史 · 玩法介绍(人性化文案)
 * 大厅「玩法介绍」弹窗与局内「玩法」入口共用同一份内容, 保证文案一致
 */
import { LLGS_VERSION } from "./version";

export const LLGS_RULE_SECTIONS = [
    {
        title: "怎么玩",
        points: [
            "每局 5 张历史事件卡(课标高频考点),把它们按时间先后排成若干列——最早的列放最左,最晚的放最右;",
            "点选一张卡(出现选中框),再用下方的方位按键移动:左/右=与相邻卡交换位置;",
            "困难模式:同一年的事件要上下并列成一列——用「左上/左下/右上/右下」把卡移到相邻列的顶部或底部,并列内上下顺序不限;",
            "点「提交判定」:已归位的卡变绿锁定不能再动;错位卡标红,继续调整再提交,直到全部归位;",
            "不设扣血——多提交几次也能通关,提交次数就是你的「失误」。",
        ],
    },
    {
        title: "提示道具",
        points: [
            "提示(每局 2 次):自动把一张错位卡放回它的正确位置并锁定,越少用排名越靠前;",
            "每张卡底部显示年份,拿不准时间先后就多看年份。",
        ],
    },
    {
        title: "难度与题库",
        points: [
            "简单:中国古代史 + 近现代常识(夏商周到新中国),年份跨度大;",
            "标准:加入近代史与世界史(鸦片战争、两次世界大战等);",
            "困难:解除年份去重——同年事件会上下并列出现(如 1861 年的洋务运动/俄国改革/美国南北战争同列),并列内上下顺序不限,需辨析的是「哪一年在前」;",
            "题库 217 条课标 + 教材高频事件,均为一句话简介,答错可长知识。",
        ],
    },
    {
        title: "排名规则",
        points: [
            "通关后成绩上榜(不填昵称或选择不参与则不展示);",
            "排名按:归位对数多 → 用时短 → 提交次数少 → 提示用得少;",
            "「版本」列显示本局历了个史版本号,方便横向比较。",
        ],
    },
];

export function LlgsRules({ compact = false }: { compact?: boolean }) {
    return (
        <div className={compact ? "space-y-3" : "space-y-5"}>
            {LLGS_RULE_SECTIONS.map((s) => (
                <section key={s.title}>
                    <h3 className="mb-1.5 text-sm font-bold text-foreground">{s.title}</h3>
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
            <p className="pt-2 text-center text-[11px] text-muted-foreground">历了个史 · {LLGS_VERSION}(仅供个人娱乐)</p>
        </div>
    );
}