"""
化了个学 · 「化了个学」小游戏蓝图
==================================
玩法类似「羊了个羊」:棋盘上的物质方块按层堆叠,
点击未被遮挡的方块放入底部消除槽,三块同类物质即可消除。
物质范围:高考化学课标常见元素/化合物,共 100+ 种。

路由: /hlgx/hua
"""
from flask import Blueprint, render_template

hlgx_hua_bp = Blueprint(
    "hlgx_hua", __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/hlgx/hua/static",   # 与主应用 static 区分,避免路径冲突
)


@hlgx_hua_bp.route("/hlgx/hua")
def hlgx_hua_game():
    """化了个学 · 消除挑战 游戏页"""
    return render_template("hlgx_hua.html")
