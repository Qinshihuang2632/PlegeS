/*
 * 默了个写 · 题库 (src/game6/bank.ts) v2 —— 按高考考纲重建
 * ============================================================
 * 范围: 高中课标「古诗文背诵推荐篇目」72 篇(文言文 32 + 诗词曲 40) + 初中课标必背高频篇目
 *       (旧全国卷默写 64 篇体系之初中 50 篇的主体)。小学-only 篇目(静夜思/登鹳雀楼/春晓等)已清出。
 * 出题模式: 全部对齐高考「理解性默写」—— cue 按主旨句/关键句/写景抒情名句拟写(2017 改革以来
 *       各卷规律: 只考语境运用, 不考上句写下句)。
 * 真题权重: piece.examObs = 2017 改革以来各卷(全国甲乙卷/新高考一二卷/京沪卷)默写考查记录,
 *       考过的篇目抽取权重 ×2(见 core.ts EXAM_WEIGHT)。考察标注为初稿(部分年份/卷别待核), 审定时请核对。
 * 每句: key=高频考点句(抽取优先), cue=理解性题干, traps=形近/音近干扰字(须为本句中的字)。
 * 文本务必准确; 修改须通过 core.test.ts 完整性校验。
 */

export interface MlgxLineV2 {
    text: string;                       // 原句(含标点)
    key?: boolean;                      // 高频考点句(主旨/哲理/写景/抒情名句)
    cue?: string;                       // 理解性默写题干
    cont?: true;                        // 与数组中前一句在原文中紧邻且同自然段(只有标注了才能出「接下句/篇章复原」题)
    traps?: Record<string, string[]>;   // 易错字 → 干扰字(须为本句中的字, 干扰字不得在本句)
}

export interface MlgxPiece {
    key: string;                        // 《篇名》·作者
    src: string;
    author: string;
    dynasty: string;
    stage: "high" | "junior";           // 高中课标 / 初中课标
    genre: "poem" | "prose";            // poem=韵文(可做句对匹配), prose=文言散文
    examObs?: { y: number; q: string; note?: string }[];   // 2017 改革以来默写考查记录(y=0=考查属实、年份待核)
    lines: MlgxLineV2[];                // 高频可考句(按原文顺序)
}

export const EXAM_WEIGHT = 2;           // 真题考过的篇目抽取权重 ×2
export const JUNIOR_WEIGHT = 0.5;       // 初中篇目出题概率 = 高中一般题目的 50%(用户 2026-10-03 指定)

