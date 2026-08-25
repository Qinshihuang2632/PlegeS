/*
 * 配了个平 · 方程式题库 (src/game5/equations.ts)
 * ==============================================
 * 与 docs/plgp_equations.md(v0.2, 用户已审定)逐条对应: 简单 32 / 标准 43 / 困难 36, 共 111 条。
 * 字段: diff 1=简单 2=标准 3=困难; left/right 物质式(可含限量标注如 "Fe(足量)",
 *       括号标注不是系数位); coefs 为左+右按序正确系数(最简整数比);
 *       condition 显示在箭头上方; reversible 时箭头用 ⇌。
 * 守恒与最简比由 src/game5/core.test.ts 的解析校验自动锁定(改题库必过测试)。
 */

export type PlgpDifficulty = 1 | 2 | 3;

export interface PlgpEquation {
    id: number;
    diff: PlgpDifficulty;
    left: string[];
    right: string[];
    coefs: number[];
    condition: string;
    reversible?: boolean;
    note?: string;
}

export const PLGP_EQUATIONS: PlgpEquation[] = [
    /* ================= 简单(32 条) ================= */
    { id: 101, diff: 1, left: ["Fe", "O₂"], right: ["Fe₃O₄"], coefs: [3, 2, 1], condition: "点燃", note: "铁在氧气中燃烧,火星四射" },
    { id: 102, diff: 1, left: ["Mg", "O₂"], right: ["MgO"], coefs: [2, 1, 2], condition: "点燃" },
    { id: 103, diff: 1, left: ["Al", "O₂"], right: ["Al₂O₃"], coefs: [4, 3, 2], condition: "点燃", note: "致密氧化膜的本质" },
    { id: 104, diff: 1, left: ["Na", "O₂"], right: ["Na₂O"], coefs: [4, 1, 2], condition: "常温" },
    { id: 105, diff: 1, left: ["H₂", "O₂"], right: ["H₂O"], coefs: [2, 1, 2], condition: "点燃" },
    { id: 106, diff: 1, left: ["S", "O₂"], right: ["SO₂"], coefs: [1, 1, 1], condition: "点燃" },
    { id: 107, diff: 1, left: ["C", "O₂"], right: ["CO₂"], coefs: [1, 1, 1], condition: "点燃" },
    { id: 108, diff: 1, left: ["P", "O₂"], right: ["P₂O₅"], coefs: [4, 5, 2], condition: "点燃" },
    { id: 109, diff: 1, left: ["H₂O₂"], right: ["H₂O", "O₂↑"], coefs: [2, 2, 1], condition: "MnO₂ 催化" },
    { id: 110, diff: 1, left: ["KMnO₄"], right: ["K₂MnO₄", "MnO₂", "O₂↑"], coefs: [2, 1, 1, 1], condition: "加热" },
    { id: 111, diff: 1, left: ["KClO₃"], right: ["KCl", "O₂↑"], coefs: [2, 2, 3], condition: "MnO₂ 催化、加热" },
    { id: 112, diff: 1, left: ["H₂O"], right: ["H₂↑", "O₂↑"], coefs: [2, 2, 1], condition: "通电" },
    { id: 113, diff: 1, left: ["Fe", "CuSO₄"], right: ["FeSO₄", "Cu"], coefs: [1, 1, 1, 1], condition: "溶液中", note: "湿法炼铜" },
    { id: 114, diff: 1, left: ["Zn", "H₂SO₄"], right: ["ZnSO₄", "H₂↑"], coefs: [1, 1, 1, 1], condition: "稀硫酸" },
    { id: 115, diff: 1, left: ["Fe", "HCl"], right: ["FeCl₂", "H₂↑"], coefs: [1, 2, 1, 1], condition: "稀盐酸", note: "生成亚铁离子(浅绿色)" },
    { id: 116, diff: 1, left: ["Fe", "H₂SO₄"], right: ["FeSO₄", "H₂↑"], coefs: [1, 1, 1, 1], condition: "稀硫酸" },
    { id: 117, diff: 1, left: ["Mg", "HCl"], right: ["MgCl₂", "H₂↑"], coefs: [1, 2, 1, 1], condition: "稀盐酸" },
    { id: 118, diff: 1, left: ["Al", "HCl"], right: ["AlCl₃", "H₂↑"], coefs: [2, 6, 2, 3], condition: "稀盐酸" },
    { id: 119, diff: 1, left: ["CaO", "H₂O"], right: ["Ca(OH)₂"], coefs: [1, 1, 1], condition: "" },
    { id: 120, diff: 1, left: ["CO₂", "H₂O"], right: ["H₂CO₃"], coefs: [1, 1, 1], condition: "" },
    { id: 121, diff: 1, left: ["CaCO₃"], right: ["CaO", "CO₂↑"], coefs: [1, 1, 1], condition: "高温" },
    { id: 122, diff: 1, left: ["CaCO₃", "HCl"], right: ["CaCl₂", "H₂O", "CO₂↑"], coefs: [1, 2, 1, 1, 1], condition: "稀盐酸", note: "实验室制 CO₂" },
    { id: 123, diff: 1, left: ["Na₂CO₃", "HCl"], right: ["NaCl", "H₂O", "CO₂↑"], coefs: [1, 2, 2, 1, 1], condition: "稀盐酸" },
    { id: 124, diff: 1, left: ["NaOH", "HCl"], right: ["NaCl", "H₂O"], coefs: [1, 1, 1, 1], condition: "", note: "中和反应原型" },
    { id: 125, diff: 1, left: ["NaOH", "H₂SO₄"], right: ["Na₂SO₄", "H₂O"], coefs: [2, 1, 1, 2], condition: "" },
    { id: 126, diff: 1, left: ["KOH", "HNO₃"], right: ["KNO₃", "H₂O"], coefs: [1, 1, 1, 1], condition: "" },
    { id: 127, diff: 1, left: ["Ca(OH)₂", "HCl"], right: ["CaCl₂", "H₂O"], coefs: [1, 2, 1, 2], condition: "稀盐酸" },
    { id: 128, diff: 1, left: ["Ca(OH)₂", "CO₂"], right: ["CaCO₃↓", "H₂O"], coefs: [1, 1, 1, 1], condition: "", note: "澄清石灰水变浑浊(CO₂ 不足情形)" },
    { id: 129, diff: 1, left: ["C", "CuO"], right: ["Cu", "CO₂↑"], coefs: [1, 2, 2, 1], condition: "高温" },
    { id: 130, diff: 1, left: ["H₂", "CuO"], right: ["Cu", "H₂O"], coefs: [1, 1, 1, 1], condition: "加热" },
    { id: 131, diff: 1, left: ["CO", "CuO"], right: ["Cu", "CO₂"], coefs: [1, 1, 1, 1], condition: "加热", note: "CO 尾气须点燃" },
    { id: 132, diff: 1, left: ["Cu", "O₂"], right: ["CuO"], coefs: [2, 1, 2], condition: "加热" },

    /* ================= 标准(43 条) ================= */
    { id: 201, diff: 2, left: ["Al", "H₂SO₄"], right: ["Al₂(SO₄)₃", "H₂↑"], coefs: [2, 3, 1, 3], condition: "稀硫酸" },
    { id: 202, diff: 2, left: ["Fe₂O₃", "CO"], right: ["Fe", "CO₂"], coefs: [1, 3, 2, 3], condition: "高温", note: "高炉炼铁" },
    { id: 203, diff: 2, left: ["Fe₃O₄", "CO"], right: ["Fe", "CO₂"], coefs: [1, 4, 3, 4], condition: "高温" },
    { id: 204, diff: 2, left: ["Fe₂O₃", "Al"], right: ["Fe", "Al₂O₃"], coefs: [1, 2, 2, 1], condition: "高温(铝热)", note: "铝热反应焊接钢轨" },
    { id: 205, diff: 2, left: ["Al", "CuSO₄"], right: ["Al₂(SO₄)₃", "Cu"], coefs: [2, 3, 1, 3], condition: "溶液中" },
    { id: 206, diff: 2, left: ["Cu", "AgNO₃"], right: ["Cu(NO₃)₂", "Ag"], coefs: [1, 2, 1, 2], condition: "溶液中" },
    { id: 207, diff: 2, left: ["Fe", "Cu(NO₃)₂"], right: ["Fe(NO₃)₂", "Cu"], coefs: [1, 1, 1, 1], condition: "溶液中" },
    { id: 208, diff: 2, left: ["CuO", "H₂SO₄"], right: ["CuSO₄", "H₂O"], coefs: [1, 1, 1, 1], condition: "稀硫酸" },
    { id: 209, diff: 2, left: ["Fe₂O₃", "HCl"], right: ["FeCl₃", "H₂O"], coefs: [1, 6, 2, 3], condition: "稀盐酸" },
    { id: 210, diff: 2, left: ["Fe₂O₃", "H₂SO₄"], right: ["Fe₂(SO₄)₃", "H₂O"], coefs: [1, 3, 1, 3], condition: "稀硫酸" },
    { id: 211, diff: 2, left: ["Fe(OH)₃", "HCl"], right: ["FeCl₃", "H₂O"], coefs: [1, 3, 1, 3], condition: "稀盐酸" },
    { id: 212, diff: 2, left: ["Fe(OH)₂", "O₂", "H₂O"], right: ["Fe(OH)₃"], coefs: [4, 1, 2, 4], condition: "溶液中", note: "白色→灰绿→红褐" },
    { id: 213, diff: 2, left: ["FeCl₃", "NaOH"], right: ["Fe(OH)₃↓", "NaCl"], coefs: [1, 3, 1, 3], condition: "溶液中" },
    { id: 214, diff: 2, left: ["AgNO₃", "HCl"], right: ["AgCl↓", "HNO₃"], coefs: [1, 1, 1, 1], condition: "稀盐酸" },
    { id: 215, diff: 2, left: ["BaCl₂", "H₂SO₄"], right: ["BaSO₄↓", "HCl"], coefs: [1, 1, 1, 2], condition: "", note: "硫酸根检验" },
    { id: 216, diff: 2, left: ["Na₂CO₃", "Ca(OH)₂"], right: ["CaCO₃↓", "NaOH"], coefs: [1, 1, 1, 2], condition: "" },
    { id: 217, diff: 2, left: ["NaHCO₃", "HCl"], right: ["NaCl", "H₂O", "CO₂↑"], coefs: [1, 1, 1, 1, 1], condition: "稀盐酸" },
    { id: 218, diff: 2, left: ["NaHCO₃"], right: ["Na₂CO₃", "H₂O", "CO₂↑"], coefs: [2, 1, 1, 1], condition: "加热" },
    { id: 219, diff: 2, left: ["CaCO₃", "CO₂", "H₂O"], right: ["Ca(HCO₃)₂"], coefs: [1, 1, 1, 1], condition: "", note: "溶洞形成原理" },
    { id: 220, diff: 2, left: ["CO₂(不足)", "NaOH"], right: ["Na₂CO₃", "H₂O"], coefs: [1, 2, 1, 1], condition: "限量标注:CO₂ 不足" },
    { id: 221, diff: 2, left: ["CO₂(足量)", "NaOH"], right: ["NaHCO₃"], coefs: [1, 1, 1], condition: "限量标注:CO₂ 足量", note: "与上条对照记忆" },
    { id: 222, diff: 2, left: ["Ca(OH)₂", "CO₂(足量)"], right: ["Ca(HCO₃)₂"], coefs: [1, 2, 1], condition: "限量标注", note: "与简单 #28 对照" },
    { id: 223, diff: 2, left: ["Na", "H₂O"], right: ["NaOH", "H₂↑"], coefs: [2, 2, 2, 1], condition: "" },
    { id: 224, diff: 2, left: ["Na", "Cl₂"], right: ["NaCl"], coefs: [2, 1, 2], condition: "点燃" },
    { id: 225, diff: 2, left: ["Cl₂", "H₂"], right: ["HCl"], coefs: [1, 1, 2], condition: "光照或点燃" },
    { id: 226, diff: 2, left: ["Cl₂", "H₂O"], right: ["HCl", "HClO"], coefs: [1, 1, 1, 1], condition: "" },
    { id: 227, diff: 2, left: ["Cl₂", "NaOH"], right: ["NaCl", "NaClO", "H₂O"], coefs: [1, 2, 1, 1, 1], condition: "常温", note: "84 消毒液制备" },
    { id: 228, diff: 2, left: ["Ca(ClO)₂", "CO₂", "H₂O"], right: ["CaCO₃↓", "HClO"], coefs: [1, 1, 1, 1, 2], condition: "", note: "漂白粉失效原理" },
    { id: 229, diff: 2, left: ["Ca(ClO)₂", "HCl"], right: ["CaCl₂", "HClO"], coefs: [1, 2, 1, 2], condition: "稀盐酸" },
    { id: 230, diff: 2, left: ["Na₂O₂", "H₂O"], right: ["NaOH", "O₂↑"], coefs: [2, 2, 4, 1], condition: "", note: "供氧剂" },
    { id: 231, diff: 2, left: ["Na₂O₂", "CO₂"], right: ["Na₂CO₃", "O₂"], coefs: [2, 2, 2, 1], condition: "", note: "潜艇/呼吸面具供氧" },
    { id: 232, diff: 2, left: ["SO₂", "H₂O"], right: ["H₂SO₃"], coefs: [1, 1, 1], condition: "", reversible: true },
    { id: 233, diff: 2, left: ["SO₂", "O₂"], right: ["SO₃"], coefs: [2, 1, 2], condition: "催化剂、加热", reversible: true },
    { id: 234, diff: 2, left: ["N₂", "H₂"], right: ["NH₃"], coefs: [1, 3, 2], condition: "高温高压催化剂", reversible: true, note: "工业合成氨" },
    { id: 235, diff: 2, left: ["N₂", "O₂"], right: ["NO"], coefs: [1, 1, 2], condition: "放电或高温" },
    { id: 236, diff: 2, left: ["NO", "O₂"], right: ["NO₂"], coefs: [2, 1, 2], condition: "" },
    { id: 237, diff: 2, left: ["NO₂", "H₂O"], right: ["HNO₃", "NO"], coefs: [3, 1, 2, 1], condition: "" },
    { id: 238, diff: 2, left: ["NH₃", "HCl"], right: ["NH₄Cl"], coefs: [1, 1, 1], condition: "" },
    { id: 239, diff: 2, left: ["NH₄Cl"], right: ["NH₃↑", "HCl↑"], coefs: [1, 1, 1], condition: "加热" },
    { id: 240, diff: 2, left: ["NH₄HCO₃"], right: ["NH₃↑", "H₂O", "CO₂↑"], coefs: [1, 1, 1, 1], condition: "加热" },
    { id: 241, diff: 2, left: ["CH₄", "O₂"], right: ["CO₂", "H₂O"], coefs: [1, 2, 1, 2], condition: "点燃" },
    { id: 242, diff: 2, left: ["CH₄", "Cl₂"], right: ["CH₃Cl", "HCl"], coefs: [1, 1, 1, 1], condition: "光照" },
    { id: 243, diff: 2, left: ["C₂H₅OH", "O₂"], right: ["CO₂", "H₂O"], coefs: [1, 3, 2, 3], condition: "点燃" },

    /* ================= 困难(36 条) ================= */
    { id: 301, diff: 3, left: ["Cu", "H₂SO₄"], right: ["CuSO₄", "SO₂↑", "H₂O"], coefs: [1, 2, 1, 1, 2], condition: "浓硫酸、加热", note: "Fe/Al 常温遇浓硫酸钝化" },
    { id: 302, diff: 3, left: ["C", "H₂SO₄"], right: ["CO₂↑", "SO₂↑", "H₂O"], coefs: [1, 2, 1, 2, 2], condition: "浓硫酸、加热" },
    { id: 303, diff: 3, left: ["Cu", "HNO₃"], right: ["Cu(NO₃)₂", "NO₂↑", "H₂O"], coefs: [1, 4, 1, 2, 2], condition: "浓硝酸" },
    { id: 304, diff: 3, left: ["Cu", "HNO₃"], right: ["Cu(NO₃)₂", "NO↑", "H₂O"], coefs: [3, 8, 3, 2, 4], condition: "稀硝酸" },
    { id: 305, diff: 3, left: ["C", "HNO₃"], right: ["CO₂↑", "NO₂↑", "H₂O"], coefs: [1, 4, 1, 4, 2], condition: "浓硝酸、加热" },
    { id: 306, diff: 3, left: ["Fe", "HNO₃(稀,足量)"], right: ["Fe(NO₃)₃", "NO↑", "H₂O"], coefs: [1, 4, 1, 1, 2], condition: "限量标注:硝酸足量", note: "铁被氧化到 +3" },
    { id: 307, diff: 3, left: ["Fe(足量)", "HNO₃(稀)"], right: ["Fe(NO₃)₂", "NO↑", "H₂O"], coefs: [3, 8, 3, 2, 4], condition: "限量标注:铁足量", note: "与上条成对" },
    { id: 308, diff: 3, left: ["MnO₂", "HCl"], right: ["MnCl₂", "Cl₂↑", "H₂O"], coefs: [1, 4, 1, 1, 2], condition: "浓盐酸、加热", note: "实验室制氯气" },
    { id: 309, diff: 3, left: ["KMnO₄", "HCl"], right: ["KCl", "MnCl₂", "Cl₂↑", "H₂O"], coefs: [2, 16, 2, 2, 5, 8], condition: "浓盐酸", note: "电子守恒经典题" },
    { id: 310, diff: 3, left: ["Cl₂", "NaOH"], right: ["NaCl", "NaClO₃", "H₂O"], coefs: [3, 6, 5, 1, 3], condition: "热浓 NaOH", note: "冷碱得 NaClO(标准 #27)" },
    { id: 311, diff: 3, left: ["KMnO₄", "H₂O₂", "H₂SO₄"], right: ["K₂SO₄", "MnSO₄", "O₂↑", "H₂O"], coefs: [2, 5, 3, 1, 2, 5, 8], condition: "稀硫酸介质" },
    { id: 312, diff: 3, left: ["SO₂", "Cl₂", "H₂O"], right: ["H₂SO₄", "HCl"], coefs: [1, 1, 2, 1, 2], condition: "溶液中" },
    { id: 313, diff: 3, left: ["SO₂", "H₂S"], right: ["S↓", "H₂O"], coefs: [1, 2, 3, 2], condition: "", note: "归中反应" },
    { id: 314, diff: 3, left: ["H₂S", "O₂"], right: ["SO₂", "H₂O"], coefs: [2, 3, 2, 2], condition: "点燃(氧气充足)" },
    { id: 315, diff: 3, left: ["NH₃", "O₂"], right: ["NO", "H₂O"], coefs: [4, 5, 4, 6], condition: "催化剂、加热", note: "氨的催化氧化" },
    { id: 316, diff: 3, left: ["NO₂", "O₂", "H₂O"], right: ["HNO₃"], coefs: [4, 1, 2, 4], condition: "" },
    { id: 317, diff: 3, left: ["NO", "O₂", "H₂O"], right: ["HNO₃"], coefs: [4, 3, 2, 4], condition: "" },
    { id: 318, diff: 3, left: ["FeCl₃", "Cu"], right: ["FeCl₂", "CuCl₂"], coefs: [2, 1, 2, 1], condition: "溶液中", note: "蚀刻电路板原理" },
    { id: 319, diff: 3, left: ["FeCl₃", "Fe"], right: ["FeCl₂"], coefs: [2, 1, 3], condition: "溶液中" },
    { id: 320, diff: 3, left: ["AlCl₃", "NaOH(少量)"], right: ["Al(OH)₃↓", "NaCl"], coefs: [1, 3, 1, 3], condition: "限量标注:NaOH 少量" },
    { id: 321, diff: 3, left: ["AlCl₃", "NaOH(足量)"], right: ["Na[Al(OH)₄]", "NaCl"], coefs: [1, 4, 1, 3], condition: "限量标注:NaOH 足量", note: "沉淀溶解;与上条成对" },
    { id: 322, diff: 3, left: ["Al", "NaOH", "H₂O"], right: ["Na[Al(OH)₄]", "H₂↑"], coefs: [2, 2, 6, 2, 3], condition: "溶液中", note: "新教材写法" },
    { id: 323, diff: 3, left: ["SiO₂", "NaOH"], right: ["Na₂SiO₃", "H₂O"], coefs: [1, 2, 1, 1], condition: "加热" },
    { id: 324, diff: 3, left: ["Na₂SiO₃", "HCl"], right: ["H₂SiO₃↓", "NaCl"], coefs: [1, 2, 1, 2], condition: "" },
    { id: 325, diff: 3, left: ["NaCl", "H₂O"], right: ["NaOH", "H₂↑", "Cl₂↑"], coefs: [2, 2, 2, 1, 1], condition: "电解(饱和食盐水)", note: "氯碱工业" },
    { id: 326, diff: 3, left: ["CuSO₄", "H₂O"], right: ["Cu", "O₂↑", "H₂SO₄"], coefs: [2, 2, 2, 1, 2], condition: "电解" },
    { id: 327, diff: 3, left: ["Cu", "O₂", "CO₂", "H₂O"], right: ["Cu₂(OH)₂CO₃"], coefs: [2, 1, 1, 1, 1], condition: "", note: "铜绿生成" },
    { id: 328, diff: 3, left: ["C₂H₄", "O₂"], right: ["CO₂", "H₂O"], coefs: [1, 3, 2, 2], condition: "点燃" },
    { id: 329, diff: 3, left: ["C₂H₂", "O₂"], right: ["CO₂", "H₂O"], coefs: [2, 5, 4, 2], condition: "点燃" },
    { id: 330, diff: 3, left: ["C₆H₆", "O₂"], right: ["CO₂", "H₂O"], coefs: [2, 15, 12, 6], condition: "点燃" },
    { id: 331, diff: 3, left: ["C₂H₅OH"], right: ["CH₂=CH₂↑", "H₂O"], coefs: [1, 1, 1], condition: "浓硫酸、170 ℃", note: "消去反应制乙烯" },
    { id: 332, diff: 3, left: ["CH₃CH₂OH", "O₂"], right: ["CH₃CHO", "H₂O"], coefs: [2, 1, 2, 2], condition: "Cu 催化、加热" },
    { id: 333, diff: 3, left: ["CH₃COOH", "C₂H₅OH"], right: ["CH₃COOC₂H₅", "H₂O"], coefs: [1, 1, 1, 1], condition: "浓硫酸、加热", reversible: true, note: "酯化反应" },
    { id: 334, diff: 3, left: ["C₆H₆", "Br₂"], right: ["C₆H₅Br", "HBr"], coefs: [1, 1, 1, 1], condition: "FeBr₃ 催化" },
    { id: 335, diff: 3, left: ["C₆H₆", "HNO₃"], right: ["C₆H₅NO₂", "H₂O"], coefs: [1, 1, 1, 1], condition: "浓硫酸、加热" },
    { id: 336, diff: 3, left: ["CH₃CHO", "O₂"], right: ["CH₃COOH"], coefs: [2, 1, 2], condition: "催化剂" },
];

export function equationsOf(diff: PlgpDifficulty): PlgpEquation[] {
    return PLGP_EQUATIONS.filter((e) => e.diff === diff);
}
