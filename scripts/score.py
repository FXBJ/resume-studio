#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""resume-studio JD 匹配度评分。

回答求职者最常问的一句话：「我这简历跟这个岗位到底对不对口？」

做法
----
1. 从 JD 文本抽取关键词（中文按 2-4 字窗口 + 停用词过滤；英文按 token）
2. 在简历全文里查覆盖率
3. 结合结构完整度、量化比例，给出 0—100 的匹配分与差距清单

这不是算命，是**可核验的关键词对照**——缺什么、补什么，一目了然。
但要注意：关键词匹配只是初筛，真实录用取决于面试表现，本分数不构成承诺。

用法
----
    python3 score.py --data resume.json --jd jd.txt
    python3 score.py --data resume.json --jd jd.txt --json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# JD 高频噪声词（出现但不构成能力要求）
STOPWORDS = {
    "岗位", "职位", "职责", "要求", "任职", "资格", "优先", "加分", "我们",
    "公司", "团队", "负责", "工作", "相关", "以上", "以下", "以及", "和",
    "熟悉", "了解", "精通", "掌握", "熟练", "能够", "具有", "具备",
    "经验", "能力", "建设", "推动", "落地", "紧密", "协作", "场景",
    "参与", "独立", "定位", "解决", "包括", "等类", "类似", "实践",
    "the", "and", "for", "with", "you", "our", "will", "are", "job",
}

# 硬性门槛信号（学历、年限、证书）
_HARD_PATTERNS = [
    (r"本科及以上|学士|本科以上", "学历≥本科"),
    (r"硕士|研究生", "学历≥硕士"),
    (r"博士", "学历≥博士"),
    (r"(\d+)\s*年以上", r"经验≥\1 年"),
    (r"(\d+)\s*年\s*(?:以上)?经验", r"经验≥\1 年"),
]


# ---------------------------------------------------------------------------
# JD 高频技能词库（零依赖下的「词典」信号）
# ---------------------------------------------------------------------------
# 边界字：真实技能词不会以这些字开头或结尾，用于过滤滑窗碎片
_BOUNDARY_CHARS = set(
    "与和的了在为能可对上中以到把被将从就更很都要会有着于且或以及包等括类种些"
    "前后中下左右间内外其此该各每某无有不未进出行来去时说想做看点用"
)

# 中文分词需要 jieba 等依赖，与零依赖目标冲突。这里用一份精选高频词库做词典
# 匹配：命中词库的词直接采信，滑窗片段只在出现 ≥2 次时采信。
# 词库同时可作为 references/industry-guide.md 的补充语料。
TERM_DICT = {
    # 技术
    "前端开发", "后端开发", "全栈开发", "数据分析", "数据可视化", "性能优化",
    "架构设计", "系统设计", "工程化", "构建工具", "持续集成", "单元测试",
    "监控体系", "异常监控", "日志分析", "代码 review", "重构", "微服务",
    "分布式", "高并发", "高可用", "数据库", "缓存", "消息队列", "容器化",
    "自动化测试", "接口设计", "安全加固", "数据建模", "机器学习", "深度学习",
    "自然语言处理", "计算机视觉", "推荐系统", "特征工程", "模型训练",
    "数据仓库", "数据治理", "实时计算", "离线计算", "任务调度",
    # 产品运营
    "产品设计", "需求分析", "用户研究", "用户增长", "活动运营", "内容运营",
    "用户运营", "数据分析能力", "商业分析", "竞品分析", "产品规划", "版本管理",
    "转化率", "留存率", "日活", "月活", "获客成本", "生命周期",
    # 设计创意
    "视觉设计", "交互设计", "用户体验", "品牌设计", "动效设计", "插画",
    "视频剪辑", "文案撰写", "分镜脚本", "设计系统", "组件库", "原型设计",
    # 金融咨询法律
    "财务分析", "尽职调查", "估值建模", "风险管理", "合规审查", "审计",
    "合同审查", "法律检索", "案例分析", "行业研究", "投资分析", "并购重组",
    # 制造工程医疗
    "工艺优化", "质量控制", "供应链", "生产计划", "设备维护", "安全规范",
    "临床研究", "病例管理", "影像诊断", "循证医学", "手术配合", "院感防控",
    "项目管理", "进度管控", "成本控制", "交付验收",
    # 公共部门
    "公共政策", "政务服务", "宣传教育", "舆情管理", "公文写作", "档案管理",
    "教学能力", "课程设计", "班级管理", "学生工作", "党建工作",
    # 通用
    "跨部门协作", "团队管理", "项目管理能力", "沟通协调", "汇报能力",
    "英文读写", "第二外语", "抗压能力", "快速学习",
}


