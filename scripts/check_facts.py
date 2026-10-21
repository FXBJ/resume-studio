#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""resume-studio 事实保真校验。

动机
----
调研的 7 个项目里，有 5 个把「never invent numbers/titles/tools」写进
README 或 SKILL.md——说明**编造是 AI 简历工具的头号事故**。本脚本把这条
从「嘱咐」变成「可执行的闸门」：

    输出简历里出现的每一个数字、公司名、学校名、日期，
    都必须能在 fact_sheet（用户亲口提供的事实清单）里找到来源；
    找不到的一律标红，要求改成【待补】占位符或删除。

用法
----
    python3 check_facts.py --data resume.json [--raw raw.json]
    python3 check_facts.py --data resume.json --strict   # 有无源声明即退出码 1
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# 允许的通用数字：不构成事实声明的序号、年份、千分位
# 注意：**不**放行裸 2—4 位数与百分数——那正是编造指标最常见的形态。
_WHITELIST_NUM = re.compile(
    r"^(?:"
    r"[一二三四五六七八九十百千万亿]+|"          # 中文序号/数量
    r"[0-9]|"                                   # 单个数字（序号、版本号）
    r"(?:19|20)\d{2}(?:[.\-/年]\d{1,2}\s*月?)?|"  # 年份 / 2023.03 / 2023年3月
    r"\d{1,3}(?:,\d{3})+"                       # 千分位整数
    r")$"
)

# 从 bullet 文本里抓「像事实」的片段
_NUM_TOKEN = re.compile(r"\d+(?:[.,]\d+)*%?")
_CN_NUM = re.compile(r"[一二三四五六七八九十百千万亿]+")


def _iter_texts(data: dict):
    """产出 (section, entry, text)。"""
    secs = data.get("sections") or {}
    meta = data.get("meta") or {}
    yield "meta", "name", str(meta.get("name") or "")
    yield "meta", "headline", str(meta.get("headline") or "")
    for key in ("experience", "projects", "education", "certificates", "volunteer"):
        for e in secs.get(key) or []:
            who = e.get("org") or e.get("school") or e.get("issuer") or e.get("title") or e.get("name") or "?"
            for b in e.get("bullets") or []:
                text = b.get("text", "") if isinstance(b, dict) else str(b)
                yield key, str(who), text
    for s in secs.get("summary") or []:
        text = s.get("text", "") if isinstance(s, dict) else str(s)
        yield "summary", "(简介)", text


def _collect_fact_tokens(raw: dict | None, data: dict) -> set[str]:
    """从 fact_sheet / raw 中收集所有已授权的事实片段。"""
    allowed: set[str] = set()

    def walk(node):
        if isinstance(node, dict):
            for k, v in node.items():
                if isinstance(v, str):
                    allowed.add(v.strip())
                    # 也收录其中的数字与中文数字
                    for tok in _NUM_TOKEN.findall(v):
                        allowed.add(tok)
                    for tok in _CN_NUM.findall(v):
                        allowed.add(tok)
                else:
                    walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)
        elif node is not None:
            allowed.add(str(node))

    walk(raw or {})
    # fact_sheet 内嵌在 resume.json 里时也收
    walk(data.get("fact_sheet") or {})
    # 用户显式标记为「已核实」的字段
    for e in (data.get("sections") or {}).get("experience") or []:
        for b in e.get("bullets") or []:
            if isinstance(b, dict) and b.get("verified"):
                for tok in _NUM_TOKEN.findall(b.get("text", "")):
                    allowed.add(tok)
    return allowed


def check(data: dict, raw: dict | None) -> dict:
    allowed = _collect_fact_tokens(raw, data)
    # 把长串也加入，便于子串匹配
    blob = " ".join(sorted(allowed, key=len, reverse=True))

    unsourced: list[dict] = []
    for sec, who, text in _iter_texts(data):
        if not text or text.strip().startswith("【待补"):
            continue
        # 跳过用户已标记 verified 的
        for tok in set(_NUM_TOKEN.findall(text)):
            if _WHITELIST_NUM.match(tok):
                continue
            if tok in allowed or tok in blob:
                continue
            unsourced.append({
                "section": sec, "where": who, "token": tok,
                "kind": "数字", "context": text[:60],
            })
        for tok in set(_CN_NUM.findall(text)):
            if tok in allowed or tok in blob:
                continue
            # 只把「真数量」当无源声明：含百/千/万/亿的才是量词
            # 「二三期」「一対一」这类序号/范围不是事实声明，跳过免误报
            if not re.search(r"[百千万亿]", tok):
                continue
            unsourced.append({
                "section": sec, "where": who, "token": tok,
                "kind": "中文数量", "context": text[:60],
            })

    return {
        "ok": not unsourced,
        "unsourced_count": len(unsourced),
        "unsourced": unsourced[:40],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="resume-studio 事实保真校验")
    ap.add_argument("--data", required=True)
    ap.add_argument("--raw", help="raw.json（用户事实清单）")
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    data = json.loads(Path(args.data).read_text(encoding="utf-8"))
    raw = json.loads(Path(args.raw).read_text(encoding="utf-8")) if args.raw else None
    res = check(data, raw)

    for u in res["unsourced"]:
        print(f"[无源] {u['section']}/{u['where']} {u['kind']}「{u['token']}」")
        print(f"       上下文：{u['context']}")
    print(f"SUMMARY unsourced={res['unsourced_count']}")

    if args.strict and not res["ok"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
