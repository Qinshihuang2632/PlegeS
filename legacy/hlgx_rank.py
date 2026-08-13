"""
化了个学游戏平台 · 排行榜蓝图
================================
单一数据文件 rankings.json 存储,不保存每局消除记录。
排序规则(优先级):剩余血量多靠前 > 通关时间短靠前 > 技能使用次数少靠前。

API:
    GET    /hlgx/api/rank?mode=easy|normal|challenge   查询某难度榜单
    POST   /hlgx/api/rank                              提交成绩(JSON)
    GET    /hlgx/api/name/exists?name=X                检查昵称是否重复
    GET    /hlgx/api/name/suggest?name=X               获取去重昵称(X*abc)
    DELETE /hlgx/api/rank?mode=easy|normal|challenge|all  清空榜单
    GET    /hlgx/rank                                  排行榜查看页
"""
import json
import os
import time
from flask import Blueprint, request, jsonify, render_template

hlgx_rank_bp = Blueprint("hlgx_rank", __name__)

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE, "rankings.json")
MODES = ("easy", "normal", "challenge")


def load():
    if not os.path.exists(DATA_FILE):
        return {m: [] for m in MODES}
    try:
        with open(DATA_FILE, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return {m: [] for m in MODES}
    for m in MODES:
        data.setdefault(m, [])
    return data


def save(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def cmp_key(e):
    # hp 取负 → 血量多排前; 时间短排前; 技能少排前
    return (-int(e.get("hp", 0)), int(e.get("time", 0)), int(e.get("tools", 0)))


def sorted_rank(entries):
    return sorted(entries, key=cmp_key)


@hlgx_rank_bp.route("/hlgx/api/rank")
def api_rank():
    mode = request.args.get("mode", "normal")
    if mode not in MODES:
        mode = "normal"
    data = load()
    return jsonify({"mode": mode, "rank": sorted_rank(data.get(mode, []))})


@hlgx_rank_bp.route("/hlgx/api/rank", methods=["POST"])
def api_rank_post():
    body = request.get_json(silent=True) or {}
    mode = body.get("mode", "normal")
    if mode not in MODES:
        mode = "normal"
    name = str(body.get("name", "")).strip()
    if not name:
        return jsonify({"ok": False, "msg": "缺少昵称"}), 400
    hp = max(0, min(int(body.get("hp", 0)), 3))
    secs = max(0, int(body.get("time", 0)))
    tools = max(0, min(int(body.get("tools", 0)), 9))

    data = load()
    entries = data.setdefault(mode, [])
    # 先算超越人数(用当前榜单,不含本次)
    new_key = cmp_key({"hp": hp, "time": secs, "tools": tools})
    surpassed = sum(1 for e in entries if new_key < cmp_key(e))

    entry = {
        "name": name,
        "hp": hp,
        "time": secs,
        "tools": tools,
        "date": time.strftime("%Y-%m-%d %H:%M"),
    }
    entries.append(entry)
    save(data)
    return jsonify({"ok": True, "surpassed": surpassed, "rank": sorted_rank(entries)})


@hlgx_rank_bp.route("/hlgx/api/name/exists")
def api_name_exists():
    name = request.args.get("name", "").strip()
    data = load()
    exists = any(any(e.get("name") == name for e in entries) for entries in data.values())
    return jsonify({"exists": bool(name) and exists})


@hlgx_rank_bp.route("/hlgx/api/name/suggest")
def api_name_suggest():
    name = request.args.get("name", "").strip()
    data = load()
    used = {e.get("name") for entries in data.values() for e in entries}
    for i in range(1, 1000):
        cand = "%s*%03d" % (name, i)
        if cand not in used:
            return jsonify({"name": cand})
    return jsonify({"name": name + "*999"})


@hlgx_rank_bp.route("/hlgx/api/rank", methods=["DELETE"])
def api_rank_delete():
    mode = request.args.get("mode", "")
    data = load()
    if mode in MODES:
        data[mode] = []
        save(data)
        return jsonify({"ok": True, "msg": "已清空 %s 榜单" % mode})
    if mode == "all":
        save({m: [] for m in MODES})
        return jsonify({"ok": True, "msg": "已清空全部榜单"})
    return jsonify({"ok": False, "msg": "参数错误"}), 400


@hlgx_rank_bp.route("/hlgx/rank")
def rank_page():
    return render_template("hlgx_rank.html")
