#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""resume-studio 主题系统：六套行业模板 + 参数化自定义。

设计原则
--------
1. **一套骨架，六套主题**。所有模板共用同一份单栏 ATS 友好 HTML 骨架，
   差异全部由主题变量驱动（配色 / 字号 / 密度 / 模块顺序 / 栏目标题样式 /
   措辞偏好）。这样避免六份重复模板代码，也保证新增行业只需加一个 dict。
2. **行业维度而非设计维度**。市面产品按「实用系 / 个性系」分模板，求职者
   依然不知道投互联网该用哪套。本 Skill 直接按行业大类分，选择成本为零。
3. **ATS 优先**。所有主题均为单栏、无表格布局、无文本框、文字可选中复制。
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# 主题 schema
# ---------------------------------------------------------------------------
# accent       主色（栏目标题、分隔线、强调）
# accent_soft  主色浅底（用于 chip / 底纹）
# ink          正文色
# muted        次要信息色（日期、地点）
# rule         分隔线色
# font         字体栈
# font_scale   正文字号倍数（相对 10.5pt 基准）
# density      行距与段距：compact / normal / relaxed
# module_order 模块顺序，直接决定信息优先级
# section_style 栏目标题样式：bar（色块条）/ underline（下划线）/ plain（纯文字）/ numbered（编号）
# show_photo   是否在头部预留照片位
# bullet_hint  该行业的 bullet 措辞偏好（给写内容用）
# notes        一句话定位，用于向用户介绍

THEMES: dict[str, dict] = {
    # ------------------------------------------------------------------ 技术
    "tech": {
        "label": "互联网 / 软件 / 技术",
        "accent": "#0f62fe",
        "accent_soft": "#e8f0ff",
        "ink": "#16181d",
        "muted": "#5c6470",
        "rule": "#d8dce3",
        "font": '-apple-system, "PingFang SC", "STHeiti", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
        "font_scale": 1.0,
        "density": "normal",
        "module_order": ["summary", "skills", "experience", "projects", "education", "certificates", "volunteer", "campus"],
        "section_style": "bar",
        "show_photo": True,
        "photo_w": 23,
        "photo_h": 31,
        "photo_radius": 2,
        "bullet_hint": "技术方案 + 量化结果。优先写「做了什么系统 / 用什么栈 / 解决什么问题 / 指标变化」",
        "notes": "技能前置，蓝色主色，工程岗与研发岗通用。",
    },
    # -------------------------------------------------------------- 产品运营
    "product": {
        "label": "产品 / 运营 / 市场",
        "accent": "#0e9f6e",
        "accent_soft": "#e6f6f0",
        "ink": "#16181d",
        "muted": "#5c6470",
        "rule": "#d8dce3",
        "font": '-apple-system, "PingFang SC", "STHeiti", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
        "font_scale": 1.0,
        "density": "normal",
        "module_order": ["summary", "experience", "projects", "skills", "education", "certificates", "volunteer", "campus"],
        "section_style": "underline",
        "show_photo": True,
        "photo_w": 23,
        "photo_h": 31,
        "photo_radius": 2,
        "bullet_hint": "结果导向 + 用户视角。优先写「负责什么产品 / 做了什么策略 / 带来什么指标变化」",
        "notes": "成果量化前置，绿色主色，适合产品、运营、增长、市场岗。",
    },
    # ---------------------------------------------------------------- 设计创意
    "design": {
        "label": "设计 / 创意 / 内容",
        "accent": "#7c5cff",
        "accent_soft": "#f0ebff",
        "ink": "#16181d",
        "muted": "#5c6470",
        "rule": "#d8dce3",
        "font": '-apple-system, "PingFang SC", "STHeiti", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
        "font_scale": 1.0,
        "density": "relaxed",
        "module_order": ["summary", "projects", "experience", "skills", "education", "certificates", "volunteer", "campus"],
        "section_style": "plain",
        "show_photo": True,
        "photo_w": 26,
        "photo_h": 34,
        "photo_radius": 2,
        "bullet_hint": "作品与影响力导向。优先写「做了什么设计 / 服务什么场景 / 带来什么业务或用户变化」",
        "notes": "作品集优先，留白舒展，可放头像，适合设计、创意、内容岗。",
    },
    # ---------------------------------------------------------------- 金融咨询
    "finance": {
        "label": "金融 / 咨询 / 法律",
        "accent": "#8a6d3b",
        "accent_soft": "#f7f1e6",
        "ink": "#16181d",
        "muted": "#5c6470",
        "rule": "#d8dce3",
        "font": '"Songti SC", "Noto Serif CJK SC", "STSong", Georgia, serif',
        "font_scale": 1.0,
        "density": "normal",
        "module_order": ["summary", "education", "experience", "certificates", "skills", "projects", "volunteer", "campus"],
        "section_style": "numbered",
        "show_photo": False,
        "photo_w": 23,
        "photo_h": 31,
        "photo_radius": 2,
        "bullet_hint": "严谨 + 规模感。优先写「参与什么项目 / 承担什么职责 / 涉及什么规模与结果」",
        "notes": "学历与证书前置，衬线字体，编号栏题，贴合金融咨询法律行业惯例。",
    },
    # ---------------------------------------------------------------- 制造工程
    "engineering": {
        "label": "制造 / 工程 / 医疗 / 基建",
        "accent": "#334e68",
        "accent_soft": "#e8eef4",
        "ink": "#16181d",
        "muted": "#5c6470",
        "rule": "#d8dce3",
        "font": '-apple-system, "PingFang SC", "STHeiti", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
        "font_scale": 1.0,
        "density": "normal",
        "module_order": ["summary", "experience", "projects", "education", "certificates", "skills", "volunteer", "campus"],
        "section_style": "bar",
        "show_photo": True,
        "photo_w": 23,
        "photo_h": 31,
        "photo_radius": 2,
        "bullet_hint": "技术规范 + 交付导向。优先写「负责什么环节 / 用什么方法与标准 / 达成什么交付结果」",
        "notes": "项目与技术规范前置，石墨蓝主色，适合制造、工程、医疗、基建岗。",
    },
    # ---------------------------------------------------------------- 公共部门
    "public": {
        "label": "国企 / 事业 / 教育 / 公共部门",
        "accent": "#9b1c31",
        "accent_soft": "#fbeaec",
        "ink": "#16181d",
        "muted": "#5c6470",
        "rule": "#d8dce3",
        "font": '"Songti SC", "Noto Serif CJK SC", "STSong", Georgia, serif',
        "font_scale": 1.02,
        "density": "normal",
        "module_order": ["summary", "education", "experience", "certificates", "skills", "projects", "volunteer", "campus"],
        "section_style": "bar",
        "show_photo": True,
        "photo_w": 23,
        "photo_h": 31,
        "photo_radius": 2,
        "bullet_hint": "稳重 + 责任导向。优先写「承担什么工作 / 服务什么对象 / 取得什么成效」",
        "notes": "荣誉与证书前置，绛红主色，庄重规范，适合国企、事业、教育、公共部门。",
    },
}

