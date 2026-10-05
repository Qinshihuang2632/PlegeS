/*
 * 错了个字 · 字库(科目分组)
 * ========================
 * 每字: { ch: 目标字, word: 提示词(考察语境), from?: 出处篇名(古诗文挖空题) }
 * 来源: docs/clgz_characters.md(待审查清单, 2026-08-19); 古诗文科目(v1.3.0)自动派生自
 *       默了个写题库(src/game6/bank.ts)的易错字 traps 与主旨句关键字 —— 单一数据源, 免手动同步。
 * 科目可在局内多选。
 */
import { MLGX_LINES } from "@/game6/bank";

export interface ClgzChar {
    ch: string;
    word: string;
    /** 出处篇名(古诗文条目): 有值时题面为「原文挖空手写」 */
    from?: string;
}

export interface ClgzSubject {
    key: string;
    label: string;
    desc: string;
    chars: ClgzChar[];
}

/* 古诗文主旨句关键字(行片段 → 该句中值得手写考查的字; 人工挑选, 覆盖 v1.2 题库的主旨/名句) */
const POEM_KEY_EXTRAS: Record<string, string> = {
    学不可以已: "已",
    路曼曼其修远: "曼",
    会当凌绝顶: "凌",
    不以物喜: "己",
    金戈铁马: "戈",
    赢得仓皇北顾: "赢",
    随风潜入夜: "潜",
    隔江犹唱后庭花: "庭",
    穷且益坚: "坠",
    与尔同销万古愁: "销",
    悠然见南山: "悠",
    心远地自偏: "偏",
    欲辨已忘言: "辨",
    江枫渔火对愁眠: "枫",
    葡萄美酒夜光杯: "葡",
    出淤泥而不染: "淤",
    予独爱莲: "予",
    在明明德: "德",
    笃行之: "笃",
    浩然之气: "浩",
    讲信修睦: "睦",
    或轻于鸿毛: "鸿",
    究天人之际: "究",
    苍山负雪: "烛",
    兰泽多芳草: "泽",
    俟我于城隅: "隅",
    修我戈矛: "矛",
    譬如朝露: "譬",
    少无适俗韵: "韵",
    榆柳荫后檐: "榆",
    久在樊笼里: "樊",
    泻水置平地: "泻",
    海上明月共潮生: "潮",
    愿逐月华流照君: "逐",
    随意春芳歇: "歇",
    砯崖转石万壑雷: "壑",
    锦城虽云乐: "锦",
    天姥连天向天横: "姥",
    古来圣贤皆寂寞: "寞",
    千金裘: "裘",
    美人帐下犹歌舞: "帐",
    相看白刃血纷纷: "刃",
    但见群鸥日日来: "鸥",
    花径不曾缘客扫: "缘",
    浔阳江头夜送客: "浔",
    同是天涯沦落人: "沦",
    转轴拨弦三两声: "拨",
    锦瑟无端五十弦: "瑟",
    望帝春心托杜鹃: "鹃",
    钱塘自古繁华: "塘",
    户盈罗绮: "绮",
    千里澄江似练: "澄",
    浪淘尽: "淘",
    一尊还酹江月: "尊",
    何妨吟啸且徐行: "啸",
    竹杖芒鞋轻胜马: "杖",
    痴儿了却公家事: "痴",
    纤云弄巧: "纤",
    凄凄惨惨戚戚: "戚",
    梧桐更兼细雨: "梧",
    早岁那知世事艰: "艰",
    楼船夜雪瓜洲渡: "渡",
    镜中衰鬓已先斑: "斑",
    郁孤台下清江水: "郁",
    毕竟东流去: "竟",
    山深闻鹧鸪: "鹧",
    笑语盈盈暗香去: "缕",
    解鞍少驻初程: "驻",
    冷月无声: "荡",
    半匹红纱一丈绫: "绫",
    学诗谩有惊人句: "嗟",
    今夕是何年: "夕",
    古道西风瘦马: "瘦",
    星汉灿烂: "灿",
    养怡之福: "盈",
    此先汉所以兴隆也: "隆",
    奉命于危难之间: "奉",
    不求闻达于诸侯: "侯",
    三顾臣于草庐之中: "庐",
    落英缤纷: "缤",
    青树翠蔓: "翠",
    悄怆幽邃: "怆",
    衔远山: "衔",
    斯是陋室: "陋",
    苔痕上阶绿: "苔",
    三而竭: "竭",
    闻寡人之耳者: "寡",
    夕死可矣: "矣",
    见贤思齐焉: "贤",
    士不可以不弘毅: "毅",
    君子喻于义: "喻",
    人而不仁: "仁",
    文质彬彬: "彬",
    知者不惑: "惑",
    天下归仁焉: "焉",
    勿施于人: "施",
    可以怨: "怨",
    振长策而御宇内: "御",
    无可奈何花落去: "奈",
    感时花溅泪: "溅",
    采之欲遗谁: "遗",
    报君黄金台上意: "携",
    表里俱澄澈: "澈",
    短发萧骚襟袖冷: "骚",
    烽火连三月: "烽",
    共剪西窗烛: "剪",
    青鸟殷勤: "殷",
};

