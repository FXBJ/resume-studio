#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""resume-studio 质检器：反 AI 味 + ATS 风险 + 一页估算。

动机
----
tech-resume 用 lint 去掉「AI 写出来的味道」，cn-resume-optimizer 用 40+ 项
自检清单兜底。两者都指向同一个真实痛点：**AI 生成的简历读起来像 AI 写的**，
HR 三秒就能闻出来。本脚本把这类检查固化成可执行项，而不是靠模型自觉。

检查分三组
----------
A. 反 AI 味  套话词 / 破折号 / bullet 长度均匀 / -ing 结尾 / 空洞形容词
B. 证据密度  无数字 bullet 占比 / 强动词覆盖
C. ATS 与排版 表格控件 / 多栏提示 / 一页体积估算

用法
----
    python3 lint.py --data resume.json
    python3 lint.py --data resume.json --strict   # 有 ERROR 即退出码 1
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# --- A. 反 AI 味词表 -------------------------------------------------------
# 这些词在真实人类简历里出现频率极低，是 LLM 的高频默认词。
AI_CLICHES = [
    "深耕", "赋能", "闭环", "抓手", "颗粒度", "打法", "链路", "沉淀",
    "对标", "复盘", "拉通", "落地", "推进", "打磨", "构建了完善的",
    "全方位的", "一体化的", "高效的", "积极的", "较强的",
    "良好的沟通能力", "团队协作精神", "抗压能力强", "学习能力强",
    "快速学习", "锐意进取", "脚踏实地", "严谨认真", "主人翁",
    "结果导向", "数据驱动", "持续优化", "深度融合", "全方位提升",
    "显著提升", "极大提升", "有效提升", "成功落地", "顺利推进",
]

# 空泛形容词——出现时必须邻近有数字，否则视为无证据
EMPTY_ADJ = ["优秀", "出色", "良好", "专业", "丰富", "深入", "扎实", "熟练"]

# 强动词（正向信号）
STRONG_VERBS = [
    "设计", "实现", "搭建", "重构", "主导", "独立", "完成", "交付", "上线",
    "优化", "降低", "提升", "缩短", "减少", "节省", "复现", "定位", "修复",
    "推动", "建立", "制定", "落地", "完成", "支撑", "覆盖", "沉淀",
    "设计并", "从零", "负责", "牵头", "协调", "推进", "输出", "验证",
]

# 技能枚举型 bullet 的引导词。
# 医疗、法务、财务等专业简历大量使用「熟练掌握 X、Y、Z」式技能清单，
# 这类 bullet 的价值在于覆盖面，不该按技术岗标准要求每条都带数字。
_SKILL_LEAD = re.compile(r"^(熟练掌握|熟悉掌握|熟悉|精通|掌握|擅长|轮转|参与轮转)")


def _is_skill_enum(text: str) -> bool:
    """判断是否为技能枚举型 bullet（并列 3 项以上）。"""
    return text.count("、") >= 2 or text.count("，") >= 3

_NUM_RE = re.compile(r"\d")


def _iter_bullets(data: dict):
    """产出 (section, entry_title, bullet_text)。"""
    secs = data.get("sections") or {}
    for key in ("experience", "projects", "education", "volunteer"):
        for e in secs.get(key) or []:
            title = e.get("title") or e.get("org") or e.get("school") or e.get("name") or "?"
            for b in e.get("bullets") or []:
                text = b.get("text", "") if isinstance(b, dict) else str(b)
                yield key, str(title), text
    for s in secs.get("summary") or []:
        text = s.get("text", "") if isinstance(s, dict) else str(s)
        if text.strip():
            yield "summary", "(简介)", text


