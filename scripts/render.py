#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""resume-studio 渲染器：resume.json + theme → 单页自包含 HTML。

用法
----
    python3 render.py --data resume.json --out resume.html [--theme tech]
    python3 render.py --data resume.json --out resume.html --list-themes

设计约束（写死在输出里，不依赖使用者自觉）
------------------------------------------------
* **单栏**：ATS 与人工阅读都不丢信息。双栏在解析时经常左右串行。
* **无表格布局、无文本框**：表格与 text-box 是 ATS 解析丢失的重灾区。
* **真实文字、可选中复制**：不用图片承载任何文字。
* **A4 + 一页**：`@page { size: A4; margin: 0 }`，页面自身控边距，
  浏览器「打印 → 存为 PDF」即得可投递成品，零第三方依赖。
* **缺数占位**：需要用户补数字的 bullet 渲染为醒目的【待补】标记，
  而不是让模型编一个数字。
"""

from __future__ import annotations

import argparse
import base64
import html
import json
import mimetypes
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from themes import SECTION_LABELS, ThemeError, resolve_theme  # noqa: E402

BASE_FONT_PT = 10.5  # 正文字号基准（pt）

DENSITY = {
    #        行高    段距    栏间距   条目间距
    "compact":  (1.45, "4px",  "10px", "5px"),
    "normal":   (1.62, "7px",  "14px", "8px"),
    "relaxed":  (1.80, "10px", "18px", "12px"),
}


# ---------------------------------------------------------------------------
# 转义与格式化
# ---------------------------------------------------------------------------
def esc(v) -> str:
    """HTML 转义；None → 空串。"""
    if v is None:
        return ""
    return html.escape(str(v), quote=False)


def _photo_src(value: str) -> tuple[str, str]:
    """把 meta.photo 转成可直接内嵌的 src。

    支持两种输入：
    - `data:image/...;base64,...` —— 直接用
    - 本地文件路径 —— 读文件并转 base64 data URI

    为什么必须内嵌：写死本地路径时，HTML 一旦被移动、发给别人或另存 PDF，
    图片必然裂图。data URI 让单文件自包含，打印和分享都不会掉图。
    """
    v = (value or "").strip()
    if not v:
        return "", ""
    if v.startswith("data:"):
        return v, "data-uri"
    p = Path(v).expanduser()
    if not p.exists():
        return "", f"missing:{v}"
    mime = mimetypes.guess_type(p.name)[0] or "image/jpeg"
    b64 = base64.b64encode(p.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}", f"embedded:{p.name}"


def fmt_date_range(start, end) -> str:
    """把起止时间拼成 '2023.03 — 2024.06'，缺 end 用「至今」。"""
    s = (start or "").strip()
    e = (end or "").strip() or "至今"
    if not s and not e:
        return ""
    if not s:
        return e
    return f"{s} — {e}"


def render_inline(text: str) -> str:
    """极简行内标记：**加粗** 与 `等宽`。避免引入 Markdown 全量解析。"""
    out = esc(text)
    import re

    out = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    return out


# ---------------------------------------------------------------------------
# 各模块渲染
# ---------------------------------------------------------------------------
def _bullet_html(b) -> str:
    """单条 bullet。b 可为 str 或 dict。"""
    if isinstance(b, str):
        return f"<li>{render_inline(b)}</li>"
    text = b.get("text", "")
    needs = bool(b.get("needs_data"))
    if needs:
        hint = b.get("data_hint") or "补充具体数字"
        return (
            f'<li class="needs-data">{render_inline(text)}'
            f'<span class="todo">【待补：{esc(hint)}】</span></li>'
        )
    return f"<li>{render_inline(text)}</li>"


def _bullets(items) -> str:
    if not items:
        return ""
    lis = "".join(_bullet_html(b) for b in items)
    return f'<ul class="bullets">{lis}</ul>'


def render_header(data: dict, theme: dict) -> tuple[str, list[str]]:
    """头部：头像 + 姓名 + 一句话定位 + 关键事实条 + 联系方式 + 求职意向。"""
    meta = data.get("meta", {})
    notes: list[str] = []
    name = esc(meta.get("name") or "你的名字")
    headline = esc(meta.get("headline") or "")

    # --- 头像（base64 内嵌，见 _photo_src）---
    photo = ""
    if theme.get("show_photo"):
        src, how = _photo_src(meta.get("photo") or meta.get("photo_path") or "")
        if src:
            photo = (
                f'<img class="photo" src="{src}" alt="">'
            )
        elif how.startswith("missing"):
            notes.append(f"头像文件不存在：{how[8:]}（已跳过头像，请检查路径）")
        elif theme.get("show_photo") and not (meta.get("photo") or meta.get("photo_path")):
            notes.append("主题开启了头像位，但未提供 photo——填入本地图片路径或 base64 即可显示")

    # --- 关键事实条：年龄 / 经验 / 学历 / 到岗状态 ---
    facts = [str(f).strip() for f in (meta.get("facts") or []) if str(f).strip()]
    facts_html = f'<div class="facts">{_spans(facts, "fact")}</div>' if facts else ""

    # --- 联系方式 ---
    contact = meta.get("contact") or {}
    parts = []
    for key in ("phone", "email", "city", "wechat", "portfolio", "github"):
        v = (contact.get(key) or "").strip()
        if v:
            parts.append(f'<span class="c-item">{esc(v)}</span>')

    # --- 求职意向 ---
    target = meta.get("target") or {}
    t_bits = []
    if (target.get("role") or "").strip():
        t_bits.append(f"<b>{esc(target['role'].strip())}</b>")
    if (target.get("industry") or "").strip():
        t_bits.append(esc(target["industry"].strip()))
    if (target.get("salary") or "").strip():
        t_bits.append(esc(target["salary"].strip()))
    t_line = (
        f'<div class="target"><span class="t-label">求职意向</span>{" · ".join(t_bits)}</div>'
        if t_bits
        else ""
    )

    head = f"""<header class="hd">
  {photo}
  <div class="hd-main">
    <div class="hd-top">
      <h1 class="name">{name}</h1>
      {facts_html}
    </div>
    {f'<div class="headline">{headline}</div>' if headline else ''}
    {t_line}
    <div class="contact">{''.join(parts)}</div>
  </div>
