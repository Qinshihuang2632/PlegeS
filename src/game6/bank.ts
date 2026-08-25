/*
 * 诗了个句 · 题库 (src/game6/bank.ts)
 * ===================================
 * 课标必背古诗词文对句库(用户要求: 必考古诗词为主)。每条为一联(上下两句),
 * 同时服务于:
 *   - 简单模式选择题: 给一句选另一句(双向);
 *   - 飞花令模式(标准/困难): 令字命中判定 —— 所有句子的全集即合法答案域,
 *     输入必须与库中某句**完全一致**(去除标点后逐字比对, 错字/别字判错)。
 * 文本务必保持原句准确; 修改题库需通过 core.test.ts 的唯一性/字段校验。
 */

export interface PoemCouplet {
    prev: string;    // 上句(含标点)
    next: string;    // 下句(含标点)
    src: string;     // 《篇名》
    author: string;
}

export const POEM_COUPLETS: PoemCouplet[] = [
    { prev: "床前明月光，", next: "疑是地上霜。", src: "《静夜思》", author: "李白" },
    { prev: "举头望明月，", next: "低头思故乡。", src: "《静夜思》", author: "李白" },
    { prev: "白日依山尽，", next: "黄河入海流。", src: "《登鹳雀楼》", author: "王之涣" },
    { prev: "欲穷千里目，", next: "更上一层楼。", src: "《登鹳雀楼》", author: "王之涣" },
    { prev: "春眠不觉晓，", next: "处处闻啼鸟。", src: "《春晓》", author: "孟浩然" },
    { prev: "夜来风雨声，", next: "花落知多少。", src: "《春晓》", author: "孟浩然" },
    { prev: "好雨知时节，", next: "当春乃发生。", src: "《春夜喜雨》", author: "杜甫" },
    { prev: "随风潜入夜，", next: "润物细无声。", src: "《春夜喜雨》", author: "杜甫" },
    { prev: "红豆生南国，", next: "春来发几枝。", src: "《相思》", author: "王维" },
    { prev: "愿君多采撷，", next: "此物最相思。", src: "《相思》", author: "王维" },
    { prev: "空山新雨后，", next: "天气晚来秋。", src: "《山居秋暝》", author: "王维" },
    { prev: "明月松间照，", next: "清泉石上流。", src: "《山居秋暝》", author: "王维" },
    { prev: "大漠孤烟直，", next: "长河落日圆。", src: "《使至塞上》", author: "王维" },
    { prev: "山重水复疑无路，", next: "柳暗花明又一村。", src: "《游山西村》", author: "陆游" },
    { prev: "沉舟侧畔千帆过，", next: "病树前头万木春。", src: "《酬乐天扬州初逢席上见赠》", author: "刘禹锡" },
    { prev: "春风又绿江南岸，", next: "明月何时照我还。", src: "《泊船瓜洲》", author: "王安石" },
    { prev: "不识庐山真面目，", next: "只缘身在此山中。", src: "《题西林壁》", author: "苏轼" },
    { prev: "水光潋滟晴方好，", next: "山色空蒙雨亦奇。", src: "《饮湖上初晴后雨》", author: "苏轼" },
    { prev: "欲把西湖比西子，", next: "淡妆浓抹总相宜。", src: "《饮湖上初晴后雨》", author: "苏轼" },
    { prev: "竹外桃花三两枝，", next: "春江水暖鸭先知。", src: "《惠崇春江晚景》", author: "苏轼" },
    { prev: "接天莲叶无穷碧，", next: "映日荷花别样红。", src: "《晓出净慈寺送林子方》", author: "杨万里" },
    { prev: "两个黄鹂鸣翠柳，", next: "一行白鹭上青天。", src: "《绝句》", author: "杜甫" },
    { prev: "窗含西岭千秋雪，", next: "门泊东吴万里船。", src: "《绝句》", author: "杜甫" },
    { prev: "忽如一夜春风来，", next: "千树万树梨花开。", src: "《白雪歌送武判官归京》", author: "岑参" },
    { prev: "千里莺啼绿映红，", next: "水村山郭酒旗风。", src: "《江南春》", author: "杜牧" },
    { prev: "停车坐爱枫林晚，", next: "霜叶红于二月花。", src: "《山行》", author: "杜牧" },
    { prev: "落霞与孤鹜齐飞，", next: "秋水共长天一色。", src: "《滕王阁序》", author: "王勃" },
    { prev: "海内存知己，", next: "天涯若比邻。", src: "《送杜少府之任蜀州》", author: "王勃" },
    { prev: "莫愁前路无知己，", next: "天下谁人不识君。", src: "《别董大》", author: "高适" },
    { prev: "桃花潭水深千尺，", next: "不及汪伦送我情。", src: "《赠汪伦》", author: "李白" },
    { prev: "孤帆远影碧空尽，", next: "唯见长江天际流。", src: "《黄鹤楼送孟浩然之广陵》", author: "李白" },
    { prev: "劝君更尽一杯酒，", next: "西出阳关无故人。", src: "《送元二使安西》", author: "王维" },
    { prev: "洛阳亲友如相问，", next: "一片冰心在玉壶。", src: "《芙蓉楼送辛渐》", author: "王昌龄" },
    { prev: "但愿人长久，", next: "千里共婵娟。", src: "《水调歌头》", author: "苏轼" },
    { prev: "会当凌绝顶，", next: "一览众山小。", src: "《望岳》", author: "杜甫" },
    { prev: "了却君王天下事，", next: "赢得生前身后名。", src: "《破阵子》", author: "辛弃疾" },
    { prev: "人生自古谁无死，", next: "留取丹心照汗青。", src: "《过零丁洋》", author: "文天祥" },
    { prev: "山河破碎风飘絮，", next: "身世浮沉雨打萍。", src: "《过零丁洋》", author: "文天祥" },
    { prev: "落红不是无情物，", next: "化作春泥更护花。", src: "《己亥杂诗》", author: "龚自珍" },
    { prev: "长风破浪会有时，", next: "直挂云帆济沧海。", src: "《行路难》", author: "李白" },
    { prev: "天生我材必有用，", next: "千金散尽还复来。", src: "《将进酒》", author: "李白" },
    { prev: "出师未捷身先死，", next: "长使英雄泪满襟。", src: "《蜀相》", author: "杜甫" },
    { prev: "感时花溅泪，", next: "恨别鸟惊心。", src: "《春望》", author: "杜甫" },
    { prev: "烽火连三月，", next: "家书抵万金。", src: "《春望》", author: "杜甫" },
    { prev: "无边落木萧萧下，", next: "不尽长江滚滚来。", src: "《登高》", author: "杜甫" },
    { prev: "商女不知亡国恨，", next: "隔江犹唱后庭花。", src: "《泊秦淮》", author: "杜牧" },
    { prev: "烟笼寒水月笼沙，", next: "夜泊秦淮近酒家。", src: "《泊秦淮》", author: "杜牧" },
    { prev: "东风不与周郎便，", next: "铜雀春深锁二乔。", src: "《赤壁》", author: "杜牧" },
    { prev: "春蚕到死丝方尽，", next: "蜡炬成灰泪始干。", src: "《无题》", author: "李商隐" },
    { prev: "身无彩凤双飞翼，", next: "心有灵犀一点通。", src: "《无题》", author: "李商隐" },
    { prev: "何当共剪西窗烛，", next: "却话巴山夜雨时。", src: "《夜雨寄北》", author: "李商隐" },
    { prev: "夕阳无限好，", next: "只是近黄昏。", src: "《登乐游原》", author: "李商隐" },
    { prev: "采菊东篱下，", next: "悠然见南山。", src: "《饮酒》", author: "陶渊明" },
    { prev: "山气日夕佳，", next: "飞鸟相与还。", src: "《饮酒》", author: "陶渊明" },
    { prev: "少壮不努力，", next: "老大徒伤悲。", src: "《长歌行》", author: "汉乐府" },
    { prev: "老骥伏枥，", next: "志在千里。", src: "《龟虽寿》", author: "曹操" },
    { prev: "烈士暮年，", next: "壮心不已。", src: "《龟虽寿》", author: "曹操" },
    { prev: "东临碣石，", next: "以观沧海。", src: "《观沧海》", author: "曹操" },
    { prev: "万里赴戎机，", next: "关山度若飞。", src: "《木兰诗》", author: "北朝民歌" },
    { prev: "雄兔脚扑朔，", next: "雌兔眼迷离。", src: "《木兰诗》", author: "北朝民歌" },
    { prev: "苔痕上阶绿，", next: "草色入帘青。", src: "《陋室铭》", author: "刘禹锡" },
    { prev: "斯是陋室，", next: "惟吾德馨。", src: "《陋室铭》", author: "刘禹锡" },
    { prev: "予独爱莲之出淤泥而不染，", next: "濯清涟而不妖。", src: "《爱莲说》", author: "周敦颐" },
    { prev: "先天下之忧而忧，", next: "后天下之乐而乐。", src: "《岳阳楼记》", author: "范仲淹" },
    { prev: "不以物喜，", next: "不以己悲。", src: "《岳阳楼记》", author: "范仲淹" },
    { prev: "醉翁之意不在酒，", next: "在乎山水之间也。", src: "《醉翁亭记》", author: "欧阳修" },
    { prev: "抽刀断水水更流，", next: "举杯消愁愁更愁。", src: "《宣州谢朓楼饯别校书叔云》", author: "李白" },
    { prev: "我寄愁心与明月，", next: "随君直到夜郎西。", src: "《闻王昌龄左迁龙标遥有此寄》", author: "李白" },
    { prev: "月落乌啼霜满天，", next: "江枫渔火对愁眠。", src: "《枫桥夜泊》", author: "张继" },
    { prev: "姑苏城外寒山寺，", next: "夜半钟声到客船。", src: "《枫桥夜泊》", author: "张继" },
    { prev: "朱雀桥边野草花，", next: "乌衣巷口夕阳斜。", src: "《乌衣巷》", author: "刘禹锡" },
    { prev: "旧时王谢堂前燕，", next: "飞入寻常百姓家。", src: "《乌衣巷》", author: "刘禹锡" },
    { prev: "天街小雨润如酥，", next: "草色遥看近却无。", src: "《早春呈水部张十八员外》", author: "韩愈" },
    { prev: "几处早莺争暖树，", next: "谁家新燕啄春泥。", src: "《钱塘湖春行》", author: "白居易" },
    { prev: "乱花渐欲迷人眼，", next: "浅草才能没马蹄。", src: "《钱塘湖春行》", author: "白居易" },
    { prev: "日出江花红胜火，", next: "春来江水绿如蓝。", src: "《忆江南》", author: "白居易" },
    { prev: "独怜幽草涧边生，", next: "上有黄鹂深树鸣。", src: "《滁州西涧》", author: "韦应物" },
    { prev: "黄河远上白云间，", next: "一片孤城万仞山。", src: "《凉州词》", author: "王之涣" },
    { prev: "羌笛何须怨杨柳，", next: "春风不度玉门关。", src: "《凉州词》", author: "王之涣" },
    { prev: "秦时明月汉时关，", next: "万里长征人未还。", src: "《出塞》", author: "王昌龄" },
    { prev: "但使龙城飞将在，", next: "不教胡马度阴山。", src: "《出塞》", author: "王昌龄" },
    { prev: "黄沙百战穿金甲，", next: "不破楼兰终不还。", src: "《从军行》", author: "王昌龄" },
    { prev: "葡萄美酒夜光杯，", next: "欲饮琵琶马上催。", src: "《凉州词》", author: "王翰" },
    { prev: "醉卧沙场君莫笑，", next: "古来征战几人回。", src: "《凉州词》", author: "王翰" },
    { prev: "醉里挑灯看剑，", next: "梦回吹角连营。", src: "《破阵子》", author: "辛弃疾" },
    { prev: "无可奈何花落去，", next: "似曾相识燕归来。", src: "《浣溪沙》", author: "晏殊" },
    { prev: "惶恐滩头说惶恐，", next: "零丁洋里叹零丁。", src: "《过零丁洋》", author: "文天祥" },
    { prev: "枯藤老树昏鸦，", next: "小桥流水人家。", src: "《天净沙·秋思》", author: "马致远" },
    { prev: "夕阳西下，", next: "断肠人在天涯。", src: "《天净沙·秋思》", author: "马致远" },
    { prev: "足蒸暑土气，", next: "背灼炎天光。", src: "《观刈麦》", author: "白居易" },
    { prev: "夜阑卧听风吹雨，", next: "铁马冰河入梦来。", src: "《十一月四日风雨大作》", author: "陆游" },
    { prev: "僵卧孤村不自哀，", next: "尚思为国戍轮台。", src: "《十一月四日风雨大作》", author: "陆游" },
    { prev: "王师北定中原日，", next: "家祭无忘告乃翁。", src: "《示儿》", author: "陆游" },
    { prev: "生当作人杰，", next: "死亦为鬼雄。", src: "《夏日绝句》", author: "李清照" },
    { prev: "稻花香里说丰年，", next: "听取蛙声一片。", src: "《西江月》", author: "辛弃疾" },
    { prev: "七八个星天外，", next: "两三点雨山前。", src: "《西江月》", author: "辛弃疾" },
    { prev: "绿树村边合，", next: "青山郭外斜。", src: "《过故人庄》", author: "孟浩然" },
    { prev: "开轩面场圃，", next: "把酒话桑麻。", src: "《过故人庄》", author: "孟浩然" },
    { prev: "马作的卢飞快，", next: "弓如霹雳弦惊。", src: "《破阵子》", author: "辛弃疾" },
    { prev: "草枯鹰眼疾，", next: "雪尽马蹄轻。", src: "《观猎》", author: "王维" },
    { prev: "众鸟高飞尽，", next: "孤云独去闲。", src: "《独坐敬亭山》", author: "李白" },
    { prev: "孤舟蓑笠翁，", next: "独钓寒江雪。", src: "《江雪》", author: "柳宗元" },
    { prev: "对酒当歌，", next: "人生几何。", src: "《短歌行》", author: "曹操" },
];