def lint(data: dict) -> dict:
    findings: list[dict] = []
    bullets = list(_iter_bullets(data))
    total = len(bullets)
    no_number = 0
    has_verb = 0
    lengths: list[int] = []

    for sec, title, text in bullets:
        t = text.strip()
        if not t:
            continue
        lengths.append(len(t))

        # --- 套话 ---
        hits = [w for w in AI_CLICHES if w in t]
        if hits:
            findings.append({
                "level": "WARN", "group": "A", "where": f"{sec}/{title}",
                "rule": "AI 套话", "detail": f"命中 {hits}",
                "fix": "换成具体动作 + 数字，或整句删除",
            })

        # --- 破折号 ---
        if "——" in t:
            findings.append({
                "level": "WARN", "group": "A", "where": f"{sec}/{title}",
                "rule": "破折号", "detail": "bullet 内含「——」",
                "fix": "拆成两句，或用逗号/分号",
            })

        # --- -ing / 进行时尾巴 ---
        if re.search(r"(ing|ING)$", t.rstrip("。；;，,")):
            findings.append({
                "level": "WARN", "group": "A", "where": f"{sec}/{title}",
                "rule": "进行时结尾", "detail": "以 -ing 结尾，AI 味重",
                "fix": "改为已完成的动作，如「完成 X」而非「正在做 X」",
            })

        # --- 空洞形容词 ---
        # 技能枚举型 bullet（「熟练掌握 X、Y、Z」）不查此项：
        # 专业简历的技能清单靠覆盖面取信，不是每条都要配数字。
        if not _SKILL_LEAD.match(t):
            for adj in EMPTY_ADJ:
                if adj in t:
                    # 同句内有数字才算有支撑
                    if not _NUM_RE.search(t):
                        findings.append({
                            "level": "WARN", "group": "A", "where": f"{sec}/{title}",
                            "rule": "空洞形容词", "detail": f"「{adj}」无数字支撑",
                            "fix": "补一个可核验的数字，或删掉该形容词",
                        })

        # --- 证据密度 ---
        # 技能枚举型 bullet 不计入「无数字」统计
        if not _NUM_RE.search(t) and not (isinstance(t, str) and t.startswith("【待补")):
            if not _is_skill_enum(t):
                no_number += 1

        if any(v in t for v in STRONG_VERBS):
            has_verb += 1

    # --- bullet 长度均匀度（AI 的典型特征：每条都差不多长）---
    if len(lengths) >= 4:
        avg = sum(lengths) / len(lengths)
        var = sum((x - avg) ** 2 for x in lengths) / len(lengths)
        cv = (var ** 0.5) / avg if avg else 0
        if cv < 0.18:
            findings.append({
                "level": "WARN", "group": "A", "where": "全局",
                "rule": "bullet 长度过于均匀",
                "detail": f"变异系数 {cv:.2f}（<0.18 判定为 AI 痕迹）",
                "fix": "让重点条目更长、次要条目更短，形成真实节奏",
            })

    if total:
        nr = no_number / total
        if nr > 0.5:
            findings.append({
                "level": "WARN", "group": "B", "where": "全局",
                "rule": "证据密度不足",
                "detail": f"{no_number}/{total} 条 bullet 无任何数字（{nr:.0%}）",
                "fix": "优先给最近两段经历补数字；没有数字的写清交付物与范围",
            })
        vr = has_verb / total
        if vr < 0.5:
            findings.append({
                "level": "WARN", "group": "B", "where": "全局",
                "rule": "强动词覆盖低",
                "detail": f"仅 {vr:.0%} 的 bullet 以强动词开头",
                "fix": "用「设计/搭建/主导/优化/降低」等开头，替换「参与/负责/协助」",
            })

    # --- C. ATS / 排版 ---
    raw = json.dumps(data, ensure_ascii=False)
    for bad, msg in [
        ("<table", "HTML 里出现表格元素，ATS 解析易丢信息"),
        ("<textarea", "出现 textarea，ATS 读不到"),
        ("text-box", "出现文本框控件"),
    ]:
        if bad in raw:
            findings.append({
                "level": "ERROR", "group": "C", "where": "全局",
                "rule": "ATS 风险", "detail": msg, "fix": "改用单栏 + 普通文字流",
            })

    # 一页体积估算：按字符数粗估 A4 容量
    total_chars = sum(len(t) for _, _, t in bullets)
    if total_chars > 2600:
        findings.append({
            "level": "WARN", "group": "C", "where": "全局",
            "rule": "可能超一页",
            "detail": f"bullet 总字符 {total_chars}（>2600 有溢出风险）",
            "fix": "删最旧经历的次要条目，或把字号降到 0.92",
        })

    errors = [f for f in findings if f["level"] == "ERROR"]
    warns = [f for f in findings if f["level"] == "WARN"]
    return {
        "ok": not errors,
        "bullet_count": total,
        "no_number_ratio": round(no_number / total, 3) if total else 0,
        "strong_verb_ratio": round(has_verb / total, 3) if total else 0,
        "errors": errors,
        "warnings": warns,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="resume-studio 质检")
    ap.add_argument("--data", required=True, help="resume.json 路径")
    ap.add_argument("--strict", action="store_true", help="存在 ERROR 时退出码 1")
    args = ap.parse_args()

    data = json.loads(Path(args.data).read_text(encoding="utf-8"))
    res = lint(data)

    for f in res["errors"] + res["warnings"]:
        print(f"[{f['level']}][{f['group']}] {f['where']} · {f['rule']}：{f['detail']}")
        print(f"        → {f['fix']}")
    print(
        f"SUMMARY bullets={res['bullet_count']} "
        f"no_number_ratio={res['no_number_ratio']} "
        f"strong_verb_ratio={res['strong_verb_ratio']} "
        f"errors={len(res['errors'])} warnings={len(res['warnings'])}"
    )
    if args.strict and res["errors"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