export const MLGX_PIECES: MlgxPiece[] = [
    /* ================= 高中 · 文言文 ================= */
    {
        key: "《论语》十二章·孔子", src: "《论语》十二章", author: "孔子弟子", dynasty: "先秦", stage: "high", genre: "prose",
        lines: [
            { text: "君子食无求饱，居无求安，敏于事而慎于言，就有道而正焉，可谓好学也已。", key: true, cue: "《论语》十二章中写君子好学的具体表现的一章" },
            { text: "人而不仁，如礼何？人而不仁，如乐何？", key: true, cue: "《论语》十二章中指出礼乐的根本在于仁的一章" },
            { text: "朝闻道，夕死可矣。", key: true, cue: "《论语》十二章中形容对真理渴求、闻道不惜性命的一句" },
            { text: "君子喻于义，小人喻于利。", key: true, cue: "《论语》十二章中对比君子与小人在义利上的取舍的一句" },
            { text: "见贤思齐焉，见不贤而内自省也。", key: true, cue: "《论语》十二章中写向贤者看齐、以不贤者为鉴自省的一句" },
            { text: "质胜文则野，文胜质则史。", key: true },
            { text: "文质彬彬，然后君子。", key: true, cue: "《论语》十二章中写文质兼备方为君子的一句", cont: true },
            { text: "士不可以不弘毅，任重而道远。", key: true, cue: "《论语》十二章中写读书人当以弘大刚毅自任、担子重路途远的一句" },
            { text: "仁以为己任，不亦重乎？死而后已，不亦远乎？", key: true, cont: true, cue: "《论语》十二章中写以仁为己任、至死方休的一句" },
            { text: "譬如为山，未成一篑，止，吾止也。", key: true, cue: "《论语》十二章中以堆山为喻写为学贵在坚持的一章", traps: { 篑: ["贵", "馈"] } },
            { text: "譬如平地，虽覆一篑，进，吾往也。", key: true, cont: true, traps: { 篑: ["贵", "馈"] } },
            { text: "知者不惑，仁者不忧，勇者不惧。", key: true, cue: "《论语》十二章中写智仁勇三达德的一句" },
            { text: "克己复礼为仁。", key: true, cue: "《论语》十二章中颜渊问仁、孔子答以约束自身归复于礼的一句" },
            { text: "一日克己复礼，天下归仁焉。", key: true, cont: true },
            { text: "为仁由己，而由人乎哉？", key: true, cont: true },
            { text: "己所不欲，勿施于人。", key: true, cue: "《论语》十二章中写「恕」之道的一句" },
            { text: "小子何莫学夫《诗》？", key: true },
            { text: "《诗》可以兴，可以观，可以群，可以怨。", key: true, cue: "《论语》十二章中概括《诗》的四种社会功能(兴观群怨)的一句", cont: true },
        ],
    },
    {
        key: "《劝学》·荀子", src: "《劝学》", author: "荀子", dynasty: "先秦", stage: "high", genre: "prose",
        examObs: [{ y: 0, q: "全国二卷", note: "驽马十驾，功在不舍" }],
        lines: [
            { text: "学不可以已。", key: true, cue: "《劝学》开篇点明全文中心论点的一句" },
            { text: "君子博学而日参省乎己，则知明而行无过矣。", key: true, cue: "《劝学》中写君子广泛学习并每天反省自己、从而智慧明达的一句" },
            { text: "青，取之于蓝，而青于蓝；冰，水为之，而寒于水。", key: true, cue: "《劝学》中以前后的超越比喻学习可以提升自己的一句" },
            { text: "故不积跬步，无以至千里；不积小流，无以成江海。", key: true, cue: "《劝学》中强调积累必须从点滴做起的一句", traps: { 跬: ["硅", "奎"] } },
            { text: "锲而舍之，朽木不折；锲而不舍，金石可镂。", key: true, cue: "《劝学》中对比刻与舍、强调坚持不懈的一句", traps: { 锲: ["契", "挈"], 镂: ["漏", "陋"] } },
            { text: "驽马十驾，功在不舍。", key: true, traps: { 驽: ["努", "弩"] } },
            { text: "假舆马者，非利足也，而致千里；假舟楫者，非能水也，而绝江河。", key: true, cue: "《劝学》中写借助车马舟楫可达远方横渡江河的一句", traps: { 楫: ["辑", "揖"] } },
            { text: "君子生非异也，善假于物也。", key: true, cue: "《劝学》中写君子天资无异于人、只是善于借助外物的一句" },
            { text: "积土成山，风雨兴焉；积水成渊，蛟龙生焉。", key: true, cue: "《劝学》中写积累可成就万物的一句", traps: { 蛟: ["姣", "跤"] } },
        ],
    },
    {
        key: "《屈原列传》·司马迁", src: "《屈原列传》", author: "司马迁", dynasty: "汉", stage: "high", genre: "prose",
        lines: [
            { text: "其志洁，故其称物芳。", key: true },
            { text: "推此志也，虽与日月争光可也。", key: true, cue: "《屈原列传》中评价屈原志向可与日月争辉的一句" },
        ],
    },
    {
        key: "《谏太宗十思疏》·魏征", src: "《谏太宗十思疏》", author: "魏征", dynasty: "唐", stage: "high", genre: "prose",
        lines: [
            { text: "居安思危，戒奢以俭。", key: true, cue: "《谏太宗十思疏》中概括治国须居安思危、崇尚节俭的一句", traps: { 戒: ["诫", "械"] } },
            { text: "求木之长者，必固其根本；欲流之远者，必浚其泉源。", key: true, cue: "《谏太宗十思疏》中以木、流设喻说明固本浚源的一句", traps: { 浚: ["峻", "竣"] } },
            { text: "念高危，则思谦冲而自牧；惧满溢，则思江海下百川。", key: true, cue: "《谏太宗十思疏》中写居高位须谦逊自省的一句", traps: { 谦: ["歉", "兼"] } },
            { text: "简能而任之，择善而从之。", key: true, cue: "《谏太宗十思疏》中写用人唯才、择善而从的一句" },
            { text: "有善始者实繁，能克终者盖寡。", key: true, cue: "《谏太宗十思疏》中写善始者多、善终者少的一句" },
        ],
    },
    {
        key: "《师说》·韩愈", src: "《师说》", author: "韩愈", dynasty: "唐", stage: "high", genre: "prose",
        examObs: [{ y: 0, q: "全国卷", note: "师者，所以传道受业解惑也（高频）" }],
        lines: [
            { text: "师者，所以传道受业解惑也。", key: true, cue: "《师说》中给「老师」下定义的一句" },
            { text: "是故无贵无贱，无长无少，道之所存，师之所存也。", key: true, cue: "《师说》中写道之所在即师之所在的一句" },
            { text: "句读之不知，惑之不解，或师焉，或不焉。", key: true, traps: { 读: ["逗", "牍"] } },
            { text: "弟子不必不如师，师不必贤于弟子。", key: true },
            { text: "古之学者必有师。", key: true, cue: "《师说》开篇提出论点的一句" },
            { text: "爱其子，择师而教之；于其身也，则耻师焉。", key: true, cue: "《师说》中讽刺世人教子与自身从师相矛盾的一句" },
            { text: "小学而大遗，吾未见其明也。", key: true, cue: "《师说》中批评舍大取小的一句" },
            { text: "圣人无常师。", key: true },
            { text: "闻道有先后，术业有专攻。", key: true, cue: "《师说》结尾点明学问技艺各有所长的一句" },
        ],
    },
    {
        key: "《阿房宫赋》·杜牧", src: "《阿房宫赋》", author: "杜牧", dynasty: "唐", stage: "high", genre: "prose",
        lines: [
            { text: "六王毕，四海一；蜀山兀，阿房出。", key: true, traps: { 兀: ["冗", "元"] } },
            { text: "廊腰缦回，檐牙高啄。", key: true, traps: { 缦: ["漫", "蔓"] } },
            { text: "鼎铛玉石，金块珠砾，弃掷逦迤。", key: true, traps: { 铛: ["当", "挡"] } },
            { text: "秦爱纷奢，人亦念其家。", key: true, cue: "《阿房宫赋》中写秦皇奢欲无度不顾百姓的一句", traps: { 纷: ["分", "芬"] } },
            { text: "奈何取之尽锱铢，用之如泥沙？", key: true, cue: "《阿房宫赋》中写秦人对财物搜刮无度的一句", traps: { 锱: ["资", "缁"], 铢: ["珠", "株"] } },
            { text: "灭六国者六国也，非秦也；族秦者秦也，非天下也。", key: true, cue: "《阿房宫赋》中论述六国与秦族灭根源的一句" },
            { text: "后人哀之而不鉴之，亦使后人而复哀后人也。", key: true, cue: "《阿房宫赋》中警示后人须以秦为鉴的一句" },
        ],
    },
    {
        key: "《六国论》·苏洵", src: "《六国论》", author: "苏洵", dynasty: "宋", stage: "high", genre: "prose",
        lines: [
            { text: "六国破灭，非兵不利，战不善，弊在赂秦。", key: true, cue: "《六国论》开篇提出中心论点的一句", traps: { 赂: ["洛", "路"] } },
            { text: "日削月割，以趋于亡。", key: true },
            { text: "今日割五城，明日割十城，然后得一夕安寝。", key: true, cue: "《六国论》中写割地苟安终不得安的一句" },
            { text: "以事秦之心礼天下之奇才，并力西向。", key: true, cue: "《六国论》中写六国抗秦应有之策的一句" },
            { text: "苟以天下之大，下而从六国破亡之故事，是又在六国下矣。", key: true, cue: "《六国论》结尾以天下视角警讽北宋的一句" },
        ],
    },
    {
        key: "《答司马谏议书》·王安石", src: "《答司马谏议书》", author: "王安石", dynasty: "宋", stage: "high", genre: "prose",
        lines: [
            { text: "度义而后动，是而不见可悔故也。", key: true, cue: "《答司马谏议书》中写权衡后再行动、认定正确便义无反顾的一句" },
        ],
    },
    {
        key: "《赤壁赋》·苏轼", src: "《赤壁赋》", author: "苏轼", dynasty: "宋", stage: "high", genre: "prose",
        examObs: [{ y: 0, q: "全国卷", note: "寄蜉蝣于天地，渺沧海之一粟（高频）" }],
        lines: [
            { text: "清风徐来，水波不兴。", key: true },
            { text: "白露横江，水光接天。", key: true },
            { text: "纵一苇之所如，凌万顷之茫然。", key: true, cont: true },
            { text: "寄蜉蝣于天地，渺沧海之一粟。", key: true, cue: "《赤壁赋》中写人于天地间渺小如虫蚁米粒的一句", traps: { 蜉: ["浮", "俘"], 粟: ["栗", "票"] } },
            { text: "哀吾生之须臾，羡长江之无穷。", key: true, cont: true },
            { text: "惟江上之清风，与山间之明月，耳得之而为声，目遇之而成色。", key: true },
            { text: "舳舻千里，旌旗蔽空。", key: true, traps: { 舳: ["轴", "舟"], 舻: ["卢", "鲁"] } },
            { text: "况吾与子渔樵于江渚之上，侣鱼虾而友麋鹿。", key: true, traps: { 麋: ["米", "糜"] } },
            { text: "盖将自其变者而观之，则天地曾不能以一瞬。", key: true, cue: "《赤壁赋》中从事物变化角度看待天地的一句", traps: { 瞬: ["舜", "意"] } },
            { text: "取之无禁，用之不竭。", key: true, cue: "《赤壁赋》中写清风明月取用不竭的一句" },
        ],
    },
    {
        key: "《项脊轩志》·归有光", src: "《项脊轩志》", author: "归有光", dynasty: "明", stage: "high", genre: "prose",
        lines: [
            { text: "三五之夜，明月半墙，桂影斑驳。", key: true, traps: { 斑: ["班", "般"], 驳: ["驱"] } },
            { text: "庭有枇杷树，吾妻死之年所手植也，今已亭亭如盖矣。", key: true, cue: "《项脊轩志》结尾借枇杷树寄托对亡妻思念的一句", traps: { 枇: ["批", "琵"], 杷: ["琶", "耙"], 亭: ["婷", "停"] } },
        ],
    },
    {
        key: "《子路、曾皙、冉有、公西华侍坐》·孔子", src: "《子路、曾皙、冉有、公西华侍坐》", author: "孔子弟子", dynasty: "先秦", stage: "high", genre: "prose",
        lines: [
            { text: "莫春者，春服既成。", key: true },
            { text: "浴乎沂，风乎舞雩，咏而归。", key: true, cue: "《侍坐》中写曾皙理想中浴水临风、咏歌而归图景的一句", traps: { 沂: ["析", "圻"], 雩: ["亏", "亏"] } },
            { text: "夫子哂之。", key: true, traps: { 哂: ["晒", "洒"] } },
            { text: "为国以礼，其言不让。", key: true },
        ],
    },
    {
        key: "《报任安书》·司马迁", src: "《报任安书》", author: "司马迁", dynasty: "汉", stage: "high", genre: "prose",
        lines: [
            { text: "人固有一死，或重于泰山，或轻于鸿毛。", key: true, cue: "《报任安书》中论生死价值的一句" },
            { text: "究天人之际，通古今之变，成一家之言。", key: true, cue: "《报任安书》中写著《史记》宗旨的一句" },
        ],
    },
    {
        key: "《过秦论》·贾谊", src: "《过秦论》", author: "贾谊", dynasty: "汉", stage: "high", genre: "prose",
        lines: [
            { text: "振长策而御宇内，吞二周而亡诸侯。", key: true },
            { text: "胡人不敢南下而牧马，士不敢弯弓而报怨。", key: true },
            { text: "仁义不施而攻守之势异也。", key: true, cue: "《过秦论》结尾点明秦灭亡原因的一句" },
        ],
    },
    {
        key: "《礼运》·《礼记》", src: "《礼运》", author: "《礼记》", dynasty: "先秦", stage: "high", genre: "prose",
        lines: [
            { text: "大道之行也，天下为公，选贤与能，讲信修睦。", key: true, cue: "《礼运》中描绘大同社会总纲的一句" },
            { text: "故人不独亲其亲，不独子其子。", key: true },
        ],
    },
    {
        key: "《陈情表》·李密", src: "《陈情表》", author: "李密", dynasty: "晋", stage: "high", genre: "prose",
        lines: [
            { text: "茕茕孑立，形影相吊。", key: true, cue: "《陈情表》中写孤苦无依、身影相伴的一句", traps: { 孑: ["子", "孓"] } },
            { text: "但以刘日薄西山，气息奄奄，人命危浅，朝不虑夕。", key: true, cue: "《陈情表》中写祖母病危的一句", traps: { 奄: ["掩", "淹"] } },
            { text: "臣无祖母，无以至今日；祖母无臣，无以终余年。", key: true, cue: "《陈情表》中写祖孙相依为命的一句" },
            { text: "州司临门，急于星火。", key: true, traps: { 州: ["周", "洲"] } },
            { text: "臣生当陨首，死当结草。", key: true, cue: "《陈情表》中写拼死报答恩情的一句", traps: { 陨: ["损", "殒"] } },
            { text: "乌鸟私情，愿乞终养。", key: true, cue: "《陈情表》中以乌鸦反哺喻奉养祖母的一句" },
        ],
    },
    {
        key: "《归去来兮辞》·陶渊明", src: "《归去来兮辞》", author: "陶渊明", dynasty: "晋", stage: "high", genre: "prose",
        lines: [
            { text: "悟已往之不谏，知来者之可追。", key: true, cue: "《归去来兮辞》中写过去不可挽回、未来尚可把握的一句" },
            { text: "实迷途其未远，觉今是而昨非。", key: true, cue: "《归去来兮辞》中写悔悟出仕、肯定归隐的一句", cont: true },
            { text: "云无心以出岫，鸟倦飞而知还。", key: true, cue: "《归去来兮辞》中以云鸟自喻归隐的一句", traps: { 岫: ["袖", "柚"] } },
        ],
    },
    {
        key: "《种树郭橐驼传》·柳宗元", src: "《种树郭橐驼传》", author: "柳宗元", dynasty: "唐", stage: "high", genre: "prose",
        lines: [
            { text: "能顺木之天，以致其性焉尔。", key: true, cue: "《种树郭橐驼传》中概括种树要领的一句" },
        ],
    },
    {
        key: "《五代史伶官传序》·欧阳修", src: "《五代史伶官传序》", author: "欧阳修", dynasty: "宋", stage: "high", genre: "prose",
        lines: [
            { text: "忧劳可以兴国，逸豫可以亡身。", key: true, cue: "《伶官传序》中概括忧劳与逸豫不同后果的一句" },
            { text: "祸患常积于忽微，而智勇多困于所溺。", key: true, cue: "《伶官传序》结尾写祸患积于细微的一句" },
        ],
    },
    {
        key: "《石钟山记》·苏轼", src: "《石钟山记》", author: "苏轼", dynasty: "宋", stage: "high", genre: "prose",
        lines: [
            { text: "事不目见耳闻，而臆断其有无，可乎？", key: true, cue: "《石钟山记》中强调凡事须亲见亲闻、不可臆断的一句", traps: { 臆: ["意", "亿"] } },
        ],
    },
    {
        key: "《登泰山记》·姚鼐", src: "《登泰山记》", author: "姚鼐", dynasty: "清", stage: "high", genre: "prose",
        lines: [
            { text: "苍山负雪，明烛天南。", key: true, cue: "《登泰山记》中写雪照南天明亮如烛的一句" },
            { text: "正赤如丹，下有红光动摇承之。", key: true },
        ],
    },
    {
        key: "《大学》·《礼记》", src: "《大学》", author: "《礼记》", dynasty: "先秦", stage: "high", genre: "prose",
        lines: [
            { text: "大学之道，在明明德，在亲民，在止于至善。", key: true, cue: "《大学》开篇点明宗旨的一句" },
            { text: "物有本末，事有终始。", key: true },
        ],
    },
    {
        key: "《中庸》·《礼记》", src: "《中庸》", author: "《礼记》", dynasty: "先秦", stage: "high", genre: "prose",
        lines: [
            { text: "博学之，审问之，慎思之，明辨之，笃行之。", key: true, cue: "《中庸》中写为学五个层次的一句" },
        ],
    },
    {
        key: "《兰亭集序》·王羲之", src: "《兰亭集序》", author: "王羲之", dynasty: "晋", stage: "high", genre: "prose",
        lines: [
            { text: "群贤毕至，少长咸集。", key: true },
            { text: "仰观宇宙之大，俯察品类之盛。", key: true, cue: "《兰亭集序》中写仰观俯察、游目骋怀的一句" },
            { text: "向之所欣，俯仰之间，已为陈迹。", key: true, cue: "《兰亭集序》中写欣悦转眼成旧迹的一句", traps: { 迹: ["绩", "蹟"] } },
            { text: "固知一死生为虚诞，齐彭殇为妄作。", key: true, cue: "《兰亭集序》中批判虚无思想的一句", traps: { 诞: ["涎", "延"], 殇: ["伤", "觞"] } },
        ],
    },
    {
        key: "《滕王阁序》·王勃", src: "《滕王阁序》", author: "王勃", dynasty: "唐", stage: "high", genre: "prose",
        lines: [
            { text: "物华天宝，龙光射牛斗之墟；人杰地灵，徐孺下陈蕃之榻。", key: true },
            { text: "潦水尽而寒潭清，烟光凝而暮山紫。", key: true, traps: { 潦: ["涝", "缭"] } },
            { text: "落霞与孤鹜齐飞，秋水共长天一色。", key: true, cue: "《滕王阁序》中被誉为千古绝唱的秋景名句", traps: { 鹜: ["骛"] } },
            { text: "渔舟唱晚，响穷彭蠡之滨；雁阵惊寒，声断衡阳之浦。", key: true },
            { text: "老当益壮，宁移白首之心；穷且益坚，不坠青云之志。", key: true, cue: "《滕王阁序》中写境遇虽困、志向愈坚的一句" },
        ],
    },

    /* ================= 高中 · 诗词曲 ================= */
    {
        key: "《静女》·佚名", src: "《静女》", author: "佚名", dynasty: "先秦", stage: "high", genre: "poem",
        lines: [
            { text: "静女其姝，俟我于城隅。", key: true, traps: { 姝: ["珠", "株"], 俟: ["候", "竟"] } },
            { text: "爱而不见，搔首踟蹰。", key: true, cue: "《静女》中写男子等不到姑娘、急得挠头的一句", traps: { 踟: ["迟", "知"], 蹰: ["厨", "橱"] }, cont: true },
            { text: "彤管有炜，说怿女美。", key: true, traps: { 炜: ["伟", "讳"] } },
            { text: "自牧归荑，洵美且异。", key: true, traps: { 荑: ["夷", "夷"], 洵: ["询", "旬"] } },
        ],
    },
    {
        key: "《无衣》·佚名", src: "《无衣》", author: "佚名", dynasty: "先秦", stage: "high", genre: "poem",
        lines: [
            { text: "岂曰无衣？与子同袍。王于兴师，修我戈矛。与子同仇！", key: true, cue: "《无衣》中写同仇敌忾、共赴战场的首章" },
        ],
    },
    {
        key: "《离骚》·屈原", src: "《离骚》", author: "屈原", dynasty: "先秦", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "新高考卷", note: "高频考查" }],
        lines: [
            { text: "长太息以掩涕兮，哀民生之多艰。", key: true, cue: "《离骚》中写诗人叹息拭泪、忧民艰难的一句" },
            { text: "亦余心之所善兮，虽九死其犹未悔。", key: true, cue: "《离骚》中写为心中美善纵死不悔的一句" },
            { text: "伏清白以死直兮，固前圣之所厚。", key: true, cue: "《离骚》中写为清白正直而死、前圣所重的一句" },
            { text: "路曼曼其修远兮，吾将上下而求索。", key: true, cue: "《离骚》中写前路漫长仍将上下求索的一句" },
        ],
    },
    {
        key: "《涉江采芙蓉》·佚名", src: "《涉江采芙蓉》", author: "佚名", dynasty: "汉", stage: "high", genre: "poem",
        lines: [
            { text: "涉江采芙蓉，兰泽多芳草。", key: true },
            { text: "采之欲遗谁？所思在远道。", key: true, cue: "《涉江采芙蓉》中写采花欲赠、所思在远方的一句", cont: true },
            { text: "同心而离居，忧伤以终老。", key: true, cue: "《涉江采芙蓉》结尾写同心离居、忧伤终老的一句" },
        ],
    },
    {
        key: "《短歌行》·曹操", src: "《短歌行》", author: "曹操", dynasty: "汉", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "全国卷", note: "周公吐哺，天下归心（高频）" }],
        lines: [
            { text: "对酒当歌，人生几何！", key: true, cue: "《短歌行》开篇感叹人生短暂的一句" },
            { text: "譬如朝露，去日苦多。", key: true, cont: true, cue: "《短歌行》中以朝露喻人生短促的一句" },
            { text: "青青子衿，悠悠我心。", key: true, cue: "《短歌行》中借《诗经》写思慕贤才的一句", traps: { 衿: ["襟", "衾"] } },
            { text: "明明如月，何时可掇？", key: true, traps: { 掇: ["辍", "缀"] } },
            { text: "越陌度阡，枉用相存。", key: true, traps: { 陌: ["佰", "百"] } },
            { text: "月明星稀，乌鹊南飞。", key: true, cue: "《短歌行》中写月夜乌鹊南飞的一句" },
            { text: "绕树三匝，何枝可依？", key: true, cont: true, traps: { 匝: ["砸", "杂"] } },
            { text: "山不厌高，海不厌深。", key: true },
            { text: "周公吐哺，天下归心。", key: true, cue: "《短歌行》结尾以周公自比写求贤若渴的一句", traps: { 哺: ["捕", "补"] }, cont: true },
        ],
    },
    {
        key: "《归园田居·其一》·陶渊明", src: "《归园田居·其一》", author: "陶渊明", dynasty: "晋", stage: "high", genre: "poem",
        lines: [
            { text: "少无适俗韵，性本爱丘山。", key: true },
            { text: "误落尘网中，一去三十年。", key: true },
            { text: "榆柳荫后檐，桃李罗堂前。", key: true },
            { text: "暧暧远人村，依依墟里烟。", key: true, cue: "《归园田居》中写远村依稀、炊烟袅袅的一句", traps: { 暧: ["暖", "嗳"], 墟: ["虚", "嘘"] } },
            { text: "狗吠深巷中，鸡鸣桑树颠。", key: true, traps: { 颠: ["巅", "掂"] } },
            { text: "久在樊笼里，复得返自然。", key: true, cue: "《归园田居》结尾写挣脱尘网重返自然的一句" },
        ],
    },
    {
        key: "《拟行路难·其四》·鲍照", src: "《拟行路难·其四》", author: "鲍照", dynasty: "南朝", stage: "high", genre: "poem",
        lines: [
            { text: "泻水置平地，各自东西南北流。", key: true, cue: "《拟行路难》中以水喻人生各有际遇的一句" },
            { text: "人生亦有命，安能行叹复坐愁？", key: true },
            { text: "心非木石岂无感？吞声踯躅不敢言。", key: true, cue: "《拟行路难》结尾写满腔感慨却不敢言说的一句" },
        ],
    },
    {
        key: "《春江花月夜》·张若虚", src: "《春江花月夜》", author: "张若虚", dynasty: "唐", stage: "high", genre: "poem",
        lines: [
            { text: "春江潮水连海平，海上明月共潮生。", key: true, cue: "《春江花月夜》开篇写明月随潮涌生的一句" },
            { text: "江畔何人初见月？江月何年初照人？", key: true, cue: "《春江花月夜》中对宇宙人生发出哲思追问的一句", cont: true },
            { text: "人生代代无穷已，江月年年望相似。", key: true, traps: { 已: ["己", "巳"] }, cont: true },
            { text: "谁家今夜扁舟子？何处相思明月楼？", key: true, traps: { 扁: ["偏", "篇"] } },
            { text: "此时相望不相闻，愿逐月华流照君。", key: true },
        ],
    },
    {
        key: "《山居秋暝》·王维", src: "《山居秋暝》", author: "王维", dynasty: "唐", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "全国卷", note: "高频考查" }],
        lines: [
            { text: "空山新雨后，天气晚来秋。", key: true },
            { text: "明月松间照，清泉石上流。", key: true, cue: "《山居秋暝》中写月照青松、泉流石上的一句", cont: true },
            { text: "竹喧归浣女，莲动下渔舟。", key: true, cue: "《山居秋暝》中以声响与动态写浣女渔舟的一句", traps: { 喧: ["宣", "暄"] }, cont: true },
            { text: "随意春芳歇，王孙自可留。", key: true, cont: true },
        ],
    },
    {
        key: "《蜀道难》·李白", src: "《蜀道难》", author: "李白", dynasty: "唐", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "新高考卷", note: "高频考查" }],
        lines: [
            { text: "地崩山摧壮士死，然后天梯石栈相钩连。", key: true, traps: { 摧: ["催", "崔"] } },
            { text: "上有六龙回日之高标，下有冲波逆折之回川。", key: true, cue: "《蜀道难》中写山高水险、极言其危的一句" },
            { text: "青泥何盘盘，百步九折萦岩峦。", key: true, traps: { 萦: ["莹", "萤"] } },
            { text: "剑阁峥嵘而崔嵬，一夫当关，万夫莫开。", key: true, cue: "《蜀道难》中写剑阁险要、易守难攻的一句", traps: { 峥: ["挣", "净"], 嵬: ["伟", "违"] } },
            { text: "侧身西望长咨嗟。", key: true, traps: { 咨: ["资", "姿"] } },
            { text: "黄鹤之飞尚不得过，猿猱欲度愁攀援。", key: true, traps: { 猱: ["柔", "揉"] } },
            { text: "飞湍瀑流争喧豗，砯崖转石万壑雷。", key: true },
            { text: "锦城虽云乐，不如早还家。", key: true },
        ],
    },
    {
        key: "《梦游天姥吟留别》·李白", src: "《梦游天姥吟留别》", author: "李白", dynasty: "唐", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "新高考卷", note: "安能摧眉折腰事权贵（高频）" }],
        lines: [
            { text: "天姥连天向天横，势拔五岳掩赤城。", key: true },
            { text: "云青青兮欲雨，水澹澹兮生烟。", key: true, traps: { 澹: ["淡", "赡"] } },
            { text: "忽魂悸以魄动，恍惊起而长嗟。", key: true, traps: { 悸: ["季", "寄"] } },
            { text: "安能摧眉折腰事权贵，使我不得开心颜！", key: true, cue: "《梦游天姥吟留别》中表现蔑视权贵、傲岸不屈的一句", traps: { 摧: ["催", "崔"] } },
        ],
    },
    {
        key: "《将进酒》·李白", src: "《将进酒》", author: "李白", dynasty: "唐", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "全国卷", note: "天生我材必有用（高频）" }],
        lines: [
            { text: "君不见黄河之水天上来，奔流到海不复回。", key: true, cue: "《将进酒》开篇以黄河起兴感叹时光一去不返的一句" },
            { text: "人生得意须尽欢，莫使金樽空对月。", key: true },
            { text: "天生我材必有用，千金散尽还复来。", key: true, cue: "《将进酒》中写自信豪迈的一句", traps: { 材: ["才", "财"] } },
            { text: "钟鼓馔玉不足贵，但愿长醉不复醒。", key: true, traps: { 馔: ["撰", "篆"] } },
            { text: "古来圣贤皆寂寞，惟有饮者留其名。", key: true },
            { text: "五花马，千金裘，呼儿将出换美酒，与尔同销万古愁。", key: true, cue: "《将进酒》结尾写散尽千金消万古愁的一句" },
        ],
    },
    {
        key: "《燕歌行》·高适", src: "《燕歌行》", author: "高适", dynasty: "唐", stage: "high", genre: "poem",
        lines: [
            { text: "战士军前半死生，美人帐下犹歌舞。", key: true, cue: "《燕歌行》中对比士兵浴血与将帅享乐的一句", traps: { 犹: ["尤", "忧"] } },
            { text: "相看白刃血纷纷，死节从来岂顾勋。", key: true, traps: { 勋: ["助", "匀"] } },
            { text: "少妇城南欲断肠，征人蓟北空回首。", key: true, cue: "《燕歌行》中写征人思妇两头相思的一句", traps: { 蓟: ["剂", "鱼"] } },
            { text: "君不见沙场征战苦，至今犹忆李将军！", key: true, cue: "《燕歌行》结尾追思良将的一句" },
        ],
    },
    {
        key: "《蜀相》·杜甫", src: "《蜀相》", author: "杜甫", dynasty: "唐", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "全国卷", note: "出师未捷身先死（高频）" }],
        lines: [
            { text: "丞相祠堂何处寻？锦官城外柏森森。", key: true },
            { text: "映阶碧草自春色，隔叶黄鹂空好音。", key: true, cont: true, traps: { 鹂: ["丽", "骊"] } },
            { text: "三顾频烦天下计，两朝开济老臣心。", key: true, cue: "《蜀相》中概括诸葛亮一生功业的一句", cont: true },
            { text: "出师未捷身先死，长使英雄泪满襟。", key: true, cue: "《蜀相》结尾写壮志未酬、英雄落泪的一句", cont: true, traps: { 襟: ["今", "禁"], 捷: ["婕", "睫"] } },
        ],
    },
    {
        key: "《客至》·杜甫", src: "《客至》", author: "杜甫", dynasty: "唐", stage: "high", genre: "poem",
        lines: [
            { text: "舍南舍北皆春水，但见群鸥日日来。", key: true },
            { text: "花径不曾缘客扫，蓬门今始为君开。", key: true, cue: "《客至》中写喜迎客至的一句", traps: { 蓬: ["篷", "篷"] } },
            { text: "盘飧市远无兼味，樽酒家贫只旧醅。", key: true, cont: true, traps: { 飧: ["餐", "食"], 醅: ["陪", "培"] } },
            { text: "肯与邻翁相对饮，隔篱呼取尽余杯。", key: true, cont: true },
        ],
    },
    {
        key: "《登高》·杜甫", src: "《登高》", author: "杜甫", dynasty: "唐", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "全国卷", note: "万里悲秋常作客（高频）" }],
        lines: [
            { text: "风急天高猿啸哀，渚清沙白鸟飞回。", key: true, traps: { 渚: ["诸", "煮"] } },
            { text: "无边落木萧萧下，不尽长江滚滚来。", key: true, cue: "《登高》中写秋景苍茫辽阔、气势雄浑的一句", cont: true },
            { text: "万里悲秋常作客，百年多病独登台。", key: true, cue: "《登高》中写漂泊多病、独自登台的一句", traps: { 作: ["做", "坐"] }, cont: true },
            { text: "艰难苦恨繁霜鬓，潦倒新停浊酒杯。", key: true, traps: { 鬓: ["宾", "滨"], 潦: ["涝", "缭"] }, cont: true },
        ],
    },
    {
        key: "《登岳阳楼》·杜甫", src: "《登岳阳楼》", author: "杜甫", dynasty: "唐", stage: "high", genre: "poem",
        lines: [
            { text: "昔闻洞庭水，今上岳阳楼。", key: true },
            { text: "吴楚东南坼，乾坤日夜浮。", key: true, cue: "《登岳阳楼》中写洞庭裂楚分吴、吞吐日月的一句", traps: { 坼: ["拆", "柝"] }, cont: true },
            { text: "戎马关山北，凭轩涕泗流。", key: true },
        ],
    },
    {
        key: "《琵琶行》·白居易", src: "《琵琶行》", author: "白居易", dynasty: "唐", stage: "high", genre: "poem",
        examObs: [{ y: 2026, q: "全国二卷", note: "五陵年少争缠头，一曲红绡不知数" }],
        lines: [
            { text: "浔阳江头夜送客，枫叶荻花秋瑟瑟。", key: true, traps: { 荻: ["获", "狄"] } },
            { text: "千呼万唤始出来，犹抱琵琶半遮面。", key: true, cue: "《琵琶行》中写琵琶女羞怯出场的名句" },
            { text: "转轴拨弦三两声，未成曲调先有情。", key: true, cue: "《琵琶行》中写调弦校音、情已先至的一句", traps: { 轴: ["舟", "压"] } },
            { text: "大弦嘈嘈如急雨，小弦切切如私语。", key: true, cue: "《琵琶行》中以比喻写弦音粗重与轻细的一句" },
            { text: "嘈嘈切切错杂弹，大珠小珠落玉盘。", key: true, cue: "《琵琶行》中写弦音交错如珠落玉盘的名句", cont: true },
            { text: "间关莺语花底滑，幽咽泉流冰下难。", key: true, cont: true },
            { text: "别有幽愁暗恨生，此时无声胜有声。", key: true, cue: "《琵琶行》中写无声胜有声的名句", traps: { 幽: ["悠", "忧"] } },
            { text: "东船西舫悄无言，唯见江心秋月白。", key: true },
            { text: "五陵年少争缠头，一曲红绡不知数。", key: true, cue: "《琵琶行》中写琵琶女当年受豪贵追捧的一句(2026 全国二卷考查)", traps: { 绡: ["宵", "销"] } },
            { text: "同是天涯沦落人，相逢何必曾相识！", key: true, cue: "《琵琶行》中写诗人与琵琶女同病相怜的名句" },
            { text: "去来江口守空船，绕船月明江水寒。", key: true, cue: "《琵琶行》中写琵琶女独守空船的一句" },
            { text: "座中泣下谁最多？江州司马青衫湿。", key: true, cue: "《琵琶行》结尾写诗人泪湿青衫的一句", traps: { 湿: ["温", "嘘"] } },
        ],
    },
    {
        key: "《李凭箜篌引》·李贺", src: "《李凭箜篌引》", author: "李贺", dynasty: "唐", stage: "high", genre: "poem",
        lines: [
            { text: "吴丝蜀桐张高秋，空山凝云颓不流。", key: true, traps: { 凝: ["疑", "拟"] } },
            { text: "昆山玉碎凤凰叫，芙蓉泣露香兰笑。", key: true, cue: "《李凭箜篌引》中以声写乐、惊天地泣鬼神的一句" },
            { text: "十二门前融冷光，二十三丝动紫皇。", key: true, traps: { 皇: ["黄", "煌"] } },
            { text: "女娲炼石补天处，石破天惊逗秋雨。", key: true, cue: "《李凭箜篌引》中写乐声惊天动地的一句", traps: { 娲: ["窝", "涡"] } },
        ],
    },
    {
        key: "《锦瑟》·李商隐", src: "《锦瑟》", author: "李商隐", dynasty: "唐", stage: "high", genre: "poem",
        examObs: [{ y: 2022, q: "新高考I卷", note: "沧海月明珠有泪，蓝田日暖玉生烟(待核)" }],
        lines: [
            { text: "锦瑟无端五十弦，一弦一柱思华年。", key: true, cue: "《锦瑟》开篇借瑟弦写追忆年华的一句" },
            { text: "庄生晓梦迷蝴蝶，望帝春心托杜鹃。", key: true, cue: "《锦瑟》中连用典故写迷惘哀怨的一句", cont: true },
            { text: "沧海月明珠有泪，蓝田日暖玉生烟。", key: true, cue: "《锦瑟》中写美好事物可望而不可即的一句", traps: { 沧: ["苍", "仓"] }, cont: true },
            { text: "此情可待成追忆，只是当时已惘然。", key: true, traps: { 惘: ["罔", "网"] }, cont: true },
        ],
    },
    {
        key: "《马嵬·其二》·李商隐", src: "《马嵬·其二》", author: "李商隐", dynasty: "唐", stage: "high", genre: "poem",
        lines: [
            { text: "海外徒闻更九州，他生未卜此生休。", key: true, traps: { 卜: ["朴", "补"] } },
            { text: "如何四纪为天子，不及卢家有莫愁。", key: true, cue: "《马嵬》结尾讽刺天子不如百姓家夫妻相守的一句" },
        ],
    },
    {
        key: "《望海潮》·柳永", src: "《望海潮》", author: "柳永", dynasty: "宋", stage: "high", genre: "poem",
        examObs: [{ y: 2025, q: "全国一卷", note: "烟柳画桥，风帘翠幕" }],
        lines: [
            { text: "东南形胜，三吴都会，钱塘自古繁华。", key: true, cue: "《望海潮》开篇总括杭州形胜与繁华的一句" },
            { text: "烟柳画桥，风帘翠幕，参差十万人家。", key: true, cue: "《望海潮》中写烟柳画桥、人烟繁盛的一句(2025 全国一卷考查)", cont: true },
            { text: "云树绕堤沙，怒涛卷霜雪，天堑无涯。", key: true, cont: true, traps: { 堑: ["暂", "斩"] } },
            { text: "市列珠玑，户盈罗绮，竞豪奢。", key: true, traps: { 玑: ["机", "矶"] } },
            { text: "重湖叠巘清嘉，有三秋桂子，十里荷花。", key: true, cue: "《望海潮》中写湖山桂荷的千古名句", cont: true, traps: { 巘: ["献", "溪"] } },
        ],
    },
    {
        key: "《桂枝香·金陵怀古》·王安石", src: "《桂枝香·金陵怀古》", author: "王安石", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "登临送目，正故国晚秋，天气初肃。", key: true },
            { text: "千里澄江似练，翠峰如簇。", key: true, cue: "《桂枝香》中写澄江如练、翠峰如簇的一句", traps: { 簇: ["族", "蔟"] } },
            { text: "六朝旧事随流水，但寒烟衰草凝绿。", key: true, cue: "《桂枝香》中借六朝旧事抒怀的一句" },
        ],
    },
    {
        key: "《江城子·乙卯正月二十日夜记梦》·苏轼", src: "《江城子·乙卯正月二十日夜记梦》", author: "苏轼", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "十年生死两茫茫，不思量，自难忘。", key: true, cue: "《江城子》开篇写十年生死相隔的悼亡名句" },
            { text: "千里孤坟，无处话凄凉。", key: true, cont: true },
            { text: "纵使相逢应不识，尘满面，鬓如霜。", key: true, traps: { 鬓: ["宾", "滨"] } },
            { text: "相顾无言，惟有泪千行。", key: true },
        ],
    },
    {
        key: "《念奴娇·赤壁怀古》·苏轼", src: "《念奴娇·赤壁怀古》", author: "苏轼", dynasty: "宋", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "全国卷", note: "樯橹灰飞烟灭（高频）" }],
        lines: [
            { text: "大江东去，浪淘尽，千古风流人物。", key: true, cue: "《念奴娇》开篇写大江东去、怀想千古人物的一句" },
            { text: "乱石穿空，惊涛拍岸，卷起千堆雪。", key: true, cue: "《念奴娇》中写赤壁奇险江景的一句" },
            { text: "羽扇纶巾，谈笑间，樯橹灰飞烟灭。", key: true, cue: "《念奴娇》中写周瑜从容破敌的一句", traps: { 纶: ["伦", "论"], 樯: ["墙", "酱"] } },
            { text: "人生如梦，一尊还酹江月。", key: true, traps: { 酹: ["泪", "类"] } },
        ],
    },
    {
        key: "《定风波》·苏轼", src: "《定风波》", author: "苏轼", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "莫听穿林打叶声，何妨吟啸且徐行。", key: true },
            { text: "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。", key: true, cue: "《定风波》中写任凭风雨、泰然自若的一句", traps: { 芒: ["茫", "氓"] }, cont: true },
            { text: "回首向来萧瑟处，归去，也无风雨也无晴。", key: true, cue: "《定风波》结尾写宠辱不惊的一句", traps: { 萧: ["箫", "潇"] }, cont: true },
        ],
    },
    {
        key: "《登快阁》·黄庭坚", src: "《登快阁》", author: "黄庭坚", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "痴儿了却公家事，快阁东西倚晚晴。", key: true, traps: { 倚: ["椅", "奇"] } },
            { text: "落木千山天远大，澄江一道月分明。", key: true, cue: "《登快阁》中写秋景澄澈、天地开阔的一句", cont: true },
            { text: "朱弦已为佳人绝，青眼聊因美酒横。", key: true, cont: true },
        ],
    },
    {
        key: "《鹊桥仙》·秦观", src: "《鹊桥仙》", author: "秦观", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "纤云弄巧，飞星传恨，银汉迢迢暗度。", key: true, traps: { 迢: ["条", "苕"] } },
            { text: "金风玉露一相逢，便胜却人间无数。", key: true, cue: "《鹊桥仙》中写相逢胜过人间的一句", cont: true },
            { text: "两情若是久长时，又岂在朝朝暮暮。", key: true, cue: "《鹊桥仙》结尾写真情不在朝夕的名句", traps: { 暮: ["幕", "墓"] }, cont: true },
        ],
    },
    {
        key: "《苏幕遮》·周邦彦", src: "《苏幕遮》", author: "周邦彦", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "叶上初阳干宿雨，水面清圆，一一风荷举。", key: true, cue: "《苏幕遮》中写荷叶出水亭亭如举的一句" },
            { text: "五月渔郎相忆否？小楫轻舟，梦入芙蓉浦。", key: true, traps: { 楫: ["辑", "揖"], 浦: ["铺", "圃"] } },
        ],
    },
    {
        key: "《声声慢》·李清照", src: "《声声慢》", author: "李清照", dynasty: "宋", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "全国卷", note: "高频考查" }],
        lines: [
            { text: "寻寻觅觅，冷冷清清，凄凄惨惨戚戚。", key: true, cue: "《声声慢》开篇十四叠字写愁绪的一句", traps: { 凄: ["萋", "妻"] } },
            { text: "三杯两盏淡酒，怎敌他、晚来风急！", key: true, traps: { 盏: ["站", "浅"] } },
            { text: "满地黄花堆积，憔悴损，如今有谁堪摘？", key: true, traps: { 憔: ["瞧", "樵"] } },
            { text: "梧桐更兼细雨，到黄昏、点点滴滴。", key: true, cont: true },
            { text: "这次第，怎一个愁字了得！", key: true, cue: "《声声慢》结尾直抒愁怀的一句", cont: true },
        ],
    },
    {
        key: "《书愤》·陆游", src: "《书愤》", author: "陆游", dynasty: "宋", stage: "high", genre: "poem",
        examObs: [{ y: 2025, q: "全国一卷", note: "楼船夜雪瓜洲渡，铁马秋风大散关" }],
        lines: [
            { text: "早岁那知世事艰，中原北望气如山。", key: true },
            { text: "楼船夜雪瓜洲渡，铁马秋风大散关。", key: true, cue: "《书愤》中追忆抗金壮景的一句(2025 全国一卷考查)", cont: true },
            { text: "塞上长城空自许，镜中衰鬓已先斑。", key: true, traps: { 鬓: ["宾", "滨"] }, cont: true },
            { text: "出师一表真名世，千载谁堪伯仲间！", key: true, cue: "《书愤》结尾以诸葛亮自勉的一句", traps: { 堪: ["斟", "甚"] }, cont: true },
        ],
    },
    {
        key: "《临安春雨初霁》·陆游", src: "《临安春雨初霁》", author: "陆游", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "小楼一夜听春雨，深巷明朝卖杏花。", key: true, cue: "《临安春雨初霁》中写江南春色的名句" },
            { text: "矮纸斜行闲作草，晴窗细乳戏分茶。", key: true, cont: true },
            { text: "素衣莫起风尘叹，犹及清明可到家。", key: true, cont: true },
        ],
    },
    {
        key: "《念奴娇·过洞庭》·张孝祥", src: "《念奴娇·过洞庭》", author: "张孝祥", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "素月分辉，明河共影，表里俱澄澈。", key: true, cue: "《念奴娇·过洞庭》中写表里澄澈、肝胆晶莹的一句" },
            { text: "悠然心会，妙处难与君说。", key: true, cue: "《念奴娇·过洞庭》中写妙悟难以言传的一句" },
            { text: "短发萧骚襟袖冷，稳泛沧浪空阔。", key: true, traps: { 襟: ["今", "禁"], 沧: ["苍", "仓"] } },
        ],
    },
    {
        key: "《永遇乐·京口北固亭怀古》·辛弃疾", src: "《永遇乐·京口北固亭怀古》", author: "辛弃疾", dynasty: "宋", stage: "high", genre: "poem",
        examObs: [{ y: 0, q: "全国二卷", note: "金戈铁马，气吞万里如虎" }],
        lines: [
            { text: "千古江山，英雄无觅，孙仲谋处。", key: true },
            { text: "舞榭歌台，风流总被，雨打风吹去。", key: true, traps: { 榭: ["谢", "税"] } },
            { text: "金戈铁马，气吞万里如虎。", key: true, cue: "《永遇乐》中写刘裕北伐气势的一句" },
            { text: "四十三年，望中犹记，烽火扬州路。", key: true, cue: "《永遇乐》中写北望烽火、追忆当年的一句" },
            { text: "元嘉草草，封狼居胥，赢得仓皇北顾。", key: true, traps: { 胥: ["虚", "婿"] }, cont: true },
            { text: "凭谁问：廉颇老矣，尚能饭否？", key: true, cue: "《永遇乐》结尾以廉颇自况的一句", traps: { 廉: ["镰", "兼"], 颇: ["坡", "波"] } },
        ],
    },
    {
        key: "《菩萨蛮·书江西造口壁》·辛弃疾", src: "《菩萨蛮·书江西造口壁》", author: "辛弃疾", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "郁孤台下清江水，中间多少行人泪。", key: true },
            { text: "青山遮不住，毕竟东流去。", key: true, cue: "《菩萨蛮》中写正义终不可阻挡的一句" },
            { text: "江晚正愁余，山深闻鹧鸪。", key: true },
        ],
    },
    {
        key: "《青玉案·元夕》·辛弃疾", src: "《青玉案·元夕》", author: "辛弃疾", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "东风夜放花千树，更吹落、星如雨。", key: true, cue: "《青玉案》中写元夕灯火如星雨的一句" },
            { text: "蛾儿雪柳黄金缕，笑语盈盈暗香去。", key: true, traps: { 蛾: ["娥", "俄"] } },
            { text: "众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。", key: true, cue: "《青玉案》结尾写蓦然回首的名句", traps: { 蓦: ["幕", "慕"], 阑: ["栏", "澜"] } },
        ],
    },
    {
        key: "《扬州慢》·姜夔", src: "《扬州慢》", author: "姜夔", dynasty: "宋", stage: "high", genre: "poem",
        lines: [
            { text: "淮左名都，竹西佳处，解鞍少驻初程。", key: true, traps: { 鞍: ["按", "案"] } },
            { text: "过春风十里，尽荠麦青青。", key: true, cue: "《扬州慢》中写扬州劫后荒芜的一句", traps: { 荠: ["齐", "济"] }, cont: true },
            { text: "自胡马窥江去后，废池乔木，犹厌言兵。", key: true },
            { text: "二十四桥仍在，波心荡、冷月无声。", key: true, cue: "《扬州慢》中写桥在月冷、物是人非的一句" },
            { text: "念桥边红药，年年知为谁生。", key: true, cont: true },
        ],
    },
    {
        key: "《朝天子·咏喇叭》·王磐", src: "《朝天子·咏喇叭》", author: "王磐", dynasty: "明", stage: "high", genre: "poem",
        lines: [
            { text: "喇叭，唢呐，曲儿小腔儿大。", key: true, cue: "《朝天子》中讽刺宦官装腔作势的一句", traps: { 唢: ["锁", "琐"] } },
        ],
    },

    /* ================= 初中 · 高频必背篇目 ================= */
    {
        key: "《关雎》·佚名", src: "《关雎》", author: "佚名", dynasty: "先秦", stage: "junior", genre: "poem",
        lines: [
            { text: "关关雎鸠，在河之洲。", key: true, traps: { 雎: ["睢", "准"], 洲: ["州", "舟"] } },
            { text: "窈窕淑女，君子好逑。", key: true, cue: "《关雎》中写文静美好的女子是君子佳偶的一句", traps: { 逑: ["求", "球"] }, cont: true },
        ],
    },
    {
        key: "《蒹葭》·佚名", src: "《蒹葭》", author: "佚名", dynasty: "先秦", stage: "junior", genre: "poem",
        lines: [
            { text: "蒹葭苍苍，白露为霜。", key: true, cue: "《蒹葭》开篇起兴的一句", traps: { 蒹: ["兼", "谦"], 葭: ["佳", "家"] } },
            { text: "所谓伊人，在水一方。", key: true, cue: "《蒹葭》中写心上人在水那头的一句", cont: true },
        ],
    },
    {
        key: "《十五从军征》·佚名", src: "《十五从军征》", author: "佚名", dynasty: "汉", stage: "junior", genre: "poem",
        lines: [
            { text: "十五从军征，八十始得归。", key: true, cue: "《十五从军征》开篇写服役之久的一句" },
            { text: "遥看是君家，松柏冢累累。", key: true, traps: { 冢: ["棕", "锺"] } },
        ],
    },
    {
        key: "《木兰诗》·北朝民歌", src: "《木兰诗》", author: "北朝民歌", dynasty: "北朝", stage: "junior", genre: "poem",
        lines: [
            { text: "万里赴戎机，关山度若飞。", key: true, cue: "《木兰诗》中写木兰奔赴战场的句子", traps: { 戎: ["戍", "戒"], 度: ["渡"] } },
            { text: "将军百战死，壮士十年归。", key: true, cue: "《木兰诗》中写征战漫长惨烈的一句" },
            { text: "雄兔脚扑朔，雌兔眼迷离。", key: true, traps: { 朔: ["溯", "塑"] } },
        ],
    },
    {
        key: "《卖炭翁》·白居易", src: "《卖炭翁》", author: "白居易", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "满面尘灰烟火色，两鬓苍苍十指黑。", key: true, traps: { 鬓: ["宾", "滨"] } },
            { text: "可怜身上衣正单，心忧炭贱愿天寒。", key: true, cue: "《卖炭翁》中写矛盾心理、令人心酸的一句" },
            { text: "一车炭，千余斤，宫使驱将惜不得。", key: true, traps: { 驱: ["躯", "区"] } },
            { text: "半匹红纱一丈绫，系向牛头充炭直。", key: true, cue: "《卖炭翁》中写宫使强行掠夺的一句" },
        ],
    },
    {
        key: "《饮酒·其五》·陶渊明", src: "《饮酒·其五》", author: "陶渊明", dynasty: "晋", stage: "junior", genre: "poem",
        lines: [
            { text: "问君何能尔？心远地自偏。", key: true },
            { text: "采菊东篱下，悠然见南山。", key: true, cue: "《饮酒》中写物我两忘的千古名句", cont: true, traps: { 篱: ["离", "璃"] } },
            { text: "山气日夕佳，飞鸟相与还。", key: true, cont: true },
            { text: "此中有真意，欲辨已忘言。", key: true, cont: true },
        ],
    },
    {
        key: "《送杜少府之任蜀州》·王勃", src: "《送杜少府之任蜀州》", author: "王勃", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "海内存知己，天涯若比邻。", key: true, cue: "《送杜少府》中写友情不受距离阻隔的名句", traps: { 涯: ["崖", "崖"] } },
        ],
    },
    {
        key: "《次北固山下》·王湾", src: "《次北固山下》", author: "王湾", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "客路青山外，行舟绿水前。" },
            { text: "潮平两岸阔，风正一帆悬。", key: true, cont: true, traps: { 悬: ["县", "县"] } },
            { text: "海日生残夜，江春入旧年。", key: true, cue: "《次北固山下》中写新旧交替、时序更迭的名句", cont: true },
            { text: "乡书何处达？归雁洛阳边。", key: true, cont: true, traps: { 雁: ["燕", "彦"] } },
        ],
    },
    {
        key: "《使至塞上》·王维", src: "《使至塞上》", author: "王维", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "征蓬出汉塞，归雁入胡天。", key: true, traps: { 蓬: ["篷", "篷"], 雁: ["燕", "彦"] } },
            { text: "大漠孤烟直，长河落日圆。", key: true, cue: "《使至塞上》中被王国维赞为「千古壮观」的名句" },
        ],
    },
    {
        key: "《闻王昌龄左迁龙标遥有此寄》·李白", src: "《闻王昌龄左迁龙标遥有此寄》", author: "李白", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "我寄愁心与明月，随君直到夜郎西。", key: true, cue: "《闻王昌龄左迁》中托月寄愁的一句", traps: { 郎: ["朗", "廊"] } },
        ],
    },
    {
        key: "《望岳》·杜甫", src: "《望岳》", author: "杜甫", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "造化钟神秀，阴阳割昏晓。", key: true, cue: "《望岳》中写泰山神奇秀丽、分割明暗的一句", traps: { 割: ["害", "谷"] } },
            { text: "会当凌绝顶，一览众山小。", key: true, cue: "《望岳》中写俯瞰一切的雄心的一句" },
        ],
    },
    {
        key: "《春望》·杜甫", src: "《春望》", author: "杜甫", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "感时花溅泪，恨别鸟惊心。", key: true, cue: "《春望》中借花鸟写忧国伤时的一句" },
            { text: "烽火连三月，家书抵万金。", key: true, cue: "《春望》中写战乱家信珍贵的一句", traps: { 抵: ["低", "底"] }, cont: true },
        ],
    },
    {
        key: "《登飞来峰》·王安石", src: "《登飞来峰》", author: "王安石", dynasty: "宋", stage: "junior", genre: "poem",
        lines: [
            { text: "飞来山上千寻塔，闻说鸡鸣见日升。", key: true },
            { text: "不畏浮云遮望眼，自缘身在最高层。", key: true, cue: "《登飞来峰》中写高瞻远瞩、无惧阻挠的一句" },
        ],
    },
    {
        key: "《酬乐天扬州初逢席上见赠》·刘禹锡", src: "《酬乐天扬州初逢席上见赠》", author: "刘禹锡", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "沉舟侧畔千帆过，病树前头万木春。", key: true, cue: "《酬乐天》中蕴含新事物必取代旧事物哲理的名句", traps: { 畔: ["叛", "拌"] } },
            { text: "今日听君歌一曲，暂凭杯酒长精神。", key: true, traps: { 暂: ["崭", "渐"] } },
        ],
    },
    {
        key: "《赤壁》·杜牧", src: "《赤壁》", author: "杜牧", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "东风不与周郎便，铜雀春深锁二乔。", key: true, cue: "《赤壁》中假设东风不助周瑜的一句", traps: { 雀: ["鹊", "崔"], 乔: ["桥", "侨"] } },
        ],
    },
    {
        key: "《泊秦淮》·杜牧", src: "《泊秦淮》", author: "杜牧", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "烟笼寒水月笼沙，夜泊秦淮近酒家。", key: true, traps: { 笼: ["茏", "拢"] } },
            { text: "商女不知亡国恨，隔江犹唱后庭花。", key: true, cue: "《泊秦淮》中借歌女讽喻时政的一句", traps: { 犹: ["尤", "忧"] }, cont: true },
        ],
    },
    {
        key: "《夜雨寄北》·李商隐", src: "《夜雨寄北》", author: "李商隐", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "君问归期未有期，巴山夜雨涨秋池。", key: true, traps: { 涨: ["张", "帐"] } },
            { text: "何当共剪西窗烛，却话巴山夜雨时。", key: true, cue: "《夜雨寄北》中想象重逢情景的一句", cont: true },
        ],
    },
    {
        key: "《无题·相见时难别亦难》·李商隐", src: "《无题·相见时难别亦难》", author: "李商隐", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "春蚕到死丝方尽，蜡炬成灰泪始干。", key: true, cue: "《无题》中以春蚕蜡烛喻至死不渝深情的一句", traps: { 蜡: ["腊", "猎"], 炬: ["距", "巨"] } },
            { text: "晓镜但愁云鬓改，夜吟应觉月光寒。", key: true, traps: { 鬓: ["宾", "滨"] }, cont: true },
            { text: "蓬山此去无多路，青鸟殷勤为探看。", key: true, traps: { 蓬: ["篷", "篷"] }, cont: true },
        ],
    },
    {
        key: "《游山西村》·陆游", src: "《游山西村》", author: "陆游", dynasty: "宋", stage: "junior", genre: "poem",
        lines: [
            { text: "莫笑农家腊酒浑，丰年留客足鸡豚。", key: true, traps: { 腊: ["蜡", "猎"], 豚: ["炖", "循"] } },
            { text: "山重水复疑无路，柳暗花明又一村。", key: true, cue: "《游山西村》中写绝处逢生的名句", cont: true },
        ],
    },
    {
        key: "《己亥杂诗·其五》·龚自珍", src: "《己亥杂诗·其五》", author: "龚自珍", dynasty: "清", stage: "junior", genre: "poem",
        lines: [
            { text: "浩荡离愁白日斜，吟鞭东指即天涯。", key: true, traps: { 涯: ["崖", "崖"] } },
            { text: "落红不是无情物，化作春泥更护花。", key: true, cue: "《己亥杂诗》中以落花自喻、写奉献精神的名句", cont: true },
        ],
    },
    {
        key: "《雁门太守行》·李贺", src: "《雁门太守行》", author: "李贺", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "黑云压城城欲摧，甲光向日金鳞开。", key: true, cue: "《雁门太守行》中写大军压境的一句", traps: { 摧: ["催", "崔"] } },
            { text: "报君黄金台上意，提携玉龙为君死。", key: true },
        ],
    },
    {
        key: "《渔家傲·天接云涛连晓雾》·李清照", src: "《渔家傲·天接云涛连晓雾》", author: "李清照", dynasty: "宋", stage: "junior", genre: "poem",
        lines: [
            { text: "天接云涛连晓雾，星河欲转千帆舞。", key: true, cue: "《渔家傲》中写海天相接、星河千帆的一句" },
            { text: "我报路长嗟日暮，学诗谩有惊人句。", key: true, traps: { 谩: ["漫", "蔓"] } },
            { text: "风休住，蓬舟吹取三山去。", key: true, cue: "《渔家傲》结尾写乘舟直上仙山的一句", traps: { 蓬: ["篷", "篷"] } },
        ],
    },
    {
        key: "《水调歌头·明月几时有》·苏轼", src: "《水调歌头·明月几时有》", author: "苏轼", dynasty: "宋", stage: "junior", genre: "poem",
        lines: [
            { text: "不知天上宫阙，今夕是何年。", key: true, traps: { 阙: ["缺", "阕"] } },
            { text: "人有悲欢离合，月有阴晴圆缺，此事古难全。", key: true, cue: "《水调歌头》中写人生难以圆满的一句" },
            { text: "但愿人长久，千里共婵娟。", key: true, cue: "《水调歌头》中遥寄祝愿的名句", traps: { 婵: ["蝉", "禅"], 娟: ["绢", "捐"] } },
        ],
    },
    {
        key: "《天净沙·秋思》·马致远", src: "《天净沙·秋思》", author: "马致远", dynasty: "元", stage: "junior", genre: "poem",
        lines: [
            { text: "枯藤老树昏鸦，小桥流水人家，古道西风瘦马。", key: true, traps: { 藤: ["腾", "滕"], 鸦: ["鸭", "雅"] } },
            { text: "夕阳西下，断肠人在天涯。", key: true, cue: "《天净沙》中直抒游子愁绪的一句", traps: { 肠: ["长", "常"], 涯: ["崖", "崖"] }, cont: true },
        ],
    },
    {
        key: "《观沧海》·曹操", src: "《观沧海》", author: "曹操", dynasty: "汉", stage: "junior", genre: "poem",
        lines: [
            { text: "东临碣石，以观沧海。", key: true, traps: { 碣: ["竭", "揭"], 沧: ["苍", "仓"] } },
            { text: "秋风萧瑟，洪波涌起。", key: true, traps: { 萧: ["箫", "潇"] } },
            { text: "日月之行，若出其中；星汉灿烂，若出其里。", key: true, cue: "《观沧海》中写吞吐日月的大海的一句" },
        ],
    },
    {
        key: "《龟虽寿》·曹操", src: "《龟虽寿》", author: "曹操", dynasty: "汉", stage: "junior", genre: "poem",
        lines: [
            { text: "老骥伏枥，志在千里。", key: true, cue: "《龟虽寿》中写老当益壮的一句", traps: { 骥: ["冀", "翼"], 枥: ["沥", "历"] } },
            { text: "烈士暮年，壮心不已。", key: true, traps: { 暮: ["幕", "墓"] } },
            { text: "盈缩之期，不但在天；养怡之福，可得永年。", key: true, cue: "《龟虽寿》中写寿命不全由天定的一句", traps: { 怡: ["贻", "饴"] }, cont: true },
        ],
    },
    {
        key: "《早春呈水部张十八员外》·韩愈", src: "《早春呈水部张十八员外》", author: "韩愈", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "天街小雨润如酥，草色遥看近却无。", key: true, cue: "《早春呈水部》中写早春草色若隐若现的名句", traps: { 酥: ["苏", "稣"] } },
        ],
    },
    {
        key: "《钱塘湖春行》·白居易", src: "《钱塘湖春行》", author: "白居易", dynasty: "唐", stage: "junior", genre: "poem",
        lines: [
            { text: "几处早莺争暖树，谁家新燕啄春泥。", key: true, cue: "《钱塘湖春行》中写早春禽鸟的一句", traps: { 莺: ["鹰", "莹"], 燕: ["雁", "宴"], 啄: ["逐", "琢"] } },
            { text: "乱花渐欲迷人眼，浅草才能没马蹄。", key: true, traps: { 蹄: ["啼", "缔"] }, cont: true },
            { text: "最爱湖东行不足，绿杨阴里白沙堤。", key: true, traps: { 堤: ["提", "题"] } },
        ],
    },
    {
        key: "《出师表》·诸葛亮", src: "《出师表》", author: "诸葛亮", dynasty: "三国", stage: "junior", genre: "prose",
        lines: [
            { text: "亲贤臣，远小人，此先汉所以兴隆也。", key: true, cue: "《出师表》中总结前汉兴隆原因的一句" },
            { text: "受任于败军之际，奉命于危难之间。", key: true, cue: "《出师表》中写自己临危受命的一句" },
            { text: "亲小人，远贤臣，此后汉所以倾颓也。", key: true, cue: "《出师表》中总结后汉倾颓原因的一句", traps: { 倾: ["顷", "隧"] } },
            { text: "苟全性命于乱世，不求闻达于诸侯。", key: true, cue: "《出师表》中写诸葛亮本志的一句" },
            { text: "三顾臣于草庐之中，咨臣以当世之事。", key: true, traps: { 咨: ["资", "姿"] } },
            { text: "今当远离，临表涕零，不知所言。", key: true, cue: "《出师表》结尾写临别涕零的一句", traps: { 涕: ["梯", "递"] } },
        ],
    },
    {
        key: "《桃花源记》·陶渊明", src: "《桃花源记》", author: "陶渊明", dynasty: "晋", stage: "junior", genre: "prose",
        lines: [
            { text: "芳草鲜美，落英缤纷。", key: true, cue: "《桃花源记》中写桃花林景色绚烂的一句" },
            { text: "阡陌交通，鸡犬相闻。", key: true, traps: { 阡: ["千", "迁"] } },
            { text: "屋舍俨然，有良田、美池、桑竹之属。", key: true, traps: { 俨: ["严", "岩"] } },
            { text: "黄发垂髫，并怡然自乐。", key: true, cue: "《桃花源记》中写老人孩童安乐的一句", traps: { 髫: ["条", "髻"], 怡: ["贻", "饴"] } },
            { text: "此人一一为具言所闻，皆叹惋。", key: true, traps: { 惋: ["婉", "宛"] } },
        ],
    },
    {
        key: "《小石潭记》·柳宗元", src: "《小石潭记》", author: "柳宗元", dynasty: "唐", stage: "junior", genre: "prose",
        lines: [
            { text: "斗折蛇行，明灭可见。", key: true, cue: "《小石潭记》中写溪流曲折的一句" },
            { text: "青树翠蔓，蒙络摇缀，参差披拂。", key: true, traps: { 缀: ["辍", "坠"], 蔓: ["漫", "曼"] } },
            { text: "潭中鱼可百许头，皆若空游无所依。", key: true, cue: "《小石潭记》中写潭水清澈见底的一句" },
            { text: "凄神寒骨，悄怆幽邃。", key: true, cue: "《小石潭记》中写气氛凄清的一句", traps: { 邃: ["遂", "燧"] } },
        ],
    },
    {
        key: "《醉翁亭记》·欧阳修", src: "《醉翁亭记》", author: "欧阳修", dynasty: "宋", stage: "junior", genre: "prose",
        lines: [
            { text: "峰回路转，有亭翼然临于泉上者，醉翁亭也。", key: true, cue: "《醉翁亭记》中写醉翁亭形胜的一句", traps: { 翼: ["冀", "冀"] } },
            { text: "若夫日出而林霏开，云归而岩穴暝。", key: true, cue: "《醉翁亭记》中写朝暮景致变化的一句", traps: { 霏: ["菲", "绯"], 暝: ["冥", "瞑"] } },
            { text: "醉翁之意不在酒，在乎山水之间也。", key: true, cue: "《醉翁亭记》中点明饮酒真意的一句" },
            { text: "醉能同其乐，醒能述以文者。", key: true },
        ],
    },
    {
        key: "《岳阳楼记》·范仲淹", src: "《岳阳楼记》", author: "范仲淹", dynasty: "宋", stage: "junior", genre: "prose",
        examObs: [{ y: 0, q: "全国卷", note: "先天下之忧而忧（高频）" }],
        lines: [
            { text: "衔远山，吞长江，浩浩汤汤，横无际涯。", key: true, traps: { 涯: ["崖", "崖"] } },
            { text: "不以物喜，不以己悲。", key: true, cue: "《岳阳楼记》中写旷达胸襟的一句" },
            { text: "阴风怒号，浊浪排空；日星隐曜，山岳潜形。", key: true, cue: "《岳阳楼记》中写洞庭风雨阴惨的一句", traps: { 曜: ["耀", "濯"], 号: ["嚎", "毫"] } },
            { text: "沙鸥翔集，锦鳞游泳。", key: true, traps: { 鳞: ["邻", "麟"] } },
            { text: "长烟一空，皓月千里。", key: true, traps: { 皓: ["浩", "洁"] } },
            { text: "先天下之忧而忧，后天下之乐而乐。", key: true, cue: "《岳阳楼记》中写以天下为己任的名句" },
        ],
    },
    {
        key: "《爱莲说》·周敦颐", src: "《爱莲说》", author: "周敦颐", dynasty: "宋", stage: "junior", genre: "prose",
        lines: [
            { text: "予独爱莲之出淤泥而不染，濯清涟而不妖。", key: true, cue: "《爱莲说》中写莲高洁不媚俗的一句", traps: { 濯: ["擢", "耀"], 涟: ["连", "链"] } },
        ],
    },
    {
        key: "《陋室铭》·刘禹锡", src: "《陋室铭》", author: "刘禹锡", dynasty: "唐", stage: "junior", genre: "prose",
        lines: [
            { text: "斯是陋室，惟吾德馨。", key: true, cue: "《陋室铭》点明主旨的一句", traps: { 馨: ["磬", "罄"] } },
            { text: "苔痕上阶绿，草色入帘青。", key: true },
        ],
    },
    {
        key: "《曹刿论战》·《左传》", src: "《曹刿论战》", author: "《左传》", dynasty: "先秦", stage: "junior", genre: "prose",
        lines: [
            { text: "一鼓作气，再而衰，三而竭。", key: true, cue: "《曹刿论战》中「一鼓作气」成语出处的一句" },
        ],
    },
    {
        key: "《邹忌讽齐王纳谏》·《战国策》", src: "《邹忌讽齐王纳谏》", author: "《战国策》", dynasty: "汉", stage: "junior", genre: "prose",
        examObs: [{ y: 2023, q: "新高考I卷", note: "吾妻之美我者，私我也(待核)" }],
        lines: [
            { text: "吾妻之美我者，私我也。", key: true, cue: "《邹忌讽齐王纳谏》中写妻偏爱自己的原因的一句" },
            { text: "能谤讥于市朝，闻寡人之耳者，受下赏。", key: true, traps: { 谤: ["磅", "傍"] } },
        ],
    },
    {
        key: "《送东阳马生序》·宋濂", src: "《送东阳马生序》", author: "宋濂", dynasty: "明", stage: "junior", genre: "prose",
        lines: [
            { text: "余则缊袍敝衣处其间。", key: true, traps: { 敝: ["弊", "蔽"] } },
        ],
    },
];

