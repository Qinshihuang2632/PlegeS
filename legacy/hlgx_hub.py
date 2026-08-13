"""
化了个学 · 游戏大厅蓝图
========================
负责 "/" 与 "/hlgx/" 两个入口,渲染小游戏合集页面。
"""
from flask import Blueprint, render_template

hlgx_hub_bp = Blueprint("hlgx_hub", __name__)


@hlgx_hub_bp.route("/")
def hlgx_hub_index():
    """游戏大厅:展示所有小游戏的入口卡片"""
    return render_template("hlgx_hub.html")


@hlgx_hub_bp.route("/hlgx/")
def hlgx_hub_root():
    """兼容 /hlgx/ 直达大厅"""
    return render_template("hlgx_hub.html")