</header>"""
    return head, notes


def render_summary(data: dict, theme: dict) -> str:
    items = (data.get("sections") or {}).get("summary") or []
    texts = [i.get("text", "") if isinstance(i, dict) else str(i) for i in items]
    texts = [t for t in texts if t.strip()]
    if not texts:
        return ""
    body = "<br>".join(render_inline(t) for t in texts)
    return f'<section class="sec"><h2>{esc(theme["labels"]["summary"])}</h2><p class="summary">{body}</p></section>'


def render_skills(data: dict, theme: dict) -> str:
    items = (data.get("sections") or {}).get("skills") or []
    if not items:
        return ""
    rows = []
    for it in items:
        cat = (it.get("category") or "").strip()
        vals = it.get("items") or []
        vals = [str(v).strip() for v in vals if str(v).strip()]
        if not vals:
            continue
        chips = "".join(f'<span class="chip">{esc(v)}</span>' for v in vals)
        label = f'<span class="sk-cat">{esc(cat)}</span>' if cat else ""
        rows.append(f'<div class="sk-row">{label}<span class="sk-items">{chips}</span></div>')
    if not rows:
        return ""
    return (
        f'<section class="sec"><h2>{esc(theme["labels"]["skills"])}</h2>'
        + "".join(rows)
        + "</section>"
    )


def _spans(items, cls: str) -> str:
    """生成一串 `<span class="cls">value</span>`。

    单独抽成函数而不用嵌套 f-string，原因有两个：
    1. Python 3.12 之前，f-string 表达式部分不能含反斜杠；
    2. 三层引号嵌套（外 ' 中 " 内 '）对旧版 tokenizer 不友好。
    抽成函数后两者都绕开了，代码也更好读。
    """
    return "".join(f'<span class="{cls}">{esc(v)}</span>' for v in items)


def _tags_html(tags) -> str:
    if not tags:
        return ""
    items = [str(t).strip() for t in tags if str(t).strip()]
    if not items:
        return ""
    return f'<div class="tags">{_spans(items, "tag")}</div>'


def _entry_block(org, title, meta_line, bullets, location="", extra="", tags=None) -> str:
    """经历/项目/教育共用的条目骨架。日期与地点同一行左右分布。"""
    head = f'<div class="e-head"><span class="e-title">{esc(title)}</span>'
    if org:
        head += f'<span class="e-org">{esc(org)}</span>'
    if extra:
        head += f'<span class="e-extra">{esc(extra)}</span>'
    head += "</div>"
    if meta_line or location:
        sub = (
            f'<div class="e-sub"><span>{esc(meta_line)}</span>'
            f'<span class="e-loc">{esc(location)}</span></div>'
        )
    else:
        sub = ""
    return f'<div class="entry">{head}{sub}{_bullets(bullets)}{_tags_html(tags)}</div>'


def render_experience(data: dict, theme: dict) -> str:
    items = (data.get("sections") or {}).get("experience") or []
    blocks = []
    for it in items:
        blocks.append(
            _entry_block(
                it.get("org", ""),
                it.get("title", ""),
                fmt_date_range(it.get("start"), it.get("end")),
                it.get("bullets") or [],
                location=it.get("location", ""),
                extra=it.get("team", ""),
                tags=it.get("tags"),
            )
        )
    if not blocks:
        return ""
    return (
        f'<section class="sec"><h2>{esc(theme["labels"]["experience"])}</h2>'
        + "".join(blocks)
        + "</section>"
    )


def render_projects(data: dict, theme: dict) -> str:
    items = (data.get("sections") or {}).get("projects") or []
    blocks = []
    for it in items:
        meta_bits = []
        if (it.get("role") or "").strip():
            meta_bits.append(f"角色：{it['role'].strip()}")
        if (it.get("stack") or "").strip():
            meta_bits.append(f"技术栈：{it['stack'].strip()}")
        meta_line = " · ".join(meta_bits)
        blocks.append(
            _entry_block(
                it.get("org", ""),
                it.get("title", ""),
                fmt_date_range(it.get("start"), it.get("end")),
                it.get("bullets") or [],
                location=it.get("location", ""),
                extra=meta_line,
                tags=it.get("tags"),
            )
        )
    if not blocks:
        return ""
    return (
        f'<section class="sec"><h2>{esc(theme["labels"]["projects"])}</h2>'
        + "".join(blocks)
        + "</section>"
    )


def render_education(data: dict, theme: dict) -> str:
    items = (data.get("sections") or {}).get("education") or []
    blocks = []
    for it in items:
        meta_bits = []
        if (it.get("degree") or "").strip():
            meta_bits.append(it["degree"].strip())
        if (it.get("major") or "").strip():
            meta_bits.append(it["major"].strip())
        if (it.get("gpa") or "").strip():
            meta_bits.append(f"GPA {it['gpa'].strip()}")
        meta_line = " · ".join(meta_bits)
        blocks.append(
            _entry_block(
                it.get("school", ""),
                it.get("degree", "") or it.get("major", ""),
                fmt_date_range(it.get("start"), it.get("end")),
                it.get("bullets") or [],
                location=it.get("location", ""),
                extra=meta_line,
            )
        )
    if not blocks:
        return ""
    return (
        f'<section class="sec"><h2>{esc(theme["labels"]["education"])}</h2>'
        + "".join(blocks)
        + "</section>"
    )


def render_certificates(data: dict, theme: dict) -> str:
    items = (data.get("sections") or {}).get("certificates") or []
    if not items:
        return ""
    lis = []
    for it in items:
        name = (it.get("name") or "").strip()
        if not name:
            continue
        bits = [f"<strong>{esc(name)}</strong>"]
        if (it.get("issuer") or "").strip():
            bits.append(esc(it["issuer"].strip()))
        if (it.get("date") or "").strip():
            bits.append(esc(it["date"].strip()))
        lis.append("<li>" + " · ".join(bits) + "</li>")
    if not lis:
        return ""
    return (
        f'<section class="sec"><h2>{esc(theme["labels"]["certificates"])}</h2>'
        f'<ul class="plain-list">{"".join(lis)}</ul></section>'
    )


def render_volunteer(data: dict, theme: dict) -> str:
    """志愿经历：名称 + 时间 + 时长 + 内容。"""
    items = (data.get("sections") or {}).get("volunteer") or []
    blocks = []
    for it in items:
        name = (it.get("name") or "").strip()
        if not name:
            continue
        meta_bits = []
        if (it.get("duration") or "").strip():
            meta_bits.append(f"时长 {it['duration'].strip()}")
        meta_line = " · ".join(meta_bits)
        blocks.append(
            _entry_block(
                "",
                name,
                fmt_date_range(it.get("start"), it.get("end")),
                it.get("bullets") or [],
                extra=meta_line,
            )
        )
    if not blocks:
        return ""
    return (
        f'<section class="sec"><h2>{esc(theme["labels"]["volunteer"])}</h2>'
        + "".join(blocks)
        + "</section>"
    )


def render_campus(data: dict, theme: dict) -> str:
    """校园经历：紧凑单行列表，默认低优先级，空间紧时最先砍。"""
    items = (data.get("sections") or {}).get("campus") or []
    rows = []
    for it in items:
        if isinstance(it, str):
            t = it.strip()
            if t:
                rows.append(f"<li>{render_inline(t)}</li>")
            continue
        org = (it.get("org") or "").strip()
        roles = [str(r).strip() for r in (it.get("roles") or []) if str(r).strip()]
        if not org and not roles:
            continue
        head = esc(org) if org else ""
        if roles:
            head += (f'<span class="c-roles">{" · ".join(esc(r) for r in roles)}</span>' if head
                     else f'<span class="c-roles">{" · ".join(esc(r) for r in roles)}</span>')
        rows.append(f"<li>{head}</li>")
    if not rows:
        return ""
    return (
        f'<section class="sec"><h2>{esc(theme["labels"]["campus"])}</h2>'
        f'<ul class="plain-list tight">{"".join(rows)}</ul></section>'
    )


RENDERERS = {
    "summary": render_summary,
    "skills": render_skills,
    "experience": render_experience,
    "projects": render_projects,
    "education": render_education,
    "certificates": render_certificates,
    "volunteer": render_volunteer,
    "campus": render_campus,
}


# ---------------------------------------------------------------------------
# CSS
# ---------------------------------------------------------------------------
def build_css(theme: dict) -> str:
    fs = float(theme.get("font_scale", 1.0)) * BASE_FONT_PT
    lh, gap_para, gap_sec, gap_entry = DENSITY[theme.get("density", "normal")]
    style = theme.get("section_style", "bar")

    if style == "bar":
        h2_css = (
            f"background:{theme['accent']};color:#fff;"
            "padding:2.5px 8px;border-radius:2px;display:inline-block;"
        )
    elif style == "underline":
        h2_css = (
            f"color:{theme['accent']};border-bottom:1.5px solid {theme['accent']};"
            "padding-bottom:2px;display:block;"
        )
    elif style == "numbered":
        h2_css = f"color:{theme['accent']};border-bottom:1px solid {theme['rule']};padding-bottom:2px;"
    else:  # plain
        h2_css = f"color:{theme['ink']};letter-spacing:.14em;text-transform:uppercase;"

    counter = ""
    if style == "numbered":
        counter = ".sec{counter-increment:sec}.sec>h2::before{content:counter(sec,decimal-leading-zero)'. ';color:" + theme["muted"] + "}"
        h2_css += ""

    return f"""