def _extract_keywords(jd: str, topn: int = 30) -> list[str]:
    """中英混合关键词抽取。

    策略（三级，全部零依赖）：
    1. 英文 token —— JD 里的硬技能几乎都是英文，权重最高
    2. 词库命中 —— 中文部分用 TERM_DICT 做词典匹配，避免滑窗切错词
    3. 滑窗候选 —— 仅作为兜底，要求出现 ≥2 次且不带边界字

    要更准可换 jieba，但会引入依赖，见 SKILL.md 迭代建议。
    """
    jd_l = jd.lower()
    en = [w for w in re.findall(r"[a-z][a-z0-9+#.]{1,}", jd_l) if w not in STOPWORDS and len(w) >= 2]

    kws: dict[str, int] = {}

    # 1) 英文
    for w in en:
        kws[w] = kws.get(w, 0) + 3

    # 2) 词库
    for term in TERM_DICT:
        c = jd.count(term)
        if c:
            kws[term] = kws.get(term, 0) + c * 2

    # 3) 滑窗兜底
    cn_blob = re.sub(r"[^一-鿿]", " ", jd)
    for seg in cn_blob.split():
        if len(seg) < 2:
            continue
        for n in (2, 3, 4):
            for i in range(len(seg) - n + 1):
                g = seg[i : i + n]
                if g in STOPWORDS or g in kws:
                    continue
                if g[0] in _BOUNDARY_CHARS or g[-1] in _BOUNDARY_CHARS:
                    continue
                kws[g] = kws.get(g, 0) + 1

    # 滑窗片段要求 ≥2 次；词库与英文词保留
    kws = {k: v for k, v in kws.items() if (k in TERM_DICT) or v >= 2 or re.fullmatch(r"[a-z0-9+#.]+", k)}

    ranked = sorted(kws.items(), key=lambda kv: (-kv[1], -len(kv[0]), kv[0]))
    picked: list[str] = []
    for k, _ in ranked:
        if any(k != p and k in p for p in picked):
            continue
        picked.append(k)
        if len(picked) >= topn:
            break
    return picked


def _hard_requirements(jd: str) -> list[str]:
    out = []
    for pat, label in _HARD_PATTERNS:
        m = re.search(pat, jd)
        if m:
            out.append(m.expand(label) if "\\" in label else label)
    return out


def _resume_text(data: dict) -> str:
    parts: list[str] = []
    meta = data.get("meta") or {}
    parts.append(str(meta.get("headline") or ""))
    secs = data.get("sections") or {}
    for key in ("summary", "skills", "experience", "projects", "education", "certificates"):
        for e in secs.get(key) or []:
            if isinstance(e, dict):
                for v in e.values():
                    if isinstance(v, str):
                        parts.append(v)
                    elif isinstance(v, list):
                        for b in v:
                            parts.append(b.get("text", "") if isinstance(b, dict) else str(b))
            else:
                parts.append(str(e))
    return "\n".join(parts)


def score(data: dict, jd: str) -> dict:
    resume = _resume_text(data)
    resume_l = resume.lower()
    kws = _extract_keywords(jd)

    hit, miss = [], []
    for k in kws:
        (hit if k.lower() in resume_l else miss).append(k)

    coverage = len(hit) / len(kws) if kws else 0.0

    # 结构完整度
    secs = data.get("sections") or {}
    required = ["summary", "experience", "education"]
    missing_sec = [s for s in required if not secs.get(s)]
    completeness = 1.0 - len(missing_sec) / len(required)

    # 量化比例
    bullets = 0
    quantified = 0
    for key in ("experience", "projects"):
        for e in secs.get(key) or []:
            for b in e.get("bullets") or []:
                text = b.get("text", "") if isinstance(b, dict) else str(b)
                bullets += 1
                if re.search(r"\d", text):
                    quantified += 1
    quant = quantified / bullets if bullets else 0.0

    total = round(100 * (0.55 * coverage + 0.20 * completeness + 0.25 * quant))

    if total >= 80:
        verdict = "匹配度较高，可以投"
    elif total >= 60:
        verdict = "基本匹配，建议按差距清单补关键词后再投"
    else:
        verdict = "匹配度偏低，建议先补经历或换更匹配的岗位"

    return {
        "score": total,
        "verdict": verdict,
        "keyword_coverage": round(coverage, 3),
        "hit_keywords": hit[:25],
        "missing_keywords": miss[:25],
        "structure_completeness": round(completeness, 3),
        "quantified_ratio": round(quant, 3),
        "missing_sections": missing_sec,
        "hard_requirements": _hard_requirements(jd),
        "disclaimer": "关键词匹配仅代表初筛通过概率，不构成录用承诺。",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="resume-studio JD 匹配评分")
    ap.add_argument("--data", required=True)
    ap.add_argument("--jd", required=True, help="JD 文本文件路径")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    data = json.loads(Path(args.data).read_text(encoding="utf-8"))
    jd = Path(args.jd).read_text(encoding="utf-8", errors="ignore")
    res = score(data, jd)

    if args.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return 0

    print(f"匹配分：{res['score']} / 100")
    print(f"结论：{res['verdict']}")
    print(f"关键词覆盖率：{res['keyword_coverage']:.0%}（命中 {len(res['hit_keywords'])} / 缺 {len(res['missing_keywords'])}）")
    print(f"量化比例：{res['quantified_ratio']:.0%}")
    if res["missing_sections"]:
        print(f"缺失模块：{res['missing_sections']}")
    if res["hard_requirements"]:
        print(f"JD 硬性门槛：{res['hard_requirements']}")
    if res["missing_keywords"]:
        print("\n建议优先补上的关键词：")
        for k in res["missing_keywords"][:15]:
            print(f"  - {k}")
    print(f"\n{res['disclaimer']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
