#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""resume-studio 输入解析器：把已有简历转成结构化文本块。

优化模式的第一公里。用户丢过来的东西五花八门（md / txt / html / docx / pdf），
先统一抽成纯文本 + 粗分段，再交给模型做结构化重组。

依赖策略
--------
* md / txt / html：标准库直接搞定
* docx：docx 本质是 zip，用 zipfile + 正则抽 word/document.xml，**零第三方依赖**
* pdf：优先 pdftotext（poppler）；没有则明确告知改用文本粘贴，
  不引入 pypdf 这类重依赖——调研中 cn-resume-optimizer 的
  fpdf2/fonttools/pdfplumber 三件套就是被依赖拖累的典型。

用法
----
    python3 parse_resume.py <文件路径>
    python3 parse_resume.py <文件路径> --json     # 输出结构化分段
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

# 简历常见栏目标题（用于粗分段）
SECTION_PATTERNS = [
    ("summary", r"(个人简介|个人评价|自我评价|求职意向|Summary|Profile)"),
    ("skills", r"(专业技能|技能清单|核心技能|技术栈|Skills)"),
    ("experience", r"(工作经历|工作经验|实习经历|职业经历|Experience)"),
    ("projects", r"(项目经历|项目经验|主要项目|Projects)"),
    ("education", r"(教育背景|教育经历|学历|Education)"),
    ("certificates", r"(证书|荣誉|奖项|获奖|资格证书|Certificates|Awards)"),
]

_DATE_RE = re.compile(
    r"(?:19|20)\d{2}\s*[年./\-]?\s*(?:\d{1,2}\s*月?)?\s*[-—–~至到]\s*"
    r"(?:(?:19|20)\d{2}\s*[年./\-]?\s*(?:\d{1,2}\s*月?)?|至今|现在|now)"
)

# markdown 装饰前缀（标题井号、加粗星号等）
_HEADING_RE = re.compile(r"^#{1,6}\s*")


def _clean(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t\xa0]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _strip_html(raw: str) -> str:
    raw = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", "", raw)
    raw = re.sub(r"(?i)</(p|div|li|h[1-6]|tr|section)>", "\n", raw)
    raw = re.sub(r"(?i)<br\s*/?>", "\n", raw)
    raw = re.sub(r"<[^>]+>", "", raw)
    import html as _h

    return _clean(_h.unescape(raw))


def _docx_text(path: Path) -> str:
    """用 zipfile 按段落抽 docx 正文，零第三方依赖。

    先按 </w:p> 切段，再在每段内取 <w:t>，段间补换行——
    直接对全文 findall 会把所有段落粘成一行。
    """
    import html as _h

    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8", "ignore")
    lines = []
    for para in re.split(r"</w:p>", xml):
        para = re.sub(r"<w:tab[^>]*/>", "\t", para)
        texts = re.findall(r"<w:t[^>]*>(.*?)</w:t>", para, flags=re.S)
        line = _h.unescape("".join(texts))
        if line.strip():
            lines.append(line)
    return _clean("\n".join(lines))


def _pdf_text(path: Path) -> str:
    exe = shutil.which("pdftotext")
    if not exe:
        raise RuntimeError(
            "PDF 解析需要 poppler（brew install poppler）；"
            "或请直接把简历文字粘贴到对话里。"
        )
    r = subprocess.run(
        [exe, "-layout", str(path), "-"], capture_output=True, text=True, timeout=60
    )
    if r.returncode != 0:
        raise RuntimeError(f"pdftotext 失败：{r.stderr.strip()[:200]}")
    return _clean(r.stdout)


def extract(path: str) -> str:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"文件不存在：{path}")
    suffix = p.suffix.lower()

    if suffix in (".md", ".markdown", ".txt"):
        return _clean(p.read_text(encoding="utf-8", errors="ignore"))
    if suffix in (".html", ".htm"):
        return _strip_html(p.read_text(encoding="utf-8", errors="ignore"))
    if suffix == ".docx":
        return _docx_text(p)
    if suffix == ".pdf":
        return _pdf_text(p)
    raise ValueError(f"暂不支持的格式 {suffix}（支持 md/txt/html/docx/pdf）")


def segment(text: str) -> list[dict]:
    """按栏目标题粗分段。先剥掉 markdown 标题/强调前缀再匹配。"""
    lines = text.split("\n")
    sections: list[dict] = []
    current = {"key": "preamble", "title": "（头部信息）", "lines": []}

    for ln in lines:
        raw = ln.strip()
        # 剥 # / * / _ 等 markdown 装饰，避免 "## 工作经历" 匹配不上
        bare = _HEADING_RE.sub("", raw).strip()
        bare = bare.strip("*_：: 「」【】[]()").strip()
        if bare and len(bare) <= 20:
            matched = None
            for key, pat in SECTION_PATTERNS:
                if re.fullmatch(pat, bare):
                    matched = (key, bare)
                    break
            if matched:
                if current["lines"]:
                    sections.append(current)
                current = {"key": matched[0], "title": matched[1], "lines": []}
                continue
        current["lines"].append(ln)

    if current["lines"]:
        sections.append(current)

    return [
        {
            "key": s["key"],
            "title": s["title"],
            "text": _clean("\n".join(s["lines"])),
            "date_hits": _DATE_RE.findall("\n".join(s["lines"])),
        }
        for s in sections
        if _clean("\n".join(s["lines"]))
    ]


def main() -> int:
    ap = argparse.ArgumentParser(description="resume-studio 输入解析")
    ap.add_argument("path", help="简历文件路径")
    ap.add_argument("--json", action="store_true", help="输出结构化分段")
    args = ap.parse_args()

    try:
        text = extract(args.path)
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        return 1

    if args.json:
        print(json.dumps({"chars": len(text), "segments": segment(text)}, ensure_ascii=False, indent=2))
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