:root{{
  --accent:{theme['accent']}; --accent-soft:{theme['accent_soft']};
  --ink:{theme['ink']}; --muted:{theme['muted']}; --rule:{theme['rule']};
  --fs:{fs:.2f}pt; --lh:{lh};
}}
*{{box-sizing:border-box;}}
html,body{{margin:0;padding:0;background:#fff;}}
body{{
  font-family:{theme['font']};
  font-size:var(--fs); line-height:var(--lh);
  color:var(--ink); -webkit-font-smoothing:antialiased;
}}
@page{{size:A4;margin:0;}}
.page{{
  width:210mm; min-height:297mm; margin:0 auto;
  padding:16mm 17mm 14mm; background:#fff;
}}
{counter}
/* ---------- 头部 ---------- */
.hd{{display:flex;gap:13px;align-items:flex-start;padding-bottom:{gap_sec};border-bottom:2px solid var(--accent);}}
.photo{{width:{theme.get('photo_w',23)}mm;height:{theme.get('photo_h',31)}mm;object-fit:cover;
  border-radius:{theme.get('photo_radius',2)}mm;flex:none;background:var(--accent-soft);}}
.hd-main{{flex:1;min-width:0;}}
.hd-top{{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;}}
.name{{font-size:calc(var(--fs)*2.05);font-weight:700;margin:0;letter-spacing:.02em;line-height:1.1;}}
.facts{{display:flex;flex-wrap:wrap;gap:2px 8px;font-size:calc(var(--fs)*0.9);color:var(--muted);}}
.fact{{white-space:nowrap;}}
.fact + .fact::before{{content:"·";margin-right:8px;color:var(--rule);}}
.headline{{font-size:calc(var(--fs)*1.12);color:var(--accent);font-weight:600;margin:4px 0 3px;}}
.target{{font-size:calc(var(--fs)*0.94);color:var(--muted);margin:0 0 4px;}}
.t-label{{color:var(--accent);font-weight:600;margin-right:4px;}}
.contact{{display:flex;flex-wrap:wrap;gap:2px 14px;font-size:calc(var(--fs)*0.92);color:var(--muted);}}
/* ---------- 栏目 ---------- */
.sec{{margin-top:{gap_sec};counter-increment:sec;}}
.sec>h2{{
  font-size:calc(var(--fs)*1.06);font-weight:700;margin:0 0 {gap_para};
  {h2_css}
}}
.summary{{margin:0;text-align:justify;}}
/* ---------- 条目 ---------- */
.entry{{margin-bottom:{gap_entry};}}
.entry:last-child{{margin-bottom:0;}}
.e-head{{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;}}
.e-title{{font-weight:700;font-size:calc(var(--fs)*1.03);}}
.e-org{{color:var(--accent);font-weight:600;}}
.e-extra{{color:var(--muted);font-size:calc(var(--fs)*0.9);}}
.e-sub{{color:var(--muted);font-size:calc(var(--fs)*0.88);margin-top:1px;display:flex;justify-content:space-between;gap:10px;}}
.e-loc{{color:var(--muted);font-size:calc(var(--fs)*0.88);flex:none;}}
/* ---------- 经历标签 ---------- */
.tags{{display:flex;flex-wrap:wrap;gap:3px 5px;margin-top:3px;}}
.tag{{background:var(--accent-soft);color:var(--ink);border-radius:2px;padding:0 5px;font-size:calc(var(--fs)*0.85);}}
/* ---------- 列表 ---------- */
.bullets{{margin:3px 0 0;padding-left:1.15em;}}
.bullets li{{margin-bottom:2px;text-align:justify;}}
.bullets li:last-child{{margin-bottom:0;}}
.plain-list{{margin:0;padding-left:1.15em;}}
.plain-list li{{margin-bottom:2px;}}
.plain-list.tight li{{margin-bottom:1px;}}
.c-roles{{color:var(--muted);}}
code{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.94em;background:var(--accent-soft);padding:0 3px;border-radius:2px;}}
/* ---------- 技能 chip ---------- */
.sk-row{{display:flex;flex-wrap:wrap;align-items:baseline;gap:3px 10px;margin-bottom:3px;}}
.sk-row:last-child{{margin-bottom:0;}}
.sk-cat{{font-weight:600;min-width:64px;color:var(--ink);}}
.sk-items{{display:flex;flex-wrap:wrap;gap:3px 5px;}}
.chip{{background:var(--accent-soft);color:var(--ink);border-radius:2px;padding:0 5px;font-size:calc(var(--fs)*0.92);}}
/* ---------- 待补标记 ---------- */
.needs-data{{list-style:none;margin-left:-1.15em;}}
.todo{{
  display:inline-block;margin-left:4px;padding:0 5px;border-radius:2px;
  background:#fff4e5;color:#b25e00;border:1px dashed #e8a33d;
  font-size:calc(var(--fs)*0.85);
}}
/* ---------- 打印 ---------- */
@media print{{
  body{{background:#fff;}}
  .page{{width:auto;min-height:0;padding:0;}}
  .needs-data{{break-inside:avoid;}}
  .entry,.sec{{break-inside:avoid;}}
}}
"""


# ---------------------------------------------------------------------------
# 主渲染
# ---------------------------------------------------------------------------
def render(data: dict, theme_name: str | None = None) -> tuple[str, list[str]]:
    """返回 (html, notes)。notes 是需要告知用户的调整说明。"""
    overrides = data.get("theme_overrides")
    notes: list[str] = []

    # 显式换主题时，清掉「从上一套主题继承来的」视觉覆盖，
    # 否则旧 accent 会盖住新主题色，用户会觉得「换了模板但没变化」。
    if theme_name and overrides and theme_name != (data.get("theme") or ""):
        stale = [k for k in ("accent", "accent_soft", "ink", "muted", "rule", "section_style")
                 if k in overrides]
        if stale:
            overrides = {k: v for k, v in overrides.items() if k not in stale}
            notes.append(f"换用 {theme_name} 主题，已重置继承自上一主题的配色：{', '.join(stale)}")

    theme = resolve_theme(theme_name or data.get("theme"), overrides)

    order = theme["module_order"]
    sections = data.get("sections") or {}
    head_html, head_notes = render_header(data, theme)
    notes.extend(head_notes)
    parts = [head_html]
    for key in order:
        fn = RENDERERS.get(key)
        if not fn or key not in sections:
            continue
        out = fn(data, theme)
        if out:
            parts.append(out)

    body = "\n".join(parts)
    return (
        f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc((data.get('meta') or {}).get('name') or '简历')} · 简历</title>
<style>{build_css(theme)}</style>
</head>
<body>
<div class="page">
{body}
</div>
</body>
</html>
""",
        notes,
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="resume-studio 渲染器")
    ap.add_argument("--data", help="resume.json 路径")
    ap.add_argument("--out", help="输出 HTML 路径")
    ap.add_argument("--theme", help="覆盖主题名（六选一）")
    ap.add_argument("--list-themes", action="store_true", help="列出六套行业模板")
    args = ap.parse_args()

    if args.list_themes:
        from themes import theme_summary

        print(theme_summary())
        return 0

    if not args.data or not args.out:
        ap.error("--data 与 --out 必填（或用 --list-themes）")

    data = json.loads(Path(args.data).read_text(encoding="utf-8"))
    try:
        out, notes = render(data, args.theme)
    except ThemeError as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        return 1
    Path(args.out).write_text(out, encoding="utf-8")
    print(json.dumps({"ok": True, "out": args.out, "bytes": len(out.encode("utf-8"))}, ensure_ascii=False))
    for n in notes:
        print(f"NOTE\t{n}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