/** 去除所有非汉字字符(标点/空白), 用于飞花令逐字精确比对 */
export function normalizeLine(s: string): string {
    return s.replace(/[^\u4e00-\u9fff]/g, "");
}

export interface PoemLine {
    text: string;        // 原句(含标点)
    norm: string;        // 仅汉字
    src: string;
    author: string;
}

/** 全部句子去重后的集合(飞花令合法答案域 + 选择题干扰项来源) */
export const ALL_LINES: PoemLine[] = (() => {
    const seen = new Set<string>();
    const out: PoemLine[] = [];
    for (const c of POEM_COUPLETS) {
        for (const t of [c.prev, c.next]) {
            const norm = normalizeLine(t);
            if (!norm || seen.has(norm)) continue;
            seen.add(norm);
            out.push({ text: t, norm, src: c.src, author: c.author });
        }
    }
    return out;
})();

/**
 * 飞花令候选令字池(高频常用 / 进阶扩展); 运行时按库内命中数过滤:
 * 标准池须 ≥5 句, 困难池(合并扩展字)须 ≥2 句 —— 测试锁定, 增删须保证覆盖。
 */
export const FLOWER_COMMON_POOL = ["花", "月", "春", "风", "山", "水", "江", "天", "人", "马", "来", "酒"];
export const FLOWER_HARD_POOL = ["霜", "愁", "梦", "泪", "帆", "燕", "柳", "舟", "雪", "夜", "云", "明", "相", "知"];

/** 统计某字在句库中出现的句子数 */
export function countLinesWith(char: string): number {
    return ALL_LINES.filter((l) => l.norm.includes(char)).length;
}