/** 从默了个写题库派生古诗文科目字表: 每句的易错字(traps) + 主旨句关键字, 按句去重 */
function buildPoemChars(): ClgzChar[] {
    const out: ClgzChar[] = [];
    const seen = new Set<string>();
    for (const l of MLGX_LINES) {
        const chars = new Set<string>(l.traps ? Object.keys(l.traps) : []);
        for (const [frag, ch] of Object.entries(POEM_KEY_EXTRAS)) {
            if (l.norm.includes(frag)) chars.add(ch);
        }
        for (const ch of chars) {
            const key = ch + "|" + l.norm;
            if (seen.has(key) || !l.norm.includes(ch)) continue;
            seen.add(key);
            out.push({ ch, word: l.text, from: l.src });
        }
    }
    return out;
}

export const CLGZ_SUBJECTS: ClgzSubject[] = [
    {
        key: "chem",
        label: "化学",
        desc: "仪器与物质名的规范字",
        chars: [
            { ch: "锥", word: "锥形瓶" }, { ch: "坩", word: "坩埚" }, { ch: "埚", word: "坩埚" },
            { ch: "镊", word: "镊子" }, { ch: "皿", word: "蒸发皿" }, { ch: "滤", word: "过滤" },
            { ch: "馏", word: "蒸馏" }, { ch: "苯", word: "苯环" }, { ch: "酚", word: "苯酚" },
            { ch: "醛", word: "乙醛" }, { ch: "酮", word: "丙酮" }, { ch: "酯", word: "酯化反应" },
            { ch: "醚", word: "乙醚" }, { ch: "烷", word: "烷烃" }, { ch: "烯", word: "烯烃" },
            { ch: "炔", word: "乙炔" }, { ch: "烃", word: "烃类" }, { ch: "羧", word: "羧基" },
            { ch: "羰", word: "羰基" }, { ch: "羟", word: "羟基" }, { ch: "氰", word: "氰化物" },
            { ch: "腈", word: "腈纶" }, { ch: "铵", word: "铵盐" }, { ch: "氨", word: "氨气" },
            { ch: "氯", word: "氯气" }, { ch: "溴", word: "溴水" }, { ch: "碘", word: "碘单质" },
            { ch: "锰", word: "高锰酸钾" }, { ch: "铬", word: "铬酸" }, { ch: "磷", word: "磷元素" },
            { ch: "硫", word: "硫酸" }, { ch: "硅", word: "硅酸盐" }, { ch: "钙", word: "钙元素" },
            { ch: "钠", word: "钠元素" }, { ch: "钾", word: "钾元素" }, { ch: "钡", word: "钡盐" },
            { ch: "汞", word: "水银(汞)" }, { ch: "淀", word: "淀粉" }, { ch: "酵", word: "发酵" },
            { ch: "皂", word: "皂化反应" }, { ch: "焰", word: "焰色反应" },
        ],
    },
    {
        key: "bio",
        label: "生物",
        desc: "结构、器官与生物学术语",
        chars: [
            { ch: "睾", word: "睾丸" }, { ch: "囊", word: "囊胚" }, { ch: "髓", word: "骨髓" },
            { ch: "腺", word: "甲状腺" }, { ch: "噬", word: "吞噬细胞" }, { ch: "酶", word: "酶活性" },
            { ch: "肾", word: "肾单位" }, { ch: "胰", word: "胰腺" }, { ch: "脾", word: "脾脏" },
            { ch: "胚", word: "胚胎" }, { ch: "卵", word: "受精卵" }, { ch: "脂", word: "脂肪" },
            { ch: "绒", word: "绒毛" }, { ch: "纤", word: "纤维素" }, { ch: "鞭", word: "鞭毛" },
            { ch: "茧", word: "蚕茧" }, { ch: "蛹", word: "蛹期" }, { ch: "蜕", word: "蜕皮" },
            { ch: "疟", word: "疟原虫" }, { ch: "履", word: "草履虫" }, { ch: "恒", word: "恒温动物" },
            { ch: "脊", word: "脊椎动物" }, { ch: "哺", word: "哺乳动物" }, { ch: "输", word: "输卵管" },
            { ch: "胱", word: "膀胱" }, { ch: "贯", word: "神经贯通" },
        ],
    },
    {
        key: "chinese",
        label: "语文",
        desc: "高频易错字(形近/生僻)",
        chars: [
            { ch: "羸", word: "羸弱" }, { ch: "窠", word: "不落窠臼" }, { ch: "臼", word: "不落窠臼" },
            { ch: "睥", word: "睥睨" }, { ch: "睨", word: "睥睨" }, { ch: "龃", word: "龃龉" },
            { ch: "龉", word: "龃龉" }, { ch: "魑", word: "魑魅魍魉" }, { ch: "魅", word: "魑魅魍魉" },
            { ch: "魍", word: "魑魅魍魉" }, { ch: "魉", word: "魑魅魍魉" }, { ch: "罅", word: "罅隙" },
            { ch: "纨", word: "纨绔" }, { ch: "绔", word: "纨绔" }, { ch: "饕", word: "饕餮" },
            { ch: "餮", word: "饕餮" }, { ch: "斡", word: "斡旋" }, { ch: "媲", word: "媲美" },
            { ch: "诟", word: "诟病" }, { ch: "玷", word: "玷污" }, { ch: "踌", word: "踌躇" },
            { ch: "躇", word: "踌躇" }, { ch: "蹉", word: "蹉跎" }, { ch: "跎", word: "蹉跎" },
            { ch: "蛊", word: "蛊惑" }, { ch: "桎", word: "桎梏" }, { ch: "梏", word: "桎梏" },
            { ch: "痉", word: "痉挛" }, { ch: "挛", word: "痉挛" }, { ch: "氤", word: "氤氲" },
            { ch: "氲", word: "氤氲" }, { ch: "旖", word: "旖旎" }, { ch: "旎", word: "旖旎" },
            { ch: "缱", word: "缱绻" }, { ch: "绻", word: "缱绻" }, { ch: "斓", word: "斑斓" },
            { ch: "璨", word: "璀璨" }, { ch: "漪", word: "涟漪" }, { ch: "潋", word: "潋滟" },
            { ch: "滟", word: "潋滟" },
        ],
    },
    {
        key: "math",
        label: "数学",
        desc: "几何与函数术语",
        chars: [
            { ch: "菱", word: "菱形" }, { ch: "矩", word: "矩形" }, { ch: "梯", word: "梯形" },
            { ch: "棱", word: "棱柱" }, { ch: "锥", word: "圆锥" }, { ch: "椭", word: "椭圆" },
            { ch: "抛", word: "抛物线" }, { ch: "弧", word: "弧长" }, { ch: "弦", word: "弦长" },
            { ch: "幂", word: "幂函数" }, { ch: "域", word: "定义域" }, { ch: "敛", word: "收敛" },
            { ch: "斜", word: "斜率" }, { ch: "圆", word: "圆心" }, { ch: "径", word: "直径" },
            { ch: "恒", word: "恒成立" },
        ],
    },
    {
        key: "phys",
        label: "物理",
        desc: "力学与光学概念",
        chars: [
            { ch: "砝", word: "砝码" }, { ch: "杠", word: "杠杆" }, { ch: "滑", word: "滑轮" },
            { ch: "弹", word: "弹簧" }, { ch: "摩", word: "摩擦力" }, { ch: "惯", word: "惯性" },
            { ch: "匀", word: "匀速" }, { ch: "磁", word: "磁场" }, { ch: "衍", word: "衍射" },
            { ch: "涉", word: "干涉" }, { ch: "振", word: "振幅" }, { ch: "幅", word: "振幅" },
            { ch: "焦", word: "焦点" }, { ch: "仑", word: "库仑" }, { ch: "伽", word: "伽利略" },
            { ch: "瑟", word: "卢瑟福" }, { ch: "谔", word: "薛定谔" }, { ch: "兹", word: "洛伦兹" },
        ],
    },
    {
        key: "poem",
        label: "古诗文",
        desc: "课标名句挖空手写(易错字与主旨句关键字, 看原文缺字凭记忆书写)",
        chars: buildPoemChars(),
    },
    {
        key: "histgeo",
        label: "史地",
        desc: "历史人物与地理地名",
        chars: [
            { ch: "嬴", word: "嬴政" }, { ch: "骞", word: "张骞" }, { ch: "奘", word: "玄奘" },
            { ch: "佗", word: "华佗" }, { ch: "昇", word: "毕昇" }, { ch: "窟", word: "莫高窟" },
            { ch: "俑", word: "兵马俑" }, { ch: "煌", word: "敦煌" }, { ch: "鄱", word: "鄱阳湖" },
            { ch: "疆", word: "新疆" }, { ch: "浙", word: "浙江" }, { ch: "徽", word: "安徽" },
            { ch: "澳", word: "澳门" }, { ch: "噶", word: "准噶尔" }, { ch: "祁", word: "祁连山" },
            { ch: "岷", word: "岷江" }, { ch: "喀", word: "喀斯特" }, { ch: "杭", word: "杭州" },
            { ch: "锡", word: "无锡" }, { ch: "蚌", word: "蚌埠" }, { ch: "亳", word: "亳州" },
            { ch: "赣", word: "江西(赣)" }, { ch: "邯", word: "邯郸" }, { ch: "汨", word: "汨罗江" },
            { ch: "潋", word: "潋滟湖" },
        ],
    },
];

/** 局内选择科目(多选) */
export function charsOfSubjects(keys: string[]): ClgzChar[] {
    const set = new Set(keys);
    return CLGZ_SUBJECTS.filter((s) => set.has(s.key)).flatMap((s) => s.chars);
}