# 模块中文名（用于栏目标题；用户可在 theme_overrides.labels 覆盖）
SECTION_LABELS: dict[str, str] = {
    "summary": "个人简介",
    "skills": "专业技能",
    "experience": "工作经历",
    "projects": "项目经历",
    "education": "教育背景",
    "certificates": "证书与荣誉",
    "volunteer": "志愿经历",
    "campus": "校园经历",
}

# 允许用户覆盖的 theme 字段（自然语言 → 参数的映射见 references/theme-schema.md）
MUTABLE_FIELDS = (
    "accent",
    "accent_soft",
    "ink",
    "muted",
    "rule",
    "font_scale",
    "density",
    "show_photo",
    "photo_w",
    "photo_h",
    "photo_radius",
    "module_order",
    "section_style",
    "labels",
)

VALID_DENSITY = ("compact", "normal", "relaxed")
VALID_SECTION_STYLE = ("bar", "underline", "plain", "numbered")
VALID_MODULES = tuple(SECTION_LABELS.keys())


class ThemeError(ValueError):
    """主题参数非法。"""


def resolve_theme(theme_name: str | None, overrides: dict | None) -> dict:
    """把主题名 + 用户覆盖合并成最终主题 dict。

    overrides 只接受 MUTABLE_FIELDS 白名单内的字段，其余静默忽略——
    防止用户（或模型）误改不可变字段导致版式崩坏。
    """
    name = (theme_name or "tech").strip().lower()
    if name not in THEMES:
        raise ThemeError(
            f"未知主题 '{name}'，可选：{', '.join(sorted(THEMES))}"
        )

    theme = dict(THEMES[name])
    theme["name"] = name
    theme["labels"] = dict(SECTION_LABELS)

    ov = dict(overrides or {})
    for key in list(ov.keys()):
        if key not in MUTABLE_FIELDS:
            del ov[key]  # 白名单外一律忽略，不做静默改名

    # labels 需要与默认值合并，不能被整体替换
    label_ov = ov.pop("labels", None) or {}

    # 校验
    if "density" in ov and ov["density"] not in VALID_DENSITY:
        raise ThemeError(f"density 只能是 {VALID_DENSITY}")
    if "section_style" in ov and ov["section_style"] not in VALID_SECTION_STYLE:
        raise ThemeError(f"section_style 只能是 {VALID_SECTION_STYLE}")
    if "module_order" in ov:
        order = list(ov["module_order"])
        unknown = [m for m in order if m not in VALID_MODULES]
        if unknown:
            raise ThemeError(f"module_order 含未知模块 {unknown}")
        if len(set(order)) != len(order):
            raise ThemeError("module_order 含重复模块")
        ov["module_order"] = order
    if "font_scale" in ov:
        try:
            fs = float(ov["font_scale"])
        except (TypeError, ValueError):
            raise ThemeError("font_scale 必须是数字")
        if not 0.7 <= fs <= 1.6:
            raise ThemeError("font_scale 需在 0.7—1.6 之间（超出会破坏一页排版）")
        ov["font_scale"] = fs

    # 头像尺寸（mm）与圆角（mm）
    for key in ("photo_w", "photo_h"):
        if key in ov:
            try:
                v = float(ov[key])
            except (TypeError, ValueError):
                raise ThemeError(f"{key} 必须是数字（mm）")
            if not 12 <= v <= 45:
                raise ThemeError(f"{key} 需在 12—45mm 之间")
            ov[key] = v
    if "photo_radius" in ov:
        try:
            ov["photo_radius"] = float(ov["photo_radius"])
        except (TypeError, ValueError):
            raise ThemeError("photo_radius 必须是数字（mm）")
        if not 0 <= ov["photo_radius"] <= 20:
            raise ThemeError("photo_radius 需在 0—20mm 之间")

    theme.update(ov)
    theme["labels"].update(label_ov)

    return theme


def theme_summary() -> str:
    """给用户看的六套模板清单（一行一套）。"""
    lines = []
    for key, t in THEMES.items():
        lines.append(f"- `{key}` {t['label']}：{t['notes']}")
    return "\n".join(lines)


if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "list":
        print(theme_summary())
    else:
        print(json.dumps({k: v for k, v in THEMES.items()}, ensure_ascii=False, indent=2))
