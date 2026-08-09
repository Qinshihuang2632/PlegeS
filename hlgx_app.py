"""
化了个学(hualeguexue)· 游戏大厅主入口
=========================================
运行方式:  python hlgx_app.py
功能:      注册各个小游戏的蓝图(Blueprint),并启动开发服务器。
           以后新增小游戏只需三步:
           1. 新建 hlgx_<游戏名>.py,内含 Blueprint 与路由
           2. 在下方 import 并 register_blueprint
           3. 在大厅模板 templates/hlgx_hub.html 中加一张卡片

入口地址:
    /            游戏大厅(小游戏合集)
    /hlgx/hua    化了个学 · 消除同类物质
"""
from flask import Flask

from hlgx_hub import hlgx_hub_bp
from hlgx_rank import hlgx_rank_bp
from hualegexue.hlgx_hua import hlgx_hua_bp


def create_app():
    app = Flask(__name__)
    # 注册各小游戏蓝图
    app.register_blueprint(hlgx_hub_bp)
    app.register_blueprint(hlgx_hua_bp)
    app.register_blueprint(hlgx_rank_bp)
    return app


app = create_app()

if __name__ == "__main__":
    # debug=True 显示错误详情;use_reloader=False 避免调试进程抢占端口
    # 对外发布时务必关闭 debug 并换用生产服务器
    app.run(debug=True, host="127.0.0.1", port=5000, use_reloader=False)