/* ---------------- 派生: 句子全集(附邻句/篇目信息) ---------------- */

export interface MlgxLine {
    text: string;
    norm: string;
    src: string;
    author: string;
    pieceKey: string;
    stage: "high" | "junior";
    genre: "poem" | "prose";
    examCount: number;              // 真题考查次数(篇目级) —— 页面显示「近年高考考查」徽标
    key?: boolean;
    cue?: string;
    traps?: Record<string, string[]>;
    neighbor?: { prev?: string; next?: string };   // 同篇相邻句
    contig?: boolean;               // 与数组前一句原文紧邻且同自然段(= MlgxLineV2.cont)
}

export const MLGX_LINES: MlgxLine[] = MLGX_PIECES.flatMap((p) => {
    const examCount = p.examObs?.length ?? 0;
    return p.lines.map((l, i) => ({
        text: l.text,
        norm: normalizeLine(l.text),
        src: p.src,
        author: p.author,
        pieceKey: p.key,
        stage: p.stage,
        genre: p.genre,
        examCount,
        key: l.key,
        cue: l.cue,
        traps: l.traps,
        neighbor: {
            prev: i > 0 ? p.lines[i - 1].text : undefined,
            next: i < p.lines.length - 1 ? p.lines[i + 1].text : undefined,
        },
        contig: i > 0 && p.lines[i].cont === true,
    }));
});

/** 去除所有非汉字字符(标点/空白) */
export function normalizeLine(s: string): string {
    return s.replace(/[^\u4e00-\u9fff]/g, "");
}

/** 点选飞花令候选令字池(运行时按库内命中数过滤) */
export const FLOWER_COMMON_POOL = ["花", "月", "春", "风", "山", "水", "江", "天", "人", "来", "愁", "心"];
export const FLOWER_HARD_POOL = ["霜", "梦", "泪", "帆", "柳", "舟", "雪", "夜", "云", "明", "归", "生", "白", "寒"];

/** 统计某字在句库中出现的句子数 */
export function countLinesWith(char: string): number {
    return MLGX_LINES.filter((l) => l.norm.includes(char)).length;
}
